import { describe, expect, it } from 'vitest'
import { defaultRoomTheme, isRoomTheme, newerRoomTheme, normalizeRoomTheme, roomThemeKey } from '@/lib/themes/room-theme'
describe('공통 대화방 테마', () => {
  it('허용된 테마만 사용할 수 있다', () => { expect(isRoomTheme('lavender')).toBe(true); expect(isRoomTheme('url(javascript:test)')).toBe(false) })
  it('개인별 키 없이 채널과 DM을 분리한다', () => { expect(roomThemeKey({kind:'channel',id:'abc'})).toBe('channel:abc'); expect(roomThemeKey({kind:'dm',id:'abc'})).toBe('dm:abc') })
  it('이전 조회 응답이 새 테마를 덮어쓰지 않는다', () => {
    const newest = { ...defaultRoomTheme, theme_id:'mint' as const, revision:5 }
    expect(newerRoomTheme(newest,{ ...defaultRoomTheme, revision:4 })).toBe(newest)
    expect(newerRoomTheme(newest,{ ...defaultRoomTheme, theme_id:'cream', revision:6 }).theme_id).toBe('cream')
  })
  it('누락되거나 지원하지 않는 테마를 기본값으로 처리한다', () => { expect(normalizeRoomTheme(null)).toEqual(defaultRoomTheme); expect(normalizeRoomTheme({theme_id:'invalid',revision:3})).toEqual(defaultRoomTheme) })
})
