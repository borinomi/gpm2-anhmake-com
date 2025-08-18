# Facebook Scraper v2 - 기술 스택 가이드

## 🏗️ 아키텍처 개요

```
GitHub → Cloudflare Pages (Next.js) → Airtable + n8n + Supabase
```

### 서비스 구성
- **프론트엔드**: Next.js (Cloudflare Pages 호스팅)
- **인증**: Supabase Auth (Google OAuth 2.0)
회원가입/인증은 supabasse연동 user_profiles 테이블 사용
로그인 흐름은 다음을 따름 : 1 user가 로그인버튼 클릭 -> /auth/signin 이동, next파라미터 값 필요 -> supabase.auth.signinwithoauth 호출하여 provide="google", redirectTo= /auth/callback으로 google로 리다이렉트 -> google 로그인/동의 화면 -> google 에서 auth로 code전달=콜백도착, 세션교환/쿠키심기 -> 쿠키세팅, 세션쿠키발급, next검증 -> next로 리다이렉트, 쿠키 브라우저에 심어짐-> SSR요청, getuser호출
- **그룹 관리**: Airtable
- **스크래핑**: n8n 웹훅 → app.py


---

## 📦 Next.js 프로젝트 설정

### 1. 프로젝트 생성
```bash
npx create-next-app@latest facebook-scraper-v2 --typescript --tailwind --eslint --app
cd facebook-scraper-v2
```

### 2. 필수 패키지 설치
```bash
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs airtable
```

### 3. 개발 환경 패키지
```bash
npm install -D @types/node
```

---

## ⚙️ 환경변수 설정

### `.env.local` 파일 생성
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://iezbufqfrblbhetexude.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Airtable
AIRTABLE_API_KEY=keyXXXXXXXXXXXXXX
AIRTABLE_BASE_ID=appXXXXXXXXXXXXXX
AIRTABLE_TABLE_NAME=Groups

# n8n Webhooks
N8N_WEBHOOK_URL=https://your-n8n.com/webhook/facebook-scraper
N8N_CALLBACK_SECRET=your-secret-key

# Site Configuration
NEXT_PUBLIC_SITE_URL=https://facebook-scraper.pages.dev
```

---

## 🔧 Next.js 설정

### `next.config.ts`
```typescript
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: true,
  },
  // Cloudflare Pages 최적화
  images: {
    unoptimized: true
  }
}

module.exports = nextConfig
```

### `middleware.ts` (루트 디렉토리)
```typescript
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  
  // Auth 세션 새로고침
  await supabase.auth.getSession()
  
  // 로그인이 필요한 페이지 보호
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user && req.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', req.url))
  }
  
  return res
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
```

---

## 🗂️ 프로젝트 구조

```
src/
├── app/
│   ├── api/
│   │   ├── groups/              # Airtable 그룹 관리
│   │   │   └── route.ts
│   │   ├── scraping/            # n8n 웹훅 호출
│   │   │   ├── start/
│   │   │   │   └── route.ts
│   │   │   └── callback/
│   │   │       └── route.ts
│   │   └── posts/               # Supabase 포스트 조회
│   │       └── route.ts
│   ├── auth/
│   │   └── callback/            # Supabase Auth 콜백
│   │       └── route.ts
│   ├── dashboard/               # 메인 대시보드
│   │   └── page.tsx
│   ├── login/                   # 로그인 페이지
│   │   └── page.tsx
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/                      # 재사용 UI 컴포넌트
│   ├── GroupManager.tsx         # 그룹 관리 컴포넌트
│   ├── ScrapingControl.tsx      # 스크래핑 제어 컴포넌트
│   └── PostsViewer.tsx          # 포스트 뷰어 컴포넌트
├── lib/
│   ├── supabase.ts              # Supabase 클라이언트
│   ├── airtable.ts              # Airtable 클라이언트
│   └── types.ts                 # TypeScript 타입 정의
└── utils/
    └── helpers.ts               # 유틸리티 함수
