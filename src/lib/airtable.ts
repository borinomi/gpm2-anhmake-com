import Airtable from 'airtable'

// Node.js runtime에서만 사용되는 직접 초기화
const base = new Airtable({
  apiKey: process.env.AIRTABLE_API_KEY!
}).base(process.env.AIRTABLE_BASE_ID!)

export const groupsTable = base(process.env.AIRTABLE_TABLE_NAME!)

export interface AirtableGroup {
  id: string
  group_name: string
  group_url: string
  group_id?: string
  status: 'active' | 'inactive'
  last_scraped?: string
}