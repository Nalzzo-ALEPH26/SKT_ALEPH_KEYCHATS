import { notFound } from 'next/navigation'

import { ShowcaseDetail } from '@/components/showcase-detail'
import type { SiteMemo, SiteComment } from '@/components/showcase-board'
import { parseVisitCount } from '@/lib/community/visit-counts'
import { signedShowcaseImages } from '@/lib/community/showcase-images'
import { showcaseUuidPattern } from '@/lib/community/showcase'
import { requireActiveUser } from '@/lib/auth/guards'
import { createAuthGuardAccess } from '@/lib/auth/server-access'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type PageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ q?: string | string[]; sort?: string | string[] }>
}

export default async function ShowcaseDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params
  if (!showcaseUuidPattern.test(id)) notFound()
  const query = await searchParams
  const client = await createClient()
  const { claims } = await requireActiveUser(createAuthGuardAccess(client))

  const { data: site, error: siteError } = await client.from('showcase_sites')
    .select('*').eq('id', id).maybeSingle()
  if (siteError) throw siteError
  if (!site) notFound()
  const [{ data: comments, error: commentsError }, { data: countRows, error: countError }] = await Promise.all([
    client.from('showcase_comments').select('*').eq('site_id', id).order('created_at', { ascending: true }),
    client.from('showcase_visit_counts').select('visit_count').eq('site_id', id).maybeSingle(),
  ])
  if (commentsError) throw commentsError
  const profileIds = [...new Set([site.author_id as string, ...(comments ?? []).map(c => c.author_id as string)])]
  const { data: profiles, error: profilesError } = await client.from('profiles')
    .select('user_id,display_name,username').in('user_id', profileIds)
  if (profilesError) throw profilesError

  const raw = site as SiteMemo
  const urls = await signedShowcaseImages(client, [raw.thumbnail_path])
  const image = raw.thumbnail_path ? urls.get(raw.thumbnail_path) ?? null : null
  const q = typeof query.q === 'string' ? query.q.slice(0, 120) : ''
  const sort = typeof query.sort === 'string' && ['new', 'popular', 'visits'].includes(query.sort) ? query.sort : 'new'
  const backQuery = new URLSearchParams()
  if (q) backQuery.set('q', q)
  if (sort !== 'new') backQuery.set('sort', sort)
  const suffix = backQuery.toString()
  const backHref = `/showcase${suffix ? '?' + suffix : ''}`

  return <ShowcaseDetail
    site={{ ...raw, thumbnail_url: image, visit_count: countError ? null : parseVisitCount(countRows?.visit_count ?? 0) }}
    comments={(comments ?? []) as SiteComment[]}
    profiles={profiles ?? []}
    currentUserId={claims.sub}
    isAdmin={claims.app_metadata?.role === 'admin'}
    backHref={backHref}
  />
}
