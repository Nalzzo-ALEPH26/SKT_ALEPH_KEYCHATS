import Link from 'next/link'
import { notFound } from 'next/navigation'

import { ModeratorDelegationForm } from '@/components/moderator-delegation-form'
import { SignupRequestsPanel } from '@/components/signup-requests-panel'
import { PasswordResetAdminPanel } from '@/components/password-reset-admin-panel'
import { AuthGuardError, requireAdmin } from '@/lib/auth/guards'
import { createAuthGuardAccess } from '@/lib/auth/server-access'
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
  const [signupRequests, { data: accounts, error: usersError }] = await Promise.all([
    listPendingSignupRequests(createSupabaseSignupReviewRepository(admin)),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ])
  if (usersError) throw usersError

  const moderator = accounts.users.find((user) => user.app_metadata?.role === 'moderator')
  let currentModerator: { loginId: string; displayName: string } | null = null
  if (moderator) {
    const { data: profile, error } = await admin.from('profiles')
      .select('username,display_name').eq('user_id', moderator.id).maybeSingle()
    if (error) throw error
    if (profile) currentModerator = { loginId: profile.username as string, displayName: profile.display_name as string }
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Keychats Admin</p>
        <h1 className="mt-2 text-2xl font-semibold">관리자</h1>
      </div>
      <ModeratorDelegationForm currentModerator={currentModerator} />
      <PasswordResetAdminPanel />
      <SignupRequestsPanel initialSignupRequests={signupRequests} />
      <Link href="/admin/users" data-admin-user-management-link
        className="flex items-center justify-between rounded-2xl border border-black/10 px-5 py-4 text-sm font-semibold transition hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5">
        <span>사용자 관리</span><span aria-hidden="true">→</span>
      </Link>
    </main>
  )
}
