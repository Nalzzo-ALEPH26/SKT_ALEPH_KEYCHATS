'use client'
import { createContext, useContext, useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from 'react'
import { setRoomThemeAction } from '@/app/(workspace)/room-theme-actions'
import { createClient } from '@/lib/supabase/client'
import { defaultRoomTheme, newerRoomTheme, normalizeRoomTheme, roomThemeKey, roomThemes, type RoomThemeSnapshot, type ThemeTarget } from '@/lib/themes/room-theme'
import './room-theme.css'
type Props = { target: ThemeTarget; initial: RoomThemeSnapshot; unavailable?: boolean; canChange: boolean; children: ReactNode }
const RoomThemeControls = createContext<{ canChange: boolean; open: () => void } | null>(null)
export function RoomThemeButton() {
  const controls = useContext(RoomThemeControls)
  if (!controls?.canChange) return null
  return <button type="button" data-room-theme-trigger onClick={controls.open} className="rt-trigger">대화방 테마</button>
}
export function RoomThemeFrame({ target, initial, unavailable = false, canChange, children }: Props) {
  const [snapshot, setSnapshot] = useState(initial)
  const [selected, setSelected] = useState(initial.theme_id)
  const [error, setError] = useState('')
  const [syncError, setSyncError] = useState(unavailable)
  const [pending, startTransition] = useTransition()
  const dialog = useRef<HTMLDialogElement>(null)
  const client = useMemo(() => createClient(), [])
  const key = roomThemeKey(target)
  useEffect(() => {
    let active = true
    let channel: ReturnType<typeof client.channel> | undefined
    const refresh = async () => {
      const { data, error } = await client.from('conversation_themes').select('theme_id,revision,updated_by,updated_by_name,updated_at').eq('room_key',key).maybeSingle()
      if (!active) return
      setSyncError(Boolean(error))
      if (!error) setSnapshot(current => newerRoomTheme(current,normalizeRoomTheme(data)))
    }
    const sync = () => { void refresh().catch(() => { if (active) setSyncError(true) }) }
    const visible = () => { if (document.visibilityState === 'visible') sync() }
    void (async () => {
      const { data: { session } } = await client.auth.getSession()
      if (!active || !session) return
      await client.realtime.setAuth(session.access_token)
      if (!active) return
      channel = client.channel(`conversation-theme:${key}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'conversation_themes', filter: `room_key=eq.${key}` }, () => sync())
        .subscribe(status => { if (!active) return; if (status === 'SUBSCRIBED') sync(); if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setSyncError(true) })
    })().catch(() => { if (active) setSyncError(true) })
    sync()
    // Reconcile missed events, reconnects, and background tabs using authoritative DB state.
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') sync() }, 15000)
    window.addEventListener('focus',sync)
    document.addEventListener('visibilitychange',visible)
    return () => { active = false; window.clearInterval(timer); window.removeEventListener('focus',sync); document.removeEventListener('visibilitychange',visible); if (channel) void client.removeChannel(channel) }
  }, [client,key])
  const themeName = roomThemes.find(t => t.id === snapshot.theme_id)?.name ?? '기본'
  function open() { setSelected(snapshot.theme_id); setError(''); dialog.current?.showModal() }
  function apply(themeId = selected) {
    startTransition(async () => {
      setError('')
      try {
        const result = await setRoomThemeAction(target,themeId)
        if (result.error || !result.snapshot) { setError(result.error ?? '테마를 저장하지 못했습니다.'); return }
        setSnapshot(current => newerRoomTheme(current,result.snapshot!))
        setSyncError(false)
        dialog.current?.close()
      } catch { setError('연결 상태를 확인하고 다시 시도해주세요.') }
    })
  }
  return <div data-room-theme={snapshot.theme_id} className="room-theme-frame">
    {snapshot.revision > 0 && snapshot.theme_id !== 'default' ? <p className="rt-event" role="status">{snapshot.updated_by_name}님이 테마를 ‘{themeName}’로 변경했어요.{snapshot.updated_at ? <time dateTime={snapshot.updated_at}> {new Date(snapshot.updated_at).toLocaleString('ko-KR',{timeZone:'Asia/Seoul',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})}</time> : null}</p> : null}
    <RoomThemeControls.Provider value={{ canChange, open }}><div className="rt-content">{children}</div></RoomThemeControls.Provider>
    {canChange ? <dialog ref={dialog} aria-labelledby="room-theme-title" className="rt-dialog" onCancel={e => { if (pending) e.preventDefault() }} onClick={e => { if (pending || e.target !== dialog.current) return; const b=dialog.current.getBoundingClientRect(); if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)dialog.current.close() }}>
      <div className="rt-dialog-heading"><h2 id="room-theme-title">대화방 테마</h2><button type="button" aria-label="닫기" disabled={pending} onClick={() => dialog.current?.close()} className="rt-close">×</button></div>
      <div className="rt-options" role="group" aria-label="테마 선택">{roomThemes.map(t => <button key={t.id} type="button" className="rt-option" data-room-theme={t.id} aria-pressed={selected === t.id} disabled={pending} onClick={() => setSelected(t.id)}><span className="rt-swatch"><span className="rt-sample-other"/><span className="rt-sample-own"/></span><span>{t.name}</span></button>)}</div>
      <p className="rt-preview-label">{roomThemes.find(t => t.id === selected)?.name} 미리보기</p>
      <div className="rt-preview" data-room-theme={selected}><p className="rt-preview-other">이 테마 어때?</p><p className="rt-preview-own">우리 대화방에 잘 어울려 😊</p></div>
      <p className="rt-scope">적용하면 <strong>이 대화방의 모든 참여자</strong>에게 동일하게 반영됩니다.</p>
      {error || syncError ? <p className="rt-error" role="alert">{error || '테마 연결을 확인하지 못했습니다. SQL 적용 전에는 테마를 저장할 수 없습니다.'}</p> : null}
      <div className="rt-dialog-footer"><button type="button" className="rt-reset" disabled={pending} onClick={() => apply(defaultRoomTheme.theme_id)}>기본으로 복원</button><button type="button" className="rt-apply" disabled={pending} onClick={() => apply()}>{pending ? '적용 중…' : '모두에게 적용'}</button></div>
    </dialog> : null}
  </div>
}

