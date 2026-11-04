'use client'

import { useLayoutEffect, useRef } from 'react'

import { MessageItem, type MessageListItem } from '@/components/message-item'
import { shouldGroupMessages } from '@/lib/messages/grouping'

type MessageListProps = {
  messages: MessageListItem[]
  currentUserId: string
  isAdmin: boolean
  onReply?: (messageId: number) => void
  onJumpToMessage?: (messageId: number) => void
  onEdit?: (messageId: number) => void
  onDelete?: (messageId: number) => void
  onToggleReaction?: (messageId: number, emoji: string) => void
  onTogglePin?: (messageId: number) => void
}

const FOLLOW_LATEST_THRESHOLD_PX = 8

export function MessageList({
  messages,
  currentUserId,
  isAdmin,
  onReply,
  onJumpToMessage,
  onEdit,
  onDelete,
  onToggleReaction,
  onTogglePin,
}: MessageListProps) {
  const contentRef = useRef<HTMLDivElement>(null)
  const didInitialScrollRef = useRef(false)
  const followLatestRef = useRef(true)
  const previousLatestMessageIdRef = useRef<number | null>(null)
  const latestMessageId = messages.at(-1)?.id ?? null
  const isEmpty = messages.length === 0

  useLayoutEffect(() => {
    const content = contentRef.current
    const scrollArea = content?.parentElement
    if (!scrollArea || !content) return

    let lastScrollHeight = scrollArea.scrollHeight
    let lastClientHeight = scrollArea.clientHeight
    const isNearBottom = () =>
      scrollArea.scrollHeight - scrollArea.clientHeight - scrollArea.scrollTop <= FOLLOW_LATEST_THRESHOLD_PX
    const stickToBottom = () => {
      scrollArea.scrollTop = scrollArea.scrollHeight
      lastScrollHeight = scrollArea.scrollHeight
      lastClientHeight = scrollArea.clientHeight
    }

    const onScroll = () => {
      const sizeChanged =
        scrollArea.scrollHeight !== lastScrollHeight || scrollArea.clientHeight !== lastClientHeight
      if (sizeChanged) {
        // Content/toolbar layout changes can dispatch scroll without user input.
        // Never interpret such a change as the reader deliberately leaving the bottom.
        if (followLatestRef.current) stickToBottom()
        lastScrollHeight = scrollArea.scrollHeight
        lastClientHeight = scrollArea.clientHeight
        return
      }
      followLatestRef.current = isNearBottom()
    }

    scrollArea.addEventListener('scroll', onScroll, { passive: true })
    // Message action bars, previews, images, and late font layout may change
    // height after the latest-message effect has already run.
    const observer = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => {
          if (followLatestRef.current) stickToBottom()
          lastScrollHeight = scrollArea.scrollHeight
          lastClientHeight = scrollArea.clientHeight
        })
      : null
    observer?.observe(content)
    observer?.observe(scrollArea)
    return () => {
      scrollArea.removeEventListener('scroll', onScroll)
      observer?.disconnect()
    }
  }, [isEmpty])

  useLayoutEffect(() => {
    const scrollArea = contentRef.current?.parentElement
    if (!scrollArea) return

    if (!didInitialScrollRef.current) {
      scrollArea.scrollTop = scrollArea.scrollHeight
      followLatestRef.current = true
      previousLatestMessageIdRef.current = latestMessageId
      didInitialScrollRef.current = true
      return
    }

    const previousLatestMessageId = previousLatestMessageIdRef.current
    previousLatestMessageIdRef.current = latestMessageId

    const receivedNewLatestMessage = latestMessageId !== null && latestMessageId !== previousLatestMessageId
    if (!receivedNewLatestMessage || !followLatestRef.current) return

    scrollArea.scrollTop = scrollArea.scrollHeight
  }, [latestMessageId])

  if (isEmpty) {
    return (
      <div ref={contentRef} data-message-scroll-area className="flex flex-1 items-center justify-center py-16 text-sm text-zinc-500">
        아직 메시지가 없습니다.
      </div>
    )
  }

  return (
    <div ref={contentRef} className="flex flex-col" data-message-list data-message-scroll-area>
      {messages.map((message, index) => {
        const previous = messages[index - 1]
        const next = messages[index + 1]
        const continuesPrevious = shouldGroupMessages(previous, message)
        const continuesNext = next ? shouldGroupMessages(message, next) : false

        return (
          <MessageItem
            key={message.id}
            message={message}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
            continuesPrevious={continuesPrevious}
            continuesNext={continuesNext}
            onReply={onReply}
            onJumpToMessage={onJumpToMessage}
            onEdit={onEdit}
            onDelete={onDelete}
            onToggleReaction={onToggleReaction}
            onTogglePin={onTogglePin}
          />
        )
      })}
    </div>
  )
}
