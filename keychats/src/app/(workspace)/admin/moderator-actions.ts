'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth/guards'
import { createAuthGuardAccess } from '@/lib/auth/server-access'
import { normalizeAccountRole } from '@/lib/auth/roles'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function setModeratorRoleAction(formData: FormData) {
  const userClient = await createClient()
  const { claims } = await requireAdmin(createAuthGuardAccess(userClient))
  const admin = createAdminClient()
  const { data: actor, error: actorError } = await admin.auth.admin.getUserById(claims.sub)
  if (actorError || actor.user?.app_metadata?.role !== 'admin') throw new Error('ADMIN_REQUIRED')

  const userId = String(formData.get('userId') ?? '')
  const requestedRole = String(formData.get('role') ?? '')
  if (!/^[0-9a-f-]{36}$/i.test(userId) || (requestedRole !== 'member' && requestedRole !== 'moderator')) {
    throw new Error('ROLE_CHANGE_INVALID')
  }
  if (userId === claims.sub) throw new Error('ROLE_CHANGE_SELF_FORBIDDEN')

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('username,status,deleted_at')
    .eq('user_id', userId)
    .maybeSingle()
  if (profileError || !profile || profile.username === 'cxu1344' || profile.deleted_at) {
    throw new Error('ROLE_CHANGE_TARGET_FORBIDDEN')
  }
  if (requestedRole === 'moderator' && profile.status !== 'active') throw new Error('ROLE_CHANGE_INACTIVE')

  const { data: userData, error: userError } = await admin.auth.admin.getUserById(userId)
  if (userError || !userData.user) throw new Error('ROLE_CHANGE_USER_NOT_FOUND')
  const currentRole = normalizeAccountRole(userData.user.app_metadata?.role)
  if (currentRole === 'admin') throw new Error('ROLE_CHANGE_ADMIN_FORBIDDEN')
  if (currentRole !== requestedRole) {
    if (requestedRole === 'moderator') {
      const { data: accounts, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
      if (listError) throw listError
      if (accounts.users.some((user) => user.id !== userId && user.app_metadata?.role === 'moderator')) {
        throw new Error('MODERATOR_ALREADY_ASSIGNED')
      }
    }
    const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
      app_metadata: { ...userData.user.app_metadata, role: requestedRole },
    })
    if (updateError) throw updateError
  }

  revalidatePath('/', 'layout')
  revalidatePath('/admin')
  redirect('/admin')
}
