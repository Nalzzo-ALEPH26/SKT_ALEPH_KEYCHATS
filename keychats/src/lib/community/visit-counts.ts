export function parseVisitCount(value: unknown): number | null {
  if (typeof value !== 'number' && typeof value !== 'string') return null
  if (typeof value === 'string' && !/^\d+$/.test(value)) return null
  const count = Number(value)
  return Number.isSafeInteger(count) && count >= 0 ? count : null
}
export type VisitResult = { count: number | null; counted: boolean }
export function parseVisitResult(value: unknown): VisitResult {
  if (!value || typeof value !== 'object') return { count: null, counted: false }
  const result = value as Record<string, unknown>
  return { count: parseVisitCount(result.count), counted: result.counted === true }
}
