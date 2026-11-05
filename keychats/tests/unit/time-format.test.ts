import { describe, expect, it } from 'vitest'

import { formatLocalDate, formatSeoulDateTime } from '@/lib/time/format'

describe('formatSeoulDateTime', () => {
  it('formats UTC timestamps in Asia/Seoul time', () => {
    const formatted = formatSeoulDateTime('2026-10-23T00:00:00.000Z')

    expect(formatted).toContain('2026')
    expect(formatted).toContain('10')
    expect(formatted).toContain('23')
    expect(formatted).toContain('09')
  })
})

describe('formatLocalDate', () => {
  it('uses a full Korean date in the runtime local timezone', () => {
    expect(formatLocalDate(new Date(2026, 10, 5, 12))).toBe('2026년 11월 5일 목요일')
  })

  it('changes at local midnight independently of the UTC date', () => {
    expect(formatLocalDate(new Date(2026, 10, 5, 23, 59))).toBe('2026년 11월 5일 목요일')
    expect(formatLocalDate(new Date(2026, 10, 6, 0, 1))).toBe('2026년 11월 6일 금요일')
  })
})
