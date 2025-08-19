import { Suspense } from 'react'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import ReportClient from './ReportClient'

export const runtime = 'edge'

interface SearchParams {
  table?: string
}

interface Post {
  id?: string
  author_id?: number
  author?: string
  author_url?: string
  post_url?: string
  time?: string
  message?: string
  media_urls?: string | null
  group_id?: string
  group_name?: string
  group_url?: string
  group_thumbnail?: string
}

async function loadInitialData(tableName: string) {
  try {
    const supabase = await createServerSupabaseClient()
    
    // 초기 데이터 로드 (첫 페이지)
    const { data: posts, error, count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact' })
      .range(0, 99) // 첫 100개
      .order('time', { ascending: false })
    
    if (error) {
      console.error('Error loading posts:', error)
      return { posts: [], totalCount: 0 }
    }
    
    return {
      posts: posts || [],
      totalCount: count || 0
    }
  } catch (error) {
    console.error('Error in loadInitialData:', error)
    return { posts: [], totalCount: 0 }
  }
}

export default async function ReportPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const tableName = params.table || 'posts'
  
  // 서버에서 초기 데이터 로드
  const { posts, totalCount } = await loadInitialData(tableName)

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    }>
      <ReportClient 
        tableName={tableName}
        initialPosts={posts as Post[]}
        initialTotalCount={totalCount}
      />
    </Suspense>
  )
}