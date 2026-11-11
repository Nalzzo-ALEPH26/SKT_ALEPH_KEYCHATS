import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')

describe('conversation layout with pinned messages', () => {
  it('preserves the original conversation width in both channels and DMs', () => {
    for (const page of [
      '../../src/app/(workspace)/channel/[channelId]/page.tsx',
      '../../src/app/(workspace)/dm/[threadId]/page.tsx',
    ]) {
      const code = source(page)
      expect(code).toContain('max-w-5xl flex-col')
      expect(code).not.toContain('xl:max-w-none')
      expect(code).toContain('min-[1680px]:max-w-[90rem]')
    }

    const pane = source('../../src/components/conversation-message-pane.tsx')
    expect(pane).toContain('min-[1680px]:max-w-[60rem]')
  })

  it('allocates a wider pinned sidebar only when the chat width can be preserved', () => {
    const pane = source('../../src/components/conversation-message-pane.tsx')
    expect(pane).toContain('min-[1680px]:flex-row')
    expect(pane).toContain('hidden w-80')
    expect(pane).toContain('min-[1680px]:flex')
    expect(pane).toContain('min-[1680px]:hidden')
    expect(pane).toContain('data-mobile-pinned-messages')
  })
})
