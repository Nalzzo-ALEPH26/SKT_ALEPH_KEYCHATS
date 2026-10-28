'use client'

import { useCallback, useEffect, useState } from 'react'

import {
  issuePasswordResetAction,
  listPasswordResetRequestsAction,
} from '@/app/(workspace)/admin/admin-actions'
import { ADMIN_PENDING_CHANGED_EVENT } from '@/lib/notifications/preferences'
import type { PendingPasswordResetRequest } from '@/lib/password-reset/types'

export function PasswordResetAdminPanel() {
  const [requests, setRequests] = useState<PendingPasswordResetRequest[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setRequests(await listPasswordResetRequestsAction())
  }, [])

  useEffect(() => {
    void refresh().catch(() => setError('비밀번호 재설정 요청을 불러오지 못했습니다.'))
  }, [refresh])

  const issue = async (request: PendingPasswordResetRequest) => {
    if (!window.confirm(`@${request.username}에게 임시 비밀번호를 발급할까요?`)) return
    setBusy(request.id)
    setError(null)
    try {
      await issuePasswordResetAction(request.id)
      await refresh()
      window.dispatchEvent(new Event(ADMIN_PENDING_CHANGED_EVENT))
    } catch {
      setError('임시 비밀번호를 발급하지 못했습니다.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="mb-8 rounded-2xl border border-black/10 p-5 dark:border-white/10">
      <h2 className="font-semibold">비밀번호 재설정 요청</h2>
      <p className="mt-1 text-sm text-zinc-500">사용자가 로그인 화면에서 요청한 경우에만 발급합니다.</p>
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      <div className="mt-4 divide-y divide-black/5 dark:divide-white/5">
        {requests.map((request) => (
          <div key={request.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div>
              <div className="text-sm font-semibold">{request.displayName} <span className="font-normal text-zinc-500">@{request.username}</span></div>
              <div className="mt-1 text-xs text-zinc-500">요청: {new Date(request.requestedAt).toLocaleString('ko-KR')}</div>
            </div>
            <button type="button" onClick={() => issue(request)} disabled={busy !== null} className="rounded-lg bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40 dark:bg-white dark:text-zinc-950">
              임시 비밀번호 발급
            </button>
          </div>
        ))}
        {requests.length === 0 ? <p className="py-4 text-sm text-zinc-500">대기 중인 요청이 없습니다.</p> : null}
      </div>
    </section>
  )
}
