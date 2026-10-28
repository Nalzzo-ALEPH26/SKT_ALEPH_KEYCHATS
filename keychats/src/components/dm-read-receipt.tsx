'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { markDmConversationReadVisibleAction } from '@/app/(workspace)/message-state-actions'
import { createClient } from '@/lib/supabase/client'

type DmReadReceiptProps = {
  dmThreadId: string
  currentUserId: string
}

function messageId(article: Element) {
  const value = Number(article.getAttribute('data-message-id'))
  return Number.isFinite(value) ? value : null
}

export function DmReadReceipt({ dmThreadId, currentUserId }: DmReadReceiptProps) {
  const client = useMemo(() => createClient(), [])
  const [counterpartLastReadMessageId, setCounterpartLastReadMessageId] = useState<number | null>(null)

  const reconcileMarkers = useCallback(() => {
    const ownMessages = Array.from(document.querySelectorAll<HTMLElement>('[data-dm-message-pane] [data-own-message="true"]'))
    for (const article of ownMessages) {
      const id = messageId(article)
      if (id === null) continue
      const unread = counterpartLastReadMessageId === null || id > counterpartLastReadMessageId
      const existing = article.querySelector<HTMLElement>('[data-dm-unread-one]')
      if (!unread) {
        existing?.remove()
        continue
      }
      if (existing) continue
      const marker = document.createElement('span')
      marker.dataset.dmUnreadOne = 'true'
      marker.textContent = '1'
      marker.className = 'order-0 self-center text-[11px] font-semibold text-amber-500'
      article.prepend(marker)
    }
  }, [counterpartLastReadMessageId])

  const markVisibleRead = useCallback(() => {
    if (document.visibilityState !== 'visible' || !document.hasFocus()) return
    const articles = Array.from(document.querySelectorAll('[data-dm-message-pane] [data-message-id]'))
    const latestMessageId = articles.reduce((latest, article) => Math.max(latest, messageId(article) ?? 0), 0)
    if (latestMessageId <= 0) return
    void markDmConversationReadVisibleAction({ dmThreadId, lastReadMessageId: latestMessageId }).catch(() => undefined)
  }, [dmThreadId])

  useEffect(() => {
    let active = true
    let realtimeChannel: ReturnType<typeof client.channel> | null = null

    void (async () => {
      const { data: thread } = await client
        .from('dm_threads')
        .select('user_low,user_high')
        .eq('id', dmThreadId)
        .maybeSingle()
      if (!active || !thread) return
      const otherUserId = thread.user_low === currentUserId ? thread.user_high : thread.user_low

      const { data: readState } = await client
        .from('read_states')
        .select('last_read_message_id')
        .eq('dm_thread_id', dmThreadId)
        .eq('user_id', otherUserId)
        .maybeSingle()
      if (!active) return
      setCounterpartLastReadMessageId(readState?.last_read_message_id == null ? null : Number(readState.last_read_message_id))

      const { data: { session } } = await client.auth.getSession()
      if (!active || !session?.access_token) return
      await client.realtime.setAuth(session.access_token)
      if (!active) return
      realtimeChannel = client
        .channel(`dm-read-receipt:${dmThreadId}:${currentUserId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'read_states', filter: `dm_thread_id=eq.${dmThreadId}` },
          (payload) => {
            const row = payload.new as { user_id?: string; last_read_message_id?: number | string | null }
            if (row.user_id !== otherUserId) return
            setCounterpartLastReadMessageId(row.last_read_message_id == null ? null : Number(row.last_read_message_id))
          },
        )
        .subscribe()
    })()

    return () => {
      active = false
      if (realtimeChannel) void client.removeChannel(realtimeChannel)
    }
  }, [client, currentUserId, dmThreadId])

  useEffect(() => {
    reconcileMarkers()
    const root = document.querySelector('[data-dm-message-pane]')
    if (!root) return
    const observer = new MutationObserver(() => {
      reconcileMarkers()
      markVisibleRead()
    })
    observer.observe(root, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [markVisibleRead, reconcileMarkers])

  useEffect(() => {
    const onFocus = () => markVisibleRead()
    const onVisibility = () => markVisibleRead()
    markVisibleRead()
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [markVisibleRead])

  return null
}
