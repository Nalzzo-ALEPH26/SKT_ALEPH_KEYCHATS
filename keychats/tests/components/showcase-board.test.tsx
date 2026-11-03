import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))
vi.mock('@/app/(workspace)/showcase/visit-actions', () => ({ recordShowcaseVisitAction: vi.fn() }))
vi.mock('@/app/(workspace)/showcase/actions', () => ({ showcaseAction: vi.fn() }))
import { ShowcaseBoard, type SiteMemo } from '@/components/showcase-board'
const site: SiteMemo = { id: 'site', author_id: 'owner', title: '<script>test</script>', url: 'https://example.com/', description: '<img onerror=test>', tags: ['React'], color: 'blue', created_at: '2026-10-29T00:00:00Z' }
function render(user: string, isAdmin = false) { return renderToStaticMarkup(createElement(ShowcaseBoard, { sites: [site], comments: [], profiles: [], currentUserId: user, isAdmin })) }
describe('사이트 메모보드', () => {
  it('저장된 방문 수를 표시하고 SQL 미적용 상태를 0회로 표시하지 않는다', () => {
    const html = renderToStaticMarkup(createElement(ShowcaseBoard, { sites:[{...site,visit_count:12}], comments:[], profiles:[], currentUserId:'other', isAdmin:false }))
    expect(html).toContain('방문 12회')
    expect(render('other')).toContain('방문 수 집계 준비 중')
  })
  it('방문자는 수정/삭제 컨트롤을 볼 수 없고 입력 내용은 이스케이프된다', () => { const html = render('other'); expect(html).not.toContain('>수정</button>'); expect(html).not.toContain('>삭제</button>'); expect(html).toContain('&lt;script&gt;'); expect(html).not.toContain('<img onerror'); expect(html).toContain('noopener noreferrer') })
  it('작성자는 수정과 삭제, 관리자는 삭제를 사용할 수 있다', () => { expect(render('owner')).toContain('>수정</button>'); expect(render('owner')).toContain('>삭제</button>'); expect(render('other',true)).toContain('>삭제</button>'); expect(render('other',true)).not.toContain('>수정</button>') })
  it('등록 양식은 닫힌 dialog 안에 배치한다', () => { const html=render('owner'); expect(html).toContain('<dialog'); expect(html).not.toContain('<dialog open'); expect(html).toContain('새 사이트 등록하기'); expect(html).toContain('만들었어요 🔨') })
})
