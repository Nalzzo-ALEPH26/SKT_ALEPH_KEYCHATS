// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'

import { createTabAttentionController } from '@/lib/notifications/tab-attention'

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
  document.head.innerHTML = ''
})

describe('tab attention after metadata reconciliation', () => {
  it('blinks the connected favicon after navigation replaces the original link', () => {
    vi.useFakeTimers()
    document.head.innerHTML = '<link rel="icon" href="/chats/keychats-tab-icon.svg" type="image/svg+xml">'
    document.title = 'Keychats'
    const controller = createTabAttentionController(document)
    const oldIcon = document.querySelector('link')!
    const navigationIcon = oldIcon.cloneNode() as HTMLLinkElement
    oldIcon.replaceWith(navigationIcon)

    controller.setUnreadCount(1)
    expect(document.title).toBe('1 새 메시지 · KEYCHATS')
    expect(navigationIcon.href).toContain('ff2d20')
    vi.advanceTimersByTime(900)
    expect(navigationIcon.href).toContain('000000')
    vi.advanceTimersByTime(900)
    expect(navigationIcon.href).toContain('ff2d20')
    controller.setUnreadCount(2)
    expect(document.title).toBe('2 새 메시지 · KEYCHATS')
    controller.clear()
    expect(document.title).toBe('Keychats')
    expect(navigationIcon.getAttribute('href')).toBe('/chats/keychats-tab-icon.svg')
    controller.dispose()
  })

  it('recovers a metadata replacement during blinking without replacing a link every tick', () => {
    vi.useFakeTimers()
    document.head.innerHTML = '<link rel="icon" href="/chats/keychats-tab-icon.svg">'
    document.title = 'Keychats'
    const controller = createTabAttentionController(document)
    controller.setUnreadCount(1)
    const replacement = document.createElement('link')
    replacement.rel = 'icon'
    replacement.href = '/chats/keychats-tab-icon.svg'
    document.querySelector('link')!.replaceWith(replacement)
    const append = vi.spyOn(document.head, 'appendChild')
    const remove = vi.spyOn(replacement, 'remove')

    vi.advanceTimersByTime(900)
    expect(replacement.href).toContain('000000')
    vi.advanceTimersByTime(900)
    expect(replacement.href).toContain('ff2d20')
    expect(document.querySelectorAll('link[rel~="icon"]')).toHaveLength(1)
    expect(append).not.toHaveBeenCalled()
    expect(remove).not.toHaveBeenCalled()
    controller.dispose()
  })

  it('keeps one authoritative icon if metadata adds a competing icon while the cached node remains connected', () => {
    vi.useFakeTimers()
    document.head.innerHTML = '<link rel="icon" href="/chats/keychats-tab-icon.svg">'
    document.title = 'Keychats'
    const controller = createTabAttentionController(document)
    controller.setUnreadCount(1)
    const original = document.querySelector('link')!
    const competing = document.createElement('link')
    competing.rel = 'icon'
    competing.href = '/chats/keychats-tab-icon.svg'
    document.head.appendChild(competing)

    vi.advanceTimersByTime(900)
    expect(document.querySelectorAll('link[rel~="icon"]')).toHaveLength(1)
    expect(original.isConnected).toBe(true)
    expect(original.getAttribute('href')).toContain('000000')
    const append = vi.spyOn(document.head, 'appendChild')
    const remove = vi.spyOn(original, 'remove')
    vi.advanceTimersByTime(1_800)
    expect(append).not.toHaveBeenCalled()
    expect(remove).not.toHaveBeenCalled()
    controller.dispose()
  })

  it('restores the original icon and stops all timer work on cleanup', () => {
    vi.useFakeTimers()
    document.head.innerHTML = '<link rel="icon" href="/chats/keychats-tab-icon.svg" type="image/svg+xml">'
    document.title = 'Keychats'
    const controller = createTabAttentionController(document)
    controller.setUnreadCount(1)
    expect(vi.getTimerCount()).toBe(1)
    controller.dispose()
    expect(vi.getTimerCount()).toBe(0)
    vi.advanceTimersByTime(9_000)
    expect(document.title).toBe('Keychats')
    expect(document.querySelector('link')?.getAttribute('href')).toBe('/chats/keychats-tab-icon.svg')
    expect(document.querySelector('link')?.hasAttribute('data-keychats-alert-icon')).toBe(false)
    controller.dispose()
    expect(vi.getTimerCount()).toBe(0)
  })
})
