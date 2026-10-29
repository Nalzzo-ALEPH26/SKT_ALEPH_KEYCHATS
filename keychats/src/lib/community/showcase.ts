export const memoColors = ['yellow', 'blue', 'green', 'pink'] as const
export type MemoColor = typeof memoColors[number]
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
