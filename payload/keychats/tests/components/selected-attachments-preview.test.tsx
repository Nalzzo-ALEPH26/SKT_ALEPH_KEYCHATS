// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { SelectedAttachmentsPreview } from '@/components/selected-attachments-preview'

const makeImage = (name: string) => new File(['image data'], name, { type: 'image/png' })

describe('selected attachment previews', () => {
  const createUrl = vi.fn(() => 'blob:local-selected-image')
  const revokeUrl = vi.fn()

  beforeEach(() => {
    createUrl.mockClear()
    revokeUrl.mockClear()
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createUrl })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeUrl })
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('shows the chosen image, its filename and a clear remove button', async () => {
    const remove = vi.fn()
    const clear = vi.fn()
    const file = makeImage('cat.png')
    render(<SelectedAttachmentsPreview files={[file]} disabled={false} onRemove={remove} onClear={clear} />)

    expect(screen.getByText('첨부파일 1개 선택됨')).toBeTruthy()
    await waitFor(() => expect(document.querySelector('[data-selected-attachment] button img')?.getAttribute('src')).toBe('blob:local-selected-image'))
    expect(createUrl).toHaveBeenCalledWith(file)
    fireEvent.click(screen.getByRole('button', { name: 'cat.png 첨부 취소' }))
    expect(remove).toHaveBeenCalledWith(0)
    fireEvent.click(screen.getByRole('button', { name: '모두 취소' }))
    expect(clear).toHaveBeenCalledTimes(1)
  })

  it('revokes local object URLs when the image preview is removed', async () => {
    const view = render(<SelectedAttachmentsPreview files={[makeImage('cat.png')]} disabled={false} onRemove={() => undefined} onClear={() => undefined} />)
    await waitFor(() => expect(createUrl).toHaveBeenCalledTimes(1))
    view.rerender(<SelectedAttachmentsPreview files={[]} disabled={false} onRemove={() => undefined} onClear={() => undefined} />)
    expect(revokeUrl).toHaveBeenCalledWith('blob:local-selected-image')
    expect(screen.queryByText('첨부파일 1개 선택됨')).toBeNull()
  })

  it('does not create preview URLs for non-image attachments, and disables removal while sending', () => {
    const remove = vi.fn()
    render(<SelectedAttachmentsPreview files={[new File(['pdf'], 'guide.pdf', { type: 'application/pdf' })]} disabled={true} onRemove={remove} onClear={() => undefined} />)
    expect(screen.getByText('guide.pdf')).toBeTruthy()
    expect(createUrl).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'guide.pdf 첨부 취소' }).hasAttribute('disabled')).toBe(true)
    expect(screen.getByRole('button', { name: '모두 취소' }).hasAttribute('disabled')).toBe(true)
  })
})
