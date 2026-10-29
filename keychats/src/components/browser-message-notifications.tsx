'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

import type { RealtimeMessageRow } from '@/lib/messages/realtime'
import {
  ADMIN_PENDING_CHANGED_EVENT,
  isRoomBrowserNotificationEnabled,
  NOTIFICATION_PREFERENCE_CHANGED_EVENT,
  notificationPreferenceKey,
  toBrowserNotificationPreferenceMap,
  type BrowserNotificationPreferenceMap,
  type BrowserNotificationPreferenceRow,
  type NotificationRoomType,
} from '@/lib/notifications/preferences'
import { createTabAttentionController } from '@/lib/notifications/tab-attention'
import { createClient } from '@/lib/supabase/client'

type AdminNotificationEventRow = {
  id: string
  kind: 'signup_request' | 'password_reset'
  entity_id: string
}

type PreferenceChangeDetail = {
  roomType: NotificationRoomType
  roomId: string
  enabled: boolean
}

type UnreadCountRow = {
  room_type: 'channel' | 'dm'
  room_id: string
  unread_count: number | string
}

function activeDmThreadId() {
  return window.location.pathname.match(/\/dm\/([^/]+)\/?$/)?.[1] ?? null
}

export function BrowserMessageNotifications() {
  const router = useRouter()

  useEffect(() => {
    const client = createClient()
    const attention = createTabAttentionController(document)
    let active = true
    let realtimeChannel: ReturnType<typeof client.channel> | null = null
    let preferences: BrowserNotificationPreferenceMap = {}
    let syncDmUnread: (() => Promise<void>) | null = null

    const stopRealtime = () => {
      if (realtimeChannel) void client.removeChannel(realtimeChannel)
      realtimeChannel = null
      syncDmUnread = null
    }

    const onPreferenceChanged = (event: Event) => {
      const detail = (event as CustomEvent<PreferenceChangeDetail>).detail
      if (!detail?.roomType || !detail.roomId) return
      preferences = {
        ...preferences,
        [notificationPreferenceKey(detail.roomType, detail.roomId)]: detail.enabled,
      }
    }
    window.addEventListener(NOTIFICATION_PREFERENCE_CHANGED_EVENT, onPreferenceChanged)

    const syncAttentionWhenVisible = () => {
      if (document.visibilityState === 'visible') void syncDmUnread?.()
    }
    document.addEventListener('visibilitychange', syncAttentionWhenVisible)
    window.addEventListener('focus', syncAttentionWhenVisible)

    const showAdminNotification = (event: AdminNotificationEventRow) => {
      window.dispatchEvent(new Event(ADMIN_PENDING_CHANGED_EVENT))
      if (document.visibilityState === 'visible' && document.hasFocus()) return
      if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return

      const body = event.kind === 'signup_request'
        ? '새 가입 요청이 들어왔습니다.'
        : '새 임시 비밀번호 발급 요청이 들어왔습니다.'
      const notification = new Notification('Keychats 관리자', {
        body,
        tag: `keychats-admin-${event.kind}-${event.entity_id}`,
      })
      notification.onclick = () => {
        window.focus()
        router.push('/admin')
        notification.close()
      }
    }

    const startRealtime = async (accessToken: string, currentUserId: string, isAdmin: boolean) => {
      stopRealtime()

      const syncCurrentDmUnread = async () => {
        const { data, error } = await client.rpc('get_unread_counts')
        if (!active || error) return

        const dmUnreadCount = ((data ?? []) as UnreadCountRow[]).reduce((total, row) => {
          if (row.room_type === 'dm') {
            const count = Number(row.unread_count)
            return total + (Number.isFinite(count) && count > 0 ? count : 0)
          }
          return total
        }, 0)
        attention.setUnreadCount(dmUnreadCount)
      }
      syncDmUnread = syncCurrentDmUnread

      const { data: preferenceRows } = await client
        .from('browser_notification_preferences')
        .select('room_type,room_id,enabled')
        .eq('user_id', currentUserId)
      preferences = toBrowserNotificationPreferenceMap(
        (preferenceRows ?? []) as BrowserNotificationPreferenceRow[],
      )

      await client.realtime.setAuth(accessToken)
      if (!active) return
      await syncCurrentDmUnread()
      if (!active) return

      const channel = client
        .channel(`browser-notifications:${currentUserId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages' },
          async (payload) => {
            const message = payload.new as unknown as RealtimeMessageRow
            if (!active || message.sender_id === currentUserId || message.deleted_at) return

            if (
              message.dm_thread_id &&
              !(
                document.visibilityState === 'visible' &&
                document.hasFocus() &&
                activeDmThreadId() === message.dm_thread_id
              )
            ) {
              void syncCurrentDmUnread()
            }

            const roomType: NotificationRoomType | null = message.dm_thread_id
              ? 'dm'
              : message.channel_id
                ? 'channel'
                : null
            const roomId = message.dm_thread_id ?? message.channel_id
            if (!roomType || !roomId || !isRoomBrowserNotificationEnabled(roomType, roomId, preferences)) return
            if (document.visibilityState === 'visible' && document.hasFocus()) return
            if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return

            const { data: sender } = await client
              .from('profiles')
              .select('display_name')
              .eq('user_id', message.sender_id)
              .maybeSingle()
            if (!active) return

            const notification = new Notification(sender?.display_name ?? 'Keychats', {
              body: message.body?.trim().slice(0, 140) || '첨부 파일을 보냈습니다.',
              tag: `keychats-${roomId}`,
            })
            notification.onclick = () => {
              window.focus()
              if (message.dm_thread_id) router.push(`/dm/${message.dm_thread_id}`)
              else if (message.channel_id) router.push(`/channel/${message.channel_id}`)
              notification.close()
            }
          },
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'read_states',
            filter: `user_id=eq.${currentUserId}`,
          },
          () => void syncCurrentDmUnread(),
        )

      if (isAdmin) {
        channel.on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'admin_notification_events' },
          (payload) => showAdminNotification(payload.new as unknown as AdminNotificationEventRow),
        )
      }

      realtimeChannel = channel.subscribe()
    }

    void client.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) {
        void startRealtime(session.access_token, session.user.id, session.user.app_metadata?.role === 'admin')
      }
    })

    const { data: authListener } = client.auth.onAuthStateChange((_event, session) => {
      if (!active) return
      if (!session?.access_token) {
        stopRealtime()
        attention.setUnreadCount(0)
        return
      }
      void startRealtime(session.access_token, session.user.id, session.user.app_metadata?.role === 'admin')
    })

    return () => {
      active = false
      authListener.subscription.unsubscribe()
      window.removeEventListener(NOTIFICATION_PREFERENCE_CHANGED_EVENT, onPreferenceChanged)
      document.removeEventListener('visibilitychange', syncAttentionWhenVisible)
      window.removeEventListener('focus', syncAttentionWhenVisible)
      attention.dispose()
      stopRealtime()
    }
  }, [router])

  return null
}
