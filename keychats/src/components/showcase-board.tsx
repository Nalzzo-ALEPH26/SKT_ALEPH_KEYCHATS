'use client'

import { useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { showcaseAction } from '@/app/(workspace)/showcase/actions'
import { recordShowcaseVisitAction } from '@/app/(workspace)/showcase/visit-actions'
import {
  imageExtension, memoColors, projectTypeLabel, projectTypes,
  SHOWCASE_IMAGE_BUCKET, type MemoColor, type ProjectType,
} from '@/lib/community/showcase'
import { createClient } from '@/lib/supabase/client'
import './showcase-board.css'

export type SiteMemo = {
  id: string; author_id: string; title: string; url: string; description: string
  color: MemoColor; tags: string[]; created_at: string
  details?: string | null; project_type?: ProjectType | null
  thumbnail_path?: string | null; thumbnail_url?: string | null
  visit_count?: number | null; comment_count?: number
}
export type SiteComment = { id: string; site_id: string; author_id: string; body: string; created_at: string }
type Profile = { user_id: string; display_name: string; username: string }
const date = (value: string) => new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date(value))
const typeLabels: Record<ProjectType, string> = { web: 'WEB', app: 'APP', other: '기타' }

type BoardProps = {
  sites: SiteMemo[]; comments?: SiteComment[]; profiles?: Profile[]
  currentUserId: string; isAdmin: boolean
  initialSearch?: string; initialSort?: string
}

