'use client'


// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic';
import { ProtectedRoute } from '@/components/auth/protected-route'
import { AutomationMonitor } from '@/components/laybys/automation-monitor'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { isSystemAdmin } from '@/lib/permission-utils'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'

export default function LaybyAutomationPage() {
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
            <p className="text-secondary">You don&apos;t have permission to manage layby automation</p>
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

          <h1 className="text-3xl font-bold text-primary">Layby Automation</h1>
          <p className="text-secondary mt-1">
            Monitor and manage automated layby tasks
          </p>
        </div>

        {/* Help Card */}
        <div className="card p-6 mb-6 bg-blue-50 dark:bg-blue-950">
          <h3 className="font-semibold mb-2">About Automation</h3>
          <p className="text-sm text-secondary mb-3">
            The layby automation system handles:
          </p>
          <ul className="text-sm text-secondary space-y-1 list-disc list-inside">
            <li><strong>Payment Reminders:</strong> Sends notifications 3 days before, 1 day before, and on due date</li>
            <li><strong>Overdue Notifications:</strong> Alerts customers when payments are overdue</li>
            <li><strong>Late Fees:</strong> Applies late fees based on business rules</li>
            <li><strong>Default Processing:</strong> Marks laybys as defaulted after missed payment threshold</li>
          </ul>
        </div>

        {/* Automation Monitor Component */}
        <AutomationMonitor />
      </div>
    </ProtectedRoute>
  )
}
