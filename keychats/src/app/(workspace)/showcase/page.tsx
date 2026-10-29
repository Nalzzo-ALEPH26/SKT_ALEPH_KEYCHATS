import { requireActiveUser } from '@/lib/auth/guards'
import { createAuthGuardAccess } from '@/lib/auth/server-access'
import { createClient } from '@/lib/supabase/server'
import { ShowcaseBoard, type SiteMemo, type SiteComment } from '@/components/showcase-board'
export const dynamic = 'force-dynamic'
export default async function ShowcasePage() {
  const client = await createClient()
  const { claims } = await requireActiveUser(createAuthGuardAccess(client))
  const { data: sites, error } = await client.from('showcase_sites').select('*').order('created_at', { ascending: false })
  if (error) return <div className="p-8"><h1 className="text-2xl font-semibold">만들었어요 🔨</h1><p className="mt-4">메모보드를 불러올 수 없습니다. 관리자에게 DB 설정 및 연결 상태 확인을 요청해주세요.</p></div>
  const [{ data: comments, error: commentError }, { data: profiles, error: profileError }] = await Promise.all([
    client.from('showcase_comments').select('*').order('created_at'),
    client.from('profiles').select('user_id,display_name,username'),
  ])
  if (commentError || profileError) throw new Error('메모보드 정보를 불러오지 못했습니다.')
  return <ShowcaseBoard sites={(sites ?? []) as SiteMemo[]} comments={(comments ?? []) as SiteComment[]} profiles={profiles ?? []} currentUserId={claims.sub} isAdmin={claims.app_metadata?.role === 'admin'} />
}
