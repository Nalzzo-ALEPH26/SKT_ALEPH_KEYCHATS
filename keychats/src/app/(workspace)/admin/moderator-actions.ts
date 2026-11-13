'use server'

import { revalidatePath } from 'next/cache'

import { requireAdmin } from '@/lib/auth/guards'
import { createAuthGuardAccess } from '@/lib/auth/server-access'
import { normalizeLoginId } from '@/lib/auth/login-id'
import { normalizeAccountRole } from '@/lib/auth/roles'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

async function moderatorAdmin() {
  const userClient = await createClient()
  const { claims } = await requireAdmin(createAuthGuardAccess(userClient))
  const admin = createAdminClient()
  const { data: actor, error: actorError } = await admin.auth.admin.getUserById(claims.sub)
  if (actorError || actor.user?.app_metadata?.role !== 'admin') throw new Error('ADMIN_REQUIRED')
  return { admin, actorId: claims.sub }
}

async function findTarget(admin: ReturnType<typeof createAdminClient>, rawLoginId: string) {
  const loginId = normalizeLoginId(rawLoginId)
  const { data: profile, error: profileError } = await admin.from('profiles')
    .select('user_id,username,display_name,status,deleted_at')
    .eq('username', loginId).is('deleted_at', null).maybeSingle()
  if (profileError) throw profileError
  if (!profile) throw new Error('ROLE_CHANGE_USER_NOT_FOUND')
  if (profile.status !== 'active') throw new Error('ROLE_CHANGE_INACTIVE')

  const userId = profile.user_id as string
  const { data: userData, error: userError } = await admin.auth.admin.getUserById(userId)
  if (userError || !userData.user) throw new Error('ROLE_CHANGE_USER_NOT_FOUND')
  return { loginId, userId, displayName: profile.display_name as string, account: userData.user }
}

export async function lookupModeratorCandidateAction(rawLoginId: string) {
  const { admin, actorId } = await moderatorAdmin()
  const target = await findTarget(admin, rawLoginId)
  if (target.userId === actorId || normalizeAccountRole(target.account.app_metadata?.role) === 'admin') {
    throw new Error('ROLE_CHANGE_ADMIN_FORBIDDEN')
  }
  return {
    loginId: target.loginId,
    displayName: target.displayName,
    isModerator: normalizeAccountRole(target.account.app_metadata?.role) === 'moderator',
  }
}

export async function setModeratorRoleAction(
  rawLoginId: string,
  requestedRole: 'member' | 'moderator',
) {
  if (requestedRole !== 'member' && requestedRole !== 'moderator') throw new Error('ROLE_CHANGE_INVALID')
  const { admin, actorId } = await moderatorAdmin()
  const target = await findTarget(admin, rawLoginId)
  if (target.userId === actorId || normalizeAccountRole(target.account.app_metadata?.role) === 'admin') {
    throw new Error('ROLE_CHANGE_ADMIN_FORBIDDEN')
  }
  const currentRole = normalizeAccountRole(target.account.app_metadata?.role)
  if (requestedRole === 'member' && currentRole !== 'moderator') throw new Error('ROLE_CHANGE_TARGET_FORBIDDEN')
  if (requestedRole === 'moderator') {
    const { data: accounts, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
    if (error) throw error
    if (accounts.users.some((user) =>
      user.id !== target.userId && user.app_metadata?.role === 'moderator'
    )) throw new Error('MODERATOR_ALREADY_ASSIGNED')
  }
  if (currentRole !== requestedRole) {
    const { error } = await admin.auth.admin.updateUserById(target.userId, {
      app_metadata: { ...target.account.app_metadata, role: requestedRole },
    })
    if (error) throw error
  }
  revalidatePath('/', 'layout')
  revalidatePath('/admin')
  return { loginId: target.loginId, role: requestedRole }
}
