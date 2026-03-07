'use client'

export const dynamic = 'force-dynamic'
import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { useToastContext } from '@/components/ui/toast'
import Link from 'next/link'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

function fmt(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

export default function PerDiemClaimFormPage({ params }: { params: { employeeId: string } }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const toast = useToastContext()
  const { currentBusinessId } = useBusinessPermissionsContext()

  const payrollMonth = parseInt(searchParams.get('payrollMonth') || String(new Date().getMonth() + 1))
  const payrollYear = parseInt(searchParams.get('payrollYear') || String(new Date().getFullYear()))
  const businessIdParam = searchParams.get('businessId') || currentBusinessId

  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    if (!session) { router.push('/auth/signin'); return }
  }, [session, status, router])

  const fetchData = useCallback(async () => {
    if (!params.employeeId || !payrollMonth || !payrollYear) return
    setLoading(true)
    try {
      const p = new URLSearchParams({
        payrollMonth: String(payrollMonth),
        payrollYear: String(payrollYear),
        ...(businessIdParam ? { businessId: businessIdParam } : {}),
      })
      const res = await fetch(`/api/per-diem/form/${params.employeeId}?${p}`, { credentials: 'include' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load')
      setData(json.data)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }, [params.employeeId, payrollMonth, payrollYear, businessIdParam, toast])

  useEffect(() => { fetchData() }, [fetchData])

  if (status === 'loading' || loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900 dark:border-gray-100" /></div>
  }

  const monthName = MONTHS[payrollMonth - 1]

  return (
    <>
      {/* Print action bar — hidden when printing */}
      <div className="no-print bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-3 flex items-center justify-between">
        <Link href="/employees/per-diem" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
          ← Back to Per Diem
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600 dark:text-gray-400">Per Diem Claim Form — {monthName} {payrollYear}</span>
          <button
            onClick={() => window.print()}
            className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            Print
          </button>
        </div>
      </div>

      {/* Printable claim form */}
      <div className="claim-form max-w-3xl mx-auto p-8 bg-white dark:bg-gray-900 min-h-screen">
        {!data ? (
          <p className="text-center text-gray-400 py-12">No data available</p>
        ) : (
          <>
            {/* Letterhead */}
            <div className="text-center mb-8 border-b-2 border-gray-900 dark:border-gray-100 pb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wide">
                {data.employee.business?.name || 'Company Name'}
              </h2>
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mt-1">
                Per Diem Claim Form
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{monthName} {payrollYear}</p>
            </div>

            {/* Employee Info */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 mb-8 text-sm">
              <div className="flex gap-2">
                <span className="font-medium text-gray-700 dark:text-gray-300 w-28 shrink-0">Employee:</span>
                <span className="text-gray-900 dark:text-gray-100">{data.employee.fullName}</span>
              </div>
              <div className="flex gap-2">
                <span className="font-medium text-gray-700 dark:text-gray-300 w-28 shrink-0">Employee #:</span>
                <span className="text-gray-900 dark:text-gray-100">{data.employee.employeeNumber}</span>
              </div>
              {data.employee.jobTitle && (
                <div className="flex gap-2">
                  <span className="font-medium text-gray-700 dark:text-gray-300 w-28 shrink-0">Job Title:</span>
                  <span className="text-gray-900 dark:text-gray-100">{data.employee.jobTitle}</span>
                </div>
              )}
              <div className="flex gap-2">
                <span className="font-medium text-gray-700 dark:text-gray-300 w-28 shrink-0">Business:</span>
                <span className="text-gray-900 dark:text-gray-100">{data.employee.business?.name || '—'}</span>
              </div>
            </div>

            {/* Entries Table */}
            <table className="w-full border-collapse text-sm mb-8">
              <thead>
                <tr className="border-t-2 border-b-2 border-gray-900 dark:border-gray-100">
                  <th className="text-left py-2 pr-4 font-semibold text-gray-900 dark:text-gray-100">Date</th>
                  <th className="text-left py-2 pr-4 font-semibold text-gray-900 dark:text-gray-100">Purpose</th>
                  <th className="text-right py-2 pr-4 font-semibold text-gray-900 dark:text-gray-100">Amount</th>
                  <th className="text-left py-2 font-semibold text-gray-900 dark:text-gray-100">Notes</th>
                </tr>
              </thead>
              <tbody>
                {data.entries.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-gray-400">No entries for this period</td>
                  </tr>
                ) : data.entries.map((e: any) => (
                  <tr key={e.id} className="border-b border-gray-200 dark:border-gray-700">
                    <td className="py-2 pr-4 text-gray-900 dark:text-gray-100">
                      {new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="py-2 pr-4 text-gray-900 dark:text-gray-100">{e.purpose}</td>
                    <td className="py-2 pr-4 text-right tabular-nums text-gray-900 dark:text-gray-100">{fmt(e.amount)}</td>
                    <td className="py-2 text-gray-600 dark:text-gray-400">{e.notes || '—'}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-gray-900 dark:border-gray-100">
                  <td colSpan={2} className="py-2 font-bold text-gray-900 dark:text-gray-100 uppercase text-xs tracking-wide">Total</td>
                  <td className="py-2 pr-4 text-right font-bold tabular-nums text-gray-900 dark:text-gray-100">{fmt(data.total)}</td>
                  <td />
                </tr>
              </tbody>
            </table>

            {/* Signature lines */}
            <div className="space-y-8 mt-12">
              {[
                { label: 'Employee Signature' },
                { label: 'Cashier Signature' },
                { label: 'Approved by' },
              ].map(({ label }) => (
                <div key={label} className="grid grid-cols-2 gap-8">
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">{label}</p>
                    <div className="border-b border-gray-400 dark:border-gray-500 h-8" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Date</p>
                    <div className="border-b border-gray-400 dark:border-gray-500 h-8" />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Print CSS */}
      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .claim-form { max-width: 100% !important; margin: 0 !important; padding: 16mm !important; }
        }
      `}</style>
    </>
  )
}
