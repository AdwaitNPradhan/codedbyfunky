import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'self'",
      // The Spotify app embeds the official player. Nothing else may be framed.
      "frame-src 'self' https://open.spotify.com",
      "form-action 'self'",
      // Instagram feed images (Photos app). The CDN URLs expire, so they are never proxied or cached.
      "img-src 'self' data: blob: https: https://*.cdninstagram.com https://*.fbcdn.net",
      "media-src 'self' blob: https:",
      "font-src 'self' data:",
      "style-src 'self' 'unsafe-inline'",
      // Next inlines bootstrap scripts; three/drei workers use blob:; the meshopt glTF decoder needs wasm-unsafe-eval (WASM only, not JS eval). 'unsafe-eval' only in dev (React refresh).
      `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' blob: https://static.cloudflareinsights.com${process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''}`,
      "worker-src 'self' blob:",
      "connect-src 'self' blob: data: https://cloudflareinsights.com",
      ...(process.env.NODE_ENV === 'production' ? ['upgrade-insecure-requests'] : []),
    ].join('; '),
  },
]

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    localPatterns: [{ pathname: '/api/media/file/**' }, { pathname: '/**' }],
  },
  experimental: {
    optimizePackageImports: ['@react-three/drei', 'motion', 'gsap'],
  },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      {
        source: '/api/media/file/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      // 3D models in public/models carry a version in the file name (e.g. arcade-v1.glb).
      {
        source: '/models/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      // The in-browser Linux (v86) files in public/linux carry a version in the file name (e.g. buildroot-v1.bin).
      {
        source: '/linux/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ]
  },
  // FunkyOS is the homepage; the URL stays "/" and reuses the ISR-cached /os render.
  async rewrites() {
    return [{ source: '/', destination: '/os' }]
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }
    return webpackConfig
  },
  turbopack: {
    root: path.resolve(dirname),
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
