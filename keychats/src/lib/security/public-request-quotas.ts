import 'server-only'

import { createHmac } from 'node:crypto'
import { isIP } from 'node:net'
import type { SupabaseClient } from '@supabase/supabase-js'
import { headers } from 'next/headers'

type QuotaAction = 'signup_ip' | 'reset_ip' | 'reset_login'

export async function getPublicClientAddress() {
  const incoming = await headers()
  // Vercel overwrites forwarding headers at its edge to prevent client spoofing.
  const forwarded = incoming.get('x-vercel-forwarded-for') ?? incoming.get('x-forwarded-for')
  const clientAddress = forwarded?.split(',')[0]?.trim() ?? ''
  // A shared, bounded fallback is safer than trusting an arbitrary caller header.
  return isIP(clientAddress) ? clientAddress : 'unknown'
}

export async function consumePublicRequestQuota(
  admin: SupabaseClient,
  action: QuotaAction,
  subject: string,
  maxAttempts: number,
  windowSeconds: number,
): Promise<boolean> {
  const secret = process.env.SUPABASE_SECRET_KEY
  if (!secret) throw new Error('PUBLIC_REQUEST_QUOTA_SECRET_MISSING')
  const subjectHash = createHmac('sha256', secret)
    .update(action)
    .update(':')
    .update(subject)
    .digest('hex')

  const { data, error } = await admin.rpc('consume_public_request_quota', {
    p_action: action,
    p_subject_hash: subjectHash,
    p_max_attempts: maxAttempts,
    p_window_seconds: windowSeconds,
  })
  if (error) throw new Error('PUBLIC_REQUEST_QUOTA_FAILED', { cause: error })
  return data === true
}
