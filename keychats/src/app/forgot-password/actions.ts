'use server'

import { cookies } from 'next/headers'

import { getPasswordResetStatus, requestPasswordReset } from '@/lib/password-reset/service'
import { createAdminClient } from '@/lib/supabase/admin'

const COOKIE_NAME = 'keychats_password_reset_token'

export type PasswordResetRequestState = {
  submitted: boolean
  error: string | null
}

export async function requestTemporaryPasswordAction(
  _previous: PasswordResetRequestState,
  formData: FormData,
): Promise<PasswordResetRequestState> {
  const rawLoginId = String(formData.get('loginId') ?? '')
  try {
    const { token } = await requestPasswordReset(createAdminClient(), rawLoginId)
    const cookieStore = await cookies()
    cookieStore.set(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/chats',
      maxAge: 30 * 60,
    })
    return { submitted: true, error: null }
  } catch {
    return { submitted: false, error: '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.' }
  }
}

export async function checkTemporaryPasswordAction() {
  const token = (await cookies()).get(COOKIE_NAME)?.value
  if (!token) return { status: 'pending' as const }
  return getPasswordResetStatus(createAdminClient(), token)
}
