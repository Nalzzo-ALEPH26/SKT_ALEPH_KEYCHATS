import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { isLikelyDevtoolsDocked } from '@/components/devtools-gate'

describe('best-effort docked DevTools warning', () => {
  it('does not block a normal browser window', () => {
    expect(isLikelyDevtoolsDocked({outerWidth:1440,innerWidth:1420,outerHeight:900,innerHeight:790})).toBe(false)
  })
  it('detects right docking and clears after closing', () => {
    expect(isLikelyDevtoolsDocked({outerWidth:1440,innerWidth:1000,outerHeight:900,innerHeight:790})).toBe(true)
    expect(isLikelyDevtoolsDocked({outerWidth:1440,innerWidth:1420,outerHeight:900,innerHeight:790})).toBe(false)
  })
  it('detects bottom docking', () => {
    expect(isLikelyDevtoolsDocked({outerWidth:1440,innerWidth:1420,outerHeight:900,innerHeight:500})).toBe(true)
  })
  it('uses stable screen width rather than viewport width for desktop detection', () => {
    const source = readFileSync(new URL('../../src/components/devtools-gate.tsx', import.meta.url), 'utf8')
    expect(source).toContain('window.screen.width >= 768')
    expect(source).toContain("window.addEventListener('keydown', onShortcut, true)")
    expect(source).not.toContain("matchMedia('(min-width: 768px)')")
  })
})
