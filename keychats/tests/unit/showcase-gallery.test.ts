import { describe, expect, it } from 'vitest'
import { imageExtension, isOwnShowcaseImagePath, projectTypeLabel, validateProjectExtras } from '@/lib/community/showcase'

const user = '11111111-1111-1111-1111-111111111111'
const site = '22222222-2222-2222-2222-222222222222'
const other = '33333333-3333-3333-3333-333333333333'
const image = `${user}/${site}/44444444-4444-4444-4444-444444444444.webp`

describe('만들었어요 갤러리 입력 검증', () => {
  it('등록 유형과 상세 설명을 정리한다', () => {
    expect(validateProjectExtras({ projectType: 'web', details: ' 설명 ' })).toEqual({ project_type: 'web', details: '설명' })
    expect(validateProjectExtras({ projectType: '', details: '' })).toEqual({ project_type: 'web', details: null })
    expect(projectTypeLabel('app')).toBe('APP')
    expect(projectTypeLabel(undefined)).toBe('WEB')
  })
  it('잘못된 유형과 너무 긴 설명을 거부한다', () => {
    expect(() => validateProjectExtras({ projectType: 'invalid', details: '' })).toThrow()
    expect(() => validateProjectExtras({ projectType: 'web', details: 'x'.repeat(5001) })).toThrow()
  })
  it('대표 이미지는 JPG/PNG/WebP와 4MB 이하만 허용한다', () => {
    expect(imageExtension({ type: 'image/webp', size: 1024 })).toBe('webp')
    expect(() => imageExtension({ type: 'image/svg+xml', size: 1024 })).toThrow()
    expect(() => imageExtension({ type: 'image/png', size: 4194305 })).toThrow()
  })
  it('대표 이미지 경로는 현재 사용자와 프로젝트 아래에만 둘 수 있다', () => {
    expect(isOwnShowcaseImagePath(image, user, site)).toBe(true)
    expect(isOwnShowcaseImagePath(image, other, site)).toBe(false)
    expect(isOwnShowcaseImagePath(image, user, other)).toBe(false)
    expect(isOwnShowcaseImagePath(`${user}/${site}/../hack.png`, user, site)).toBe(false)
  })
})
