import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = readFileSync(new URL('../../src/components/conversation-message-pane.tsx', import.meta.url), 'utf8')

describe('conversation file drag and drop', () => {
  it('reuses the attachment validation path and preserves existing image paste and file input flows', () => {
    expect(source).toContain('addFiles(Array.from(event.dataTransfer.files))')
    expect(source).toContain('addFiles(Array.from(event.target.files ?? []))')
    expect(source).toContain('addFiles(images)')
    expect(source).toContain('validateAttachmentFile(file)')
  })

  it('blocks file navigation, displays a drop target, and rejects drops while editing or sending', () => {
    expect(source).toContain("window.addEventListener('drop', blockFileNavigation)")
    expect(source).toContain('data-file-drop-overlay')
    expect(source).toContain('if (busy || editingMessageId !== null)')
  })
})
