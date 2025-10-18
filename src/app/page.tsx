'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Link from 'next/link'

export default function HomePage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return
    
    if (session) {
      router.push('/dashboard')
    }
  }, [session, status, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen page-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (session) {
    return null
  }

  return (
    <div className="min-h-screen page-background">
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <div className="max-w-md w-full space-y-8 text-center">
          <div>
            <h1 className="text-4xl font-bold text-primary mb-2">
              Multi-Business Management Platform
            </h1>
            <p className="text-lg text-secondary">
              Unified platform for managing multiple business operations
            </p>
          </div>
          
          <div className="card p-8">
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="text-center">
                <div className="text-2xl mb-2">🏗️</div>
                <div className="text-sm font-medium text-primary">Construction</div>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-2">🍽️</div>
                <div className="text-sm font-medium text-primary">Restaurant</div>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-2">🛒</div>
                <div className="text-sm font-medium text-primary">Grocery</div>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-2">👕</div>
                <div className="text-sm font-medium text-primary">Clothing</div>
              </div>
            </div>
            
            <Link
              href="/auth/signin"
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium inline-block"
            >
              Sign In to Get Started
            </Link>
            
            <div className="mt-4 pt-4 border-t border-gray-200">
              <Link
                href="/test"
                className="w-full bg-orange-600 text-white py-2 px-4 rounded-lg hover:bg-orange-700 transition-colors font-medium inline-block text-sm"
              >
                🧪 Database Schema Test
              </Link>
              <div className="text-xs text-gray-500 mt-2">
                Debug employee relations & camelCase schema
              </div>
            </div>
          </div>
          
          <div className="text-sm text-secondary">
            Secure • Role-based Access • Multi-tenant
          </div>
        </div>
      </div>
    </div>
  )
}