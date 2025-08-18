import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'

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
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit
    const tableName = searchParams.get('table') || 'posts'
    
    // 테이블 접근 제어 - 숨겨진 테이블만 차단
    const hiddenTables = process.env.RESULTS_HIDDEN_TABLES?.split(',').map(t => t.trim()) || []
    
    if (hiddenTables.includes(tableName)) {
      return NextResponse.json({ error: 'Access denied to this table' }, { status: 403 })
    }
    
    console.log('📋 Pagination:', { page, limit, offset, table: tableName })

    // 메인 프로젝트에서 테이블 데이터 가져오기
    // phòng, khách 테이블은 time 컬럼 사용 (베트남 현지 시간 저장됨)
    const { data: posts, error, count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact' })
      .order('time', { ascending: false })
      .range(offset, offset + limit - 1)

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