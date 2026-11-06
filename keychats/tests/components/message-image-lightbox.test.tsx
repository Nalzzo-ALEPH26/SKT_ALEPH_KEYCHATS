// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'

import { MessageImageLightbox } from '@/components/message-image-lightbox'

const href = '/chats/api/attachments/11111111-1111-1111-1111-111111111111'
const originalName = '테스트 이미지.png'

beforeEach(() => {
  // JSDOM does not currently implement the browser's native <dialog> methods.
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: function (this: HTMLDialogElement) { this.setAttribute('open', '') },
  })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.removeAttribute('open')
      this.dispatchEvent(new Event('close'))
    },
  })
})

afterEach(cleanup)

describe('MessageImageLightbox', () => {
  it('opens an accessible in-page image preview and returns focus on close', () => {
    const { container } = render(<MessageImageLightbox href={href} originalName={originalName} />)
    const trigger = screen.getByRole('button', { name: `${originalName} 이미지 확대` })
    const dialog = container.querySelector('dialog')!

    expect(trigger.querySelector('img')?.getAttribute('src')).toBe(href)
    expect(dialog.hasAttribute('open')).toBe(false)
    expect(within(dialog).queryByRole('img')).toBeNull()

    fireEvent.click(trigger)
    expect(dialog.hasAttribute('open')).toBe(true)
    expect(within(dialog).getByRole('img', { name: originalName }).getAttribute('src')).toBe(href)
    expect(within(dialog).getByRole('link', { name: '원본 보기' }).getAttribute('href')).toBe(href)

    fireEvent.click(within(dialog).getByRole('button', { name: '이미지 확대 닫기' }))
    expect(dialog.hasAttribute('open')).toBe(false)
    expect(within(dialog).queryByRole('img')).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })

  it('closes when clicking outside the dialog bounds but not its contents', () => {
    const { container } = render(<MessageImageLightbox href={href} originalName={originalName} />)
    const dialog = container.querySelector('dialog')!
    Object.defineProperty(dialog, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ left: 50, top: 50, right: 250, bottom: 250 }),
    })
    fireEvent.click(screen.getByRole('button', { name: `${originalName} 이미지 확대` }))
    fireEvent.click(dialog.querySelector('h2')!, { clientX: 100, clientY: 100 })
    expect(dialog.hasAttribute('open')).toBe(true)
    fireEvent.click(dialog, { clientX: 10, clientY: 10 })
    expect(dialog.hasAttribute('open')).toBe(false)
  })
})
