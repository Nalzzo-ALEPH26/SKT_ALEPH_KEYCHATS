// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => {
    const query = {
      select: () => query,
      eq: () => query,
      is: () => query,
      order: () => query,
      limit: async () => ({ data: [], error: null }),
    }
    return {
      auth: { getSession: async () => ({ data: { session: null }, error: null }) },
      from: () => query,
    }
  },
}))
vi.mock('@/app/(workspace)/message-state-actions', () => ({
  loadMessageStateAction: async () => ({}),
  markConversationReadAction: async () => undefined,
  toggleMessagePinAction: async () => true,
  toggleMessageReactionAction: async () => true,
}))
vi.mock('@/lib/files/supabase', () => ({
  loadAttachmentsForMessages: async () => [],
  uploadMessageAttachments: async () => [],
}))
vi.mock('@/components/message-list', () => ({
  MessageList: ({ onReply }: { onReply: (id: number) => void }) => (
    <button type="button" onClick={() => onReply(1)}>메시지 답글</button>
  ),
}))
vi.mock('@/components/selected-attachments-preview', () => ({ SelectedAttachmentsPreview: () => null }))

import { ConversationMessagePane } from '@/components/conversation-message-pane'
import { PinnedMessageList } from '@/components/pinned-message-list'

afterEach(() => cleanup())

describe('pinned-message navigation and reply focus', () => {
  it('shows stored pins with a navigation button and an unpin action', () => {
    const onJumpToMessage = vi.fn()
    const onUnpin = vi.fn()
    const view = render(
      <PinnedMessageList
        items={[{ id: 42, body: '중요한 공지', senderId: 'alice', pinnedAt: '2026-11-11T00:00:00Z' }]}
        profiles={[{ userId: 'alice', displayName: 'Alice', username: 'alice', avatarPath: null }]}
        onJumpToMessage={onJumpToMessage}
        onUnpin={onUnpin}
      />,
    )
    fireEvent.click(view.container.querySelector('[data-jump-to-pinned-message="42"]')!)
    expect(onJumpToMessage).toHaveBeenCalledWith(42)
    fireEvent.click(view.container.querySelector('[data-unpin-message="42"]')!)
    expect(onUnpin).toHaveBeenCalledWith(42)
  })

  it('focuses the composer immediately when replying in a channel', () => {
    render(
      <ConversationMessagePane
        target={{ kind: 'channel', id: 'channel-a' }}
        initialMessages={[{
          id: 1, channel_id: 'channel-a', dm_thread_id: null, sender_id: 'alice',
          body: '첫 메시지', reply_to_id: null, created_at: '2026-11-11T00:00:00Z',
          edited_at: null, deleted_at: null,
        }]}
        profiles={[{ userId: 'alice', displayName: 'Alice', username: 'alice', avatarPath: null }]}
        currentUserId="bob"
        isAdmin={false}
      />,
    )
    const composer = screen.getByRole('textbox', { name: '메시지 입력' })
    expect(document.activeElement).not.toBe(composer)
    fireEvent.click(screen.getByRole('button', { name: '메시지 답글' }))
    expect(document.activeElement).toBe(composer)
    expect(screen.getByText('Alice에게 답글')).toBeTruthy()
  })

  it('uses the same focus behavior in direct messages', () => {
    render(
      <ConversationMessagePane
        target={{ kind: 'dm', id: 'dm-a' }}
        initialMessages={[{
          id: 1, channel_id: null, dm_thread_id: 'dm-a', sender_id: 'alice',
          body: 'DM 메시지', reply_to_id: null, created_at: '2026-11-11T00:00:00Z',
          edited_at: null, deleted_at: null,
        }]}
        profiles={[{ userId: 'alice', displayName: 'Alice', username: 'alice', avatarPath: null }]}
        currentUserId="bob"
        isAdmin={false}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: '메시지 답글' }))
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: '메시지 입력' }))
  })
})
