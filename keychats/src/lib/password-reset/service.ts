import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import { generateTemporaryPassword } from '@/lib/admin/service'
import { normalizeLoginId } from '@/lib/auth/login-id'
import {
  decryptTemporaryPassword,
  encryptTemporaryPassword,
  generatePasswordResetToken,
  hashPasswordResetToken,
} from '@/lib/password-reset/crypto'
import type { PasswordResetStatus, PendingPasswordResetRequest } from '@/lib/password-reset/types'

const RESET_WINDOW_MS = 30 * 60 * 1000

export async function requestPasswordReset(admin: SupabaseClient, rawLoginId: string) {
  const token = generatePasswordResetToken()
  let username: string
  try {
    username = normalizeLoginId(rawLoginId)
  } catch {
    return { token }
  }

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('user_id')
    .eq('username', username)
    .eq('status', 'active')
    .is('deleted_at', null)
    .maybeSingle()

  if (profileError) throw profileError
  if (!profile?.user_id) return { token }

  const now = new Date()
  const expiresAt = new Date(now.getTime() + RESET_WINDOW_MS).toISOString()
  const { error: cancelError } = await admin
    .from('password_reset_requests')
    .update({ status: 'cancelled' })
    .eq('user_id', profile.user_id)
    .eq('status', 'pending')
  if (cancelError) throw cancelError

  const { error: insertError } = await admin.from('password_reset_requests').insert({
    user_id: profile.user_id,
    request_token_hash: hashPasswordResetToken(token),
    expires_at: expiresAt,
  })
  if (insertError) throw insertError

  return { token }
}

export async function getPasswordResetStatus(admin: SupabaseClient, token: string): Promise<PasswordResetStatus> {
  const { data, error } = await admin
    .from('password_reset_requests')
    .select('status,encrypted_password,expires_at')
    .eq('request_token_hash', hashPasswordResetToken(token))
    .maybeSingle()

  if (error) throw error
  if (!data) return { status: 'pending' }
  if (new Date(data.expires_at as string).getTime() <= Date.now()) return { status: 'expired' }
  if (data.status !== 'issued' || !data.encrypted_password) return { status: 'pending' }
  return {
    status: 'issued',
    temporaryPassword: decryptTemporaryPassword(data.encrypted_password as string),
  }
}

export async function listPendingPasswordResetRequests(admin: SupabaseClient): Promise<PendingPasswordResetRequest[]> {
  const now = new Date().toISOString()
  const { data: requests, error } = await admin
    .from('password_reset_requests')
    .select('id,user_id,requested_at,expires_at')
    .eq('status', 'pending')
    .gt('expires_at', now)
    .order('requested_at', { ascending: true })
  if (error) throw error
  if (!requests?.length) return []

  const userIds = [...new Set(requests.map((request) => request.user_id as string))]
  const { data: profiles, error: profilesError } = await admin
    .from('profiles')
    .select('user_id,username,display_name')
    .in('user_id', userIds)
  if (profilesError) throw profilesError
  const profileById = new Map((profiles ?? []).map((profile) => [profile.user_id as string, profile]))

  return requests.flatMap((request) => {
    const profile = profileById.get(request.user_id as string)
    if (!profile) return []
    return [{
      id: request.id as string,
      userId: request.user_id as string,
      username: profile.username as string,
      displayName: profile.display_name as string,
      requestedAt: request.requested_at as string,
      expiresAt: request.expires_at as string,
    }]
  })
}

export async function issuePasswordReset(admin: SupabaseClient, requestId: string, reviewerId: string) {
  const { data: request, error } = await admin
    .from('password_reset_requests')
    .select('id,user_id,status,expires_at')
    .eq('id', requestId)
    .maybeSingle()
  if (error) throw error
  if (!request || request.status !== 'pending') throw new Error('PASSWORD_RESET_REQUEST_NOT_PENDING')
  if (new Date(request.expires_at as string).getTime() <= Date.now()) throw new Error('PASSWORD_RESET_REQUEST_EXPIRED')

  const temporaryPassword = generateTemporaryPassword()
  const { error: authError } = await admin.auth.admin.updateUserById(request.user_id as string, {
    password: temporaryPassword,
  })
  if (authError) throw authError

  const { error: updateError } = await admin
    .from('password_reset_requests')
    .update({
      status: 'issued',
      encrypted_password: encryptTemporaryPassword(temporaryPassword),
      issued_at: new Date().toISOString(),
      reviewed_by: reviewerId,
    })
    .eq('id', requestId)
    .eq('status', 'pending')
  if (updateError) throw updateError
}
