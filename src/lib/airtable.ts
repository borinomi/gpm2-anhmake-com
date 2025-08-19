import Airtable from 'airtable'

// 빌드 시 환경변수가 없어도 에러 방지 - 런타임에만 초기화
let _groupsTable: any = null

export const groupsTable = new Proxy({} as any, {
  get(_, prop) {
    if (!_groupsTable) {
      if (!process.env.AIRTABLE_API_KEY) {
        throw new Error('AIRTABLE_API_KEY is required')
      }
      const base = new Airtable({
        apiKey: process.env.AIRTABLE_API_KEY
      }).base(process.env.AIRTABLE_BASE_ID!)
      _groupsTable = base(process.env.AIRTABLE_TABLE_NAME!)
    }
    return _groupsTable[prop]
  }
})

export interface AirtableGroup {
  id: string
  group_name: string
  group_url: string
  group_id?: string
  status: 'active' | 'inactive'
  last_scraped?: string
}