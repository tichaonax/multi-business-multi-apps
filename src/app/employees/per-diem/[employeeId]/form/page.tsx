'use client'

export const dynamic = 'force-dynamic'
import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { useToastContext } from '@/components/ui/toast'
import { generatePerDiemClaimPDF } from '@/lib/pdf-utils'
import Link from 'next/link'
import React from 'react'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

export default function PerDiemClaimFormPage({ params }: { params: Promise<{ employeeId: string }> }) {
  const { employeeId } = React.use(params)
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
    if (!employeeId || !payrollMonth || !payrollYear) return
    setLoading(true)
    try {
      const p = new URLSearchParams({
        payrollMonth: String(payrollMonth),
        payrollYear: String(payrollYear),
        ...(businessIdParam ? { businessId: businessIdParam } : {}),
      })
      const res = await fetch(`/api/per-diem/form/${employeeId}?${p}`, { credentials: 'include' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load')
      setData(json.data)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }, [employeeId, payrollMonth, payrollYear, businessIdParam, toast])

  useEffect(() => { fetchData() }, [fetchData])

  const handlePDF = (action: 'save' | 'print') => {
    if (!data) return
    generatePerDiemClaimPDF(
      {
        employee: {
          fullName: data.employee.fullName,
          employeeNumber: data.employee.employeeNumber,
          jobTitle: data.employee.jobTitle,
          business: data.employee.business,
        },
        period: { month: payrollMonth, year: payrollYear },
        entries: data.entries,
        total: data.total,
      },
      action,
    )
  }

  if (status === 'loading' || loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900 dark:border-gray-100" /></div>
  }

  const monthName = MONTHS[payrollMonth - 1]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-8">
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-8 max-w-md w-full space-y-6">

        <div className="text-center">
          <div className="text-4xl mb-2">🗂️</div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Per Diem Claim Form</h1>
          {data && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              <span className="font-semibold text-gray-700 dark:text-gray-300">{data.employee.fullName}</span>
              {' — '}{monthName} {payrollYear}
            </p>
          )}
        </div>

        {data && (
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg px-4 py-3 text-sm space-y-1">
            <div className="flex justify-between text-gray-600 dark:text-gray-400">
              <span>Entries</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">{data.entries.length}</span>
            </div>
            <div className="flex justify-between text-gray-600 dark:text-gray-400">
              <span>Total</span>
              <span className="font-semibold text-green-600 dark:text-green-400">
                {data.total.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
              </span>
            </div>
          </div>
        )}

        {!data && !loading && (
          <p className="text-center text-sm text-gray-400">No data available for this period.</p>
        )}

        {data && (
          <div className="flex gap-2">
            <button
              onClick={() => handlePDF('save')}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Save PDF
            </button>
            <button
              onClick={() => handlePDF('print')}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print
            </button>
          </div>
        )}

        <Link href="/employees/per-diem" className="block text-center text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          ← Back to Per Diem
        </Link>
      </div>
    </div>
  )
}
