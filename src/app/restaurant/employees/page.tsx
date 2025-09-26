'use client'

import { BusinessTypeRoute } from '@/components/auth/business-type-route'
import { ContentLayout } from '@/components/layout/content-layout'
import { Button } from '@/components/ui/button'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function RestaurantEmployeesPage() {
  const router = useRouter()

  useEffect(() => {
    // Auto-redirect to main employee management page with restaurant filter
    const timer = setTimeout(() => {
      router.push('/employees?businessType=restaurant')
    }, 3000)

    return () => clearTimeout(timer)
  }, [router])

  const handleRedirectNow = () => {
    router.push('/employees?businessType=restaurant')
  }

  const handleRedirectToMain = () => {
    router.push('/employees')
  }

  return (
    <BusinessTypeRoute requiredBusinessType="restaurant">
      <ContentLayout
        title="Restaurant Employee Management"
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Restaurant', href: '/restaurant' },
          { label: 'Employees', isActive: true }
        ]}
      >
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center max-w-md mx-auto">
            <div className="mb-8">
              <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">👥</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Employee Management
              </h2>
              <p className="text-gray-600 mb-6">
                Employee management is handled through our centralized system.
                You'll be redirected to the main employee management page with restaurant employees filtered.
              </p>
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleRedirectNow}
                className="w-full bg-primary hover:bg-primary/90"
              >
                🚀 Go to Restaurant Employees
              </Button>

              <Button
                onClick={handleRedirectToMain}
                variant="outline"
                className="w-full"
              >
                👥 View All Employees
              </Button>
            </div>

            <div className="mt-8 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">Available Features</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <div>• ➕ Add and manage restaurant employees</div>
                <div>• 📝 Create and manage employee contracts</div>
                <div>• 💰 Handle salary increases and payroll</div>
                <div>• 📊 Generate employee reports</div>
                <div>• 🔐 Manage user accounts and permissions</div>
                <div>• 🏢 Multi-business assignment support</div>
              </div>
            </div>

            <p className="text-sm text-gray-500 mt-4">
              Redirecting automatically in 3 seconds...
            </p>
          </div>
        </div>
      </ContentLayout>
    </BusinessTypeRoute>
  )
}