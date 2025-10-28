'use client'

import { ProtectedRoute } from '@/components/auth/protected-route'
import { BusinessLaybyRules } from '@/components/laybys/business-layby-rules'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { isSystemAdmin } from '@/lib/permission-utils'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'

export default function LaybyRulesPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const { hasPermission } = useBusinessPermissionsContext()
  const currentUser = session?.user as any
  const canManageLaybys = isSystemAdmin(currentUser) || hasPermission('canManageLaybys')

  if (!canManageLaybys) {
    return (
      <ProtectedRoute>
        <div className="container mx-auto px-4 py-8">
          <div className="card p-12 text-center">
            <p className="text-secondary">You don&apos;t have permission to view layby rules</p>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={() => router.push('/business/laybys')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Laybys
          </Button>

          <h1 className="text-3xl font-bold text-primary">Layby Business Rules</h1>
          <p className="text-secondary mt-1">
            View and understand layby rules for different business types
          </p>
        </div>

        {/* Help Card */}
        <div className="card p-6 mb-6 bg-blue-50 dark:bg-blue-950">
          <h3 className="font-semibold mb-2">Understanding Business Rules</h3>
          <p className="text-sm text-secondary mb-3">
            Each business type has specific rules for layby agreements. These rules define:
          </p>
          <ul className="text-sm text-secondary space-y-1 list-disc list-inside">
            <li>Deposit requirements and payment schedules</li>
            <li>Applicable fees and charges</li>
            <li>Refund and cancellation policies</li>
            <li>Automation and validation settings</li>
          </ul>
        </div>

        {/* Business Rules Component */}
        <BusinessLaybyRules showComparison={true} />
      </div>
    </ProtectedRoute>
  )
}
