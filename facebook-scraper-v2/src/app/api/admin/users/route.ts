import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { createServerClient as createSupabaseServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

// 관리자용 서버 클라이언트 (RLS 우회)
async function createAdminClient() {
  // Service Role Key 사용 시 쿠키 없이 생성
  return createSupabaseServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // Service Role Key 사용
    {
      cookies: {
        getAll() { return [] }, // 빈 쿠키로 세션 무시
        setAll() {}, // 쿠키 설정 무시
      },
    }
  )
}

// 모든 사용자 목록 조회 (관리자용)
export async function GET() {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Service Role로 현재 사용자가 admin인지 확인 (RLS 우회)
    const adminClient = await createAdminClient()
    const { data: currentProfile } = await adminClient
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (currentProfile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // 관리자 권한으로 모든 사용자 프로필 조회
    console.log('🔑 Using Service Role Key:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)
    const { data: users, error } = await adminClient
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false })

    console.log('🔍 Admin query result:', { users, error, count: users?.length })
    console.log('🔍 Full users data:', JSON.stringify(users, null, 2))

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

// 사용자 권한 업데이트 (관리자용)
export async function PATCH(request: Request) {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Service Role로 현재 사용자가 admin인지 확인 (RLS 우회)
    const adminClient = await createAdminClient()
    const { data: currentProfile } = await adminClient
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (currentProfile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { user_id, role, status } = await request.json()

    // 관리자 권한으로 사용자 정보 업데이트
    const { data: updatedProfile, error: updateError } = await adminClient
      .from('user_profiles')
      .update({ 
        role, 
        status, 
        updated_at: new Date().toISOString() 
      })
      .eq('user_id', user_id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating profile:', updateError)
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
    }

    return NextResponse.json({ profile: updatedProfile })
  } catch (error) {
    console.error('Error in profile update:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}