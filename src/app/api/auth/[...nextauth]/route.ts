import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'

console.log('🔧 NextAuth API route loaded at:', new Date().toISOString())

const handler = NextAuth(authOptions)

// Add request logging
const loggedHandler = async (request: Request, context: any) => {
  console.log(`🌐 NextAuth ${request.method} request to:`, request.url)
  console.log('🔗 Request headers:', Object.fromEntries(request.headers.entries()))

  try {
    const response = await handler(request, context)
    console.log('✅ NextAuth response status:', response?.status)
    return response
  } catch (error) {
    console.error('❌ NextAuth error:', error)
    throw error
  }
}

export { loggedHandler as GET, loggedHandler as POST }