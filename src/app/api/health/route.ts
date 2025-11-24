import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Track server start time
const SERVER_START_TIME = Date.now()

/**
 * Format uptime milliseconds to human-readable string
 * @param ms - Milliseconds of uptime
 * @returns Formatted string like "2d 5h 23m"
 */
function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  const parts: string[] = []
  if (days > 0) parts.push(`${days}d`)
  if (hours % 24 > 0) parts.push(`${hours % 24}h`)
  if (minutes % 60 > 0) parts.push(`${minutes % 60}m`)

  return parts.length > 0 ? parts.join(' ') : '0m'
}

export async function GET() {
  console.log('🏥 Health check API route hit at:', new Date().toISOString())
  
  try {
    console.log('🔍 Testing database connection...')
    
    // Test database connection
    const result = await prisma.$executeRaw`SELECT 1 as test`
    console.log('✅ Database connection successful:', result)
    
    // Get user count as an additional test
    const userCount = await prisma.users.count()
    console.log('👥 Total users in database:', userCount)

    // Calculate uptime
    const uptimeMs = Date.now() - SERVER_START_TIME
    const startTime = new Date(SERVER_START_TIME).toISOString()

    const response = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: {
        milliseconds: uptimeMs,
        formatted: formatUptime(uptimeMs)
      },
      startTime,
      database: 'connected',
      userCount,
      environment: process.env.NODE_ENV
    }
    
    console.log('🏥 Health check response:', response)
    
    // Return response with headers that might help avoid extension blocking
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Health-Check': 'true', // Custom header to identify health checks
      }
    })
  } catch (error) {
    console.error('❌ Health check failed:', error)
    
    const errorResponse = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
      environment: process.env.NODE_ENV
    }
    
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Health-Check': 'true',
      }
    })
  }
}