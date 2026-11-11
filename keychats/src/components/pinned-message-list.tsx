'use client'

import type { MessagePresentationProfile } from '@/lib/messages/presentation'

export type PinnedMessage = {
  id: number
  body: string | null
  senderId: string
  pinnedAt: string
}

type Props = {
  items: PinnedMessage[]
  profiles: MessagePresentationProfile[]
  onJumpToMessage: (id: number) => void
  onUnpin: (id: number) => void
}

export function PinnedMessageList({ items, profiles, onJumpToMessage, onUnpin }: Props) {
  const senderNames = new Map(profiles.map((profile) => [profile.userId, profile.displayName]))

  if (items.length === 0) {
    return <p className="py-5 text-center text-xs text-zinc-500 dark:text-zinc-400">고정된 메시지가 없습니다.</p>
  }

  return (
    <ul className="space-y-2" data-pinned-message-list>
      {items.map((item) => {
        const sender = senderNames.get(item.senderId) ?? '알 수 없는 사용자'
        return (
          <li key={item.id} className="rounded-xl border border-black/10 bg-white px-3 py-2 dark:border-white/15 dark:bg-zinc-950">
            <button
              type="button"
              data-jump-to-pinned-message={item.id}
              onClick={() => onJumpToMessage(item.id)}
              className="block w-full min-w-0 text-left"
              aria-label={`${sender}의 고정 메시지로 이동`}
            >
              <span className="block truncate text-xs font-semibold">{sender}</span>
              <span className="mt-1 block whitespace-pre-wrap break-words text-xs leading-5 text-zinc-600 line-clamp-3 dark:text-zinc-300">
                {item.body?.trim() || '첨부파일 메시지'}
              </span>
            </button>
            <button
              type="button"
              data-unpin-message={item.id}
              onClick={() => onUnpin(item.id)}
              aria-label={`${sender}의 고정 메시지 해제`}
              className="mt-2 text-xs font-medium text-zinc-500 underline underline-offset-2 hover:text-zinc-900 dark:hover:text-white"
            >
              고정 해제
            </button>
          </li>
        )
      })}
    </ul>
  )
}
