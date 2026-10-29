import { createClient } from '@supabase/supabase-js'
import { expect, test, type Page } from '@playwright/test'
const password = 'E2eRoomTheme!2026'
test('shares the DM theme across participants, preserves drafts, and persists after reload', async ({ browser }) => {
  test.setTimeout(60000)
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL, secret=process.env.SUPABASE_SECRET_KEY
  if (!url || !secret) throw new Error('E2E_ENV_MISSING:local Supabase credentials required')
  const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}})
  const contexts=[await browser.newContext(),await browser.newContext()]
  const users: Array<{id:string;login:string}>=[]
  let threadId: string | undefined
  try {
    for(let i=0;i<2;i++){
      const login=`theme${i}_${Date.now().toString(36)}`
      const {data,error}=await admin.auth.admin.createUser({email:`${login}@auth.keychats.invalid`,password,email_confirm:true,app_metadata:{role:'member'}})
      if(error||!data.user)throw error??new Error('CREATE_USER_FAILED')
      users.push({id:data.user.id,login})
      const {error:profileError}=await admin.from('profiles').insert({user_id:data.user.id,username:login,display_name:`Theme ${i}`,status:'active'})
      if(profileError)throw profileError
    }
    const ids=users.map(u=>u.id).sort()
    const {data:thread,error}=await admin.from('dm_threads').insert({user_low:ids[0],user_high:ids[1]}).select('id').single()
    if(error||!thread)throw error??new Error('CREATE_DM_FAILED')
    threadId=thread.id
    const pages: Page[]=[]
    for(let i=0;i<2;i++){
      const page=await contexts[i].newPage();pages.push(page)
      await page.goto('/chats/login')
      await page.getByLabel('아이디').fill(users[i].login)
      await page.getByLabel('비밀번호').fill(password)
      await page.getByRole('button',{name:'로그인',exact:true}).click()
      await expect(page).toHaveURL(/\/chats\/(?:settings|channel\/)/)
      await page.goto(`/chats/dm/${threadId}`)
      await expect(page.locator('[data-dm-message-pane]')).toBeVisible()
    }
    await pages[1].getByLabel('메시지 입력',{exact:true}).fill('작성 중인 메시지 유지')
    await pages[0].getByRole('button',{name:'대화방 테마',exact:true}).click()
    const dialog=pages[0].getByRole('dialog')
    await dialog.getByRole('button',{name:'라벤더',exact:true}).click()
    await expect(pages[0].locator('.room-theme-frame')).toHaveAttribute('data-room-theme','default')
    await dialog.getByRole('button',{name:'모두에게 적용'}).click()
    await expect(dialog).not.toBeVisible()
    for(const page of pages)await expect(page.locator('.room-theme-frame')).toHaveAttribute('data-room-theme','lavender',{timeout:20000})
    await expect(pages[1].getByLabel('메시지 입력',{exact:true})).toHaveValue('작성 중인 메시지 유지')
    await pages[1].reload()
    await expect(pages[1].locator('.room-theme-frame')).toHaveAttribute('data-room-theme','lavender')
    const {count}=await admin.from('messages').select('id',{count:'exact',head:true}).eq('dm_thread_id',threadId)
    expect(count).toBe(0)
  } finally {
    await Promise.all(contexts.map(c=>c.close()))
    if(threadId)await admin.from('dm_threads').delete().eq('id',threadId)
    for(const user of users)await admin.auth.admin.deleteUser(user.id)
  }
})
