import { notFound } from 'next/navigation'

import { AdminPanel } from '@/components/admin-panel'
import { setModeratorRoleAction } from './moderator-actions'
import { PasswordResetAdminPanel } from '@/components/password-reset-admin-panel'
import { AuthGuardError, requireAdmin } from '@/lib/auth/guards'
import { createAuthGuardAccess } from '@/lib/auth/server-access'
import { listManagedUsers } from '@/lib/admin/service'
import { createSupabaseAdminRepository } from '@/lib/admin/supabase'
import { listPendingSignupRequests } from '@/lib/admin/signup-requests'
import { createSupabaseSignupReviewRepository } from '@/lib/admin/signup-requests-supabase'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export default async function AdminPage() {
  const userClient = await createClient()
  try {
    await requireAdmin(createAuthGuardAccess(userClient))
  } catch (error) {
    if (error instanceof AuthGuardError) notFound()
    throw error
  }

  const admin = createAdminClient()
  const [users, signupRequests, { data: inviteRows, error: inviteError }] = await Promise.all([
    listManagedUsers(createSupabaseAdminRepository(admin)),
    listPendingSignupRequests(createSupabaseSignupReviewRepository(admin)),
    admin
      .from('invites')
      .select('id,expires_at,used_at,revoked_at,created_at')
      .order('created_at', { ascending: false })
      .limit(30),
  ])

  if (inviteError) throw inviteError
  const { data: accounts, error: accountError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (accountError) throw accountError
  const accountRole = new Map(accounts.users.map((user) => [user.id, user.app_metadata?.role]))
  const eligible = users.filter((user) => user.status === 'active' && accountRole.get(user.userId) !== 'admin')
  const hasModerator = eligible.some((user) => accountRole.get(user.userId) === 'moderator')

  const invites = (inviteRows ?? []).map((invite) => ({
    id: invite.id as string,
    expiresAt: invite.expires_at as string,
    usedAt: (invite.used_at as string | null) ?? null,
    revokedAt: (invite.revoked_at as string | null) ?? null,
    createdAt: invite.created_at as string,
  }))

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Keychats Admin</p>
        <h1 className="mt-2 text-2xl font-semibold">관리자</h1>
      </div>
      <section className="mb-6 rounded-2xl border border-black/10 p-5 dark:border-white/10">
        <h2 className="font-semibold">운영 권한 위임</h2>
        <p className="mt-1 text-sm text-zinc-500">운영 관리자는 채널과 커뮤니티만 관리하며 가입·비밀번호·계정 관리에는 접근할 수 없습니다. 한 명만 지정할 수 있습니다.</p>
        <div className="mt-4 divide-y divide-black/10 dark:divide-white/10">
          {eligible.map((user) => {
            const assigned = accountRole.get(user.userId) === 'moderator'
            return (
              <form key={user.userId} action={setModeratorRoleAction} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <span className="text-sm">{user.displayName} <span className="text-zinc-500">@{user.username}</span>{assigned ? ' · 운영 관리자' : ''}</span>
                <input type="hidden" name="userId" value={user.userId} />
                <input type="hidden" name="role" value={assigned ? 'member' : 'moderator'} />
                <button type="submit" disabled={hasModerator && !assigned} className="rounded-lg border border-current/20 px-3 py-1.5 text-xs font-semibold disabled:opacity-40">
                  {assigned ? '관리자 권한 해제' : '운영 관리자로 지정'}
                </button>
              </form>
            )
          })}
        </div>
      </section>
      <PasswordResetAdminPanel />
      <AdminPanel initialUsers={users} initialInvites={invites} initialSignupRequests={signupRequests} />
    </main>
  )
}
