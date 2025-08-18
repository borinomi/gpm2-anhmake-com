# Facebook Scraper v2

서버리스 아키텍처 기반의 Facebook 그룹 포스트 수집 및 분석 도구

## 🏗️ 아키텍처

```
GitHub → Cloudflare Pages (Next.js) → Airtable + n8n + Supabase
```

### 서비스 구성
- **프론트엔드**: Next.js (Cloudflare Pages 호스팅)
- **인증**: Supabase Auth (Google OAuth 2.0)
- **그룹 관리**: Airtable
- **스크래핑**: n8n 웹훅 → app.py
- **데이터베이스**: Supabase (phong 테이블)

## 🚀 시작하기

### 1. 환경변수 설정

`.env.local` 파일을 생성하고 다음 값들을 설정하세요:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

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

### 2. 의존성 설치

```bash
npm install
```

### 3. 개발 서버 실행

```bash
npm run dev
```

### 4. 빌드

```bash
npm run build
```

## 📊 데이터 모델

### Supabase user_profiles 테이블
사용자 인증 및 프로필 정보 관리

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

### Supabase phong 테이블
수집된 포스트 데이터 저장
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

## 🔧 배포

### Cloudflare Pages 설정
```
Framework preset: Next.js
Build command: npm run build
Build output directory: .next
Root directory: /
Node.js version: 18
```

환경변수를 Cloudflare Pages 대시보드에서 설정해야 합니다.

## 🔒 보안

- 모든 API 키는 환경변수로 관리
- Supabase Auth를 통한 사용자 인증
- 미들웨어를 통한 라우트 보호
- n8n 웹훅 시크릿 키 검증

## 📈 기능

- [x] Google OAuth 2.0 로그인
- [x] Airtable 그룹 관리
- [x] Supabase 포스트 조회
- [ ] n8n 웹훅 스크래핑 제어
- [ ] 실시간 스크래핑 진행률
- [ ] 포스트 분석 및 필터링