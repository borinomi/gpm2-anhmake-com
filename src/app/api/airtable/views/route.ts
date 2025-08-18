import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export const runtime = 'edge'

export async function GET() {
  try {
    console.log('🔄 Airtable Views API called')
    
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

    // Airtable Meta API를 사용해서 테이블 정보 및 View 목록 가져오기
    const baseId = process.env.AIRTABLE_BASE_ID
    const tableName = process.env.AIRTABLE_TABLE_NAME
    const apiKey = process.env.AIRTABLE_API_KEY
    
    const metaUrl = `https://api.airtable.com/v0/meta/bases/${baseId}/tables`
    
    console.log('📡 Calling Airtable Meta API:', metaUrl)
    
    const response = await fetch(metaUrl, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    })
    
    if (!response.ok) {
      console.error('❌ Airtable Meta API error:', response.status, response.statusText)
      return NextResponse.json({ error: 'Failed to fetch Airtable views' }, { status: 500 })
    }
    
    const metaData = await response.json()
    console.log('📊 Airtable Meta data received')
    
    // 해당 테이블 찾기
    const table = metaData.tables.find((t: any) => t.name === tableName)
    if (!table) {
      console.error('❌ Table not found:', tableName)
      return NextResponse.json({ error: 'Table not found' }, { status: 404 })
    }
    
    // View 목록 추출 - 임시로 name을 id로 사용
    const views = table.views.map((view: any) => ({
      id: view.name,
      name: view.name,
      type: view.type,
      count: 0 // 초기값, 실제 카운트는 나중에 업데이트
    }))
    
    console.log('✅ Views found:', views.map((v: any) => v.name))
    console.log('🔍 Full views data:', views)
    
    return NextResponse.json({ 
      success: true, 
      views,
      tableName,
      tableId: table.id
    })
  } catch (error) {
    console.error('❌ Error in Airtable views API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}