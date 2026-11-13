'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function logoutAction() {
  const client = await createClient()
  const { error } = await client.auth.signOut()
  if (error) throw error
  redirect('/login')
}
