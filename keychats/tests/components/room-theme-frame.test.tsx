import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({}) }))
vi.mock('@/app/(workspace)/room-theme-actions', () => ({ setRoomThemeAction: vi.fn() }))
import { RoomThemeFrame } from '@/components/room-theme-frame'
import { defaultRoomTheme } from '@/lib/themes/room-theme'
function render(canChange: boolean) { return renderToStaticMarkup(createElement(RoomThemeFrame,{ target:{kind:'dm',id:'example'},initial:{...defaultRoomTheme,theme_id:'midnight'},canChange,children:createElement('p',null,'채팅 내용') })) }
describe('테마 선택 화면', () => {
  it('서버에서 전달된 테마를 최초 렌더부터 적용한다', () => { expect(render(true)).toContain('data-room-theme="midnight"'); expect(render(true)).toContain('채팅 내용') })
  it('변경 권한이 없으면 변경 컨트롤과 dialog를 노출하지 않는다', () => { expect(render(false)).not.toContain('data-room-theme-trigger'); expect(render(false)).not.toContain('<dialog') })
  it('공통 적용만 제공하고 dialog를 닫힌 상태로 시작한다', () => { const html=render(true);expect(html).toContain('모두에게 적용');expect(html).toContain('모든 참여자');expect(html).not.toContain('내 화면');expect(html).not.toContain('<dialog open') })
})
