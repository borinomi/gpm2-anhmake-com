import { createBrowserClient } from '@supabase/ssr'

// 클라이언트 사이드
export const createClient = () => 
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )