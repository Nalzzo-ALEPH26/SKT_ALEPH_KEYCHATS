import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('pinned messages follow the per-room palette', () => {
  it('scopes pinned card, mobile tray, and desktop panel to custom room themes', () => {
    const css = readFileSync(new URL('../../src/components/room-theme.css', import.meta.url), 'utf8')
    const pins = readFileSync(new URL('../../src/components/pinned-message-list.tsx', import.meta.url), 'utf8')
    for (const selector of ['data-mobile-pinned-messages', 'data-pinned-messages-panel', 'data-pinned-message-list', 'data-pinned-body', 'data-unpin-message']) {
      expect(css).toContain(selector)
    }
    expect(css).toContain('.room-theme-frame:not([data-room-theme=default]) [data-pinned-message-list] > li')
    expect(css).toContain('background:var(--rt-surface)')
    expect(css).toContain('color:var(--rt-text)')
    expect(pins).toContain('data-pinned-sender')
    expect(pins).toContain('data-pinned-body')
  })
})
