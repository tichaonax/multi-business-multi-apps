'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ContentLayout } from '@/components/layout/content-layout'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { ListSearchFilterBar } from '@/components/ui/list-search-filter-bar'

interface ServiceCustomer {
  id: string
  name: string
  phone: string | null
  email: string | null
  customerNumber: string
  vehicles: Array<{ make: string | null; model: string | null; plate: string | null }>
  jobCount: number
  lastVisit: string | null
}

export default function VehicleServiceCustomersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { currentBusinessId } = useBusinessPermissionsContext()

  const [customers, setCustomers] = useState<ServiceCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const fetchCustomers = useCallback(async () => {
    if (!currentBusinessId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/vehicle-service/customers?businessId=${currentBusinessId}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load customers')
      setCustomers(data.customers || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [currentBusinessId])

  useEffect(() => { fetchCustomers() }, [fetchCustomers])

  const filtered = customers.filter(c => {
    if (!search.trim()) return true
    const q = search.trim().toLowerCase()
    return (
      c.name.toLowerCase().includes(q) ||
      (c.phone || '').includes(q) ||
      c.vehicles.some(v => [v.make, v.model, v.plate].some(x => (x || '').toLowerCase().includes(q)))
    )
  })

  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'

  if (status === 'loading') {
    return <div className="flex items-center justify-center min-h-screen text-gray-600">Loading...</div>
  }
  if (!session) {
    router.push('/auth/signin')
    return null
  }

  return (
    <ContentLayout title="Service Customers" subtitle="Customers who've had vehicle-service jobs at this business">
      <div className="max-w-5xl mx-auto">
        <ListSearchFilterBar
          onSearchChange={setSearch}
          searchLoading={loading}
          searchPlaceholder="Search by name, phone, or vehicle..."
        />

        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-200">
            {error}
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}

        {!loading && filtered.length === 0 && !error && (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow text-gray-500 dark:text-gray-400">
            {customers.length === 0 ? 'No service customers yet — they appear here once a job is created for them.' : 'No matches.'}
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  {['Customer', 'Vehicle(s)', 'Jobs', 'Last Visit', ''].map(h => (
                    <th key={h} className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filtered.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-3 py-4 whitespace-nowrap text-sm">
                      <div className="font-medium text-gray-900 dark:text-white">{c.name}</div>
                      <div className="text-xs text-gray-400">{c.phone || c.email || c.customerNumber}</div>
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-600 dark:text-gray-300">
                      {c.vehicles.length === 0 ? '-' : c.vehicles.map((v, i) => (
                        <div key={i}>{[v.make, v.model].filter(Boolean).join(' ') || 'Vehicle'}{v.plate ? ` (${v.plate})` : ''}</div>
                      ))}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{c.jobCount}</td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{formatDate(c.lastVisit)}</td>
                    <td className="px-3 py-4 whitespace-nowrap text-right text-sm">
                      <Link href={`/vehicle-service/jobs?search=${encodeURIComponent(c.phone || c.name)}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                        View Jobs
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ContentLayout>
  )
}
