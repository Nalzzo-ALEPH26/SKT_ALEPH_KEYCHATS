import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import ts from 'typescript'

import type { TabAttentionController } from '../../src/lib/notifications/tab-attention'

test('recovers a replaced favicon and keeps a single stable node through 900ms phases', async ({ page }) => {
  await page.clock.install()
  await page.setContent('<head><title>Keychats</title><link rel="icon" type="image/svg+xml" href="/chats/keychats-tab-icon.svg"></head>')
  const source = readFileSync('src/lib/notifications/tab-attention.ts', 'utf8')
  const script = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  await page.addScriptTag({ content: `const exports = {}; ${script}; window.attention = exports.createTabAttentionController(document);` })
  await page.evaluate(() => {
    const icon = document.querySelector('link')!
    icon.replaceWith(icon.cloneNode(true))
    ;(window as typeof window & { attention: TabAttentionController }).attention.setUnreadCount(1)
  })
  const favicon = page.locator('link[rel~="icon"]')
  const persistentNode = await favicon.elementHandle()
  await expect(page).toHaveTitle('1 새 메시지 · KEYCHATS')
  await expect(favicon).toHaveAttribute('href', /ff2d20/)
  await page.clock.fastForward(899)
  await expect(favicon).toHaveAttribute('href', /ff2d20/)
  await page.clock.fastForward(1)
  await expect(favicon).toHaveAttribute('href', /000000/)
  await expect(page).toHaveTitle('1 새 메시지 · KEYCHATS')
  await page.evaluate(() => {
    const competing = document.createElement('link')
    competing.rel = 'icon'
    competing.href = '/chats/keychats-tab-icon.svg'
    document.head.appendChild(competing)
  })
  await page.clock.fastForward(900)
  await expect(favicon).toHaveCount(1)
  await expect(favicon).toHaveAttribute('href', /ff2d20/)
  await page.evaluate(() => (window as typeof window & { attention: TabAttentionController }).attention.setUnreadCount(2))
  await expect(page).toHaveTitle('2 새 메시지 · KEYCHATS')
  await page.evaluate(() => (window as typeof window & { attention: TabAttentionController }).attention.clear())
  await expect(page).toHaveTitle('Keychats')
  await expect(favicon).toHaveCount(1)
  await expect(favicon).toHaveAttribute('href', '/chats/keychats-tab-icon.svg')
  expect(await persistentNode!.evaluate((node) => node.isConnected && node === document.querySelector('link[rel~="icon"]'))).toBe(true)
  await page.evaluate(() => (window as typeof window & { attention: TabAttentionController }).attention.dispose())
  await page.clock.fastForward(9_000)
  await expect(page).toHaveTitle('Keychats')
  await expect(favicon).toHaveAttribute('href', '/chats/keychats-tab-icon.svg')
})
