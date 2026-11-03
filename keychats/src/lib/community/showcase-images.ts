import 'server-only'

import { SHOWCASE_IMAGE_BUCKET } from '@/lib/community/showcase'
import { createClient } from '@/lib/supabase/server'

// Gallery images are private storage objects. Resolve temporary links only for signed-in users.
export async function signedShowcaseImages(
  client: Awaited<ReturnType<typeof createClient>>,
  paths: Array<string | null | undefined>,
): Promise<Map<string, string>> {
  const unique = [...new Set(paths.filter((path): path is string => typeof path === 'string' && path.length > 0))]
  const urls = new Map<string, string>()
  for (let offset = 0; offset < unique.length; offset += 100) {
    const chunk = unique.slice(offset, offset + 100)
    const { data, error } = await client.storage.from(SHOWCASE_IMAGE_BUCKET).createSignedUrls(chunk, 3600)
    if (error || !data) continue // Existing posts still render when the gallery SQL is not installed.
    for (const image of data) {
      if (image.path && image.signedUrl && !image.error) urls.set(image.path, image.signedUrl)
    }
  }
  return urls
}
