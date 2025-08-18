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
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [needsApproval, setNeedsApproval] = useState(false)
  const [currentTab, setCurrentTab] = useState<'groups' | 'posts' | 'scraping' | 'admin'>('groups')
  const [groupsPage, setGroupsPage] = useState(1)
  const [groupsPagination, setGroupsPagination] = useState<any>(null)

  const formatMemberCount = (count: number) => {
    if (count >= 1000000) {
      return (count / 1000000).toFixed(1).replace('.0', '') + 'M'
    } else if (count >= 1000) {
      return (count / 1000).toFixed(1).replace('.0', '') + 'k'
    }
    return count.toString()
  }

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
          if (data.profile.role === 'admin') {
            loadUsers()
          }
        } else {
          setNeedsApproval(true)
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    }
  }

  const loadGroups = async (page: number = 1) => {
    try {
      const response = await fetch(`/api/groups?page=${page}&limit=100`)
      if (response.ok) {
        const data = await response.json()
        console.log('📊 Groups data received:', data)
        console.log('🖼️ First group thumbnail:', data.groups?.[0]?.thumbnail || data.groups?.[0]?.group_thumbnail)
        setGroups(data.groups || [])
        setGroupsPagination(data.pagination || null)
        setGroupsPage(page)
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

  const loadUsers = async () => {
    try {
      console.log('🔄 Loading users...')
      const response = await fetch('/api/admin/users')
      console.log('📡 API response status:', response.status)
      if (response.ok) {
        const data = await response.json()
        console.log('📊 API response data:', data)
        console.log('👥 Users count:', data.users?.length || 0)
        setUsers(data.users || [])
      } else {
        console.error('❌ Failed to load users, status:', response.status)
      }
    } catch (error) {
      console.error('Error loading users:', error)
    }
  }

  const updateUserRole = async (userId: string, role: string, status: string) => {
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          role,
          status
        })
      })

      if (response.ok) {
        await loadUsers() // 목록 새로고침
        alert('User permissions have been updated.')
      } else {
        alert('Failed to update permissions.')
      }
    } catch (error) {
      console.error('Error updating user role:', error)
      alert('An error occurred while updating permissions.')
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (needsApproval) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-6xl mb-4">⏳</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Pending Approval</h2>
          <p className="text-gray-600 mb-6">
            Your account has been created. Please wait for admin approval.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800">
              <strong>User Information:</strong><br/>
              Email: {profile?.email}<br/>
              Name: {profile?.name || 'N/A'}<br/>
              Status: {profile?.status === 'pending' ? 'Pending Approval' : profile?.status}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Logout
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
                Facebook Group Post Collection & Analysis Tool
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm text-gray-600">Welcome,</div>
                <div className="font-semibold text-gray-900">{user?.email}</div>
              </div>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                Logout
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
              👥 Groups
            </button>
            <button
              onClick={() => setCurrentTab('posts')}
              className={`px-6 py-2 rounded-md transition-colors ${
                currentTab === 'posts' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-600 hover:text-blue-600'
              }`}
            >
              📝 Posts
            </button>
            <button
              onClick={() => setCurrentTab('scraping')}
              className={`px-6 py-2 rounded-md transition-colors ${
                currentTab === 'scraping' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-600 hover:text-blue-600'
              }`}
            >
              🔄 Scraping
            </button>
            {profile?.role === 'admin' && (
              <button
                onClick={() => {
                  setCurrentTab('admin')
                  loadUsers() // 관리자 탭 클릭 시 사용자 목록 새로고침
                }}
                className={`px-6 py-2 rounded-md transition-colors ${
                  currentTab === 'admin' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-600 hover:text-blue-600'
                }`}
              >
                👑 Admin
              </button>
            )}
          </div>
        </div>

        {/* Tab Content */}
        {currentTab === 'groups' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Group Management</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {groups.length > 0 ? (
                groups.map((group) => (
                  <div key={group.id} className="border border-gray-200 rounded-lg p-2 h-20 flex items-center gap-2">
                    <img 
                      src={group.thumbnail || '/default-group.png'} 
                      alt={group.group_name}
                      className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                      onError={(e) => {
                        e.currentTarget.src = '/default-group.png'
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 text-sm truncate">{group.group_name}</h3>
                      <p className="text-xs text-gray-500 truncate">{group.group_url}</p>
                      {group.member_count && (
                        <p className="text-xs text-gray-500">
                          {formatMemberCount(group.member_count)} members
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-1">
                        <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                          group.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {group.status}
                        </span>
                        <button 
                          onClick={() => window.open(group.group_url, '_blank')}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          View
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full text-center text-gray-500 py-8">
                  <div className="text-2xl mb-2">📂</div>
                  <p>No registered groups.</p>
                </div>
              )}
            </div>
            
            {/* Pagination */}
            {groupsPagination && groupsPagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-600">
                  Showing {((groupsPagination.page - 1) * groupsPagination.limit) + 1} to {Math.min(groupsPagination.page * groupsPagination.limit, groupsPagination.total)} of {groupsPagination.total} groups
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => loadGroups(groupsPage - 1)}
                    disabled={!groupsPagination.hasPrev}
                    className={`px-3 py-1 text-sm rounded-lg border ${
                      groupsPagination.hasPrev 
                        ? 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50' 
                        : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                    }`}
                  >
                    Previous
                  </button>
                  
                  {/* Page Numbers */}
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, groupsPagination.totalPages) }, (_, i) => {
                      let pageNum;
                      if (groupsPagination.totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (groupsPagination.page <= 3) {
                        pageNum = i + 1;
                      } else if (groupsPagination.page >= groupsPagination.totalPages - 2) {
                        pageNum = groupsPagination.totalPages - 4 + i;
                      } else {
                        pageNum = groupsPagination.page - 2 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => loadGroups(pageNum)}
                          className={`px-2 py-1 text-sm rounded ${
                            pageNum === groupsPagination.page
                              ? 'bg-blue-600 text-white'
                              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    
                    {groupsPagination.totalPages > 5 && groupsPagination.page < groupsPagination.totalPages - 2 && (
                      <>
                        <span className="text-gray-500">...</span>
                        <button
                          onClick={() => loadGroups(groupsPagination.totalPages)}
                          className="px-2 py-1 text-sm rounded bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                        >
                          {groupsPagination.totalPages}
                        </button>
                      </>
                    )}
                  </div>
                  
                  <button
                    onClick={() => loadGroups(groupsPage + 1)}
                    disabled={!groupsPagination.hasNext}
                    className={`px-3 py-1 text-sm rounded-lg border ${
                      groupsPagination.hasNext 
                        ? 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50' 
                        : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                    }`}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {currentTab === 'posts' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Collected Posts</h2>
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
                        {new Date(post.time * 1000).toLocaleDateString('en-US', {
                          timeZone: 'Asia/Ho_Chi_Minh',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
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
                  <p>No collected posts available.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {currentTab === 'scraping' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Scraping Control</h2>
            <div className="text-center text-gray-500 py-8">
              <div className="text-2xl mb-2">🚧</div>
              <p>Scraping functionality is under development.</p>
              <p className="text-sm mt-2">Will be activated after n8n webhook integration.</p>
            </div>
          </div>
        )}

        {currentTab === 'admin' && profile?.role === 'admin' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">User Management</h2>
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Email</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Name</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Current Role</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Current Status</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Join Date</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">{u.email}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{u.name || 'N/A'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                          u.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                          u.role === 'user' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                          u.status === 'active' ? 'bg-green-100 text-green-800' :
                          u.status === 'inactive' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {u.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {new Date(u.created_at).toLocaleDateString('en-US', {
                          timeZone: 'Asia/Ho_Chi_Minh',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {u.status === 'pending' && (
                            <>
                              <button
                                onClick={() => updateUserRole(u.user_id, 'user', 'active')}
                                className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => updateUserRole(u.user_id, 'pending', 'inactive')}
                                className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {u.status === 'active' && u.role === 'user' && (
                            <button
                              onClick={() => updateUserRole(u.user_id, 'admin', 'active')}
                              className="px-3 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                            >
                              Make Admin
                            </button>
                          )}
                          {u.status === 'active' && u.role === 'admin' && u.user_id !== user?.id && (
                            <button
                              onClick={() => updateUserRole(u.user_id, 'user', 'active')}
                              className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                            >
                              Remove Admin
                            </button>
                          )}
                          {u.status === 'active' && (
                            <button
                              onClick={() => updateUserRole(u.user_id, u.role, 'inactive')}
                              className="px-3 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors"
                            >
                              Deactivate
                            </button>
                          )}
                          {u.status === 'inactive' && (
                            <button
                              onClick={() => updateUserRole(u.user_id, u.role, 'active')}
                              className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                            >
                              Activate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  <div className="text-2xl mb-2">👥</div>
                  <p>No registered users found.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}