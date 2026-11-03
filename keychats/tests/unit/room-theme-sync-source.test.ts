import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = readFileSync(resolve(process.cwd(), 'src/components/room-theme-frame.tsx'), 'utf8')

describe('대화방 테마 Realtime 동기화 정책', () => {
  it('15초 상시 폴링을 제거하고 연결 장애 때만 60초 보조 조회한다', () => {
    expect(source).not.toMatch(/setInterval\([\s\S]{0,130}15000/)
    expect(source).toContain('}, 60_000)')
    expect(source).toContain("!connected && document.visibilityState === 'visible'")
    expect(source).toContain("status === 'SUBSCRIBED'")
    expect(source).toContain('stopFallback()')
  })

  it('Realtime 테마 변경은 이벤트로 즉시 반영하고 오래된 값의 역전을 막는다', () => {
    expect(source).toContain('normalizeRoomTheme(payload.new)')
    expect(source).toContain('newerRoomTheme(current, incoming)')
    expect(source).toContain('if (incoming.revision > 0)')
    expect(source).toContain('sync()')
  })

  it('포커스·탭 복귀 조회는 중복 방지하고 언마운트 시 자원을 정리한다', () => {
    expect(source).toContain('now - lastResumeAt < 1_500')
    expect(source).toContain('if (inFlight) { refreshQueued = true; return }')
    expect(source).toContain("window.addEventListener('focus', onResume)")
    expect(source).toContain("document.addEventListener('visibilitychange', onResume)")
    expect(source).toContain("window.removeEventListener('focus', onResume)")
    expect(source).toContain("document.removeEventListener('visibilitychange', onResume)")
    expect(source).toContain('client.removeChannel(channel)')
  })
})
