import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))
vi.mock('@/app/(workspace)/showcase/visit-actions', () => ({ recordShowcaseVisitAction: vi.fn() }))
vi.mock('@/app/(workspace)/showcase/actions', () => ({ showcaseAction: vi.fn() }))
vi.mock('@/lib/supabase/client', () => ({ createClient: vi.fn() }))
import { ShowcaseBoard, type SiteMemo } from '@/components/showcase-board'

const site: SiteMemo = {
  id: '11111111-1111-1111-1111-111111111111', author_id: 'owner',
  title: '<script>test</script>', url: 'https://example.com/', description: '<img onerror=test>',
  tags: ['React'], color: 'blue', created_at: '2026-10-29T00:00:00Z',
}
function render(user: string, isAdmin = false) {
  return renderToStaticMarkup(createElement(ShowcaseBoard, { sites: [site], profiles: [], currentUserId: user, isAdmin }))
}

describe('프로젝트 갤러리', () => {
  it('기존 게시글에 대표 이미지가 없어도 표시하고 클릭 경로를 분리한다', () => {
    const html = render('visitor')
    expect(html).toContain('PROJECT SHOWCASE')
    expect(html).toContain('https://example.com/')
    expect(html).toContain('target="_blank"')
    expect(html).toContain('/showcase/11111111-1111-1111-1111-111111111111')
    expect(html).toContain('#comments')
    expect(html).toContain('noopener noreferrer')
  })
  it('기존 조회수와 정렬 필터를 유지하고, SQL이 없으면 미확인을 표시한다', () => {
    const html = renderToStaticMarkup(createElement(ShowcaseBoard, {
      sites: [{ ...site, visit_count: 12, comment_count: 3 }], profiles: [], currentUserId: 'other', isAdmin: false,
    }))
    expect(html).toContain('방문 12회')
    expect(html).toContain('댓글 3개')
    expect(html).toContain('조회수많은순')
    expect(render('other')).toContain('방문 수 집계 준비 중')
  })
  it('방문자는 관리 버튼이 없고 사용자 입력은 HTML로 실행되지 않는다', () => {
    const html = render('visitor')
    expect(html).not.toContain('>수정</button>')
    expect(html).not.toContain('>삭제</button>')
    expect(html).toContain('&lt;script&gt;')
    expect(html).not.toContain('<img onerror')
  })
  it('작성자는 수정·삭제, 관리자는 삭제만 보인다', () => {
    expect(render('owner')).toContain('>수정</button>')
    expect(render('owner')).toContain('>삭제</button>')
    expect(render('visitor', true)).not.toContain('>수정</button>')
    expect(render('visitor', true)).toContain('>삭제</button>')
  })
  it('등록 팝업에서 대표 이미지, 유형, 설명을 입력할 수 있다', () => {
    const html = render('owner')
    expect(html).toContain('새 사이트 등록하기')
    expect(html).toContain('name="thumbnail"')
    expect(html).toContain('name="project_type"')
    expect(html).toContain('name="details"')
    expect(html).toContain('<dialog')
  })
})
