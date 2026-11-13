import Link from 'next/link'
import { notFound } from 'next/navigation'
import { UserManagementPanel } from '@/components/user-management-panel'
import { AuthGuardError, requireAdmin } from '@/lib/auth/guards'
import { createAuthGuardAccess } from '@/lib/auth/server-access'
import { listManagedUsers } from '@/lib/admin/service'
import { createSupabaseAdminRepository } from '@/lib/admin/supabase'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export default async function AdminUsersPage() {
  const userClient = await createClient()
  try {
    await requireAdmin(createAuthGuardAccess(userClient))
  } catch (error) {
    if (error instanceof AuthGuardError) notFound()
    throw error
  }
  const users = await listManagedUsers(createSupabaseAdminRepository(createAdminClient()))
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <Link href="/admin" className="text-sm font-semibold text-zinc-500 hover:underline">← 관리자 페이지</Link>
      <h1 className="mb-6 mt-4 text-2xl font-semibold">사용자 관리</h1>
      <UserManagementPanel initialUsers={users} />
    </main>
  )
}