```

---

## 🔗 API 라우트 구현

### 1. Supabase 클라이언트 (`lib/supabase.ts`)
```typescript
import { createClientComponentClient, createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

// 클라이언트 사이드
export const createClient = () => createClientComponentClient()

// 서버 사이드
export const createServerClient = () => createServerComponentClient({ cookies })
```

### 2. Airtable 클라이언트 (`lib/airtable.ts`)
```typescript
import Airtable from 'airtable'

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
```

### 3. 그룹 관리 API (`app/api/groups/route.ts`)
```typescript
import { NextResponse } from 'next/server'
import { groupsTable } from '@/lib/airtable'

export const runtime = 'edge'

export async function GET() {
  try {
    const records = await groupsTable.select({
      filterByFormula: "{status} = 'active'"
    }).all()
    
    const groups = records.map(record => ({
      id: record.id,
      ...record.fields
    }))
    
    return NextResponse.json({ success: true, groups })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch groups' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { group_name, group_url } = await request.json()
  
  try {
    const record = await groupsTable.create({
      group_name,
      group_url,
      status: 'active'
    })
    
    return NextResponse.json({ success: true, id: record.id })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create group' }, { status: 500 })
  }
}
```

### 4. 스크래핑 시작 API (`app/api/scraping/start/route.ts`)
```typescript
import { NextResponse } from 'next/server'

export const runtime = 'edge'

export async function POST(request: Request) {
  const { groups, targetCount, daysFilter } = await request.json()
  
  try {
    // n8n 웹훅으로 스크래핑 요청 전송
    const response = await fetch(process.env.N8N_WEBHOOK_URL!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        groups,
        target_post_count: targetCount,
        days_filter: daysFilter,
        callback_url: `${process.env.NEXT_PUBLIC_SITE_URL}/api/scraping/callback`,
        callback_secret: process.env.N8N_CALLBACK_SECRET
      })
    })
    
    const result = await response.json()
    
    return NextResponse.json({
      success: true,
      taskId: result.task_id,
      message: 'Scraping started successfully'
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to start scraping' }, { status: 500 })
  }
}
```

---

## 🎨 주요 컴포넌트

### 1. 로그인 컴포넌트 (`app/login/page.tsx`)
```typescript
'use client'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const supabase = createClient()
  const router = useRouter()
  
  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center">
      <button 
        onClick={handleGoogleLogin}
        className="bg-blue-500 text-white px-6 py-3 rounded-lg"
      >
        Continue with Google
      </button>
    </div>
  )
}
```

### 2. 인증 콜백 (`app/auth/callback/route.ts`)
```typescript
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  
  if (code) {
    const supabase = createRouteHandlerClient({ cookies })
    await supabase.auth.exchangeCodeForSession(code)
  }
  
  return NextResponse.redirect(`${origin}/dashboard`)
}
```

---

## 🚀 Cloudflare Pages 배포

### 1. 빌드 설정
```
Framework preset: Next.js
Build command: npm run build
Build output directory: .next
Root directory: /
Node.js version: 18
```

### 2. 환경변수 설정
Cloudflare Pages → Settings → Environment variables에서 모든 환경변수 설정

### 3. 도메인 연결
- Custom domain 추가
- DNS 설정으로 도메인 연결

---

## 🔄 n8n 워크플로우 설계

### 워크플로우 구성
```
1. Webhook Trigger (Next.js에서 호출)
   ↓
2. HTTP Request (app.py 실행 요청)
   ↓
3. Wait for Completion
   ↓
4. CSV to Supabase (UPSERT)
   ↓
5. Callback to Next.js (완료 알림)
```

---

## 📊 데이터 모델

### Airtable Groups 테이블
```
- id (Record ID)
- group_name (Text)
- group_url (URL)
- group_id (Text, optional)
- status (Single Select: active/inactive)
- last_scraped (DateTime)
- created_at (DateTime)
```

### Supabase Posts 테이블 (기존 phong 테이블 사용)
```sql
CREATE TABLE phong (
  author_id BIGINT PRIMARY KEY,
  author TEXT,
  author_url TEXT,
  post_url TEXT,
  time BIGINT, -- Unix timestamp
  message TEXT,
  media_urls TEXT, -- Pipe-separated URLs
  group_id TEXT,
  group_name TEXT,
  group_url TEXT,
  group_thumbnail TEXT
);
```

---

## 🛠️ 개발 워크플로우

### 1. 로컬 개발
```bash
npm run dev
```

### 2. 타입 체크
```bash
npm run type-check
```

### 3. 배포
```bash
git add .
git commit -m "feat: implement feature"
git push origin main
# Cloudflare Pages 자동 배포
```

---

## 🔒 보안 고려사항

### 1. 환경변수 보호
- 모든 API 키를 환경변수로 관리
- 클라이언트에 노출되지 않도록 주의

### 2. 인증 검증
```typescript
// API 라우트에서 사용자 인증 확인
const supabase = createRouteHandlerClient({ cookies })
const { data: { user } } = await supabase.auth.getUser()

if (!user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

### 3. 웹훅 보안
```typescript
// n8n 콜백 검증
const providedSecret = request.headers.get('x-callback-secret')
if (providedSecret !== process.env.N8N_CALLBACK_SECRET) {
  return NextResponse.json({ error: 'Invalid secret' }, { status: 403 })
}
```

---

## 📈 모니터링 & 로깅

### 1. Cloudflare Analytics
- 페이지 뷰, 성능 모니터링
- 오류 추적

### 2. Supabase 로그
- 데이터베이스 쿼리 모니터링
- 인증 로그 확인

### 3. n8n 실행 로그
- 워크플로우 실행 상태
- 오류 디버깅

---

이 가이드를 따라 구현하면 완전히 서버리스이면서 확장 가능한 Facebook Scraper v2를 구축할 수 있습니다.