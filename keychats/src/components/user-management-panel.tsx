'use client'

import { useState } from 'react'
import {
  deleteUserAction, disableUserAction, expelUserAction, listUsersAction, resetUserPasswordAction,
} from '@/app/(workspace)/admin/admin-actions'
import type { ManagedUser } from '@/lib/admin/service'

export function UserManagementPanel({ initialUsers }: { initialUsers: ManagedUser[] }) {
  const [users, setUsers] = useState(initialUsers)
  const [temporaryPassword, setTemporaryPassword] = useState<{ username: string; password: string } | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function refreshUsers() {
    setUsers(await listUsersAction())
  }

  async function resetPassword(user: ManagedUser) {
    setBusy(`password:${user.userId}`)
    setError(null)
    setTemporaryPassword(null)
    try {
      const result = await resetUserPasswordAction(user.userId)
      setTemporaryPassword({ username: user.username, password: result.temporaryPassword })
    } catch (caught) {
      setError(
        caught instanceof Error && caught.message === 'SOLE_ADMIN_PROTECTED'
          ? 'cxu1344 관리자 본인에게는 임시 비밀번호를 발급할 수 없습니다.'
          : '임시 비밀번호를 발급하지 못했습니다.',
      )
    } finally {
      setBusy(null)
    }
  }

  async function changeStatus(user: ManagedUser, mode: 'disable' | 'expel') {
    const label = mode === 'disable' ? '비활성화' : '퇴출'
    if (!window.confirm(`@${user.username} 계정을 ${label}할까요?`)) return
    setBusy(`${mode}:${user.userId}`)
    setError(null)
    try {
      if (mode === 'disable') await disableUserAction(user.userId)
      else await expelUserAction(user.userId)
      await refreshUsers()
    } catch (caught) {
      setError(
        caught instanceof Error && caught.message === 'SOLE_ADMIN_PROTECTED'
          ? '유일한 관리자 계정은 변경할 수 없습니다.'
          : `계정을 ${label}하지 못했습니다.`,
      )
    } finally {
      setBusy(null)
    }
  }

  async function deleteAccount(user: ManagedUser) {
    if (!window.confirm(`@${user.username} 로그인 계정을 삭제할까요? 이 작업은 되돌릴 수 없습니다.`)) return
    setBusy(`delete:${user.userId}`)
    setError(null)
    try {
      await deleteUserAction(user.userId)
      await refreshUsers()
    } catch (caught) {
      setError(
        caught instanceof Error && caught.message === 'SOLE_ADMIN_PROTECTED'
          ? 'cxu1344 관리자 계정은 삭제할 수 없습니다.'
          : '계정을 삭제하지 못했습니다.',
      )
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
        <h2 className="font-semibold">사용자 관리</h2>
        <p className="mt-1 text-sm text-zinc-500">계정 삭제 시 로그인은 제거되며 과거 메시지는 유지됩니다.</p>
        {temporaryPassword ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30">
            <div className="text-xs font-semibold">@{temporaryPassword.username} 임시 비밀번호 · 지금 한 번만 전달하세요</div>
            <code className="mt-2 block break-all text-sm">{temporaryPassword.password}</code>
            <button type="button" className="mt-2 text-xs font-semibold underline" onClick={() => void navigator.clipboard.writeText(temporaryPassword.password)}>비밀번호 복사</button>
          </div>
        ) : null}
        <div className="mt-4 divide-y divide-black/5 dark:divide-white/5">
          {users.map((user) => {
            const soleAdmin = user.username === 'cxu1344'
            return (
              <div key={user.userId} className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div>
                  <div className="text-sm font-semibold">{user.displayName} <span className="font-normal text-zinc-500">@{user.username}</span></div>
                  <div className="mt-1 text-xs text-zinc-500">상태: {user.status}{soleAdmin ? ' · 관리자' : ''}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => resetPassword(user)} disabled={busy !== null || soleAdmin || user.status !== 'active'} title={soleAdmin ? '관리자 본인은 설정에서 비밀번호를 변경하세요.' : undefined} className="rounded-lg border border-black/10 px-3 py-1.5 text-xs font-semibold disabled:opacity-40 dark:border-white/10">임시 비밀번호</button>
                  <button type="button" onClick={() => changeStatus(user, 'disable')} disabled={busy !== null || soleAdmin || user.status !== 'active'} className="rounded-lg border border-black/10 px-3 py-1.5 text-xs font-semibold disabled:opacity-40 dark:border-white/10">비활성화</button>
                  <button type="button" onClick={() => changeStatus(user, 'expel')} disabled={busy !== null || soleAdmin || user.status === 'expelled'} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 disabled:opacity-40 dark:border-red-900">퇴출</button>
                  <button type="button" onClick={() => deleteAccount(user)} disabled={busy !== null || soleAdmin} data-delete-user={user.userId} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40">계정 삭제</button>
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
