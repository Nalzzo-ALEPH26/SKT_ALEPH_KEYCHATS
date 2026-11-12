import { NextResponse, type NextRequest } from 'next/server'

import { updateSession } from '@/lib/supabase/proxy'

export async function proxy(request: NextRequest) {
  // NextRequest may expose a pathname with or without the configured /chats basePath.
  // Skip session refresh only for the public monitoring endpoint.
  const pathname = request.nextUrl.pathname
  if (pathname === '/api/health' || pathname === '/chats/api/health') {
    return NextResponse.next()
  }

  return updateSession(request)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
