import { afterEach, describe, expect, it, vi } from 'vitest'

import { createTabAttentionController } from '@/lib/notifications/tab-attention'

type FakeLink = {
  rel: string
  type: string
  href: string
  isConnected: boolean
  attributes: Map<string, string>
  setAttribute: (name: string, value: string) => void
  getAttribute: (name: string) => string | null
  remove: () => void
}

function createFakeDocument() {
  const links: FakeLink[] = []

  const createLink = (): FakeLink => {
    const link: FakeLink = {
      rel: '',
      type: '',
      href: '',
      isConnected: false,
      attributes: new Map(),
      setAttribute(name, value) {
        this.attributes.set(name, value)
      },
      getAttribute(name) {
        return this.attributes.get(name) ?? null
      },
      remove() {
        this.isConnected = false
        const index = links.indexOf(this)
        if (index >= 0) links.splice(index, 1)
      },
    }

    return link
  }

  const staticIcon = createLink()
  staticIcon.rel = 'icon'
  staticIcon.type = 'image/svg+xml'
  staticIcon.href = '/chats/keychats-tab-icon.svg'
  staticIcon.isConnected = true
  links.push(staticIcon)

  const document = {
    title: 'KEYCHATS',
    querySelector: (selector: string) => {
      if (selector === 'link[data-keychats-alert-icon="true"]') {
        return links.find((link) => link.getAttribute('data-keychats-alert-icon') === 'true') ?? null
      }
      return null
    },
    createElement: () => createLink(),
    head: {
      appendChild: (link: FakeLink) => {
        link.isConnected = true
        if (!links.includes(link)) links.push(link)
        return link
      },
    },
  }

  return {
    document: document as unknown as Document,
    staticIcon,
    getAlertIcon: () =>
      links.find((link) => link.getAttribute('data-keychats-alert-icon') === 'true') ?? null,
    getIcons: () => [...links],
  }
}

afterEach(() => {
  vi.useRealTimers()
})

describe('DM favicon attention', () => {
  it('replaces a dedicated alert icon while keeping the default favicon untouched, then removes it at zero', () => {
    vi.useFakeTimers()
    const { document, staticIcon, getAlertIcon, getIcons } = createFakeDocument()
    const controller = createTabAttentionController(document)

    controller.setUnreadCount(2)
    expect(document.title).toBe('2 새 메시지 · KEYCHATS')
    const redAlertIcon = getAlertIcon()
    expect(redAlertIcon?.href).toContain('ff2d20')
    expect(redAlertIcon?.type).toBe('image/svg+xml')
    expect(staticIcon.href).toBe('/chats/keychats-tab-icon.svg')
    expect(getIcons().at(-1)).toBe(redAlertIcon)

    vi.advanceTimersByTime(900)
    expect(document.title).toBe('2 새 메시지 · KEYCHATS')
    const blackAlertIcon = getAlertIcon()
    expect(blackAlertIcon?.href).toContain('000000')
    expect(blackAlertIcon).not.toBe(redAlertIcon)
    expect(redAlertIcon?.isConnected).toBe(false)
    expect(staticIcon.href).toBe('/chats/keychats-tab-icon.svg')

    vi.advanceTimersByTime(900)
    expect(document.title).toBe('2 새 메시지 · KEYCHATS')
    const nextRedAlertIcon = getAlertIcon()
    expect(nextRedAlertIcon?.href).toContain('ff2d20')
    expect(nextRedAlertIcon).not.toBe(blackAlertIcon)

    controller.setUnreadCount(0)
    expect(document.title).toBe('KEYCHATS')
    expect(getAlertIcon()).toBeNull()
    expect(staticIcon.href).toBe('/chats/keychats-tab-icon.svg')
    expect(staticIcon.isConnected).toBe(true)
    expect(getIcons()).toEqual([staticIcon])

    controller.dispose()
  })
})
