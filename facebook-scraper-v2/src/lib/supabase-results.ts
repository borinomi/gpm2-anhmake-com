import { createClient } from '@supabase/supabase-js'

// Results 전용 Supabase 클라이언트 (클라이언트 사이드)
export const createResultsClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_RESULTS_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_RESULTS_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Results Supabase environment variables')
  }
  
  return createClient(supabaseUrl, supabaseAnonKey)
}