// @vitest-environment jsdom

import { cleanup, fireEvent, render } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { MessageList } from '@/components/message-list'

const sender = { userId: 'sender', displayName: 'Sender', username: 'sender', avatarPath: null }
function message(id: number, createdAt: string, userId = sender.userId) {
  return { id, createdAt, sender: { ...sender, userId }, body: `message ${id}`, replyTo: null, editedAt: null, deletedAt: null }
}
const props = { currentUserId: sender.userId, isAdmin: false }
const day = '2026년 11월 5일 목요일'
const nextDay = '2026년 11월 6일 금요일'

afterEach(() => { cleanup(); vi.restoreAllMocks() })

describe('local message dates', () => {
  it('shows both labels for a single message without changing its time', () => {
    const { container } = render(<MessageList {...props} messages={[message(1, '2026-11-05T12:00:00')]} />)
    expect([...container.querySelectorAll('[data-message-date]')].map((label) => label.textContent)).toEqual([day, day])
    expect(container.querySelector('time')?.getAttribute('dateTime')).toBe('2026-11-05T12:00:00')
    expect(container.querySelector('[data-message-date]')?.className).toContain('text-center')
  })

  it('groups dates independently of senders and splits a sender group across local midnight', () => {
    const { container } = render(<MessageList {...props} messages={[
      message(1, '2026-11-05T23:58:00', 'other'),
      message(2, '2026-11-05T23:59:00'),
      message(3, '2026-11-06T00:01:00'),
    ]} />)
    expect([...container.querySelector('[data-message-list]')!.children].map((node) => node.getAttribute('data-message-date') ?? node.getAttribute('data-message-id'))).toEqual(['start', '1', '2', 'end', 'start', '3', 'end'])
    expect([...container.querySelectorAll('[data-message-date]')].map((label) => label.textContent)).toEqual([day, day, nextDay, nextDay])
    expect(container.querySelector('[data-message-id="3"]')?.getAttribute('data-message-group-continuation')).toBe('false')
  })

  it('keeps the first date open until older history proves its boundary', () => {
    const messages = [message(2, '2026-11-05T12:01:00')]
    const { container, rerender } = render(<MessageList {...props} messages={messages} hasMoreOlder />)
    expect(container.querySelectorAll('[data-message-date="start"]')).toHaveLength(0)
    expect(container.querySelectorAll('[data-message-date="end"]')).toHaveLength(1)
    const original = container.querySelector('[data-message-id="2"]')
    rerender(<MessageList {...props} messages={[message(1, '2026-11-05T12:00:00'), ...messages]} hasMoreOlder={false} />)
    expect(container.querySelectorAll('[data-message-date="start"]')).toHaveLength(1)
    expect(container.querySelector('[data-message-id="2"]')).toBe(original)
    expect(container.querySelector('[data-message-date="start"]')?.nextElementSibling?.getAttribute('data-message-id')).toBe('1')
  })

  it('shows a confirmed transition after an unknown oldest boundary and moves the end on realtime append', () => {
    const messages = [message(1, '2026-11-05T23:59:00'), message(2, '2026-11-06T00:01:00')]
    const { container, rerender } = render(<MessageList {...props} messages={messages} hasMoreOlder />)
    expect([...container.querySelectorAll('[data-message-date]')].map((label) => label.textContent)).toEqual([day, nextDay, nextDay])
    rerender(<MessageList {...props} messages={[...messages, message(3, '2026-11-06T00:02:00')]} hasMoreOlder />)
    expect(container.querySelectorAll('[data-message-date]')).toHaveLength(3)
    expect(container.querySelector('[data-message-id="3"]')?.nextElementSibling?.getAttribute('data-message-date')).toBe('end')
  })

  it('does not emit server-timezone labels before browser hydration', () => {
    expect(renderToString(<MessageList {...props} messages={[message(1, '2026-11-05T12:00:00Z')]} />)).not.toContain('data-message-date')
  })

  it('includes the date labels in the initial scroll and does not scroll on history prepend', () => {
    vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockImplementation(function (this: HTMLElement) {
      return 100 + this.querySelectorAll('[data-message-date]').length * 20
    })
    const messages = [message(2, '2026-11-05T12:01:00')]
    const { container, rerender } = render(<div data-scroll><MessageList {...props} messages={messages} /></div>)
    const scrollArea = container.querySelector<HTMLElement>('[data-scroll]')!
    expect(scrollArea.scrollTop).toBe(140)
    scrollArea.scrollTop = 25
    rerender(<div data-scroll><MessageList {...props} messages={[message(1, '2026-11-04T12:00:00'), ...messages]} /></div>)
    expect(scrollArea.scrollTop).toBe(25)
  })

  it('resumes following when the reader returns to the bottom before a size update is observed', () => {
    let height = 1000
    vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockImplementation(() => height)
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(100)
    const messages = [message(1, '2026-11-05T23:59:00')]
    const { container, rerender } = render(<div data-scroll><MessageList {...props} messages={messages} /></div>)
    const scrollArea = container.querySelector<HTMLElement>('[data-scroll]')!
    scrollArea.scrollTop = 200
    fireEvent.scroll(scrollArea)
    height = 1100
    messages.push(message(2, '2026-11-06T00:01:00'))
    rerender(<div data-scroll><MessageList {...props} messages={[...messages]} /></div>)
    scrollArea.scrollTop = 1000
    fireEvent.scroll(scrollArea)
    height = 1200
    messages.push(message(3, '2026-11-06T00:02:00'))
    rerender(<div data-scroll><MessageList {...props} messages={[...messages]} /></div>)
    expect(scrollArea.scrollTop).toBe(1200)
  })
})
