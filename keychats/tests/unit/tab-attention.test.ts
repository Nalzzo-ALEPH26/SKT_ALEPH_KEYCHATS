import { afterEach, describe, expect, it, vi } from 'vitest'

import { createTabAttentionController } from '@/lib/notifications/tab-attention'

function createFakeDocument() {
  const icon = {
    rel: 'icon',
    href: '/chats/keychats-tab-icon.svg',
    isConnected: true,
    remove() {
      this.isConnected = false
    },
  }

  const document = {
    title: 'KEYCHATS',
    querySelector: () => icon,
    createElement: () => icon,
    head: {
      appendChild: () => {
        icon.isConnected = true
      },
    },
  }

  return { document: document as unknown as Document, icon }
}

afterEach(() => {
  vi.useRealTimers()
})

describe('DM favicon attention', () => {
  it('keeps the unread title fixed while only the favicon blinks, then restores the default at zero', () => {
    vi.useFakeTimers()
    const { document, icon } = createFakeDocument()
    const controller = createTabAttentionController(document) as ReturnType<typeof createTabAttentionController> & {
      setUnreadCount: (count: number) => void
    }

    controller.setUnreadCount(2)
    expect(document.title).toBe('2 새 메시지 · KEYCHATS')
    expect(icon.href).toContain('ff2d20')

    vi.advanceTimersByTime(900)
    expect(document.title).toBe('2 새 메시지 · KEYCHATS')
    expect(icon.href).toContain('000000')

    vi.advanceTimersByTime(900)
    expect(document.title).toBe('2 새 메시지 · KEYCHATS')
    expect(icon.href).toContain('ff2d20')

    controller.setUnreadCount(0)
    expect(document.title).toBe('KEYCHATS')
    expect(icon.href).toBe('/chats/keychats-tab-icon.svg')

    controller.dispose()
  })
})
