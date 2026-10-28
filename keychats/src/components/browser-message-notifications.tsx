'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

import type { RealtimeMessageRow } from '@/lib/messages/realtime'
import { createClient } from '@/lib/supabase/client'

export function BrowserMessageNotifications() {
  const router = useRouter()

  useEffect(() => {
    if (typeof Notification === 'undefined') return
    const client = createClient()
    let active = true
    let realtimeChannel: ReturnType<typeof client.channel> | null = null

    const stopRealtime = () => {
      if (realtimeChannel) void client.removeChannel(realtimeChannel)
      realtimeChannel = null
    }

    const startRealtime = async (accessToken: string, currentUserId: string) => {
      stopRealtime()
      await client.realtime.setAuth(accessToken)
      if (!active) return
      realtimeChannel = client
        .channel(`browser-notifications:${currentUserId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages' },
          async (payload) => {
            const message = payload.new as unknown as RealtimeMessageRow
            if (!active || message.sender_id === currentUserId || message.deleted_at) return
            if (Notification.permission !== 'granted') return
            if (document.visibilityState === 'visible' && document.hasFocus()) return

            const { data: sender } = await client
              .from('profiles')
              .select('display_name')
              .eq('user_id', message.sender_id)
              .maybeSingle()
            if (!active) return

            const notification = new Notification(sender?.display_name ?? 'Keychats', {
              body: message.body?.trim().slice(0, 140) || '첨부 파일을 보냈습니다.',
              tag: `keychats-${message.channel_id ?? message.dm_thread_id ?? message.id}`,
            })
            notification.onclick = () => {
              window.focus()
              if (message.dm_thread_id) router.push(`/dm/${message.dm_thread_id}`)
              else if (message.channel_id) router.push(`/channel/${message.channel_id}`)
              notification.close()
            }
          },
        )
        .subscribe()
    }

    void client.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) void startRealtime(session.access_token, session.user.id)
    })

    const { data: authListener } = client.auth.onAuthStateChange((_event, session) => {
      if (!active) return
      if (!session?.access_token) {
        stopRealtime()
        return
      }
      void startRealtime(session.access_token, session.user.id)
    })

    return () => {
      active = false
      authListener.subscription.unsubscribe()
      stopRealtime()
    }
  }, [router])

  return null
}
