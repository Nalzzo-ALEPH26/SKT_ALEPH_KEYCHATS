'use client'

import { useState } from 'react'
import { approveSignupRequestAction, listSignupRequestsAction, rejectSignupRequestAction } from '@/app/(workspace)/admin/admin-actions'
import type { PendingSignupRequest } from '@/lib/admin/signup-requests'
import { ADMIN_PENDING_CHANGED_EVENT } from '@/lib/notifications/preferences'

export function SignupRequestsPanel({ initialSignupRequests }: { initialSignupRequests: PendingSignupRequest[] }) {
  const [signupRequests, setSignupRequests] = useState(initialSignupRequests)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function refreshSignupRequests() {
    setSignupRequests(await listSignupRequestsAction())
  }

  async function reviewSignup(request: PendingSignupRequest, mode: 'approve' | 'reject') {
    const label = mode === 'approve' ? '승인' : '거절'
    if (!window.confirm(`@${request.username} 가입 요청을 ${label}할까요?`)) return
    setBusy(`signup:${request.id}`)
    setError(null)
    try {
      if (mode === 'approve') {
        await approveSignupRequestAction(request.id)
        await refreshSignupRequests()
        window.dispatchEvent(new Event(ADMIN_PENDING_CHANGED_EVENT))
      } else {
        await rejectSignupRequestAction(request.id)
        await refreshSignupRequests()
        window.dispatchEvent(new Event(ADMIN_PENDING_CHANGED_EVENT))
      }
    } catch {
      setError(`가입 요청을 ${label}하지 못했습니다.`)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-8">
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-950 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <section className="rounded-2xl border border-black/10 p-5 dark:border-white/10">
        <h2 className="font-semibold">가입 요청</h2>
        <p className="mt-1 text-sm text-zinc-500">승인하면 바로 Keychats를 사용할 수 있습니다.</p>
        <div className="mt-4 divide-y divide-black/5 dark:divide-white/5">
          {signupRequests.map((request) => (
            <div key={request.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div>
                <div className="text-sm font-semibold">
                  {request.displayName} <span className="font-normal text-zinc-500">@{request.username}</span>
                </div>
                <div className="mt-1 text-xs text-zinc-500">요청: {new Date(request.requestedAt).toLocaleString('ko-KR')}</div>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => reviewSignup(request, 'approve')} disabled={busy !== null} className="rounded-lg bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40 dark:bg-white dark:text-zinc-950">승인</button>
                <button type="button" onClick={() => reviewSignup(request, 'reject')} disabled={busy !== null} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 disabled:opacity-40 dark:border-red-900">거절</button>
              </div>
            </div>
          ))}
          {signupRequests.length === 0 ? <p className="py-4 text-sm text-zinc-500">대기 중인 가입 요청이 없습니다.</p> : null}
        </div>
      </section>


    </div>
  )
}
