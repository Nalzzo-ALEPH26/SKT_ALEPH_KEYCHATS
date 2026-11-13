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
})
