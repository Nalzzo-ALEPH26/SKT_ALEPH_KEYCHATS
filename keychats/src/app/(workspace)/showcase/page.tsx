import { parseVisitCount } from '@/lib/community/visit-counts'
import { signedShowcaseImages } from '@/lib/community/showcase-images'
import { requireActiveUser } from '@/lib/auth/guards'
import { createAuthGuardAccess } from '@/lib/auth/server-access'
import { createClient } from '@/lib/supabase/server'
import { ShowcaseBoard, type SiteMemo } from '@/components/showcase-board'

export const dynamic = 'force-dynamic'

type PageProps = { searchParams: Promise<{ q?: string | string[]; sort?: string | string[] }> }

export default async function ShowcasePage({ searchParams }: PageProps) {
  const query = await searchParams
  const client = await createClient()
  const { claims } = await requireActiveUser(createAuthGuardAccess(client))
  const { data: sites, error } = await client.from('showcase_sites').select('*').order('created_at', { ascending: false })
  if (error) return <div className="p-8"><h1 className="text-2xl font-semibold">만들었어요 🔨</h1><p className="mt-4">프로젝트 목록을 불러올 수 없습니다. 관리자에게 DB 연결 상태 확인을 요청해주세요.</p></div>
  const ids = (sites ?? []).map(site => site.id as string)
  const [{ data: profiles, error: profilesError }, { data: commentRows, error: commentError }, visits] = await Promise.all([
    client.from('profiles').select('user_id,display_name,username'),
    client.rpc('showcase_comment_counts'),
    ids.length ? client.from('showcase_visit_counts').select('site_id,visit_count').in('site_id', ids) : Promise.resolve({ data: [], error: null }),
  ])
  if (profilesError) throw new Error('프로젝트 목록 정보를 불러오지 못했습니다.')
  const counts = new Map((visits.data ?? []).map(row => [row.site_id as string, parseVisitCount(row.visit_count)]))
  const commentCounts = new Map<string, number>()
  if (!commentError) {
    for (const row of commentRows ?? []) commentCounts.set(row.site_id, Number(row.comment_count) || 0)
  } else {
    // Compatibility until the gallery migration is applied: count in batches, not just first 1,000.
    for (let from = 0; ; from += 1000) {
      const { data, error: fallbackError } = await client.from('showcase_comments')
        .select('site_id').order('id').range(from, from + 999)
      if (fallbackError) throw fallbackError
      for (const row of data ?? []) commentCounts.set(row.site_id, (commentCounts.get(row.site_id) ?? 0) + 1)
      if (!data || data.length < 1000) break
    }
  }
  const siteRows = (sites ?? []) as SiteMemo[]
  const images = await signedShowcaseImages(client, siteRows.map(s => s.thumbnail_path))
  const projects = siteRows.map(site => ({
    ...site,
    thumbnail_url: site.thumbnail_path ? images.get(site.thumbnail_path) ?? null : null,
    comment_count: commentCounts.get(site.id) ?? 0,
    visit_count: visits.error ? null : counts.get(site.id) ?? 0,
  }))
  const q = typeof query.q === 'string' ? query.q.slice(0, 120) : ''
  const sort = typeof query.sort === 'string' && ['new', 'popular', 'visits'].includes(query.sort) ? query.sort : 'new'
  return <ShowcaseBoard sites={projects} profiles={profiles ?? []} currentUserId={claims.sub}
    isAdmin={claims.app_metadata?.role === 'admin'} initialSearch={q} initialSort={sort} />
}
