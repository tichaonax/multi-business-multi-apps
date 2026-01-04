'use client'


// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic';
/**
 * Admin Printers Page
 * Manage network printers and print jobs
 */

import { ContentLayout } from '@/components/layout/content-layout'
import { PrinterManagement } from '@/components/admin/printers/printer-management'

export default function PrintersPage() {
  return (
    <ContentLayout title="Printers">
      <PrinterManagement />
    </ContentLayout>
  )
}
