'use client'


// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic';
/**
 * Admin Printers Page
 * Manage network printers and print jobs
 */

import { ContentLayout } from '@/components/layout/content-layout'
import { PrinterManagement } from '@/components/admin/printers/printer-management'
import { QzTraySetup } from '@/components/printing/qz-tray-setup'

export default function PrintersPage() {
  return (
    <ContentLayout title="Printers">
      {/* Local Printer (QZ Tray) — configure which local printer receives card/receipt jobs */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Local Printer (QZ Tray)
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          Select and save your local receipt printer. This printer will appear in all receipt and card print dropdowns.
        </p>
        <div className="max-w-md">
          <QzTraySetup />
        </div>
      </div>

      {/* Network Printers */}
      <PrinterManagement />
    </ContentLayout>
  )
}
