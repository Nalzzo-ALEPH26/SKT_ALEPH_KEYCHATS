'use server'

import { recordAdminNotificationEvent } from '@/lib/admin/notifications'
import { createAdminClient } from '@/lib/supabase/admin'
import { submitSupabaseSignupRequest } from '@/lib/auth/signup-requests-supabase'
import { validateSignupRequestInput } from '@/lib/auth/signup-requests'
import { consumePublicRequestQuota, getPublicClientAddress } from '@/lib/security/public-request-quotas'

export type SignupRequestState = {
  status: 'idle' | 'success'
  error: string | null
}

export async function requestSignup(
  _previousState: SignupRequestState,
  formData: FormData,
): Promise<SignupRequestState> {
  try {
    const input = {
      loginId: String(formData.get('loginId') ?? ''),
      displayName: String(formData.get('displayName') ?? ''),
      password: String(formData.get('password') ?? ''),
    }
    validateSignupRequestInput(input)
    const admin = createAdminClient()
    const clientAddress = await getPublicClientAddress()
    const allowed = await consumePublicRequestQuota(admin, 'signup_ip', clientAddress, 5, 3600)
    if (!allowed) throw new Error('PUBLIC_REQUEST_RATE_LIMITED')
    const result = await submitSupabaseSignupRequest(admin, input)
    const { data: request } = await admin
      .from('signup_requests')
      .select('id')
      .eq('auth_user_id', result.userId)
      .eq('status', 'pending')
      .maybeSingle()
    if (request?.id) await recordAdminNotificationEvent(admin, 'signup_request', request.id as string)

    return { status: 'success', error: null }
  } catch (error) {
    const code = error instanceof Error ? error.message : ''

    if (code === 'PUBLIC_REQUEST_RATE_LIMITED') {
      return { status: 'idle', error: '요청이 많습니다. 잠시 후 다시 시도해 주세요.' }
    }

    if (code === 'SIGNUP_REQUEST_CONFLICT') {
      return { status: 'idle', error: '이미 사용 중이거나 승인 대기 중인 아이디입니다.' }
    }

    if (code === 'LOGIN_ID_INVALID' || code === 'DISPLAY_NAME_INVALID' || code === 'PASSWORD_INVALID') {
      return { status: 'idle', error: '아이디·표시 이름·비밀번호 형식을 확인해 주세요.' }
    }

    return { status: 'idle', error: '가입 요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.' }
  }
}
