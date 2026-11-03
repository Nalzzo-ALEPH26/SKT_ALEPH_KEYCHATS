'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { showcaseAction } from '@/app/(workspace)/showcase/actions'
import { recordShowcaseVisitAction } from '@/app/(workspace)/showcase/visit-actions'
import { projectTypeLabel } from '@/lib/community/showcase'
import type { SiteComment, SiteMemo } from '@/components/showcase-board'
import './showcase-board.css'

type UserInfo = { user_id: string; display_name: string; username: string }
type Props = {
  site: SiteMemo; comments: SiteComment[]; profiles: UserInfo[]
  currentUserId: string; isAdmin: boolean; backHref: string
}
const formatDate = (value: string) => new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date(value))

export function ShowcaseDetail({ site, comments, profiles, currentUserId, isAdmin, backHref }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [count, setCount] = useState(site.visit_count ?? null)
  const author = profiles.find(p => p.user_id === site.author_id)
  const profile = (id: string) => profiles.find(p => p.user_id === id)

  function trackVisit() {
    void recordShowcaseVisitAction(site.id).then(result => {
      if (result.count === null) { setStatus('사이트를 열었습니다. 방문 수는 집계하지 못했습니다.'); return }
      setCount(value => Math.max(value ?? 0, result.count!))
      setStatus('')
    }).catch(() => setStatus('사이트를 열었습니다. 방문 수는 집계하지 못했습니다.'))
  }
  function submitComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const target = event.currentTarget
    const data = new FormData(target)
    data.set('operation', 'comment'); data.set('id', site.id)
    startTransition(async () => {
      setError('')
      const result = await showcaseAction(data).catch(() => ({ error: '댓글을 등록하지 못했습니다.' }))
      if (result.error) { setError(result.error); return }
      target.reset()
      router.refresh()
    })
  }
  function deleteComment(id: string) {
    if (!window.confirm('댓글을 삭제할까요?')) return
    const data = new FormData()
    data.set('operation', 'delete-comment'); data.set('id', id)
    startTransition(async () => {
      setError('')
      const result = await showcaseAction(data).catch(() => ({ error: '댓글을 삭제하지 못했습니다.' }))
      if (result.error) { setError(result.error); return }
      router.refresh()
    })
  }
  async function share() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setStatus('프로젝트 상세페이지 주소를 복사했습니다.')
    } catch { setStatus('주소를 복사하지 못했습니다. 브라우저 주소창에서 복사해주세요.') }
  }

  return <div className="showcase-detail mx-auto w-full max-w-4xl px-5 py-8 md:px-8">
    <nav aria-label="이전 페이지" className="sb-detail-nav">
      <Link href={backHref}>← 만들었어요 목록으로</Link>
    </nav>
    <article className="sb-detail-article">
      <div className="sb-detail-cover">
        {site.thumbnail_url ? <img src={site.thumbnail_url} alt={`${site.title} 대표 이미지`} />
          : <div className="sb-placeholder" data-color={site.color}><span className="sb-placeholder-mark">✦</span><strong>{site.title}</strong><small>PROJECT SHOWCASE</small></div>}
        <span className="sb-type">{projectTypeLabel(site.project_type)}</span>
      </div>
      <div className="sb-detail-content">
        <div className="sb-detail-title-row">
          <div><h1>{site.title}</h1><p className="sb-detail-byline">{author?.display_name ?? '사용자'} <span>@{author?.username ?? 'unknown'}</span> · {formatDate(site.created_at)}</p></div>
          <button type="button" className="sb-share" onClick={share}>↗ 공유</button>
        </div>
        <div className="sb-detail-stats"><span data-showcase-visit-count>◉ 방문 {count === null ? '—' : `${count.toLocaleString('ko-KR')}회`}</span><span>♧ 댓글 {comments.length}개</span></div>
        {site.tags.length > 0 && <div className="sb-tags">{site.tags.map(tag => <span key={tag}>#{tag}</span>)}</div>}
        <section aria-labelledby="showcase-about-title" className="sb-about">
          <h2 id="showcase-about-title">프로젝트 소개</h2>
          <p className="sb-intro">{site.description}</p>
          {site.details && <p className="sb-details-text">{site.details}</p>}
          <a href={site.url} className="sb-external" target="_blank" rel="noopener noreferrer"
            onClick={trackVisit} onAuxClick={e => { if (e.button === 1) trackVisit() }}>↗ 실제 사이트 방문</a>
          <p className="sb-hint">새 탭에서 열립니다. 본인 방문과 재방문도 클릭할 때마다 집계됩니다.</p>
        </section>
      </div>
    </article>

    <section id="comments" className="sb-detail-comments" aria-labelledby="showcase-comments-title">
      <div className="sb-comments-header"><h2 id="showcase-comments-title">댓글 <span>{comments.length}개</span></h2></div>
      <div className="sb-comment-list">
        {comments.length === 0 && <p className="sb-empty-comment">아직 댓글이 없습니다. 첫 피드백을 남겨보세요.</p>}
        {comments.map(comment => <div className="sb-comment" key={comment.id}>
          <div className="sb-comment-head"><div><strong>{profile(comment.author_id)?.display_name ?? '사용자'}</strong><time dateTime={comment.created_at}>{formatDate(comment.created_at)}</time></div>
            {(comment.author_id === currentUserId || isAdmin) && <button type="button" disabled={pending} onClick={() => deleteComment(comment.id)}>삭제</button>}</div>
          <p>{comment.body}</p>
        </div>)}
      </div>
      <form onSubmit={submitComment} className="sb-comment-form">
        <label htmlFor="showcase-comment">댓글 작성</label>
        <textarea id="showcase-comment" name="body" maxLength={1000} rows={3} required placeholder="프로젝트에 대한 의견이나 질문을 남겨주세요." />
        <div className="sb-comment-actions"><span>최대 1,000자</span><button type="submit" className="sb-primary" disabled={pending}>{pending ? '등록 중...' : '댓글 등록'}</button></div>
      </form>
      {error && <p role="alert" className="sb-error">{error}</p>}
      <p role="status" aria-live="polite" className="sb-visit-status">{status}</p>
    </section>
  </div>
}
