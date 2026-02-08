import { NextResponse } from 'next/server'

/**
 * Health check endpoint for Railway deployment
 * Returns 200 OK with basic health status
 */
export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'wheeltracker',
      version: process.env.npm_package_version || '0.1.0'
    },
    { status: 200 }
  )
}
