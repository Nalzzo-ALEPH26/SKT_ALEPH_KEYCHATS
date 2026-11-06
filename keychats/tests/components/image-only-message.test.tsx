import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { MessageItem, type MessageListItem } from '@/components/message-item'

const baseMessage: MessageListItem = {
  id: 100,
  body: '',
  sender: { userId: 'test-user', displayName: '테스트', username: 'test', avatarPath: null },
  replyTo: null,
  createdAt: '2026-11-06T00:00:00.000Z',
  editedAt: null,
  deletedAt: null,
  attachments: [{ id: 'example-attachment', messageId: 100, originalName: 'cat.png', mimeType: 'image/png', sizeBytes: 500 }],
}

function markup(overrides: Partial<MessageListItem>) {
  return renderToStaticMarkup(createElement(MessageItem, { message: { ...baseMessage, ...overrides }, currentUserId: 'test-user', isAdmin: false }))
}

describe('image-only messages', () => {
  it('renders the image without an empty message bubble', () => {
    const html = markup({})
    expect(html).toContain('cat.png 이미지 확대')
    expect(html).toContain('data-message-attachments')
    expect(html).not.toContain('data-message-bubble')
  })

  it('keeps the bubble when text accompanies an image', () => {
    const html = markup({ body: '사진이야' })
    expect(html).toContain('data-message-bubble')
    expect(html).toContain('사진이야')
  })

  it('keeps the deleted-message tombstone', () => {
    const html = markup({ deletedAt: '2026-11-06T00:01:00Z' })
    expect(html).toContain('삭제된 메시지입니다.')
    expect(html).toContain('data-message-bubble')
    expect(html).not.toContain('cat.png 이미지 확대')
  })

  it('does not show a blank bubble for a non-image file-only message', () => {
    const html = markup({ attachments: [{ id: 'document', messageId: 100, originalName: 'guide.pdf', mimeType: 'application/pdf', sizeBytes: 1234 }] })
    expect(html).toContain('guide.pdf')
    expect(html).not.toContain('data-message-bubble')
  })
})
