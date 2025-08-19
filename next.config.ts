/** @type {import('next').NextConfig} */
const nextConfig = {
  // Cloudflare Pages 최적화
  images: {
    unoptimized: true
  }
}

// 개발 환경에서 Cloudflare 바인딩 사용 가능하게 설정
if (process.env.NODE_ENV === 'development') {
  (async () => {
    const { setupDevPlatform } = await import('@cloudflare/next-on-pages/next-dev')
    await setupDevPlatform()
  })()
}

export default nextConfig