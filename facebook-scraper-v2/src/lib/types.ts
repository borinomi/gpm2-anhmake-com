export interface User {
  id: string
  email: string
  name?: string
  avatar_url?: string
  created_at: string
}

export interface UserProfile {
  id: string
  user_id: string
  email: string
  name?: string
  avatar_url?: string
  role: 'admin' | 'user' | 'pending'
  status: 'active' | 'inactive' | 'pending'
  created_at: string
  updated_at: string
}

export interface Group {
  id: string
  group_name: string
  group_url: string
  group_id?: string
  status: 'active' | 'inactive'
  last_scraped?: string
  checked?: boolean
  thumbnail?: string
  group_thumbnail?: string
  member_count?: number
}

export interface Post {
  author_id: number
  author: string
  author_url: string
  post_url: string
  time: number
  message: string
  media_urls: string
  group_id: string
  group_name: string
  group_url: string
  group_thumbnail?: string
}