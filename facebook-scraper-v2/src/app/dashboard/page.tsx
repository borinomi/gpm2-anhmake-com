'use client'

import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Group, Post, UserProfile } from '@/lib/types'

export default function DashboardPage() {
  const supabase = createClient()
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [groups, setGroups] = useState<Group[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [needsApproval, setNeedsApproval] = useState(false)
  const [currentTab, setCurrentTab] = useState<'groups' | 'posts' | 'scraping' | 'admin'>('groups')

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      router.push('/login')
      return
    }

    setUser(session.user)
    
    // 사용자 프로필 확인/생성
    await loadProfile()
    
    setLoading(false)
  }

  const loadProfile = async () => {
    try {
      const response = await fetch('/api/auth/profile')
      const data = await response.json()
      
      if (response.ok) {
        setProfile(data.profile)
        
        if (data.profile.status === 'active') {
          loadGroups()
          loadPosts()
        } else {
          setNeedsApproval(true)
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    }
  }

  const loadGroups = async () => {
    try {
      const response = await fetch('/api/groups')
      if (response.ok) {
        const data = await response.json()
        setGroups(data.groups || [])
      }
    } catch (error) {
      console.error('Error loading groups:', error)
    }
  }

  const loadPosts = async () => {
    try {
      const response = await fetch('/api/posts?limit=50')
      if (response.ok) {
        const data = await response.json()
        setPosts(data.posts || [])
      }
    } catch (error) {
      console.error('Error loading posts:', error)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">로딩 중...</div>
      </div>
    )
  }

  if (needsApproval) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-6xl mb-4">⏳</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">승인 대기 중</h2>
          <p className="text-gray-600 mb-6">
            계정이 생성되었습니다. 관리자의 승인을 기다리고 있습니다.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800">
              <strong>사용자 정보:</strong><br/>
              이메일: {profile?.email}<br/>
              이름: {profile?.name || 'N/A'}<br/>
              상태: {profile?.status === 'pending' ? '승인 대기' : profile?.status}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            로그아웃
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Facebook Scraper v2
              </h1>
              <p className="text-gray-600">
                Facebook 그룹 포스트 수집 및 분석 도구
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm text-gray-600">환영합니다,</div>
                <div className="font-semibold text-gray-900">{user?.email}</div>
              </div>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex justify-center mb-6">
          <div className="bg-white rounded-lg shadow-lg p-1 inline-flex">
            <button
              onClick={() => setCurrentTab('groups')}
              className={`px-6 py-2 rounded-md transition-colors ${
                currentTab === 'groups' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-600 hover:text-blue-600'
              }`}
            >
              👥 그룹 관리
            </button>
            <button
              onClick={() => setCurrentTab('posts')}
              className={`px-6 py-2 rounded-md transition-colors ${
                currentTab === 'posts' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-600 hover:text-blue-600'
              }`}
            >
              📝 포스트 보기
            </button>
            <button
              onClick={() => setCurrentTab('scraping')}
              className={`px-6 py-2 rounded-md transition-colors ${
                currentTab === 'scraping' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-600 hover:text-blue-600'
              }`}
            >
              🔄 스크래핑
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {currentTab === 'groups' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">그룹 관리</h2>
            <div className="space-y-4">
              {groups.length > 0 ? (
                groups.map((group) => (
                  <div key={group.id} className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900">{group.group_name}</h3>
                    <p className="text-sm text-gray-600">{group.group_url}</p>
                    <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                      group.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {group.status}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <div className="text-2xl mb-2">📂</div>
                  <p>등록된 그룹이 없습니다.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {currentTab === 'posts' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">수집된 포스트</h2>
            <div className="space-y-4">
              {posts.length > 0 ? (
                posts.slice(0, 10).map((post, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-medium text-gray-900">{post.author}</h3>
                        <p className="text-sm text-gray-600">{post.group_name}</p>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(post.time * 1000).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-gray-700 text-sm line-clamp-3">
                      {post.message?.substring(0, 200)}...
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <div className="text-2xl mb-2">📝</div>
                  <p>수집된 포스트가 없습니다.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {currentTab === 'scraping' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">스크래핑 제어</h2>
            <div className="text-center text-gray-500 py-8">
              <div className="text-2xl mb-2">🚧</div>
              <p>스크래핑 기능은 준비 중입니다.</p>
              <p className="text-sm mt-2">n8n 웹훅 연동 후 활성화됩니다.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}