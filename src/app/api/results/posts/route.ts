import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export const runtime = 'edge'

export async function GET(request: Request) {
  try {
    console.log('🔄 Results Posts API called')
    
    // 사용자 인증 확인
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 사용자 권한 확인
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role, status')
      .eq('user_id', user.id)
      .single()

    if (!profile || profile.status !== 'active') {
      return NextResponse.json({ 
        error: 'Access denied. Please contact admin for approval.',
        needsApproval: !profile || profile.status === 'pending'
      }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = (page - 1) * limit
    const tableName = searchParams.get('table') || 'posts'
    const keyword = searchParams.get('keyword')
    
    // 테이블 접근 제어 - 숨겨진 테이블만 차단
    const hiddenTables = process.env.RESULTS_HIDDEN_TABLES?.split(',').map(t => t.trim()) || []
    
    if (hiddenTables.includes(tableName)) {
      return NextResponse.json({ error: 'Access denied to this table' }, { status: 403 })
    }
    
    console.log('📋 Pagination:', { page, limit, offset, table: tableName, keyword })

    // 메인 프로젝트에서 테이블 데이터 가져오기
    let query = supabase
      .from(tableName)
      .select('*', { count: 'exact' })
      .order('time', { ascending: false })

    // 키워드 검색이 있으면 전체 검색, 없으면 페이지네이션
    if (keyword && keyword.trim()) {
      const keywords = keyword.toLowerCase().split('&').map(k => k.trim()).filter(k => k)
      
      if (keywords.length > 0) {
        // 각 키워드에 대해 OR 조건으로 message, author, group_name 검색
        const orConditions = keywords.map(kw => 
          `message.ilike.%${kw}%,author.ilike.%${kw}%,group_name.ilike.%${kw}%`
        ).join(',')
        
        query = query.or(orConditions)
        console.log('🔍 Server search with keywords:', keywords)
      }
    } else {
      // 일반 페이지네이션
      query = query.range(offset, offset + limit - 1)
    }

    const { data: posts, error, count } = await query

    if (error) {
      console.error('❌ Error fetching posts:', error)
      return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 })
    }

    console.log('✅ Posts fetched:', posts?.length || 0)
    
    return NextResponse.json({ 
      success: true, 
      posts: posts || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
        hasNext: offset + limit < (count || 0),
        hasPrev: page > 1
      }
    })
  } catch (error) {
    console.error('❌ Error in results posts API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}