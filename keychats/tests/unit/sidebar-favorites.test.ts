import { describe, expect, it } from 'vitest'
import {
  moveSidebarFavoriteKey,
  readSidebarFavoriteKeys,
  shiftSidebarFavoriteKey,
  sidebarFavoriteKey,
  toggleSidebarFavoriteKey,
} from '@/lib/sidebar/favorites'

describe('sidebar favorites', () => {
  const channel = sidebarFavoriteKey('channel', 'general')
  const dm = sidebarFavoriteKey('dm', 'someone')
  const other = sidebarFavoriteKey('channel', 'design')

  it('treats damaged browser storage as empty and deduplicates keys', () => {
    expect(readSidebarFavoriteKeys(null)).toEqual([])
    expect(readSidebarFavoriteKeys('{broken')).toEqual([])
    expect(readSidebarFavoriteKeys(JSON.stringify([channel, channel, dm, 1, 'invalid']))).toEqual([channel, dm])
  })

  it('adds and removes favorites without changing unrelated rooms', () => {
    expect(toggleSidebarFavoriteKey([channel], dm)).toEqual([channel, dm])
    expect(toggleSidebarFavoriteKey([channel, dm], channel)).toEqual([dm])
  })

  it('reorders by drag target and keyboard up/down with safe boundaries', () => {
    expect(moveSidebarFavoriteKey([channel, dm, other], channel, other)).toEqual([dm, other, channel])
    expect(shiftSidebarFavoriteKey([channel, dm, other], other, -1)).toEqual([channel, other, dm])
    expect(shiftSidebarFavoriteKey([channel, dm], channel, -1)).toEqual([channel, dm])
    expect(moveSidebarFavoriteKey([channel, dm], 'channel:missing', dm)).toEqual([channel, dm])
  })
})
