'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'

interface Post {
  id?: string
  author_id?: number
  author?: string
  author_url?: string
  post_url?: string
  time?: string
  message?: string
  media_urls?: string | null
  group_id?: string
  group_name?: string
  group_url?: string
  group_thumbnail?: string
}

interface ReportClientProps {
  tableName: string
  initialPosts: Post[]
  initialTotalCount: number
}

export default function ReportClient({ tableName, initialPosts, initialTotalCount }: ReportClientProps) {
  const [posts, setPosts] = useState<Post[]>(initialPosts)
  const [filteredPosts, setFilteredPosts] = useState<Post[]>(initialPosts)
  const [selectedPosts, setSelectedPosts] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(initialTotalCount)
  const [pagination, setPagination] = useState<any>(null)
  const postsPerPage = 100

  const [filters, setFilters] = useState({
    keyword: '',
    thumbnailFilter: 'all',
    dateFilter: 'all',
    dateFrom: '',
    dateTo: '',
    selectedGroupId: null as string | null
  })
  
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0)
  const [currentImages, setCurrentImages] = useState<string[]>([])
  const [groupStats, setGroupStats] = useState<any[]>([])
  const [isServerSearching, setIsServerSearching] = useState(false)

  useEffect(() => {
    if (currentPage > 1) {
      loadTableData()
    }
  }, [currentPage]) // eslint-disable-line react-hooks/exhaustive-deps

  // 필터가 변경될 때마다 필터링된 포스트 업데이트
  useEffect(() => {
    applyFilters()
  }, [filters, posts]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    generateGroupStats(posts)
  }, [posts])

  const loadTableData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/results/posts?table=${tableName}&page=${currentPage}&limit=${postsPerPage}`)
      if (response.ok) {
        const data = await response.json()
        setPosts(data.posts || [])
        setFilteredPosts(data.posts || [])
        setPagination(data.pagination)
        setTotalCount(data.pagination?.total || 0)
        
        // 그룹 통계 생성
        generateGroupStats(data.posts || [])
      }
    } catch (error) {
      console.error('Error loading table data:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateGroupStats = (posts: Post[]) => {
    const groupMap = new Map()
    posts.forEach(post => {
      if (post.group_id) {
        if (!groupMap.has(post.group_id)) {
          groupMap.set(post.group_id, {
            groupId: post.group_id,
            groupName: post.group_name || 'Unknown Group',
            totalPosts: 0,
            lastCollected: new Date(post.time ? parseInt(post.time) * 1000 : Date.now())
          })
        }
        const group = groupMap.get(post.group_id)
        group.totalPosts++
      }
    })
    setGroupStats(Array.from(groupMap.values()))
  }

  // 베트남어 특수문자 제거 함수
  const removeVietnameseDiacritics = (str: string): string => {
    const diacriticsMap: { [key: string]: string } = {
      'à': 'a', 'á': 'a', 'ả': 'a', 'ã': 'a', 'ạ': 'a',
      'ă': 'a', 'ằ': 'a', 'ắ': 'a', 'ẳ': 'a', 'ẵ': 'a', 'ặ': 'a',
      'â': 'a', 'ầ': 'a', 'ấ': 'a', 'ẩ': 'a', 'ẫ': 'a', 'ậ': 'a',
      'è': 'e', 'é': 'e', 'ẻ': 'e', 'ẽ': 'e', 'ẹ': 'e',
      'ê': 'e', 'ề': 'e', 'ế': 'e', 'ể': 'e', 'ễ': 'e', 'ệ': 'e',
      'ì': 'i', 'í': 'i', 'ỉ': 'i', 'ĩ': 'i', 'ị': 'i',
      'ò': 'o', 'ó': 'o', 'ỏ': 'o', 'õ': 'o', 'ọ': 'o',
      'ô': 'o', 'ồ': 'o', 'ố': 'o', 'ổ': 'o', 'ỗ': 'o', 'ộ': 'o',
      'ơ': 'o', 'ờ': 'o', 'ớ': 'o', 'ở': 'o', 'ỡ': 'o', 'ợ': 'o',
      'ù': 'u', 'ú': 'u', 'ủ': 'u', 'ũ': 'u', 'ụ': 'u',
      'ư': 'u', 'ừ': 'u', 'ứ': 'u', 'ử': 'u', 'ữ': 'u', 'ự': 'u',
      'ỳ': 'y', 'ý': 'y', 'ỷ': 'y', 'ỹ': 'y', 'ỵ': 'y',
      'đ': 'd',
      'À': 'A', 'Á': 'A', 'Ả': 'A', 'Ã': 'A', 'Ạ': 'A',
      'Ă': 'A', 'Ằ': 'A', 'Ắ': 'A', 'Ẳ': 'A', 'Ẵ': 'A', 'Ặ': 'A',
      'Â': 'A', 'Ầ': 'A', 'Ấ': 'A', 'Ẩ': 'A', 'Ẫ': 'A', 'Ậ': 'A',
      'È': 'E', 'É': 'E', 'Ẻ': 'E', 'Ẽ': 'E', 'Ẹ': 'E',
      'Ê': 'E', 'Ề': 'E', 'Ế': 'E', 'Ể': 'E', 'Ễ': 'E', 'Ệ': 'E',
      'Ì': 'I', 'Í': 'I', 'Ỉ': 'I', 'Ĩ': 'I', 'Ị': 'I',
      'Ò': 'O', 'Ó': 'O', 'Ỏ': 'O', 'Õ': 'O', 'Ọ': 'O',
      'Ô': 'O', 'Ồ': 'O', 'Ố': 'O', 'Ổ': 'O', 'Ỗ': 'O', 'Ộ': 'O',
      'Ơ': 'O', 'Ờ': 'O', 'Ớ': 'O', 'Ở': 'O', 'Ỡ': 'O', 'Ợ': 'O',
      'Ù': 'U', 'Ú': 'U', 'Ủ': 'U', 'Ũ': 'U', 'Ụ': 'U',
      'Ư': 'U', 'Ừ': 'U', 'Ứ': 'U', 'Ử': 'U', 'Ữ': 'U', 'Ự': 'U',
      'Ỳ': 'Y', 'Ý': 'Y', 'Ỷ': 'Y', 'Ỹ': 'Y', 'Ỵ': 'Y',
      'Đ': 'D'
    }
    
    return str.replace(/[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴĐ]/g, char => diacriticsMap[char] || char)
  }

  const parseMediaUrls = (mediaUrls: string | null | undefined): string[] => {
    if (!mediaUrls) return []
    
    // 먼저 JSON 파싱 시도
    try {
      const parsed = JSON.parse(mediaUrls)
      if (Array.isArray(parsed)) {
        return parsed
      }
    } catch {
      // JSON이 아니면 | 구분자로 분리
      if (typeof mediaUrls === 'string') {
        return mediaUrls.split('|').filter(url => url.trim().length > 0)
      }
    }
    
    return []
  }

  const formatVietnameseDate = (timestamp: string) => {
    if (!timestamp) return 'N/A'
    try {
      const date = new Date(parseInt(timestamp) * 1000)
      return date.toLocaleDateString('en-US', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return timestamp
    }
  }

  const handlePostSelect = (postId: string) => {
    const newSelected = new Set(selectedPosts)
    if (newSelected.has(postId)) {
      newSelected.delete(postId)
    } else {
      newSelected.add(postId)
    }
    setSelectedPosts(newSelected)
  }

  const handleSelectAll = () => {
    const allIds = new Set(filteredPosts.map((_, index) => index.toString()))
    setSelectedPosts(allIds)
  }

  const handleUnselectAll = () => {
    setSelectedPosts(new Set())
  }

  const truncateMessage = (message: string) => {
    if (!message || message.trim().length === 0) {
      return { text: '', needsMore: false }
    }
    
    const lines = message.split('\n').filter(line => line.trim().length > 0)
    
    if (lines.length <= 5) {
      const hasLongLines = lines.some(line => line.length > 300)
      if (!hasLongLines) {
        return { text: message, needsMore: false }
      }
    }
    
    if (lines.length > 4) {
      const truncatedText = lines.slice(0, 4).join('\n')
      return { text: truncatedText, needsMore: true }
    }
    
    if (message.length > 300) {
      const words = message.split(' ')
      let truncated = ''
      for (let word of words) {
        if ((truncated + word).length > 250) break
        truncated += (truncated ? ' ' : '') + word
      }
      return { text: truncated, needsMore: true }
    }
    
    return { text: message, needsMore: false }
  }

  const openPostModal = (post: Post) => {
    setSelectedPost(post)
  }

  const closePostModal = useCallback(() => {
    setSelectedPost(null);
  }, []);

  const openImageModal = (images: string[], index: number) => {
    setCurrentImages(images)
    setSelectedImageIndex(index)
  }

  const closeImageModal = useCallback(() => {
    setCurrentImages([])
    setSelectedImageIndex(0)
  },[]);

  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (currentImages && currentImages.length > 0) {
          closeImageModal();
        } else if (selectedPost) {
          closePostModal();
        }
      }
    };

    document.addEventListener('keydown', handleEscapeKey);

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [closePostModal, closeImageModal, currentImages, selectedPost]);

  const nextImage = () => {
    setSelectedImageIndex((prev) => (prev + 1) % currentImages.length)
  }

  const prevImage = () => {
    setSelectedImageIndex((prev) => (prev - 1 + currentImages.length) % currentImages.length)
  }

  const applyFilters = () => {
    let filtered = [...posts]
    
    // 키워드 필터 (베트남어 특수문자 제거하여 유연한 검색)
    if (filters.keyword.trim()) {
      const keywords = filters.keyword.toLowerCase().split('&').map(k => k.trim()).filter(k => k)
      
      filtered = filtered.filter(post => {
        const searchText = removeVietnameseDiacritics([
          post.message || '',
          post.author || '',
          post.group_name || '',
        ].join(' ').toLowerCase())
        
        return keywords.every(keyword => {
          const normalizedKeyword = removeVietnameseDiacritics(keyword)
          return searchText.includes(normalizedKeyword)
        })
      })
    }
    
    // 썸네일 필터
    if (filters.thumbnailFilter === 'with') {
      filtered = filtered.filter(post => parseMediaUrls(post.media_urls).length > 0)
    } else if (filters.thumbnailFilter === 'without') {
      filtered = filtered.filter(post => parseMediaUrls(post.media_urls).length === 0)
    }
    
    // 그룹 필터
    if (filters.selectedGroupId) {
      filtered = filtered.filter(post => post.group_id === filters.selectedGroupId)
    }
    
    setFilteredPosts(filtered)
    setSelectedPosts(new Set()) // 필터 변경 시 선택 초기화
  }

  const filterByThumbnail = (type: string) => {
    setFilters(prev => ({ ...prev, thumbnailFilter: type }))
  }

  const filterByGroup = (groupId: string | null) => {
    setFilters(prev => ({ ...prev, selectedGroupId: groupId }))
  }

  const postsWithThumbnails = filteredPosts.filter(post => parseMediaUrls(post.media_urls as string | null).length > 0
  ).length;
  const postsWithoutThumbnails = filteredPosts.length - postsWithThumbnails

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    setSelectedPosts(new Set())
  }

  const performServerSearch = async (searchKeyword: string) => {
    if (!searchKeyword.trim()) {
      // 검색어가 없으면 첫 페이지로 리셋
      setCurrentPage(1)
      loadTableData()
      return
    }

    try {
      setIsServerSearching(true)
      setLoading(true)
      
      const response = await fetch(
        `/api/results/posts?table=${tableName}&keyword=${encodeURIComponent(searchKeyword.trim())}&page=1&limit=1000`
      )
      
      if (response.ok) {
        const data = await response.json()
        setPosts(data.posts || [])
        setFilteredPosts(data.posts || [])
        setPagination({
          ...data.pagination,
          isServerSearch: true
        })
        setTotalCount(data.pagination?.total || 0)
        setCurrentPage(1)
        
        // 그룹 통계 재생성
        generateGroupStats(data.posts || [])
      }
    } catch (error) {
      console.error('Error performing server search:', error)
    } finally {
      setLoading(false)
      setIsServerSearching(false)
    }
  }

  const handleKeywordChange = (value: string) => {
    setFilters(prev => ({ ...prev, keyword: value }))
  }

  const handleSearchSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      performServerSearch(filters.keyword)
    }
  }

  // 계산된 페이지네이션 정보
  const totalPages = Math.ceil(totalCount / postsPerPage)
  const currentPagination = pagination || {
    page: currentPage,
    totalPages,
    total: totalCount,
    hasPrev: currentPage > 1,
    hasNext: currentPage < totalPages
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-600">Loading Facebook Posts Data...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full" style={{ 
      background: '#e7f3ff', 
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", 
      color: '#1e293b', 
      lineHeight: '1.6',
      minHeight: '100vh'
    }}>
      <style jsx>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        
        body, input, button, select, textarea {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }

        .btn {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-primary {
          background: #3b82f6;
          color: white;
        }

        .btn-primary:hover {
          background: #2563eb;
        }

        .btn-premium {
          background: linear-gradient(135deg, #f59e0b, #d97706);
          color: white;
          position: relative;
        }

        .btn-premium:hover {
          background: linear-gradient(135deg, #d97706, #b45309);
        }

        .btn-premium:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }

        .btn-outline {
          background: white;
          color: #374151;
          border: 1px solid #d1d5db;
        }

        .btn-outline:hover {
          background: #f9fafb;
        }

        .btn-sm {
          padding: 0.25rem 0.5rem;
          font-size: 0.75rem;
        }

        .btn-destructive {
          background: #ef4444;
          color: white;
        }

        .btn-destructive:hover {
          background: #dc2626;
        }

        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .thumbnail-filter-btn {
          font-size: 14px;
          background-color: #fff;
          border: 1px solid #28a745;
          padding: 8px 14px;
          margin: 0 5px 5px 0;
          cursor: pointer;
          border-radius: 15px;
          transition: all 0.2s;
          color: #28a745;
          font-weight: normal;
        }

        .thumbnail-filter-btn:hover {
          background-color: #e8f5e8;
        }

        .thumbnail-filter-btn.active {
          background-color: #28a745;
          color: white;
          border-color: #28a745;
          font-weight: bold;
        }

        .group-filter-btn {
          padding: 0.5rem 1rem;
          border: 1px solid #d1d5db;
          border-radius: 20px;
          background: white;
          color: #374151;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .group-filter-btn:hover {
          background: #f3f4f6;
        }

        .group-filter-btn.active {
          background: #3b82f6;
          color: white;
          border-color: #3b82f6;
        }

        .form-input {
          width: 100%;
          padding: 0.5rem 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          font-size: 0.875rem;
        }

        .form-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
        }

        .search-input-with-clear {
          padding-right: 35px;
        }

        .search-clear-btn {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          font-size: 16px;
          color: #9ca3af;
          cursor: pointer;
          padding: 2px;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          display: flex;
          justify-content: center;
          align-items: center;
          transition: all 0.2s;
        }

        .search-clear-btn:hover {
          background-color: #f3f4f6;
          color: #374151;
        }
      `}</style>
      
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="header-content" style={{ maxWidth: '80rem', margin: '0 auto', padding: '1rem' }}>
          {/* Mobile-first responsive header */}
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div>
              <h1 className="text-lg md:text-xl font-bold text-gray-900">Facebook Posts Report ({tableName.toUpperCase()})</h1>
              <div className="text-xs md:text-sm text-gray-600">
                Total {totalCount} | Page {currentPage} of {currentPagination?.totalPages || 1} | Showing {filteredPosts.length} | Selected {selectedPosts.size}
              </div>
            </div>
            <div className="flex gap-1 md:gap-2 flex-wrap">
              <button className="btn btn-premium text-xs md:text-sm" disabled={selectedPosts.size === 0}>
                📋 Copy
              </button>
              <button className="btn btn-premium text-xs md:text-sm" disabled={selectedPosts.size === 0}>
                💬 Zalo
              </button>
              <button className="btn btn-premium text-xs md:text-sm" disabled={selectedPosts.size === 0}>
                📧 Email
              </button>
              <button className="btn btn-primary text-xs md:text-sm" disabled={selectedPosts.size === 0}>
                📊 Export
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="main-content" style={{ maxWidth: '80rem', margin: '0 auto', padding: '1rem 0.5rem md:1.5rem 1rem' }}>
        {/* Thumbnail Filter - Mobile Responsive */}
        <div className="thumbnail-filter-section" style={{ marginBottom: '20px' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#333', fontSize: '14px', textAlign: 'center' }} className="md:text-base">📊 Thumbnail Filter</h3>
          <div className="thumbnail-filter-buttons" style={{ marginBottom: '15px', paddingBottom: '10px', borderBottom: '1px solid #ddd', textAlign: 'center' }}>
            <button
              onClick={() => filterByThumbnail('all')}
              className={`thumbnail-filter-btn ${filters.thumbnailFilter === 'all' ? 'active' : ''}`}
              style={{ fontSize: '11px', padding: '6px 10px', margin: '0 2px 5px 0' }}
            >
              All ({posts.length})
            </button>
            <button
              onClick={() => filterByThumbnail('with')}
              className={`thumbnail-filter-btn ${filters.thumbnailFilter === 'with' ? 'active' : ''}`}
              style={{ fontSize: '11px', padding: '6px 10px', margin: '0 2px 5px 0' }}
            >
              With Media ({postsWithThumbnails})
            </button>
            <button
              onClick={() => filterByThumbnail('without')}
              className={`thumbnail-filter-btn ${filters.thumbnailFilter === 'without' ? 'active' : ''}`}
              style={{ fontSize: '11px', padding: '6px 10px', margin: '0 2px 5px 0' }}
            >
              No Media ({postsWithoutThumbnails})
            </button>
          </div>
        </div>

        {/* Group Filter Buttons */}
        {groupStats.length > 0 && (
          <div className="flex gap-2 mb-6 flex-wrap">
            <button 
              onClick={() => filterByGroup(null)}
              className={`group-filter-btn ${filters.selectedGroupId === null ? 'active' : ''}`}
            >
              ALL ({posts.length})
            </button>
            {groupStats.slice(0, 10).map((group) => (
              <button
                key={group.groupId}
                onClick={() => filterByGroup(group.groupId)}
                className={`group-filter-btn ${filters.selectedGroupId === group.groupId ? 'active' : ''}`}
              >
                {group.groupName} ({group.totalPosts})
              </button>
            ))}
          </div>
        )}

        {/* Controls - Mobile Responsive */}
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-4 gap-4">
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={handleSelectAll}
              className="btn btn-outline btn-sm text-xs"
            >
              Select All
            </button>
            <button
              onClick={handleUnselectAll}
              className="btn btn-outline btn-sm text-xs"
            >
              Unselect All
            </button>
            <button
              className="btn btn-destructive btn-sm text-xs"
              disabled={selectedPosts.size === 0}
            >
              Delete Selected
            </button>
          </div>
          
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2">
            {/* Date Filter */}
            <select
              value={filters.dateFilter}
              onChange={(e) => setFilters(prev => ({ ...prev, dateFilter: e.target.value }))}
              className="form-input text-sm"
              style={{ minWidth: '120px' }}
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
              <option value="custom">Custom Range</option>
            </select>

            {/* Custom Date Range */}
            {filters.dateFilter === 'custom' && (
              <div className="flex gap-1">
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                  className="form-input text-sm"
                  style={{ minWidth: '120px' }}
                />
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                  className="form-input text-sm"
                  style={{ minWidth: '120px' }}
                />
              </div>
            )}

            {/* Search Input */}
            <div className="relative flex-1 sm:flex-none">
              <input
                type="text"
                placeholder="Search posts... Press Enter for full search"
                value={filters.keyword}
                onChange={(e) => handleKeywordChange(e.target.value)}
                onKeyDown={handleSearchSubmit}
                className="form-input search-input-with-clear text-sm w-full"
                style={{ minWidth: '200px' }}
              />
              {filters.keyword && (
                <button
                  onClick={() => {
                    setFilters(prev => ({ ...prev, keyword: '' }))
                    // Clear 버튼 클릭 시 원본 데이터로 리셋
                    if (isServerSearching || pagination?.isServerSearch) {
                      loadTableData()
                    }
                  }}
                  className="search-clear-btn"
                  type="button"
                  title="Clear search"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Posts List */}
        <div className="flex flex-col gap-3 mb-6">
          {filteredPosts.length > 0 ? (
            filteredPosts.map((post, index) => {
              const postId = index.toString()
              const mediaUrls = parseMediaUrls(post.media_urls)
              const messageResult = truncateMessage(post.message || '')
              const isSelected = selectedPosts.has(postId)
              
              return (
                <div
                  key={index}
                  className="bg-white rounded-lg shadow-sm transition-shadow hover:shadow-md flex flex-col md:flex-row gap-4 relative"
                  style={{ padding: '1rem 0.5rem 1rem 1.5rem', minHeight: 'auto' }}
                >
                  {/* Post Controls */}
                  <div className="absolute top-4 left-0 flex flex-col gap-2 z-10">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handlePostSelect(postId)}
                      className="w-4 h-4"
                      style={{ margin: '2px 2px 2px 6px' }}
                    />
                  </div>

                  {/* Post Content */}
                  <div className="flex-1 flex flex-col p-0 m-0">
                    {/* Post Header */}
                    <div className="flex items-start gap-3 mb-0">
                      <Image
                        src={post.group_thumbnail || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjRTVFN0VCIi8+CjxwYXRoIGQ9Ik0yMCAxMkM5IDEyIDUgMTQgNSAyMEMxMyAzNSAxOCAzNSAzNSAyOCAzNSAyMCAzMSAxMiAyMCAxMloiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+Cg=='}
                        alt="Group"
                        width={40}
                        height={40}
                        className="cursor-pointer object-cover flex-shrink-0 w-10 h-10 md:w-12 md:h-12"
                        style={{ borderRadius: '8px' }}
                        onClick={() => post.group_url && window.open(post.group_url, '_blank')}
                      />
                      <div className="flex-1 flex flex-col justify-start gap-1">
                        <div className="font-black text-gray-900 text-sm md:text-base">
                          {post.group_name ? (
                            <a href={post.group_url || '#'} className="text-blue-600 cursor-pointer no-underline hover:underline" target="_blank" rel="noopener noreferrer">
                              {post.group_name}
                            </a>
                          ) : 'Personal Post'}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <a href={post.author_url || '#'} className="text-black font-medium text-xs md:text-sm no-underline hover:underline" target="_blank" rel="noopener noreferrer">
                            {post.author || 'Unknown Author'}
                          </a>
                          <span className="text-xs text-gray-400" suppressHydrationWarning>
                            {formatVietnameseDate(post.time || '')}
                          </span>
                          <a href={post.post_url || '#'} className="text-blue-600 text-xs no-underline hover:underline whitespace-nowrap" target="_blank" rel="noopener noreferrer">
                            View post
                          </a>
                        </div>
                      </div>
                    </div>

                    {/* Post Message */}
                    {messageResult.text && (
                      <p 
                        className="text-gray-700 mt-2 mb-0 cursor-pointer leading-6 whitespace-pre-wrap break-words text-xs md:text-sm"
                        onClick={() => openPostModal(post)}
                        style={{ 
                          maxHeight: 'none',
                          overflow: 'visible',
                          textIndent: '0',
                          padding: '0',
                          marginLeft: '0',
                          marginTop: '0.5rem'
                        }}
                      >
                        {messageResult.text}
                      </p>
                    )}

                    {/* See More Link */}
                    {messageResult.needsMore && (
                      <button
                        onClick={() => openPostModal(post)}
                        className="text-gray-500 text-xs md:text-sm cursor-pointer text-left py-1 hover:text-blue-600 transition-colors mt-1"
                      >
                        See more...
                      </button>
                    )}
                  </div>

                  {/* Post Media - Mobile Responsive */}
                  <div className="flex-none flex flex-col mt-2 md:mt-0 md:max-h-[180px] overflow-hidden w-full md:w-[270px]">
                    {mediaUrls.length > 0 && (
                      <div 
                        className="grid gap-1 overflow-hidden"
                        style={{ 
                          gridTemplateColumns: 'repeat(3, 1fr)',
                          gridTemplateRows: 'auto'
                        }}
                      >
                        {mediaUrls.slice(0, 6).map((url, idx) => (
                          <div key={idx} className="relative aspect-square">
                            <Image
                              src={url}
                              alt={`Media ${idx + 1}`}
                              width={85}
                              height={85}
                              className="cursor-pointer transition-transform hover:scale-105 object-cover w-full h-full"
                              style={{ borderRadius: '0.25rem' }}
                              onClick={() => openImageModal(mediaUrls, idx)}
                              onError={(e) => {
                                e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjRTVFN0VCIi8+CjxwYXRoIGQ9Ik0yMCAxMkM5IDEyIDUgMTQgNSAyMEMxMyAzNSAxOCAzNSAzNSAyOCAzNSAyMCAzMSAxMiAyMCAxMloiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+Cg=='
                              }}
                            />
                            {idx === 5 && mediaUrls.length > 6 && (
                              <div 
                                className="absolute inset-0 flex items-center justify-center font-bold text-sm md:text-xl cursor-pointer text-white"
                                style={{ background: 'rgba(0, 0, 0, 0.6)' }}
                                onClick={() => openImageModal(mediaUrls, idx)}
                              >
                                +{mediaUrls.length - 6}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          ) : (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <div className="text-4xl mb-4">📄</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Posts Found</h3>
              <p className="text-gray-600">No records found in {tableName} table.</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {currentPagination && currentPagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={!currentPagination.hasPrev}
              className="btn btn-outline btn-sm"
            >
              Previous
            </button>
            
            {Array.from({ length: Math.min(5, currentPagination.totalPages) }, (_, i) => {
              let pageNum;
              if (currentPagination.totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= currentPagination.totalPages - 2) {
                pageNum = currentPagination.totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`btn btn-sm ${
                    pageNum === currentPage
                      ? 'btn-primary'
                      : 'btn-outline'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={!currentPagination.hasNext}
              className="btn btn-outline btn-sm"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Post Detail Modal - Mobile Responsive */}
      {selectedPost && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000] p-4"
          onClick={closePostModal}
        >
          <div 
            className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-2 right-4 bg-none border-none text-xl cursor-pointer text-gray-500 hover:text-gray-700 z-[1001]"
              onClick={closePostModal}
            >
              ×
            </button>
            <div className="p-4 md:p-8">
              <div className="flex items-center gap-4 mb-6 pb-4 border-b border-gray-200">
                <Image
                  src={selectedPost.group_thumbnail || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjRTVFN0VCIi8+CjxwYXRoIGQ9Ik0yMCAxMkM5IDEyIDUgMTQgNSAyMEMxMyAzNSAxOCAzNSAzNSAyOCAzNSAyMCAzMSAxMiAyMCAxMloiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+Cg=='}
                  alt="Group"
                  width={48}
                  height={48}
                  className="w-10 h-10 md:w-12 md:h-12 rounded-lg object-cover"
                />
                <div>
                  <h3 className="m-0 text-base md:text-lg font-semibold">
                    <a href={selectedPost.group_url || '#'} target="_blank" rel="noopener noreferrer">
                      {selectedPost.group_name || 'Personal Post'}
                    </a>
                  </h3>
                  <p className="my-1 text-gray-500 text-xs md:text-sm">
                    By <a href={selectedPost.author_url || '#'} target="_blank" rel="noopener noreferrer">
                      {selectedPost.author || 'Unknown Author'}
                    </a>
                  </p>
                  <p className="my-1 text-gray-500 text-xs md:text-sm" suppressHydrationWarning>{formatVietnameseDate(selectedPost.time || '')}</p>
                </div>
              </div>
              <div className="mb-6">
                <p className="leading-6 mb-4 whitespace-pre-wrap break-words text-xs md:text-sm">
                  {selectedPost.message || 'No content'}
                </p>
                {/* Media Grid for Modal - Mobile Responsive */}
                {parseMediaUrls(selectedPost.media_urls).length > 0 && (
                  <div className="grid gap-1 mt-4" style={{ gridTemplateColumns: 'repeat(3, 1fr)', maxWidth: '300px' }}>
                    {parseMediaUrls(selectedPost.media_urls).slice(0, 6).map((url, idx) => (
                      <Image
                        key={idx}
                        src={url}
                        alt={`Media ${idx + 1}`}
                        width={85}
                        height={85}
                        className="aspect-square object-cover cursor-pointer transition-transform hover:scale-105 w-full"
                        style={{ borderRadius: '0.25rem' }}
                        onClick={() => openImageModal(parseMediaUrls(selectedPost.media_urls), idx)}
                      />
                    ))}
                  </div>
                )}
              </div>
              <div className="pt-4 border-t border-gray-200 text-center">
                {selectedPost.post_url && (
                  <a
                    href={selectedPost.post_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary text-sm"
                  >
                    View this post
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Modal - Mobile Responsive */}
      {currentImages.length > 0 && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000] p-4"
          onClick={closeImageModal}
        >
          <div 
            className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-2 right-4 bg-none border-none text-xl cursor-pointer text-gray-500 hover:text-gray-700 z-[1001]"
              onClick={closeImageModal}
            >
              ×
            </button>
            <div className="flex items-center justify-center p-4 md:p-8 relative">
              {currentImages.length > 1 && (
                <button
                  className="absolute left-2 md:left-5 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white border-none rounded-full w-8 h-8 md:w-10 md:h-10 cursor-pointer text-sm md:text-xl z-[1001] hover:bg-opacity-70 flex items-center justify-center"
                  onClick={prevImage}
                >
                  ←
                </button>
              )}
              <Image
                src={currentImages[selectedImageIndex]}
                alt="Full size"
                width={800}
                height={600}
                className="max-h-[70vh] max-w-full object-contain"
              />
              {currentImages.length > 1 && (
                <button
                  className="absolute right-2 md:right-5 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white border-none rounded-full w-8 h-8 md:w-10 md:h-10 cursor-pointer text-sm md:text-xl z-[1001] hover:bg-opacity-70 flex items-center justify-center"
                  onClick={nextImage}
                >
                  →
                </button>
              )}
            </div>
            {/* Image Counter */}
            {currentImages.length > 1 && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-70 text-white px-3 py-1 rounded-full text-sm">
                {selectedImageIndex + 1} / {currentImages.length}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}