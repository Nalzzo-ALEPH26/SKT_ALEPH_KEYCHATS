import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

function source(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8')
}

describe('temporary password copy feedback', () => {
  it('shows success feedback after copying the issued temporary password', () => {
    const form = source('../../src/components/password-reset-request-form.tsx')

    expect(form).toContain('copyTemporaryPassword')
    expect(form).toContain('navigator.clipboard.writeText')
    expect(form).toContain('복사되었습니다.')
    expect(form).toContain('role="status"')
    expect(form).toContain('aria-live="polite"')
    expect(form).toContain('복사에 실패했습니다.')
  })
})
