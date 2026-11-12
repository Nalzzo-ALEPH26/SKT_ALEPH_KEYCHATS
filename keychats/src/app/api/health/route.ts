import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const HEALTH_TIMEOUT_MS = 3000

function healthResponse(healthy: boolean) {
  return NextResponse.json(
    healthy ? { status: 'ok' } : { status: 'error' },
    {
      status: healthy ? 200 : 503,
      headers: { 'cache-control': 'private, no-store' },
    },
  )
}

async function checkDatabase(): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url || !publishableKey) return false

  const controller = new AbortController()
  let timeoutId: ReturnType<typeof setTimeout> | undefined

  try {
    // No cookies, auth session, or service-role key. Exactly one anon RPC request.
    const supabase = createSupabaseClient(url, publishableKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    })

    const timeout = new Promise<never>((_resolve, reject) => {
      timeoutId = setTimeout(() => {
        controller.abort()
        reject(new Error('HEALTH_TIMEOUT'))
      }, HEALTH_TIMEOUT_MS)
    })

    // A race also bounds latency if a fetch implementation ignores abort.
    const result = await Promise.race([
      supabase.rpc('keychats_health_check').abortSignal(controller.signal),
      timeout,
    ])

    return result.error === null && result.data === true
  } catch {
    // Never expose PostgREST, network, configuration, or timeout details.
    return false
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId)
  }
}

export async function GET() {
  return healthResponse(await checkDatabase())
}
