import { NextResponse } from 'next/server'
import { groupsTable } from '@/lib/airtable'
import { createServerClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  try {
    console.log('🔄 Groups API called')
    
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

    // 페이지네이션 파라미터
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '100')
    const view = searchParams.get('view') || 'Grid view' // 기본값은 'Grid view'
    const offset = (page - 1) * limit

    console.log('📋 Pagination:', { page, limit, offset, view })
    console.log('🔍 Received view parameter:', view)
    console.log('🔍 View type:', typeof view)

    console.log('📡 Calling Airtable select with view:', view)
    
    // Airtable View를 사용해서 데이터 가져오기
    console.log('🔍 Received view parameter:', view, 'Type:', typeof view)
    
    let selectOptions = undefined
    if (view && view !== 'all' && view.trim() !== '') {
      // Plain object 생성 보장
      selectOptions = JSON.parse(JSON.stringify({ view: view.trim() }))
      console.log('📋 SelectOptions created:', selectOptions)
    }
    
    const allRecords = await groupsTable.select(selectOptions).all()
    const totalRecords = allRecords.length
    
    // 페이지네이션 적용
    const startIndex = offset
    const endIndex = offset + limit
    const paginatedRecords = allRecords.slice(startIndex, endIndex)
    
    console.log('📊 Total records:', totalRecords, 'Page records:', paginatedRecords.length)
    
    const groups = paginatedRecords.map((record: any) => {
      // Airtable attachment 배열에서 첫 번째 이미지 URL 추출
      const thumbnailArray = record.fields.group_thumbnail
      const thumbnailUrl = Array.isArray(thumbnailArray) && thumbnailArray.length > 0 
        ? thumbnailArray[0].url 
        : null
      
      const memberCount = record.fields.Member ? parseInt(record.fields.Member.toString().replace(/,/g, ''), 10) : null
      
      return {
        id: record.id,
        ...record.fields,
        thumbnail: thumbnailUrl,
        member_count: memberCount
      }
    })
    
    console.log('✅ Groups processed:', groups.length)
    console.log('🖼️ Sample thumbnail:', groups[0]?.thumbnail)
    console.log('👥 Sample member count:', groups[0]?.member_count)
    
    return NextResponse.json({ 
      success: true, 
      groups,
      pagination: {
        page,
        limit,
        total: totalRecords,
        totalPages: Math.ceil(totalRecords / limit),
        hasNext: endIndex < totalRecords,
        hasPrev: page > 1
      }
    })
  } catch (error) {
    console.error('❌ Error fetching groups:', error)
    console.error('❌ Error details:', error instanceof Error ? error.message : String(error))
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