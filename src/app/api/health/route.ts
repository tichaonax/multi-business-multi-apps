import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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
    
    const response = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      userCount,
      environment: process.env.NODE_ENV
    }
    
    console.log('🏥 Health check response:', response)
    
    return NextResponse.json(response)
  } catch (error) {
    console.error('❌ Health check failed:', error)
    
    const errorResponse = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
      environment: process.env.NODE_ENV
    }
    
    return NextResponse.json(errorResponse, { status: 500 })
  }
}