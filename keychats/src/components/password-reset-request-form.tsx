'use client'

import Link from 'next/link'
import { useActionState, useEffect, useState } from 'react'

import {
  checkTemporaryPasswordAction,
  requestTemporaryPasswordAction,
  type PasswordResetRequestState,
} from '@/app/forgot-password/actions'
import type { PasswordResetStatus } from '@/lib/password-reset/types'

const initialState: PasswordResetRequestState = { submitted: false, error: null }

export function PasswordResetRequestForm() {
  const [state, formAction, pending] = useActionState(requestTemporaryPasswordAction, initialState)
  const [result, setResult] = useState<PasswordResetStatus>({ status: 'pending' })

  useEffect(() => {
    if (!state.submitted) return
    let active = true
    const poll = async () => {
      try {
        const next = await checkTemporaryPasswordAction()
        if (active) setResult(next)
      } catch {
        // Keep polling; the request remains valid on the server.
      }
    }
    void poll()
    const timer = window.setInterval(() => void poll(), 2500)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [state.submitted])

  return (
    <section className="w-full max-w-sm rounded-3xl border border-black/5 bg-white p-8 shadow-sm">
      <p className="text-xs font-semibold tracking-[0.2em] text-black/40">KEYCHATS</p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-950">비밀번호 찾기</h1>
      <p className="mt-2 text-sm leading-6 text-black/50">아이디로 임시 비밀번호 발급을 요청하면 관리자가 확인 후 발급합니다.</p>

      {!state.submitted ? (
        <form action={formAction} className="mt-8 space-y-5">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-zinc-950">아이디</span>
            <input name="loginId" type="text" autoComplete="username" autoCapitalize="none" spellCheck={false} required maxLength={24} className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-black/35" />
          </label>
          {state.error ? <p role="alert" className="text-sm text-red-600">{state.error}</p> : null}
          <button type="submit" disabled={pending} className="w-full rounded-xl bg-zinc-950 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">
            {pending ? '요청 중…' : '임시 비밀번호 발급 요청'}
          </button>
        </form>
      ) : result.status === 'issued' ? (
        <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-zinc-950">
          <p className="text-sm font-semibold">임시 비밀번호가 발급되었습니다.</p>
          <code className="mt-3 block break-all rounded-xl bg-white px-3 py-3 text-base">{result.temporaryPassword}</code>
          <button type="button" onClick={() => void navigator.clipboard.writeText(result.temporaryPassword)} className="mt-3 text-sm font-semibold underline underline-offset-4">복사</button>
          <p className="mt-3 text-xs text-zinc-500">로그인 후 설정에서 새 비밀번호로 변경하세요.</p>
        </div>
      ) : result.status === 'expired' ? (
        <div className="mt-8 text-sm text-red-600">요청이 만료되었습니다. 로그인 화면으로 돌아가 다시 요청해 주세요.</div>
      ) : (
        <div className="mt-8 rounded-2xl bg-zinc-50 p-4 text-sm leading-6 text-zinc-600">
          관리자 확인을 기다리고 있습니다. 이 페이지를 열어두면 발급되는 즉시 임시 비밀번호가 표시됩니다.
        </div>
      )}

      <div className="mt-6 text-center">
        <Link href="/login" className="text-sm font-semibold text-zinc-950 underline underline-offset-4">로그인으로 돌아가기</Link>
      </div>
    </section>
  )
}
