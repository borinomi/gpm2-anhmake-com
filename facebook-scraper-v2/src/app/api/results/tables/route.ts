import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'

export async function GET() {
  try {
    console.log('🔄 Results Tables API called')
    
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
        error: 'Access denied. Please contact admin for approval.'
      }, { status: 403 })
    }

    // 하드코딩된 테이블 목록 (실제 테이블이 있다고 가정)
    const defaultTables = ['phòng', 'khách']
    const filteredTables = filterTables(defaultTables)
    
    console.log('✅ Tables found:', filteredTables)
    
    return NextResponse.json({ 
      success: true, 
      tables: filteredTables
    })
  } catch (error) {
    console.error('❌ Error in results tables API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// 테이블 필터링 함수
function filterTables(tableNames: string[]): string[] {
  const hiddenTables = process.env.RESULTS_HIDDEN_TABLES?.split(',').map(t => t.trim()) || []
  
  return tableNames.filter(tableName => {
    // 시스템 테이블들 제외
    if (tableName.startsWith('_') || 
        tableName.startsWith('pg_') || 
        tableName.startsWith('information_schema') ||
        tableName.includes('geography_columns') ||
        tableName.includes('geometry_columns') ||
        tableName.includes('raster_') ||
        tableName.includes('spatial_ref_sys')) {
      return false
    }
    
    // 숨겨진 테이블들 제외
    if (hiddenTables.includes(tableName)) {
      return false
    }
    
    return true
  })
}