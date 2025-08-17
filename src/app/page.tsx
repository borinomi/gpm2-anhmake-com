'use client';

import { useEffect, useState, useRef } from 'react';

declare global {
  interface Window {
    gapi: any;
  }
}

interface Group {
  id: string
  name: string
  url: string
  thumbnail?: string
  checked: boolean
}

interface ScrapingStatus {
  status: 'idle' | 'running' | 'stopped' | 'completed'
  currentGroup?: string
  totalPosts: number
  progress: number
  logs: string[]
}

interface GroupInfo {
  id: string
  name: string
  url: string
  thumbnail?: string
  memberCount: number
  checked: boolean
  category?: string
}

interface Category {
  id: string
  name: string
  groupCount: number
}

const generateUniqueGroupId = () => {
  return `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export default function Home() {
  // Google OAuth states
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  
  // Main app states
  const [groups, setGroups] = useState<Group[]>([])
  const [allGroups, setAllGroups] = useState<GroupInfo[]>([])
  const [groupUrls, setGroupUrls] = useState("")
  const [addGroupUrls, setAddGroupUrls] = useState("")
  const [targetCount, setTargetCount] = useState("")
  const [daysFilter, setDaysFilter] = useState("")
  const [scrapingStatus, setScrapingStatus] = useState<ScrapingStatus>({
    status: 'idle',
    totalPosts: 0,
    progress: 0,
    logs: []
  })
  const [currentTab, setCurrentTab] = useState<'scraping' | 'reports' | 'groups'>('scraping')
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState<'name' | 'members'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [categories, setCategories] = useState<Category[]>([{id: 'unidentified', name: 'Unidentified', groupCount: 0}])
  const [selectedCategory, setSelectedCategory] = useState<string>('unidentified')

  const logContainerRef = useRef<HTMLDivElement>(null)
  const authCheckIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Google OAuth initialization with periodic session check
  useEffect(() => {
    const initializeGapi = () => {
      if (window.gapi) {
        window.gapi.load('auth2', () => {
          window.gapi.auth2.init({
            client_id: '403836712272-23j7evtiacnv09amsa519b37lib9v652.apps.googleusercontent.com',
          }).then(() => {
            const authInstance = window.gapi.auth2.getAuthInstance();
            const isSignedIn = authInstance.isSignedIn.get();
            setIsSignedIn(isSignedIn);
            
            if (isSignedIn) {
              const user = authInstance.currentUser.get();
              const profile = user.getBasicProfile();
              setUserProfile({
                id: profile.getId(),
                name: profile.getName(),
                email: profile.getEmail(),
                imageUrl: profile.getImageUrl(),
              });
            }

            // 주기적 인증 상태 체크 (30초마다)
            authCheckIntervalRef.current = setInterval(() => {
              const currentlySignedIn = authInstance.isSignedIn.get();
              if (!currentlySignedIn && isSignedIn) {
                // 세션 만료 시 자동 로그아웃
                console.log('Session expired, signing out...');
                setIsSignedIn(false);
                setUserProfile(null);
              }
            }, 30000);
          });
        });
      }
    };

    if (window.gapi) {
      initializeGapi();
    } else {
      const checkGapi = setInterval(() => {
        if (window.gapi) {
          clearInterval(checkGapi);
          initializeGapi();
        }
      }, 100);
      
      setTimeout(() => clearInterval(checkGapi), 5000);
    }

    // 컴포넌트 언마운트 시 인터벌 정리
    return () => {
      if (authCheckIntervalRef.current) {
        clearInterval(authCheckIntervalRef.current);
      }
    };
  }, []);

  // 탭 포커스 시 인증 상태 재확인
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && window.gapi) {
        const authInstance = window.gapi.auth2.getAuthInstance();
        if (authInstance) {
          const currentlySignedIn = authInstance.isSignedIn.get();
          if (!currentlySignedIn && isSignedIn) {
            setIsSignedIn(false);
            setUserProfile(null);
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isSignedIn]);

  const onSignIn = (googleUser: any) => {
    const profile = googleUser.getBasicProfile();
    setUserProfile({
      id: profile.getId(),
      name: profile.getName(),
      email: profile.getEmail(),
      imageUrl: profile.getImageUrl(),
    });
    setIsSignedIn(true);
  };

  const signOut = () => {
    if (window.gapi) {
      const auth2 = window.gapi.auth2.getAuthInstance();
      auth2.signOut().then(() => {
        setIsSignedIn(false);
        setUserProfile(null);
        if (authCheckIntervalRef.current) {
          clearInterval(authCheckIntervalRef.current);
        }
      });
    }
  };

  const handleManualSignIn = () => {
    if (window.gapi) {
      const authInstance = window.gapi.auth2.getAuthInstance();
      authInstance.signIn().then(onSignIn);
    }
  };

  // 로그인 화면
  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">
            GPM v2
          </h1>
          <p className="text-center text-gray-600 mb-8">
            Facebook Group Post Manager
          </p>

          <div className="space-y-4">
            <button
              onClick={handleManualSignIn}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center space-x-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 메인 앱 화면 (로그인 후)
  return (
    <div className="min-h-screen bg-blue-50">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-between items-center mb-4">
            <div></div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Facebook Group Manager
              </h1>
              <p className="text-gray-600">
                Extract and analyze Facebook group posts with advanced reporting
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm text-gray-600">Welcome,</div>
                <div className="font-semibold text-gray-900">{userProfile?.name}</div>
                <button
                  onClick={signOut}
                  className="mt-1 text-xs text-red-600 hover:text-red-800 underline"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex justify-center mb-8">
          <div className="bg-white rounded-lg shadow-lg p-1 inline-flex">
            <button
              onClick={() => setCurrentTab('scraping')}
              className={`px-6 py-2 rounded-md transition-colors ${
                currentTab === 'scraping' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-600 hover:text-blue-600'
              }`}
            >
              🔄 Collecting
            </button>
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
              onClick={() => setCurrentTab('reports')}
              className={`px-6 py-2 rounded-md transition-colors ${
                currentTab === 'reports' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-600 hover:text-blue-600'
              }`}
            >
              📊 Reports
            </button>
          </div>
        </div>

        {/* Tab Content Placeholder */}
        <div className="bg-white p-8 rounded-lg shadow-lg text-center">
          <h2 className="text-xl font-semibold mb-4">
            {currentTab === 'scraping' && '🔄 Scraping & Collection'}
            {currentTab === 'groups' && '👥 Group Management'}  
            {currentTab === 'reports' && '📊 Reports & Analytics'}
          </h2>
          <p className="text-gray-600">
            {currentTab === 'scraping' && 'Configure and run Facebook group post collection'}
            {currentTab === 'groups' && 'Manage your Facebook groups and categories'}
            {currentTab === 'reports' && 'View collected posts and generate reports'}
          </p>
          <div className="mt-8 text-sm text-gray-500">
            Tab content will be implemented next...
          </div>
        </div>
      </div>
    </div>
  );
}