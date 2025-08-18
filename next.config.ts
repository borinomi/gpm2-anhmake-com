/** @type {import('next').NextConfig} */
const nextConfig = {
  // Cloudflare Pages 최적화
  images: {
    unoptimized: true
  }
}

module.exports = nextConfig