export function ShowcaseBoard({
  sites, comments = [], profiles = [], currentUserId, isAdmin,
  initialSearch = '', initialSort = 'new',
}: BoardProps) {
  const dialog = useRef<HTMLDialogElement>(null)
  const form = useRef<HTMLFormElement>(null)
  const [editing, setEditing] = useState<SiteMemo | null>(null)
  const [search, setSearch] = useState(initialSearch)
  const [sort, setSort] = useState(initialSort)
  const [error, setError] = useState('')
  const [dialogError, setDialogError] = useState('')
  const [pending, startTransition] = useTransition()
  const [visitCounts, setVisitCounts] = useState<Record<string, number>>({})
  const [visitStatus, setVisitStatus] = useState('')
  const router = useRouter()

  const profile = (id: string) => profiles.find(p => p.user_id === id)
  const visitCountFor = (site: SiteMemo) => Math.max(visitCounts[site.id] ?? -1, site.visit_count ?? -1)
  const commentsFor = (site: SiteMemo) => site.comment_count ?? comments.filter(c => c.site_id === site.id).length
  const visible = [...sites]
    .filter(site => `${site.title} ${site.description} ${profile(site.author_id)?.display_name ?? ''} ${site.tags.join(' ')}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sort === 'popular' && commentsFor(b) !== commentsFor(a)) return commentsFor(b) - commentsFor(a)
      if (sort === 'visits' && visitCountFor(b) !== visitCountFor(a)) return visitCountFor(b) - visitCountFor(a)
      return Date.parse(b.created_at) - Date.parse(a.created_at)
    })

  function queryString(q: string, order: string) {
    const params = new URLSearchParams()
    if (q.trim()) params.set('q', q)
    if (order !== 'new') params.set('sort', order)
    return params.toString()
  }
  function rememberFilter(q: string, order: string) {
    if (typeof window === 'undefined') return
    const next = queryString(q, order)
    window.history.replaceState(null, '', `${window.location.pathname}${next ? '?' + next : ''}`)
  }
  function detailHref(site: SiteMemo) {
    const query = queryString(search, sort)
    return `/showcase/${site.id}${query ? '?' + query : ''}`
  }
  function openDialog(site: SiteMemo | null) {
    setEditing(site)
    setDialogError('')
    dialog.current?.showModal()
  }
  function trackVisit(site: SiteMemo) {
    // Opening the external site never waits for this RPC. Every click is eligible for counting.
    void recordShowcaseVisitAction(site.id).then(result => {
      if (result.count === null) {
        setVisitStatus('사이트를 열었습니다. 방문 수는 집계하지 못했습니다.')
        return
      }
      setVisitCounts(current => ({ ...current, [site.id]: Math.max(current[site.id] ?? 0, result.count!) }))
      setVisitStatus('')
    }).catch(() => setVisitStatus('사이트를 열었습니다. 방문 수는 집계하지 못했습니다.'))
  }
  function mutate(data: FormData) {
    startTransition(async () => {
      setError('')
      const result = await showcaseAction(data).catch(() => ({ error: '요청을 처리하지 못했습니다.' }))
      if (result.error) { setError(result.error); return }
      router.refresh()
    })
  }

  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    const data = new FormData(event.currentTarget)
    const image = data.get('thumbnail')
    const file = image instanceof File && image.size > 0 ? image : null
    const removeThumbnail = data.get('remove_thumbnail') === 'on'
    if (file) {
      try { imageExtension(file) } catch (e) { setDialogError(e instanceof Error ? e.message : '이미지를 확인해주세요.'); return }
    }
    data.delete('thumbnail') // File uploads go directly to Supabase Storage, not through a Server Action.
    data.delete('remove_thumbnail')
    startTransition(async () => {
      setDialogError('')
      try {
        const result = await showcaseAction(data)
        if (result.error || !result.id) { setDialogError(result.error ?? '프로젝트 저장에 실패했습니다.'); return }
        const siteId = result.id
        const oldPath = editing?.thumbnail_path
        let imageError = ''
        if (file) {
          const client = createClient()
          const path = `${currentUserId}/${siteId}/${crypto.randomUUID()}.${imageExtension(file)}`
          const { error: uploadError } = await client.storage.from(SHOWCASE_IMAGE_BUCKET)
            .upload(path, file, { contentType: file.type, upsert: false })
          if (uploadError) imageError = '이미지 업로드에 실패했습니다. Supabase 저장소 설정을 확인해주세요.'
          else {
            const update = new FormData()
            update.set('operation', 'set-thumbnail'); update.set('id', siteId); update.set('thumbnail_path', path)
            const saved = await showcaseAction(update)
            if (saved.error) {
              await client.storage.from(SHOWCASE_IMAGE_BUCKET).remove([path])
              imageError = saved.error
            } else if (oldPath && oldPath !== path) {
              await client.storage.from(SHOWCASE_IMAGE_BUCKET).remove([oldPath])
            }
          }
        } else if (removeThumbnail && oldPath) {
          const update = new FormData()
          update.set('operation', 'remove-thumbnail'); update.set('id', siteId)
          const saved = await showcaseAction(update)
          if (saved.error) imageError = saved.error
          else await createClient().storage.from(SHOWCASE_IMAGE_BUCKET).remove([oldPath])
        }
        dialog.current?.close()
        form.current?.reset()
        setEditing(null)
        if (imageError) setError(`프로젝트 정보는 저장되었지만 대표 이미지는 반영되지 않았습니다. ${imageError}`)
        router.refresh()
      } catch {
        setDialogError('프로젝트를 저장하지 못했습니다. 연결 상태를 확인해주세요.')
      }
    })
  }

  return <div className="showcase-board mx-auto w-full max-w-6xl px-5 py-8 md:px-8">
    <header className="sb-heading">
      <div>
        <p className="sb-eyebrow">COMMUNITY / SHOWCASE</p>
        <h1>✨ 만들었어요 <span aria-hidden>🔨</span></h1>
        <p className="sb-subtitle">직접 만든 프로젝트를 공유하고, 서로의 결과물을 구경해 보세요.</p>
      </div>
      <button type="button" className="sb-primary" onClick={() => openDialog(null)}>＋ 프로젝트 등록</button>
    </header>

    <div className="sb-toolbar">
      <p className="sb-total"><strong>{visible.length}</strong>개의 프로젝트</p>
      <div className="sb-filters">
        <input className="sb-input sb-search" aria-label="사이트 또는 작성자 검색" placeholder="프로젝트 검색..." value={search}
          onChange={e => { setSearch(e.target.value); rememberFilter(e.target.value, sort) }} />
        <select className="sb-input" aria-label="정렬" value={sort}
          onChange={e => { setSort(e.target.value); rememberFilter(search, e.target.value) }}>
          <option value="new">최신순</option><option value="popular">댓글많은순</option><option value="visits">조회수많은순</option>
        </select>
      </div>
    </div>
    {error ? <p role="alert" className="sb-error">{error}</p> : null}
    <div className="sb-gallery">
      {visible.map(site => {
        const owner = profile(site.author_id)
        const own = site.author_id === currentUserId
        const count = visitCountFor(site)
        const detail = detailHref(site)
        return <article data-showcase-site={site.id} key={site.id} className="sb-card" data-color={site.color}>
          <a className="sb-cover" href={site.url} target="_blank" rel="noopener noreferrer" aria-label={`${site.title} 실제 사이트 방문 (새 탭)`}
            onClick={() => trackVisit(site)} onAuxClick={e => { if (e.button === 1) trackVisit(site) }}>
            {site.thumbnail_url ? <img src={site.thumbnail_url} alt={`${site.title} 프로젝트 대표 이미지`} loading="lazy" decoding="async" />
              : <span className="sb-placeholder"><span className="sb-placeholder-mark" aria-hidden>✦</span><span>{site.title}</span><small>PROJECT SHOWCASE</small></span>}
            <span className="sb-type">{projectTypeLabel(site.project_type)}</span>
            <span className="sb-cover-hover">↗ 실제 프로젝트 사이트 방문</span>
          </a>
          <div className="sb-card-body">
            <Link className="sb-info-link" href={detail}>
              <h2>{site.title}</h2>
              <p>{site.description}</p>
              <span className="sb-view-stat" data-showcase-visit-count aria-label={count < 0 ? '방문 수 집계 준비 중' : `방문 ${count}회`}>
                {count < 0 ? '방문 —' : `방문 ${count.toLocaleString('ko-KR')}회`}
              </span>
              <span className="sb-view-more">설명 보기 →</span>
            </Link>
            <div className="sb-card-footer">
              <span className="sb-author" title={owner?.username ?? ''}>{owner?.display_name ?? '사용자'} <span>· {date(site.created_at)}</span></span>
              <Link className="sb-comment-link" href={`${detail}#comments`} aria-label={`${site.title} 댓글 ${commentsFor(site)}개 보기`}>♧ 댓글 {commentsFor(site)}개 →</Link>
            </div>
            {(own || isAdmin) && <div className="sb-manage">
              {own && <button type="button" disabled={pending} onClick={() => openDialog(site)}>수정</button>}
              <button type="button" disabled={pending} onClick={() => {
                if (!window.confirm('이 프로젝트와 모든 댓글을 삭제할까요?')) return
                const data = new FormData(); data.set('operation', 'delete'); data.set('id', site.id); mutate(data)
              }}>삭제</button>
            </div>}
          </div>
        </article>
      })}
    </div>
    {visible.length === 0 && <div className="sb-empty">{search ? '검색 결과가 없습니다.' : '아직 등록된 프로젝트가 없습니다. 첫 프로젝트를 공유해 보세요!'}</div>}
    <p className="sb-visit-status" role="status" aria-live="polite">{visitStatus}</p>

    <dialog ref={dialog} className="sb-dialog" aria-labelledby="showcase-dialog-title" onClick={e => {
      if (e.target !== dialog.current) return
      const rect = dialog.current.getBoundingClientRect()
      if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) dialog.current.close()
    }}>
      <div className="sb-dialog-head"><h2 id="showcase-dialog-title">{editing ? '프로젝트 수정하기' : '새 사이트 등록하기'}</h2>
        <button type="button" className="sb-close" aria-label="닫기" onClick={() => dialog.current?.close()}>×</button></div>
      <form ref={form} key={editing?.id ?? 'new'} onSubmit={save}>
        <input type="hidden" name="operation" value={editing ? 'update' : 'create'} />
        <input type="hidden" name="id" value={editing?.id ?? ''} />
        <label className="sb-label">프로젝트 이름 *<input className="sb-input" name="title" required maxLength={60} defaultValue={editing?.title} placeholder="예: KEYCHATS" /></label>
        <label className="sb-label">URL 링크 *<input className="sb-input" name="url" type="url" required maxLength={2048} defaultValue={editing?.url} placeholder="https://example.com" /></label>
        <label className="sb-label">간단한 소개 * <span>갤러리 카드에 표시됩니다.</span>
          <textarea className="sb-input" name="description" required maxLength={1000} rows={2} defaultValue={editing?.description} placeholder="프로젝트를 짧게 소개해주세요." /></label>
        <label className="sb-label">상세 소개 <span>설명 페이지에 표시됩니다. (선택)</span>
          <textarea className="sb-input" name="details" maxLength={5000} rows={5} defaultValue={editing?.details ?? ''} placeholder="주요 기능, 제작 동기, 사용 기술 등을 자유롭게 소개해주세요." /></label>
        <div className="sb-form-row">
          <label className="sb-label">프로젝트 유형<select className="sb-input" name="project_type" defaultValue={editing?.project_type ?? 'web'}>
            {projectTypes.map(type => <option key={type} value={type}>{typeLabels[type]}</option>)}</select></label>
          <label className="sb-label">태그 (쉼표로 구분)<input className="sb-input" name="tags" maxLength={200} defaultValue={editing?.tags.join(', ')} placeholder="React, Supabase" /></label>
        </div>
        <label className="sb-label">대표 이미지 <span>JPG · PNG · WebP, 최대 4MB (선택)</span>
          <input className="sb-input" name="thumbnail" type="file" accept="image/jpeg,image/png,image/webp" /></label>
        {editing?.thumbnail_path && <label className="sb-check"><input type="checkbox" name="remove_thumbnail" /> 현재 대표 이미지 제거 (새 이미지를 선택하면 교체)</label>}
        <fieldset className="sb-colors"><legend>카드 강조색</legend><div>
          {memoColors.map((color, i) => <label key={color} data-color={color} className="sb-color"><input type="radio" name="color" value={color} defaultChecked={(editing?.color ?? 'yellow') === color} />{['노랑', '파랑', '초록', '분홍'][i]}</label>)}
        </div></fieldset>
        {dialogError ? <p role="alert" className="sb-error">{dialogError}</p> : null}
        <div className="sb-dialog-actions"><button type="button" className="sb-cancel" onClick={() => dialog.current?.close()}>취소</button>
          <button type="submit" className="sb-primary" disabled={pending}>{pending ? '저장 중...' : editing ? '저장' : '등록'}</button></div>
      </form>
    </dialog>
  </div>
}
