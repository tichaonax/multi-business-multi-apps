'use client'

// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic';

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'

export default function HomePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { currentBusinessId } = useBusinessPermissionsContext()

  // Terminal ID for customer display
  const [terminalId] = useState(() => {
    if (typeof window === 'undefined') return 'terminal-default'
    const stored = localStorage.getItem('pos-terminal-id')
    if (stored) return stored
    const newId = `terminal-${Date.now()}`
    localStorage.setItem('pos-terminal-id', newId)
    return newId
  })

  // No need to send SET_ACTIVE_BUSINESS here anymore
  // It's now handled globally in BusinessPermissionsContext

  // Auto-open customer display when logged in and business is selected
  useEffect(() => {
    if (status === 'loading' || !session || !currentBusinessId) return

    async function openCustomerDisplay() {
      try {
        const displayUrl = `/customer-display?businessId=${currentBusinessId}&terminalId=${terminalId}`

        // Try Window Management API for multi-monitor support
        if ('getScreenDetails' in window) {
          try {
            const screenDetails = await (window as any).getScreenDetails()
            const screens = screenDetails.screens
            const currentScreen = screenDetails.currentScreen
            const secondaryScreen = screens.find((screen: any) => screen !== currentScreen)

            if (secondaryScreen) {
              const width = 1920
              const height = 1080
              const left = secondaryScreen.availLeft + (secondaryScreen.availWidth - width) / 2
              const top = secondaryScreen.availTop + (secondaryScreen.availHeight - height) / 2
              const features = `left=${left},top=${top},width=${width},height=${height},toolbar=no,menubar=no,location=no,status=no`
              window.open(displayUrl, 'CustomerDisplay', features)
              console.log('[HomePage] Customer display opened on secondary monitor')
              return
            }
          } catch (err) {
            console.log('[HomePage] Window Management API not available:', err)
          }
        }

        // Fallback: standard window.open
        const features = 'width=1920,height=1080,toolbar=no,menubar=no,location=no,status=no'
        window.open(displayUrl, 'CustomerDisplay', features)
        console.log('[HomePage] Customer display opened')
      } catch (error) {
        console.error('[HomePage] Failed to open customer display:', error)
      }
    }

    openCustomerDisplay()
  }, [session, status, currentBusinessId, terminalId])

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