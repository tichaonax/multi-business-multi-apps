'use client'

export const dynamic = 'force-dynamic'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { ContentLayout } from '@/components/layout/content-layout'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'

const REPORT_CARDS = [
  {
    href: '/chicken-run/reports/batch',
    icon: '📊',
    label: 'Batch Cost Report',
    description: 'Detailed cost breakdown per batch',
  },
  {
    href: '/chicken-run/reports/profitability',
    icon: '💰',
    label: 'Profitability',
    description: 'Raised vs purchased cost/kg comparison',
  },
  {
    href: '/chicken-run/reports/inventory',
    icon: '🧊',
    label: 'Inventory Stock',
    description: 'Current freezer stock by source',
  },
  {
    href: '/chicken-run/reports/kitchen-usage',
    icon: '🍽️',
    label: 'Kitchen Usage',
    description: 'Transfer history by source and business',
  },
  {
    href: '/chicken-run/reports/mortality',
    icon: '💀',
    label: 'Mortality Trends',
    description: 'Deaths by batch and reason',
  },
  {
    href: '/chicken-run/reports/batch-comparison',
    icon: '📋',
    label: 'Batch Comparison',
    description: 'Compare two or more batches side-by-side',
  },
]

export default function ChickenRunReportsHub() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { isAuthenticated, loading: bizLoading } = useBusinessPermissionsContext()

  useEffect(() => {
    if (status === 'loading') return
    if (!session) { router.push('/auth/signin'); return }
  }, [session, status, router])

  if (status === 'loading' || bizLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900 dark:border-gray-100" />
      </div>
    )
  }
  if (!session || !isAuthenticated) return null

  return (
    <ContentLayout title="Chicken Run Reports">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <nav className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            <Link href="/chicken-run" className="hover:underline">Chicken Run</Link>
            <span className="mx-2">/</span>
            <span>Reports</span>
          </nav>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Reports</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Analytics and insights for your chicken run operations
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {REPORT_CARDS.map(card => (
            <Link
              key={card.href}
              href={card.href}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow block"
            >
              <div className="flex items-start gap-3">
                <span className="text-3xl">{card.icon}</span>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{card.label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{card.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </ContentLayout>
  )
}
