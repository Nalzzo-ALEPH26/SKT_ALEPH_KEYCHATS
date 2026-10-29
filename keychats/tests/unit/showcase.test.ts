import { describe, expect, it } from 'vitest'
import { validateSite } from '../../src/lib/community/showcase'
const valid = { title: ' 메모 ', url: 'https://example.com', description: ' 소개 ', color: 'yellow', tags: 'React, React, Supabase' }
describe('사이트 메모 검증', () => {
  it('공백 제거 및 중복 태그 정리', () => { expect(validateSite(valid)).toMatchObject({ title: '메모', description: '소개', tags: ['React', 'Supabase'] }) })
  it.each(['javascript:alert(1)', 'data:text/html,test', 'https://user:password@example.com', 'not a url'])('안전하지 않은 주소 거부: %s', url => { expect(() => validateSite({ ...valid, url })).toThrow() })
  it('빈 본문, 잘못된 색상, 태그 초과 거부', () => {
    expect(() => validateSite({ ...valid, description: ' ' })).toThrow()
    expect(() => validateSite({ ...valid, color: 'invalid' })).toThrow()
    expect(() => validateSite({ ...valid, tags: Array.from({ length: 9 }, (_, i) => String(i)).join(',') })).toThrow()
  })
})
