import type { NextConfig } from 'next'

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

const nextConfig: NextConfig = {
  output: 'standalone',

  // Performance optimizations
  // compiler: {
  //   removeConsole: process.env.NODE_ENV === 'production',
  // },

  // Optimize images
  images: {
    formats: ['image/webp', 'image/avif'],
  },

  // Enable compression
  compress: true,
}

export default withBundleAnalyzer(nextConfig)
