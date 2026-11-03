'use server'

import { revalidatePath } from 'next/cache'
import { requireActiveUser } from '@/lib/auth/guards'
import { createAuthGuardAccess } from '@/lib/auth/server-access'
import {
  SHOWCASE_IMAGE_BUCKET,
  isOwnShowcaseImagePath,
  showcaseUuidPattern,
  validateProjectExtras,
  validateSite,
} from '@/lib/community/showcase'
import { createClient } from '@/lib/supabase/server'

export type ShowcaseResult = { error?: string; ok?: boolean; id?: string }

export async function showcaseAction(form: FormData): Promise<ShowcaseResult> {
  const client = await createClient()
  const { claims } = await requireActiveUser(createAuthGuardAccess(client))
  const text = (key: string) => String(form.get(key) ?? '')
  const operation = text('operation')
  const id = text('id')

  try {
    if (operation === 'create' || operation === 'update') {
      const site = validateSite({
        title: text('title'), url: text('url'), description: text('description'),
        tags: text('tags'), color: text('color'),
      })
      const extras = validateProjectExtras({ projectType: text('project_type'), details: text('details') })
      if (operation === 'create') {
        const { data, error } = await client.from('showcase_sites')
          .insert({ ...site, ...extras, author_id: claims.sub })
          .select('id').single()
        if (error || !data) return { error: '등록하지 못했습니다. 갤러리용 Supabase SQL 적용 상태를 확인해주세요.' }
        revalidatePath('/showcase')
        return { ok: true, id: data.id as string }
      }
      if (!showcaseUuidPattern.test(id)) return { error: '프로젝트 정보가 올바르지 않습니다.' }
      const { data, error } = await client.from('showcase_sites')
        .update({ ...site, ...extras })
        .eq('id', id).eq('author_id', claims.sub).select('id')
      if (error || !data?.length) return { error: '수정할 수 없습니다. 작성자 권한 및 DB 설정을 확인해주세요.' }
    } else if (operation === 'set-thumbnail') {
      if (!showcaseUuidPattern.test(id)) return { error: '프로젝트 정보가 올바르지 않습니다.' }
      const path = text('thumbnail_path')
      if (!isOwnShowcaseImagePath(path, claims.sub, id)) return { error: '대표 이미지 경로가 올바르지 않습니다.' }
      // Verify that the image exists in the private bucket before exposing a reference to it.
      const { error: storageError } = await client.storage.from(SHOWCASE_IMAGE_BUCKET).createSignedUrl(path, 30)
      if (storageError) return { error: '업로드된 이미지를 확인하지 못했습니다.' }
      const { data, error } = await client.from('showcase_sites')
        .update({ thumbnail_path: path }).eq('id', id).eq('author_id', claims.sub)
        .select('id,thumbnail_path')
      if (error || !data?.length) return { error: '대표 이미지를 저장하지 못했습니다.' }
    } else if (operation === 'remove-thumbnail') {
      if (!showcaseUuidPattern.test(id)) return { error: '프로젝트 정보가 올바르지 않습니다.' }
      const { data, error } = await client.from('showcase_sites')
        .update({ thumbnail_path: null }).eq('id', id).eq('author_id', claims.sub)
        .select('id,thumbnail_path')
      if (error || !data?.length) return { error: '대표 이미지를 삭제하지 못했습니다.' }
    } else if (operation === 'delete') {
      if (!showcaseUuidPattern.test(id)) return { error: '프로젝트 정보가 올바르지 않습니다.' }
      let query = client.from('showcase_sites').delete().eq('id', id)
      if (claims.app_metadata?.role !== 'admin') query = query.eq('author_id', claims.sub)
      const { data, error } = await query.select('id,thumbnail_path')
      if (error || !data?.length) return { error: '삭제 권한이 없거나 이미 삭제된 프로젝트입니다.' }
      // Storage cleanup is best-effort; it cannot undo a successful DB delete.
      for (const row of data) {
        if (row.thumbnail_path) {
          try { await client.storage.from(SHOWCASE_IMAGE_BUCKET).remove([row.thumbnail_path]) } catch { /* DB delete already succeeded */ }
        }
      }
    } else if (operation === 'comment') {
      const body = text('body').trim()
      if (!showcaseUuidPattern.test(id) || !body || body.length > 1000) return { error: '댓글은 1~1,000자로 입력해주세요.' }
      const { error } = await client.from('showcase_comments')
        .insert({ site_id: id, author_id: claims.sub, body })
      if (error) return { error: '댓글을 등록하지 못했습니다.' }
    } else if (operation === 'delete-comment') {
      if (!showcaseUuidPattern.test(id)) return { error: '댓글 정보가 올바르지 않습니다.' }
      let query = client.from('showcase_comments').delete().eq('id', id)
      if (claims.app_metadata?.role !== 'admin') query = query.eq('author_id', claims.sub)
      const { data, error } = await query.select('id,site_id')
      if (error || !data?.length) return { error: '댓글을 삭제할 수 없습니다.' }
      revalidatePath(`/showcase/${data[0].site_id}`)
      revalidatePath('/showcase')
      return { ok: true }
    } else return { error: '지원하지 않는 작업입니다.' }
  } catch (error) {
    return { error: error instanceof Error ? error.message : '요청을 처리하지 못했습니다.' }
  }

  revalidatePath('/showcase')
  if (showcaseUuidPattern.test(id)) revalidatePath(`/showcase/${id}`)
  return { ok: true, id: showcaseUuidPattern.test(id) ? id : undefined }
}
