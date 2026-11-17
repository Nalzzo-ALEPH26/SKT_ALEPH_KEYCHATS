import { NextResponse } from 'next/server'

import { AuthGuardError, requireActiveUser } from '@/lib/auth/guards'
import { createAuthGuardAccess } from '@/lib/auth/server-access'
import { createClient } from '@/lib/supabase/server'

type RouteContext = {
  params: Promise<{ attachmentId: string }>
}

// RFC 5987 filename* preserves non-ASCII names (including Korean) in downloads.
function attachmentDisposition(originalName: string) {
  const filename = originalName.replace(/[\x00-\x1f\x7f/\\"]/g, '_').slice(0, 255) || 'attachment'
  const fallback = filename.replace(/[^\x20-\x7e]/g, '_')
  const encoded = encodeURIComponent(filename).replace(/[!'()*]/g, (char) =>
    `%${char.charCodeAt(0).toString(16).toUpperCase()}`)
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`
}

export async function GET(request: Request, { params }: RouteContext) {
  const { attachmentId } = await params
  const client = await createClient()

  try {
    await requireActiveUser(createAuthGuardAccess(client))
  } catch (error) {
    if (error instanceof AuthGuardError) {
      return new NextResponse(null, { status: 404 })
    }
    throw error
  }

  const { data: attachment, error } = await client
    .from('attachments')
    .select('storage_path,original_name')
    .eq('id', attachmentId)
    .maybeSingle()

  if (error) throw error
  if (!attachment) return new NextResponse(null, { status: 404 })

  // File downloads must return Content-Disposition from our own origin.
  // Storage's signed-URL download option percent-encodes Korean filenames in
  // the browser's saved name; image previews continue using signed redirects.
  if (new URL(request.url).searchParams.get('download') === '1') {
    const { data: file, error: downloadError } = await client.storage
      .from('chat-attachments')
      .download(attachment.storage_path as string)
    if (downloadError || !file) return new NextResponse(null, { status: 404 })

    return new NextResponse(file, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': attachmentDisposition(attachment.original_name as string),
        'Content-Length': String(file.size),
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  }

  const { data, error: signedUrlError } = await client.storage
    .from('chat-attachments')
    .createSignedUrl(attachment.storage_path as string, 60)

  if (signedUrlError || !data?.signedUrl) {
    return new NextResponse(null, { status: 404 })
  }

  return NextResponse.redirect(data.signedUrl, 307)
}
