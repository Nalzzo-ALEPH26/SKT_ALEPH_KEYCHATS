import { afterEach, describe, expect, it, vi } from 'vitest'

import { createTabAttentionController } from '@/lib/notifications/tab-attention'

type FakeLink = {
  rel: string
  type: string
  href: string
  isConnected: boolean
  attributes: Map<string, string>
  setAttribute: (name: string, value: string) => void
  removeAttribute: (name: string) => void
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
      removeAttribute(name) {
        this.attributes.delete(name)
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
      if (selector === 'link[rel~="icon"]') {
        return links.find((link) => link.rel.split(/\s+/).includes('icon')) ?? null
      }
      return null
    },
    querySelectorAll: (selector: string) => {
      if (selector === 'link[rel~="icon"]') {
        return links.filter((link) => link.rel.split(/\s+/).includes('icon'))
      }
      return []
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
  it('keeps one persistent favicon node while blinking and restores it at zero', () => {
    vi.useFakeTimers()
    const { document, staticIcon, getAlertIcon, getIcons } = createFakeDocument()
    const controller = createTabAttentionController(document)

    controller.setUnreadCount(2)
    expect(document.title).toBe('2 새 메시지 · KEYCHATS')
    const redAlertIcon = getAlertIcon()
    expect(redAlertIcon).toBe(staticIcon)
    expect(redAlertIcon?.href).toContain('ff2d20')
    expect(redAlertIcon?.type).toBe('image/svg+xml')
    expect(staticIcon.isConnected).toBe(true)
    expect(getIcons()).toEqual([staticIcon])

    vi.advanceTimersByTime(900)
    expect(document.title).toBe('2 새 메시지 · KEYCHATS')
    const blackAlertIcon = getAlertIcon()
    expect(blackAlertIcon).toBe(staticIcon)
    expect(blackAlertIcon?.href).toContain('000000')
    expect(staticIcon.isConnected).toBe(true)
    expect(getIcons()).toEqual([staticIcon])

    vi.advanceTimersByTime(900)
    expect(document.title).toBe('2 새 메시지 · KEYCHATS')
    const nextRedAlertIcon = getAlertIcon()
    expect(nextRedAlertIcon).toBe(staticIcon)
    expect(nextRedAlertIcon?.href).toContain('ff2d20')
    expect(getIcons()).toEqual([staticIcon])

    controller.setUnreadCount(0)
    expect(document.title).toBe('KEYCHATS')
    expect(getAlertIcon()).toBeNull()
    const restoredIcon = getIcons()[0]
    expect(restoredIcon).toBe(staticIcon)
    expect(restoredIcon?.href).toBe('/chats/keychats-tab-icon.svg')
    expect(restoredIcon?.type).toBe('image/svg+xml')
    expect(restoredIcon?.isConnected).toBe(true)
    expect(getIcons()).toHaveLength(1)

    controller.dispose()
  })
})
