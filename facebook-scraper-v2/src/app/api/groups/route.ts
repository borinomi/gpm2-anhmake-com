import { NextResponse } from 'next/server'
import { groupsTable } from '@/lib/airtable'
import { createServerClient } from '@/lib/supabase-server'

export const runtime = 'edge'

export async function GET() {
  try {
    // 인증 확인
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

    const records = await groupsTable.select().all()
    
    const groups = records.map(record => ({
      id: record.id,
      ...record.fields
    }))
    
    return NextResponse.json({ success: true, groups })
  } catch (error) {
    console.error('Error fetching groups:', error)
    return NextResponse.json({ error: 'Failed to fetch groups' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    // 인증 확인
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { group_name, group_url } = await request.json()
    
    const record = await groupsTable.create({
      group_name,
      group_url,
      status: 'active'
    })
    
    return NextResponse.json({ success: true, id: record.id })
  } catch (error) {
    console.error('Error creating group:', error)
    return NextResponse.json({ error: 'Failed to create group' }, { status: 500 })
  }
}