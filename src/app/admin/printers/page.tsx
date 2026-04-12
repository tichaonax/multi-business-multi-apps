'use client'

// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic';
/**
 * Printer Setup Page
 * QZ Tray local printer setup (all users) + network printer management (admins only)
 */

import { ContentLayout } from '@/components/layout/content-layout'
import { PrinterManagement } from '@/components/admin/printers/printer-management'
import { QzTraySetup } from '@/components/printing/qz-tray-setup'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { useSession } from 'next-auth/react'
import { isSystemAdmin } from '@/lib/permission-utils'
import { SessionUser } from '@/lib/permission-utils'

export default function PrintersPage() {
  const { hasPermission } = useBusinessPermissionsContext()
  const { data: session } = useSession()
  const user = session?.user as SessionUser
  const canManageNetwork = isSystemAdmin(user) || hasPermission('canManageNetworkPrinters')

  return (
    <ContentLayout title="Printer Setup">
      {/* Local Printer (QZ Tray) — every user configures their own machine */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Local Printer (QZ Tray)
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          Select and save your local receipt printer. This setting is per-device and stored in your browser.
        </p>
        <div className="max-w-md">
          <QzTraySetup />
        </div>
      </div>

      {/* Network Printers — admin / canManageNetworkPrinters only */}
      {canManageNetwork && <PrinterManagement />}
    </ContentLayout>
  )
}
