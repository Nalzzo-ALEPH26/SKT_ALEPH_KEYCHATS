import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { MessageList } from '@/components/message-list'

const ownUserId = '11111111-1111-1111-1111-111111111111'
const otherUserId = '22222222-2222-2222-2222-222222222222'
const message = (id: number, senderId: string, seconds: number) => ({
  id,
  body: `Message ${id}`,
  sender: { userId: senderId, displayName: '사용자', username: 'test', avatarPath: null },
  replyTo: null,
  createdAt: new Date(Date.parse('2026-11-04T00:00:00Z') + seconds * 1000).toISOString(),
  editedAt: null,
  deletedAt: null,
})

function render(messages: Parameters<typeof MessageList>[0]['messages']) {
  return renderToStaticMarkup(createElement(MessageList, { messages, currentUserId: ownUserId, isAdmin: false }))
}

function classForMessage(html: string, id: number) {
  const match = html.match(new RegExp(`<article[^>]*data-message-id="${id}"[^>]*class="([^"]*)"`))
  expect(match, `message ${id} should render`).not.toBeNull()
  return match?.[1] ?? ''
}

describe('message spacing and actions', () => {
  it('uses 3px top and bottom padding between consecutive messages within five minutes', () => {
    const html = render([
      message(1, ownUserId, 0),
      message(2, ownUserId, 30),
      message(3, ownUserId, 60),
    ])
    expect(classForMessage(html, 1)).toContain('pb-[3px]')
    expect(classForMessage(html, 2)).toContain('pt-[3px]')
    expect(classForMessage(html, 2)).toContain('pb-[3px]')
    expect(classForMessage(html, 3)).toContain('pt-[3px]')
    expect((html.match(/data-message-sender-meta/g) ?? [])).toHaveLength(1)
  })

  it('preserves a larger separator when the sender changes or five minutes have elapsed', () => {
    const html = render([
      message(1, ownUserId, 0),
      message(2, otherUserId, 10),
      message(3, otherUserId, 400),
    ])
    expect(classForMessage(html, 1)).toContain('pb-2')
    expect(classForMessage(html, 2)).toContain('pt-3')
    expect(classForMessage(html, 3)).toContain('pt-3')
    expect((html.match(/data-message-sender-meta/g) ?? [])).toHaveLength(3)
  })

  it('collapses idle actions and reveals them inside their own message on hover or keyboard focus', () => {
    const html = render([message(1, ownUserId, 0)])
    expect(html).toContain('data-message-actions="true"')
    expect(html).toContain('max-h-0')
    expect(html).toContain('overflow-hidden')
    expect(html).toContain('group-hover:max-h-24')
    expect(html).toContain('group-focus-within:max-h-24')
    expect(html).not.toContain('absolute bottom-full')
    expect(html).toContain('group-hover:opacity-100')
    expect(html).toContain('group-focus-within:opacity-100')
    expect(html).toContain('data-reply-to="1"')
    expect(html).toContain('data-edit-message="1"')
    expect(html).toContain('data-delete-message="1"')
  })
})
