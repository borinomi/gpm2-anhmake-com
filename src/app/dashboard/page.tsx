'use client'


import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Group, UserProfile } from '@/lib/types'
import Image from 'next/image'

export default function DashboardPage() {
  const supabase = createClient()
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [groups, setGroups] = useState<Group[]>([])
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [needsApproval, setNeedsApproval] = useState(false)
  const [currentTab, setCurrentTab] = useState<'groups' | 'results' | 'admin'>('groups')
  const [groupsPage, setGroupsPage] = useState(1)
  const [groupsPagination, setGroupsPagination] = useState<any>(null)
  const [selectedView, setSelectedView] = useState<string>('')
  const [airtableViews, setAirtableViews] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedGroups, setSelectedGroups] = useState<{[viewId: string]: string[]}>({})
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<number | null>(null)
  const [availableTables, setAvailableTables] = useState<string[]>([])

  const formatMemberCount = (count: number) => {
    if (count >= 1000000) {
      return (count / 1000000).toFixed(1).replace('.0', '') + 'M'
    } else if (count >= 1000) {
      return (count / 1000).toFixed(1).replace('.0', '') + 'k'
    }
    return count.toString()
  }

  const loadAirtableViews = async () => {
    try {
      const response = await fetch('/api/airtable/views')
      if (response.ok) {
        const data = await response.json()
        console.log('📊 Airtable views loaded:', data.views)
        console.log('🔍 First view:', data.views[0])
        console.log('🔍 Second view:', data.views[1])
        setAirtableViews(data.views || [])
        
        // 첫 번째 View를 기본 선택
        if (data.views && data.views.length > 0 && !selectedView) {
          setSelectedView(data.views[0].id)
        }
      }
    } catch (error) {
      console.error('Error loading Airtable views:', error)
    }
  }

  // 그룹 선택 관련 함수들
  const toggleGroupSelection = (groupId: string) => {
    setSelectedGroups(prev => ({
      ...prev,
      [selectedView]: prev[selectedView]
        ? prev[selectedView].includes(groupId)
          ? prev[selectedView].filter(id => id !== groupId)
          : [...prev[selectedView], groupId]
        : [groupId]
    }))
  }

  const selectAllGroups = () => {
    const allGroupIds = groups.map(group => group.id)
    setSelectedGroups(prev => ({
      ...prev,
      [selectedView]: allGroupIds
    }))
  }

  const unselectAllGroups = () => {
    setSelectedGroups(prev => ({
      ...prev,
      [selectedView]: []
    }))
  }

  const isGroupSelected = (groupId: string) => {
    return selectedGroups[selectedView]?.includes(groupId) || false
  }

  const getSelectedCount = () => {
    return selectedGroups[selectedView]?.length || 0
  }

  const getSelectedGroupUrls = () => {
    const selectedIds = selectedGroups[selectedView] || []
    return groups
      .filter(group => selectedIds.includes(group.id))
      .map(group => group.group_url)
  }

  const sendToN8n = async () => {
    const selectedUrls = getSelectedGroupUrls()
    if (selectedUrls.length === 0) {
      alert('Please select at least one group')
      return
    }

    try {
      console.log('📤 Sending to n8n:', selectedUrls)
      // TODO: n8n webhook URL로 전송
      // await fetch('N8N_WEBHOOK_URL', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ groupUrls: selectedUrls })
      // })
      
      alert(`Ready to scrape ${selectedUrls.length} groups!\nURLs: ${selectedUrls.slice(0, 3).join(', ')}${selectedUrls.length > 3 ? '...' : ''}`)
    } catch (error) {
      console.error('Error sending to n8n:', error)
      alert('Failed to send to scraper')
    }
  }

  const loadAvailableTables = async () => {
    try {
      const response = await fetch('/api/results/tables')
      if (response.ok) {
        const data = await response.json()
        setAvailableTables(data.tables || [])
      }
    } catch (error) {
      console.error('Error loading tables:', error)
    }
  }

  const openTableReport = (tableName: string) => {
    // 모든 테이블을 새탭으로 열기
    const url = `/results/report?table=${encodeURIComponent(tableName)}`
    window.open(url, '_blank')
  }

  useEffect(() => {
    checkUser()
    loadAirtableViews()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // selectedView가 변경될 때마다 해당 View의 그룹 데이터 로드
  useEffect(() => {
    if (selectedView && profile?.status === 'active' && currentTab === 'groups') {
      loadGroups(1)
    }
  }, [selectedView, profile?.status, currentTab]) // eslint-disable-line react-hooks/exhaustive-deps

  // 드래그 종료를 위한 전역 이벤트 리스너
  useEffect(() => {
    const handleMouseUp = () => {
      setIsDragging(false)
      setDragStart(null)
    }

    if (isDragging) {
      document.addEventListener('mouseup', handleMouseUp)
      return () => document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

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
          if (currentTab === 'groups') {
            loadGroups()
          }
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
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '100',
        view: selectedView
      })
      
      if (searchTerm) {
        params.append('search', searchTerm)
      }
      
      const response = await fetch(`/api/groups?${params}`)
      if (response.ok) {
        const data = await response.json()
        console.log('📊 Groups data received:', data)
        
        setGroups(data.groups || [])
        setGroupsPagination(data.pagination || null)
        setGroupsPage(page)
        
        // View 카운트 업데이트
        setAirtableViews(prev => prev.map(view => 
          view.id === selectedView 
            ? { ...view, count: data.pagination?.total || 0 }
            : view
        ))
      }
    } catch (error) {
      console.error('Error loading groups:', error)
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
              onClick={() => {
                setCurrentTab('results')
                loadAvailableTables()
              }}
              className={`px-6 py-2 rounded-md transition-colors ${
                currentTab === 'results' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-600 hover:text-blue-600'
              }`}
            >
              📊 Results
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
            <div className="flex gap-6">
              {/* Left Sidebar - Airtable Views */}
              <div className="w-64 flex-shrink-0">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Airtable Views</h3>
                  <div className="space-y-2">
                    {airtableViews.map((view) => (
                      <button
                        key={view.id}
                        onClick={() => {
                          setSelectedView(view.id)
                          loadGroups(1)
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                          selectedView === view.id
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span>{view.name}</span>
                          <span className={`text-xs ${
                            selectedView === view.id ? 'text-blue-200' : 'text-gray-500'
                          }`}>
                            {view.count}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                  
                  {/* 선택된 그룹 수 표시 */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="text-xs text-gray-600 mb-2">
                      Selected: {getSelectedCount()} / {groups.length} groups
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={selectAllGroups}
                        disabled={getSelectedCount() === groups.length}
                        className="flex-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        Select All
                      </button>
                      <button
                        onClick={unselectAllGroups}
                        disabled={getSelectedCount() === 0}
                        className="flex-1 px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        Clear
                      </button>
                    </div>
                    
                    {/* Start Scraping 버튼 */}
                    {getSelectedCount() > 0 && (
                      <button
                        onClick={sendToN8n}
                        className="w-full mt-2 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        🚀 Start Working ({getSelectedCount()})
                      </button>
                    )}
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500">
                    <p>Views are managed in Airtable</p>
                  </div>
                </div>
              </div>
              
              {/* Right Content - Groups */}
              <div className="flex-1">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {airtableViews.find(v => v.id === selectedView)?.name || 'All Groups'}
                    </h4>
                    <p className="text-sm text-gray-500">
                      {groupsPagination?.total || 0} groups
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Search groups..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value)
                        // 검색어 변경 시 자동으로 새로 로드
                        setTimeout(() => loadGroups(1), 300)
                      }}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {groups.length > 0 ? (
                groups.map((group, index) => (
                  <div 
                    key={group.id} 
                    className={`border rounded-lg p-2 h-20 flex items-center gap-2 cursor-pointer transition-colors ${
                      isGroupSelected(group.id) 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => toggleGroupSelection(group.id)}
                    onMouseDown={(e) => {
                      setIsDragging(true)
                      setDragStart(index)
                      e.preventDefault()
                    }}
                    onMouseEnter={() => {
                      if (isDragging && dragStart !== null) {
                        const startIdx = Math.min(dragStart, index)
                        const endIdx = Math.max(dragStart, index)
                        const groupsToSelect = groups.slice(startIdx, endIdx + 1).map(g => g.id)
                        
                        setSelectedGroups(prev => ({
                          ...prev,
                          [selectedView]: [...new Set([...(prev[selectedView] || []), ...groupsToSelect])]
                        }))
                      }
                    }}
                    onMouseUp={() => {
                      setIsDragging(false)
                      setDragStart(null)
                    }}
                  >
                    {/* 체크박스 */}
                    <div className="flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={isGroupSelected(group.id)}
                        onChange={() => toggleGroupSelection(group.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </div>
                    
                    <Image 
                      src={group.thumbnail || '/default-group.png'} 
                      alt={group.group_name}
                      width={64}
                      height={64}
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
                          onClick={(e) => {
                            e.stopPropagation()
                            window.open(group.group_url, '_blank')
                          }}
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
            </div>
          </div>
        )}

        {currentTab === 'results' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-6">Available Tables</h2>
            
            {/* Default Tables (phòng, khách) */}
            <div className="mb-8">
              <h3 className="text-lg font-medium text-gray-800 mb-4">📊 Main Reports</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <button
                  onClick={() => openTableReport('phòng')}
                  className="p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
                >
                  <div className="text-3xl mb-2">🏠</div>
                  <div className="text-lg font-semibold">PHÒNG</div>
                  <div className="text-sm opacity-90">Main Report</div>
                </button>
                
                <button
                  onClick={() => openTableReport('khách')}
                  className="p-6 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
                >
                  <div className="text-3xl mb-2">👥</div>
                  <div className="text-lg font-semibold">KHÁCH</div>
                  <div className="text-sm opacity-90">Main Report</div>
                </button>
              </div>
            </div>

            {/* Additional Tables (saved reports) */}
            {availableTables.filter(table => !['phòng', 'khách'].includes(table.toLowerCase())).length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-4">💾 Saved Reports</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {availableTables
                    .filter(table => !['phòng', 'khách'].includes(table.toLowerCase()))
                    .map((table) => (
                      <button
                        key={table}
                        onClick={() => openTableReport(table)}
                        className="p-4 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 shadow-md"
                      >
                        <div className="text-2xl mb-1">📋</div>
                        <div className="text-sm font-medium truncate">{table.toUpperCase()}</div>
                        <div className="text-xs opacity-90">Saved Report</div>
                      </button>
                    ))}
                </div>
              </div>
            )}

            {availableTables.length === 0 && (
              <div className="text-center text-gray-500 py-12">
                <div className="text-4xl mb-4">📊</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No tables available</h3>
                <p className="text-gray-600">Start working with groups to generate reports.</p>
              </div>
            )}
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