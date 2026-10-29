'use client'
import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { showcaseAction } from '@/app/(workspace)/showcase/actions'
import { memoColors, type MemoColor } from '@/lib/community/showcase'
import './showcase-board.css'
export type SiteMemo = { id: string; author_id: string; title: string; url: string; description: string; color: MemoColor; tags: string[]; created_at: string }
export type SiteComment = { id: string; site_id: string; author_id: string; body: string; created_at: string }
type Profile = { user_id: string; display_name: string; username: string }
const date = (value: string) => new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value))
export function ShowcaseBoard({ sites, comments, profiles, currentUserId, isAdmin }: { sites: SiteMemo[]; comments: SiteComment[]; profiles: Profile[]; currentUserId: string; isAdmin: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const form = useRef<HTMLFormElement>(null)
  const [editing, setEditing] = useState<SiteMemo | null>(null)
  const [search, setSearch] = useState(''), [sort, setSort] = useState('new')
  const [error, setError] = useState(''), [dialogError, setDialogError] = useState('')
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  const profile = (id: string) => profiles.find(p => p.user_id === id)
  const siteComments = (id: string) => comments.filter(c => c.site_id === id)
  const visible = sites.filter(s => `${s.title} ${profile(s.author_id)?.display_name ?? ''} ${s.tags.join(' ')}`.toLowerCase().includes(search.toLowerCase())).sort((a,b) => sort === 'popular' ? siteComments(b.id).length - siteComments(a.id).length : Date.parse(b.created_at) - Date.parse(a.created_at))
  function open(site: SiteMemo | null) { setEditing(site); setDialogError(''); dialog.current?.showModal() }
  function mutate(data: FormData, success?: () => void, inDialog = false) {
    startTransition(async () => {
      const setMessage = inDialog ? setDialogError : setError
      setMessage('')
      try { const result = await showcaseAction(data); if (result.error) { setMessage(result.error); return }; success?.(); router.refresh() }
      catch { setMessage('요청을 처리하지 못했습니다. 연결 상태를 확인하고 다시 시도해주세요.') }
    })
  }
  return <div className="showcase-board mx-auto w-full max-w-6xl px-5 py-8 md:px-8">
    <p className="text-xs font-semibold tracking-[0.16em] text-zinc-500">COMMUNITY</p>
    <div className="mt-2 flex items-center justify-between gap-4"><h1 className="text-2xl font-semibold">만들었어요 🔨</h1><button type="button" className="sb-primary" onClick={() => open(null)}>등록</button></div>
    <p className="mt-2 text-sm text-zinc-500">직접 만든 사이트를 메모보드에 공유하고 자유롭게 피드백을 주고받는 공간입니다.</p>
    <div className="mb-6 mt-8 flex flex-wrap items-center justify-between gap-4"><h2 className="text-lg font-semibold">등록된 사이트 메모보드 <span className="sb-count">{visible.length}</span></h2><div className="flex max-w-full gap-2"><input className="sb-input min-w-0" aria-label="사이트 또는 작성자 검색" placeholder="사이트 또는 작성자 검색..." value={search} onChange={e => setSearch(e.target.value)} /><select className="sb-input" aria-label="정렬" value={sort} onChange={e => setSort(e.target.value)}><option value="new">최신순</option><option value="popular">댓글많은순</option></select></div></div>
    {error ? <p role="alert" className="mb-4 text-sm text-red-600">{error}</p> : null}
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">{visible.map(site => {
      const author = profile(site.author_id), own = site.author_id === currentUserId
      return <article key={site.id} className="sb-memo" data-color={site.color}>
        <div><div className="sb-meta"><div className="flex min-w-0 items-center gap-2"><span className="sb-avatar">{(author?.display_name ?? '사용자')[0]}</span><div className="min-w-0"><p className="truncate text-xs font-bold">{author?.display_name ?? '사용자'}</p><p className="sb-handle">@{author?.username ?? 'unknown'}</p></div></div><time dateTime={site.created_at}>{date(site.created_at)}</time></div>
        <h3 className="mb-1 break-words text-base font-bold">{site.title}</h3><a href={site.url} target="_blank" rel="noopener noreferrer" className="sb-url">↗ {site.url}</a><p className="mb-4 whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-700">{site.description}</p></div>
        <div><div className="mb-4 flex flex-wrap gap-1">{site.tags.map(t => <span className="sb-tag" key={t}>#{t}</span>)}</div>
        <div className="sb-controls">{own ? <button type="button" disabled={pending} onClick={() => open(site)}>수정</button> : null}{own || isAdmin ? <button type="button" disabled={pending} onClick={() => { if (!window.confirm('이 메모와 댓글을 삭제할까요?')) return; const data = new FormData(); data.set('operation','delete'); data.set('id',site.id); mutate(data) }}>삭제</button> : null}</div>
        <div className="sb-interactions"><details className="sb-comments"><summary className="sb-footer"><span>댓글 {siteComments(site.id).length}개</span></summary><div className="mt-3 space-y-3">{siteComments(site.id).map(comment => <div key={comment.id} className="sb-comment"><div className="flex justify-between gap-2"><span className="text-xs font-semibold">{profile(comment.author_id)?.display_name ?? '사용자'}</span>{comment.author_id === currentUserId || isAdmin ? <button type="button" className="text-xs text-slate-500" disabled={pending} onClick={() => { const data = new FormData(); data.set('operation','delete-comment'); data.set('id',comment.id); mutate(data) }}>삭제</button> : null}</div><p className="mt-1 whitespace-pre-wrap break-words text-xs">{comment.body}</p><time className="text-[10px] text-slate-500">{date(comment.created_at)}</time></div>)}<form onSubmit={e => { e.preventDefault(); const target = e.currentTarget; mutate(new FormData(target), () => target.reset()) }}><input type="hidden" name="operation" value="comment"/><input type="hidden" name="id" value={site.id}/><textarea name="body" required maxLength={1000} rows={2} className="sb-input w-full" aria-label={`${site.title} 댓글`} placeholder="피드백을 남겨주세요."/><button type="submit" className="sb-primary mt-2" disabled={pending}>댓글 등록</button></form></div></details>
        <div className="sb-visit-position"><a className="sb-visit" href={site.url} target="_blank" rel="noopener noreferrer">방문하기 ↗</a></div></div></div>
      </article>
    })}</div>
    {!visible.length ? <p className="rounded-xl border border-dashed border-black/10 p-10 text-center text-sm text-zinc-500 dark:border-white/10">{search ? '검색 결과가 없습니다.' : '아직 등록된 사이트가 없습니다. 첫 프로젝트를 공유해보세요!'}</p> : null}
    <dialog ref={dialog} className="sb-dialog" aria-labelledby="showcase-dialog-title" onClick={e => { if (e.target === dialog.current) { const rect = dialog.current.getBoundingClientRect(); if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) dialog.current.close() } }}>
      <div className="mb-5 flex items-center justify-between gap-4"><h2 id="showcase-dialog-title" className="text-lg font-bold">{editing ? '사이트 수정하기' : '새 사이트 등록하기'}</h2><button type="button" className="sb-close" aria-label="닫기" onClick={() => dialog.current?.close()}>×</button></div>
      <form key={editing?.id ?? 'new'} ref={form} onSubmit={e => { e.preventDefault(); mutate(new FormData(e.currentTarget), () => { dialog.current?.close(); form.current?.reset() }, true) }}>
        <input type="hidden" name="operation" value={editing ? 'update' : 'create'}/><input type="hidden" name="id" value={editing?.id ?? ''}/>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><label className="sb-label">사이트 이름 *<input className="sb-input" name="title" required maxLength={60} defaultValue={editing?.title} placeholder="예: 개발자 포트폴리오 웹사이트"/></label><label className="sb-label">URL 링크 *<input className="sb-input" name="url" type="url" required maxLength={2048} defaultValue={editing?.url} placeholder="https://example.com"/></label><label className="sb-label sm:col-span-2">소개 및 메모 *<textarea className="sb-input" name="description" required maxLength={1000} rows={4} defaultValue={editing?.description} placeholder="사이트 소개나 피드백을 받고 싶은 부분을 적어주세요."/></label><fieldset className="sm:col-span-2"><legend className="sb-label">메모지 색상 선택</legend><div className="grid grid-cols-4 gap-2">{memoColors.map((color,i) => <label key={color} className="sb-color" data-color={color}><input type="radio" name="color" value={color} defaultChecked={(editing?.color ?? 'yellow') === color}/>{['노랑','파랑','초록','분홍'][i]}</label>)}</div></fieldset><label className="sb-label sm:col-span-2">태그 (쉼표 구분)<input className="sb-input" name="tags" maxLength={200} defaultValue={editing?.tags.join(', ')} placeholder="React, Tailwind, 포트폴리오"/></label></div>
        {dialogError ? <p role="alert" className="mt-4 text-sm text-red-600">{dialogError}</p> : null}<div className="mt-6 flex justify-end gap-2"><button type="button" className="sb-cancel" onClick={() => dialog.current?.close()}>취소</button><button type="submit" className="sb-primary" disabled={pending}>{pending ? '저장 중...' : editing ? '저장' : '등록'}</button></div>
      </form>
    </dialog>
  </div>
}
