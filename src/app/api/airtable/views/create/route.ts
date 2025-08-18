import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export const runtime = 'edge'

export async function POST(request: Request) {
  try {
    console.log('🔄 Create Airtable View API called')
    
    // 인증 확인
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 사용자 권한 확인 (admin만 View 생성 가능)
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role, status')
      .eq('user_id', user.id)
      .single()

    if (!profile || profile.status !== 'active' || profile.role !== 'admin') {
      return NextResponse.json({ 
        error: 'Access denied. Admin privileges required.',
      }, { status: 403 })
    }

    const { name, type = 'grid', filterConditions = [] } = await request.json()

    if (!name) {
      return NextResponse.json({ error: 'View name is required' }, { status: 400 })
    }

    // Airtable Meta API를 사용해서 새 View 생성
    const baseId = process.env.AIRTABLE_BASE_ID
    const tableName = process.env.AIRTABLE_TABLE_NAME
    const apiKey = process.env.AIRTABLE_API_KEY
    
    // 먼저 테이블 ID 가져오기
    const metaUrl = `https://api.airtable.com/v0/meta/bases/${baseId}/tables`
    
    console.log('📡 Getting table info from Airtable Meta API')
    
    const metaResponse = await fetch(metaUrl, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    })
    
    if (!metaResponse.ok) {
      console.error('❌ Airtable Meta API error:', metaResponse.status, metaResponse.statusText)
      return NextResponse.json({ error: 'Failed to fetch table info' }, { status: 500 })
    }
    
    const metaData = await metaResponse.json()
    const table = metaData.tables.find((t: any) => t.name === tableName)
    
    if (!table) {
      console.error('❌ Table not found:', tableName)
      return NextResponse.json({ error: 'Table not found' }, { status: 404 })
    }

    // 새 View 생성 - 다른 엔드포인트 시도
    const createViewUrl = `https://api.airtable.com/v0/meta/bases/${baseId}/tables/${table.id}/views`
    console.log('🔗 Create view URL:', createViewUrl)
    console.log('🔑 API Key exists:', !!apiKey)
    console.log('📊 Table ID:', table.id)
    
    const viewData = {
      name: name,
      type: type,
      // 기본 Grid View 설정
      ...(type === 'grid' && {
        visibleFieldIds: table.fields.slice(0, 5).map((field: any) => field.id) // 처음 5개 필드만 표시
      })
    }

    console.log('📡 Creating new view:', viewData)
    
    const createResponse = await fetch(createViewUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(viewData)
    })
    
    if (!createResponse.ok) {
      const errorData = await createResponse.json()
      console.error('❌ Failed to create view:', createResponse.status, errorData)
      return NextResponse.json({ 
        error: 'Failed to create view', 
        details: errorData 
      }, { status: createResponse.status })
    }
    
    const newView = await createResponse.json()
    console.log('✅ View created successfully:', newView.name)
    
    return NextResponse.json({ 
      success: true, 
      view: {
        id: newView.name, // 우리 시스템에서는 name을 id로 사용
        name: newView.name,
        type: newView.type,
        count: 0
      }
    })
  } catch (error) {
    console.error('❌ Error creating Airtable view:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}