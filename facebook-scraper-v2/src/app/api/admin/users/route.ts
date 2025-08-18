import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export const runtime = 'edge'

// 모든 사용자 목록 조회 (관리자용)
export async function GET() {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 현재 사용자가 admin인지 확인
    const { data: currentProfile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (currentProfile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // 모든 사용자 프로필 조회
    const { data: users, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching users:', error)
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    return NextResponse.json({ users })
  } catch (error) {
    console.error('Error in admin users API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}