import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8')
const themeScope = '.room-theme-frame:not([data-room-theme="default"]) [data-conversation-message-pane]'

describe('custom room theme composer styling', () => {
  it('keeps default theme styles untouched by scoping the composer redesign to custom themes', () => {
    expect(css).toContain(`${themeScope} [data-sticky-composer]`)
    expect(css).toContain(`${themeScope} [data-message-composer]`)
    expect(css).toContain(`${themeScope} [data-message-composer] textarea`)
  })

  it('removes the separate composer background and keeps a themed unified input surface', () => {
    expect(css).toContain('background: transparent !important;')
    expect(css).toContain('background: var(--rt-surface);')
    expect(css).toContain('border: 1px solid var(--rt-border);')
    expect(css).toContain('border-color: var(--rt-accent);')
  })

  it('preserves an accessible editable field and the existing send control', () => {
    expect(css).toContain(`${themeScope} [data-message-composer] [data-send-message]`)
    expect(css).toContain('min-width: 0;')
    expect(css).toContain('color: var(--rt-text) !important;')
  })
})
