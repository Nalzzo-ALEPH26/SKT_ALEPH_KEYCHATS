'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import {
  lookupModeratorCandidateAction,
  setModeratorRoleAction,
} from '@/app/(workspace)/admin/moderator-actions'

type Candidate = { loginId: string; displayName: string; isModerator: boolean }
type CurrentModerator = { loginId: string; displayName: string } | null

function explainError(error: unknown) {
  const code = error instanceof Error ? error.message : ''
  switch (code) {
    case 'LOGIN_ID_INVALID': return '올바른 아이디를 입력해 주세요.'
    case 'ROLE_CHANGE_USER_NOT_FOUND': return '일치하는 계정을 찾지 못했습니다.'
    case 'ROLE_CHANGE_INACTIVE': return '활성화된 계정만 지정할 수 있습니다.'
    case 'ROLE_CHANGE_ADMIN_FORBIDDEN': return '최고 관리자에게는 이 권한을 변경할 수 없습니다.'
    case 'MODERATOR_ALREADY_ASSIGNED': return '이미 운영 관리자가 지정되어 있습니다. 먼저 기존 권한을 해제해 주세요.'
    default: return '요청을 처리하지 못했습니다. 다시 확인해 주세요.'
  }
}

export function ModeratorDelegationForm({ currentModerator }: { currentModerator: CurrentModerator }) {
  const router = useRouter()
  const [loginId, setLoginId] = useState('')
  const [candidate, setCandidate] = useState<Candidate | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function lookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setSuccess(null)
    setCandidate(null)
    try {
      const result = await lookupModeratorCandidateAction(loginId)
      setCandidate(result)
    } catch (caught) {
      setError(explainError(caught))
    } finally {
      setBusy(false)
    }
  }

  async function update(targetLoginId: string, role: 'member' | 'moderator') {
    if (!window.confirm(role === 'moderator'
      ? `@${targetLoginId} 계정에 운영 관리자 권한을 부여할까요?`
      : `@${targetLoginId} 계정의 운영 관리자 권한을 해제할까요?`)) return
    setBusy(true)
    setError(null)
    setSuccess(null)
    try {
      await setModeratorRoleAction(targetLoginId, role)
      setCandidate(null)
      setLoginId('')
      setSuccess(role === 'moderator' ? '운영 관리자 권한을 부여했습니다.' : '운영 관리자 권한을 해제했습니다.')
      router.refresh()
    } catch (caught) {
      setError(explainError(caught))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="mb-6 rounded-2xl border border-black/10 p-5 dark:border-white/10" data-moderator-delegation>
      <h2 className="font-semibold">운영 권한 위임</h2>
      <p className="mt-1 text-sm text-zinc-500">
        가입된 아이디로 계정을 확인한 후 채널·커뮤니티 운영 권한을 부여합니다. 운영 관리자는 한 명만 지정할 수 있으며 계정 관리는 할 수 없습니다.
      </p>
      {currentModerator ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-black/10 p-3 dark:border-white/10" data-current-moderator>
          <div>
            <p className="text-xs text-zinc-500">현재 운영 관리자</p>
            <p className="mt-1 text-sm font-semibold">{currentModerator.displayName} <span className="font-normal text-zinc-500">@{currentModerator.loginId}</span></p>
          </div>
          <button type="button" disabled={busy} onClick={() => void update(currentModerator.loginId, 'member')}
            className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 disabled:opacity-40 dark:border-red-900">
            권한 해제
          </button>
        </div>
      ) : (
        <form onSubmit={lookup} className="mt-4 flex flex-wrap items-end gap-2">
          <label className="min-w-[12rem] flex-1">
            <span className="mb-2 block text-xs font-semibold">계정 아이디</span>
            <input name="moderatorLoginId" value={loginId} onChange={(event) => {
              setLoginId(event.target.value)
              setCandidate(null)
              setError(null)
            }} placeholder="로그인 아이디 입력" autoComplete="off" minLength={3} maxLength={24}
              pattern="[A-Za-z0-9_]+" required
              className="w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/50 dark:border-white/20" />
          </label>
          <button type="submit" disabled={busy}
            className="rounded-lg bg-zinc-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 dark:bg-white dark:text-zinc-950">
            계정 확인
          </button>
        </form>
      )}
      {candidate && !currentModerator ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-zinc-100 p-3 dark:bg-zinc-900" data-moderator-candidate>
          <span className="text-sm">{candidate.displayName} <span className="text-zinc-500">@{candidate.loginId}</span></span>
          <button type="button" disabled={busy} onClick={() => void update(candidate.loginId, 'moderator')}
            className="rounded-lg border border-current/20 px-3 py-2 text-xs font-semibold disabled:opacity-40">
            운영 관리자로 지정
          </button>
        </div>
      ) : null}
      {error ? <p role="alert" className="mt-3 text-sm text-red-600">{error}</p> : null}
      {success ? <p role="status" className="mt-3 text-sm text-emerald-600">{success}</p> : null}
    </section>
  )
}
