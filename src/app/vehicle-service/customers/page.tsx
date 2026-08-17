'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ContentLayout } from '@/components/layout/content-layout'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { ListSearchFilterBar } from '@/components/ui/list-search-filter-bar'
import { CustomerQuickRegister } from '@/components/pos/customer-quick-register'
import { formatPhoneNumberForDisplay } from '@/lib/country-codes'

interface ServiceCustomer {
  id: string
  name: string
  phone: string | null
  email: string | null
  customerNumber: string
  vehicles: Array<{ make: string | null; model: string | null; plate: string | null }>
  jobCount: number
  lastVisit: string | null
  isFromOtherBusiness: boolean
  homeBusinessId: string | null
  homeBusinessName: string | null
  homeBusinessType: string | null
  customerSince: string
  totalOrders: number
  totalSpent: number
  loyaltyPoints: number
}

export default function VehicleServiceCustomersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { currentBusinessId, currentBusiness } = useBusinessPermissionsContext()

  const [customers, setCustomers] = useState<ServiceCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [detailCustomer, setDetailCustomer] = useState<ServiceCustomer | null>(null)
  const [lookupQuery, setLookupQuery] = useState('')
  const [lookupResults, setLookupResults] = useState<any[]>([])
  const [lookupCrossBusiness, setLookupCrossBusiness] = useState<any[]>([])
  const [showRegisterForm, setShowRegisterForm] = useState(false)

  useEffect(() => {
    if (!showAddModal || !currentBusinessId || !lookupQuery.trim()) { setLookupResults([]); setLookupCrossBusiness([]); return }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/universal/customers?businessId=${currentBusinessId}&search=${encodeURIComponent(lookupQuery)}&limit=5&crossBusiness=true`)
      if (res.ok) {
        const data = await res.json()
        setLookupResults(data.customers || data.data || [])
        setLookupCrossBusiness(data.crossBusinessMatches || [])
      }
    }, 300)
    return () => clearTimeout(t)
  }, [lookupQuery, currentBusinessId, showAddModal])

  const closeAddModal = () => {
    setShowAddModal(false)
    setLookupQuery('')
    setLookupResults([])
    setLookupCrossBusiness([])
    setShowRegisterForm(false)
  }

  // Jump straight into New Job with this customer pre-selected — no need to
  // leave and re-search on the Jobs page.
  const startJobFor = (c: any) => {
    const params = new URLSearchParams({ newJobCustomerId: c.id, newJobCustomerName: c.name })
    if (c.phone) params.set('newJobCustomerPhone', c.phone)
    router.push(`/vehicle-service/jobs?${params}`)
  }

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
        <div className="flex items-start gap-3 mb-1">
          <div className="flex-1">
            <ListSearchFilterBar
              onSearchChange={setSearch}
              searchLoading={loading}
              searchPlaceholder="Search by name, phone, or vehicle..."
            />
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="shrink-0 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
          >
            + New Customer
          </button>
        </div>

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
                      <div className="font-medium text-gray-900 dark:text-white flex items-center gap-1.5">
                        {c.name}
                        {c.isFromOtherBusiness && (
                          <button
                            onClick={() => setDetailCustomer(c)}
                            title={`Also a customer at ${c.homeBusinessName}`}
                            className="px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50"
                          >
                            also at {c.homeBusinessName}
                          </button>
                        )}
                      </div>
                      <div className="text-xs text-gray-400">{c.phone ? formatPhoneNumberForDisplay(c.phone) : (c.email || c.customerNumber)}</div>
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-600 dark:text-gray-300">
                      {c.vehicles.length === 0 ? '-' : c.vehicles.map((v, i) => (
                        <div key={i}>{[v.make, v.model].filter(Boolean).join(' ') || 'Vehicle'}{v.plate ? ` (${v.plate})` : ''}</div>
                      ))}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{c.jobCount}</td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{formatDate(c.lastVisit)}</td>
                    <td className="px-3 py-4 whitespace-nowrap text-right text-sm space-x-3">
                      <Link href={`/vehicle-service/jobs?search=${encodeURIComponent(c.phone || c.name)}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                        View Jobs
                      </Link>
                      <button onClick={() => startJobFor(c)} className="text-blue-600 dark:text-blue-400 hover:underline">
                        + New Job
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {detailCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setDetailCustomer(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-sm w-full p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{detailCustomer.name}</h3>
              <button onClick={() => setDetailCustomer(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg leading-none">✕</button>
            </div>
            <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded px-2 py-1.5 mb-3">
              This customer's home record belongs to <span className="font-medium">{detailCustomer.homeBusinessName}</span> ({detailCustomer.homeBusinessType}) — the same phone number is used for both, so it's the same customer, same history, everywhere.
            </p>
            <dl className="text-xs text-gray-600 dark:text-gray-300 space-y-1.5">
              <div className="flex justify-between"><dt className="text-gray-400">Customer #</dt><dd>{detailCustomer.customerNumber}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-400">Phone</dt><dd>{detailCustomer.phone ? formatPhoneNumberForDisplay(detailCustomer.phone) : '-'}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-400">Customer since</dt><dd>{formatDate(detailCustomer.customerSince)}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-400">Total orders (all businesses)</dt><dd>{detailCustomer.totalOrders}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-400">Total spent (all businesses)</dt><dd>${detailCustomer.totalSpent.toFixed(2)}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-400">Loyalty points</dt><dd>{detailCustomer.loyaltyPoints}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-400">Jobs here</dt><dd>{detailCustomer.jobCount}</dd></div>
            </dl>
          </div>
        </div>
      )}

      {showAddModal && currentBusinessId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">New Customer</h3>
              <button onClick={closeAddModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg leading-none">✕</button>
            </div>

            {!showRegisterForm ? (
              <>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  Search first — phone numbers uniquely identify a customer, so if they already exist anywhere in the system (even at another business), use that record instead of creating a new one.
                </p>
                <input
                  type="text"
                  autoFocus
                  value={lookupQuery}
                  onChange={e => setLookupQuery(e.target.value)}
                  placeholder="Search by name or phone..."
                  className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-2"
                />

                {(lookupResults.length > 0 || lookupCrossBusiness.length > 0) && (
                  <div className="space-y-1.5 mb-3">
                    {lookupResults.map((c: any) => (
                      <div key={c.id} className="flex items-center justify-between gap-2 text-sm bg-gray-50 dark:bg-gray-900 rounded px-2 py-1.5">
                        <span>
                          {c.name} {c.phone && <span className="text-xs text-gray-400">({formatPhoneNumberForDisplay(c.phone)})</span>}
                          <span className="block text-[10px] text-green-600 dark:text-green-400 font-medium">Already a customer here</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => startJobFor(c)}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline shrink-0"
                        >
                          Start a Job →
                        </button>
                      </div>
                    ))}
                    {lookupCrossBusiness.map((c: any) => (
                      <div key={c.id} className="flex items-center justify-between gap-2 text-sm bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded px-2 py-1.5">
                        <span>
                          {c.name} {c.phone && <span className="text-xs text-gray-400">({formatPhoneNumberForDisplay(c.phone)})</span>}
                          <span className="block text-[10px] text-amber-700 dark:text-amber-400">at {c.sourceBusinessName} — same customer, reuse this record</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => startJobFor(c)}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline shrink-0"
                        >
                          Start a Job →
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {lookupQuery.trim() && lookupResults.length === 0 && lookupCrossBusiness.length === 0 && (
                  <p className="text-xs text-gray-400 mb-3">No match found anywhere.</p>
                )}

                <button
                  type="button"
                  onClick={() => setShowRegisterForm(true)}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {lookupQuery.trim() ? "None of these — register a new customer" : '+ Register a new customer (skip search)'}
                </button>
              </>
            ) : (
              <CustomerQuickRegister
                businessId={currentBusinessId}
                businessName={currentBusiness?.businessName}
                businessPhone={currentBusiness?.phone}
                onCreated={() => { closeAddModal(); fetchCustomers() }}
                onCancel={() => setShowRegisterForm(false)}
              />
            )}
          </div>
        </div>
      )}
    </ContentLayout>
  )
}
