export const memoColors = ['yellow', 'blue', 'green', 'pink'] as const
export type MemoColor = typeof memoColors[number]
export const projectTypes = ['web', 'app', 'other'] as const
export type ProjectType = typeof projectTypes[number]

export function validateSite(input: { title: string; url: string; description: string; tags: string; color: string }) {
  const title = input.title.trim(), description = input.description.trim()
  if (!title || title.length > 60) throw new Error('사이트 이름은 1~60자로 입력해주세요.')
  if (!description || description.length > 1000) throw new Error('소개는 1~1,000자로 입력해주세요.')
  let url: URL
  try { url = new URL(input.url.trim()) } catch { throw new Error('올바른 URL을 입력해주세요.') }
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.href.length > 2048) throw new Error('http 또는 https 사이트 주소를 입력해주세요.')
  if (!memoColors.includes(input.color as MemoColor)) throw new Error('메모 색상을 선택해주세요.')
  const tags = [...new Set(input.tags.split(',').map(t => t.trim()).filter(Boolean))]
  if (tags.length > 8 || tags.some(t => t.length > 20)) throw new Error('태그는 각 20자, 최대 8개까지 입력해주세요.')
  return { title, url: url.href, description, tags, color: input.color as MemoColor }
}

export function validateProjectExtras(input: { projectType: string; details: string }) {
  const projectType = input.projectType || 'web'
  const details = input.details.trim()
  if (!projectTypes.includes(projectType as ProjectType)) throw new Error('프로젝트 유형을 확인해주세요.')
  if (details.length > 5000) throw new Error('상세 소개는 최대 5,000자까지 작성할 수 있습니다.')
  return { project_type: projectType as ProjectType, details: details || null }
}

export const SHOWCASE_IMAGE_BUCKET = 'showcase-thumbnails'
export const SHOWCASE_IMAGE_MAX_BYTES = 4 * 1024 * 1024
export const showcaseUuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function imageExtension(file: { type: string; size: number }) {
  if (file.size < 1 || file.size > SHOWCASE_IMAGE_MAX_BYTES) throw new Error('대표 이미지는 4MB 이하만 등록할 수 있습니다.')
  const extensions: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }
  const extension = extensions[file.type]
  if (!extension) throw new Error('대표 이미지는 JPG, PNG, WebP 형식만 가능합니다.')
  return extension
}

export function isOwnShowcaseImagePath(path: string, userId: string, siteId: string): boolean {
  if (!showcaseUuidPattern.test(userId) || !showcaseUuidPattern.test(siteId)) return false
  return new RegExp(`^${userId}/${siteId}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.(jpg|png|webp)$`, 'i').test(path)
}

export function projectTypeLabel(value: string | null | undefined): string {
  return value === 'app' ? 'APP' : value === 'other' ? '기타' : 'WEB'
}
