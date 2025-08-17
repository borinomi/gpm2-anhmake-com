'use client';

import { useEffect, useState, useRef } from 'react';

declare global {
  interface Window {
    gapi: any;
  }
}

export default function Home() {
  // Google OAuth states
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isClient, setIsClient] = useState(false);
  
  // Simple states for main page
  const [currentTab, setCurrentTab] = useState<'scraping' | 'reports' | 'groups'>('scraping')

  const authCheckIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // 클라이언트 사이드에서만 실행되도록 설정
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Google OAuth initialization with periodic session check
  useEffect(() => {
    if (!isClient) return;
    
    // Global onSignIn function for platform.js
    (window as any).onSignIn = (googleUser: any) => {
      console.log('🔥 onSignIn called!', googleUser);
      try {
        const profile = googleUser.getBasicProfile();
        console.log('📝 Profile:', profile.getName(), profile.getEmail());
        setUserProfile({
          id: profile.getId(),
          name: profile.getName(),
          email: profile.getEmail(),
          imageUrl: profile.getImageUrl(),
        });
        setIsSignedIn(true);
        console.log('✅ Login successful, redirecting to main page...');
      } catch (error) {
        console.error('❌ Error in onSignIn:', error);
      }
    };

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
      delete (window as any).onSignIn;
    };
  }, [isClient]);

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


  // 디버깅용 로그
  console.log('🏠 Page render - isClient:', isClient, 'isSignedIn:', isSignedIn, 'userProfile:', userProfile);

  // 클라이언트가 로드되기 전에는 로딩 화면 표시
  if (!isClient) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
          <h1 className="text-2xl font-bold mb-6 text-gray-800">
            GPM v2
          </h1>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading...</p>
        </div>
      </div>
    );
  }

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

          <div className="text-center">
            <div className="g-signin2" data-onsuccess="onSignIn"></div>
            <p className="text-xs text-gray-500 mt-4">
              Check console for login debug info
            </p>
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

        {/* Tab Content - Simple placeholders for now */}
        <div className="bg-white p-8 rounded-lg shadow-lg text-center">
          <h2 className="text-xl font-semibold mb-4">
            {currentTab === 'scraping' && '🔄 Scraping & Collection'}
            {currentTab === 'groups' && '👥 Group Management'}  
            {currentTab === 'reports' && '📊 Reports & Analytics'}
          </h2>
          <p className="text-gray-600 mb-4">
            {currentTab === 'scraping' && 'Configure and run Facebook group post collection'}
            {currentTab === 'groups' && 'Manage your Facebook groups and categories'}
            {currentTab === 'reports' && 'View collected posts and generate reports'}
          </p>
          <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800 text-sm">
              ✅ Successfully logged in as <strong>{userProfile?.name}</strong>
            </p>
            <p className="text-green-600 text-xs mt-1">
              Main functionality will be implemented in next steps
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}