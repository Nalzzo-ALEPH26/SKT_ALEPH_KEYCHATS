'use server'
import { revalidatePath } from 'next/cache'
import { requireActiveUser } from '@/lib/auth/guards'
import { createAuthGuardAccess } from '@/lib/auth/server-access'
import { createClient } from '@/lib/supabase/server'
import { validateSite } from '@/lib/community/showcase'
export type ShowcaseResult = { error?: string; ok?: boolean }
export async function showcaseAction(form: FormData): Promise<ShowcaseResult> {
  const client = await createClient()
  const { claims } = await requireActiveUser(createAuthGuardAccess(client))
  const text = (key: string) => String(form.get(key) ?? '')
  const operation = text('operation')
  try {
    if (operation === 'create' || operation === 'update') {
      const site = validateSite({ title: text('title'), url: text('url'), description: text('description'), tags: text('tags'), color: text('color') })
      if (operation === 'create') {
        const { error } = await client.from('showcase_sites').insert({ ...site, author_id: claims.sub })
        if (error) return { error: '등록하지 못했습니다. 잠시 후 다시 시도해주세요.' }
      } else {
        const { data, error } = await client.from('showcase_sites').update(site).eq('id', text('id')).eq('author_id', claims.sub).select('id')
        if (error || !data?.length) return { error: '본인이 작성한 메모만 수정할 수 있습니다.' }
      }
    } else if (operation === 'delete') {
      let query = client.from('showcase_sites').delete().eq('id', text('id'))
      if (claims.app_metadata?.role !== 'admin') query = query.eq('author_id', claims.sub)
      const { data, error } = await query.select('id')
      if (error || !data?.length) return { error: '삭제 권한이 없거나 이미 삭제된 메모입니다.' }
    } else if (operation === 'comment') {
      const body = text('body').trim()
      if (!body || body.length > 1000) return { error: '댓글은 1~1,000자로 입력해주세요.' }
      const { error } = await client.from('showcase_comments').insert({ site_id: text('id'), author_id: claims.sub, body })
      if (error) return { error: '댓글을 등록하지 못했습니다.' }
    } else if (operation === 'delete-comment') {
      let query = client.from('showcase_comments').delete().eq('id', text('id'))
      if (claims.app_metadata?.role !== 'admin') query = query.eq('author_id', claims.sub)
      const { data, error } = await query.select('id')
      if (error || !data?.length) return { error: '댓글을 삭제하지 못했습니다.' }
    } else return { error: '지원하지 않는 작업입니다.' }
  } catch (error) { return { error: error instanceof Error ? error.message : '입력값을 확인해주세요.' } }
  revalidatePath('/showcase')
  return { ok: true }
}
