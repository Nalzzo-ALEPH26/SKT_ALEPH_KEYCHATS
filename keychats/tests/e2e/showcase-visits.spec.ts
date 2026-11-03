import { createClient } from '@supabase/supabase-js'
import { expect, test } from '@playwright/test'
test('counts outbound site visits with server deduplication and excludes the author', async ({ browser }) => {
  test.setTimeout(60000)
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL, secret=process.env.SUPABASE_SECRET_KEY, publishable=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if(!url||!secret||!publishable)throw new Error('E2E_ENV_MISSING:local Supabase credentials required')
  const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}})
  const contexts=[await browser.newContext(),await browser.newContext()]
  const users:Array<{id:string;login:string}>=[]
  const password='E2eVisitCounter!2026'
  let siteId:string|undefined
  try {
    for(let i=0;i<2;i++){
      const login=`visit${i}_${Date.now().toString(36)}`
      const {data,error}=await admin.auth.admin.createUser({email:`${login}@auth.keychats.invalid`,password,email_confirm:true,app_metadata:{role:'member'}})
      if(error||!data.user)throw error??new Error('CREATE_USER_FAILED')
      users.push({id:data.user.id,login})
      const {error:profileError}=await admin.from('profiles').insert({user_id:data.user.id,username:login,display_name:`Visit ${i}`,status:'active'})
      if(profileError)throw profileError
    }
    const {data:site,error}=await admin.from('showcase_sites').insert({author_id:users[0].id,title:'Visit Counter Test',url:'https://example.com/',description:'E2E',color:'yellow',tags:[]}).select('id').single()
    if(error||!site)throw error??new Error('CREATE_SITE_FAILED')
    siteId=site.id
    const viewer=createClient(url,publishable,{auth:{persistSession:false,autoRefreshToken:false}})
    const {error:authError}=await viewer.auth.signInWithPassword({email:`${users[1].login}@auth.keychats.invalid`,password})
    if(authError)throw authError
    const results=await Promise.all(Array.from({length:8},()=>viewer.rpc('record_showcase_visit',{target_site_id:siteId})))
    expect(results.every(r=>!r.error)).toBe(true)
    const {data:count}=await admin.from('showcase_visit_counts').select('visit_count').eq('site_id',siteId).single()
    expect(Number(count?.visit_count)).toBe(1)
    for(let i=0;i<2;i++){
      const page=await contexts[i].newPage()
      await page.goto('/chats/login')
      await page.getByLabel('아이디').fill(users[i].login)
      await page.getByLabel('비밀번호').fill(password)
      await page.getByRole('button',{name:'로그인',exact:true}).click()
      await expect(page).toHaveURL(/\/chats\/(?:settings|channel\/)/)
      await page.goto('/chats/showcase')
      const card=page.locator(`[data-showcase-site="${siteId}"]`)
      await expect(card.locator('[data-showcase-visit-count]')).toHaveText('방문 1회')
      // Avoid relying on the external site's availability when testing the native popup.
      await contexts[i].route('https://example.com/**',route=>route.fulfill({contentType:'text/html',body:'Site opened'}))
      const popupPromise=page.waitForEvent('popup')
      await card.getByRole('link',{name:'방문하기 ↗'}).click()
      const popup=await popupPromise
      await expect(popup).toHaveURL('https://example.com/')
      await popup.close()
      await expect.poll(async()=>Number((await admin.from('showcase_visit_counts').select('visit_count').eq('site_id',siteId!).single()).data?.visit_count)).toBe(1)
      await page.reload()
      await expect(page.locator(`[data-showcase-site="${siteId}"] [data-showcase-visit-count]`)).toHaveText('방문 1회')
    }
  } finally {
    await Promise.all(contexts.map(c=>c.close()))
    if(siteId)await admin.from('showcase_sites').delete().eq('id',siteId)
    for(const user of users)await admin.auth.admin.deleteUser(user.id)
  }
})
