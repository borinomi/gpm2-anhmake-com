import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// Results 전용 Supabase 서버 클라이언트
export const createResultsServerClient = async () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_RESULTS_SUPABASE_URL
  const supabaseServiceKey = process.env.RESULTS_SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Results Supabase server environment variables')
  }
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
    },
  })
}

// Results 전용 Supabase 클라이언트 (서버 사이드, 사용자 세션 포함)
export const createResultsServerClientWithAuth = async () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_RESULTS_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_RESULTS_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Results Supabase environment variables')
  }
  
  const cookieStore = await cookies()
  
  return createClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get: (key: string) => cookieStore.get(key)?.value,
      set: (key: string, value: string, options: any) => {
        cookieStore.set(key, value, options)
      },
      remove: (key: string, options: any) => {
        cookieStore.set(key, '', { ...options, maxAge: 0 })
      },
    },
  })
}