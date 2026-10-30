      },
      { timeout: 10_000 },
    )
    .toBe('live-attachments:1')
}

test('creates a member channel and covers attachment, reaction, pin, unread, theme and mobile drawer', async ({ browser }) => {
  const admin = createAdminClient()
  const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
  const users: TestUser[] = []
  const channelIds: string[] = []
  const firstContext = await browser.newContext()
  const secondContext = await browser.newContext()

  try {
    const first = await createUser(admin, {
      loginId: `accept_a_${suffix}`.slice(0, 24),
      displayName: 'Accept Alpha',
    })
    const second = await createUser(admin, {
      loginId: `accept_b_${suffix}`.slice(0, 24),
      displayName: 'Accept Beta',
    })
    users.push(first, second)

    const baseChannelId = await createChannel(admin, {
      name: `base-${suffix}`.slice(0, 80),
      createdBy: first.userId,
      members: [
        { userId: first.userId, role: 'owner' },
        { userId: second.userId, role: 'member' },
      ],
    })
    channelIds.push(baseChannelId)

    const firstPage = await firstContext.newPage()
    await login(firstPage, first.loginId)
    await firstPage.goto(`/chats/channel/${baseChannelId}`)

    const newChannelName = `accept-${suffix}`.slice(0, 80)
    const createDetails = firstPage.locator('details').filter({ hasText: '채널 만들기' }).first()
    await createDetails.locator('summary').click()
    await createDetails.getByLabel('채널 이름').fill(newChannelName)
    await createDetails.getByRole('checkbox', { name: /Accept Beta/ }).check()
    await createDetails.getByRole('button', { name: '만들기' }).click()

    const baseChannelUrl = `http://localhost:3000/chats/channel/${baseChannelId}`
    await expect.poll(() => firstPage.url(), { timeout: 10_000 }).not.toBe(baseChannelUrl)
    await expect(firstPage).toHaveURL(/\/chats\/channel\/[0-9a-f-]+$/)
    await expect(firstPage.getByRole('heading', { name: `#${newChannelName}` })).toBeVisible({
      timeout: 10_000,
    })

    const createdChannelId = firstPage.url().split('/').pop()
    expect(createdChannelId).toBeTruthy()
    expect(createdChannelId).not.toBe(baseChannelId)
    channelIds.push(createdChannelId!)
    await expect(firstPage.getByText('멤버 2명', { exact: true })).toBeVisible()
    await expect(firstPage.locator('[data-channel-message-pane]')).toHaveAttribute(
      'data-realtime-status',
      'ready',
      { timeout: 12_000 },
    )

    const secondPage = await secondContext.newPage()
    await login(secondPage, second.loginId)
    await secondPage.goto(`/chats/channel/${createdChannelId}`)
    await expect(secondPage.locator('[data-channel-message-pane]')).toHaveAttribute(
      'data-realtime-status',
      'ready',
      { timeout: 12_000 },
    )

    const richMessage = `rich-${Date.now()}`
    await firstPage.locator('input[type="file"][multiple]').setInputFiles({
      name: 'acceptance.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('keychats acceptance attachment'),
    })
    await expect(firstPage.locator('[data-selected-attachments]')).toContainText('acceptance.txt')

    const firstInput = firstPage.getByLabel('메시지 입력')
    const firstSend = firstPage.locator('[data-send-message]')
    await firstInput.fill(richMessage)
    await expect(firstInput).toHaveValue(richMessage)
    await expect(firstSend).toBeEnabled({ timeout: 5_000 })
    await firstSend.click()

    const firstArticle = firstPage.locator('article').filter({ hasText: richMessage }).first()
    await expect(firstArticle).toBeVisible({ timeout: 10_000 })
    await expect(firstSend).toHaveText('전송', { timeout: 10_000 })
    const messageId = Number(await firstArticle.getAttribute('data-message-id'))
    expect(Number.isInteger(messageId)).toBe(true)

    await waitForLiveAttachment(admin, messageId, richMessage)
    await expect(firstArticle.getByRole('link', { name: /acceptance\.txt/ })).toBeVisible({
      timeout: 10_000,
    })

    const secondArticle = secondPage.locator(`article[data-message-id="${messageId}"]`)
    await expect(secondArticle).toContainText(richMessage, { timeout: 10_000 })
    await expect(secondArticle.getByRole('link', { name: /acceptance\.txt/ })).toBeVisible({ timeout: 10_000 })
    await waitForReadState(admin, second.userId, createdChannelId!, messageId)

    await firstArticle.hover()
    await firstArticle.getByRole('button', { name: '👍 반응' }).click()
    await expect(secondArticle.locator('[data-reaction-emoji="👍"]')).toContainText('1', {