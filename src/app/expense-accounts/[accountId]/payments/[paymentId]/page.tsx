"use client"

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { ContentLayout } from '@/components/layout/content-layout'
import { formatCurrency } from '@/lib/format-currency'

export default function ExpensePaymentDetailPage() {
  const params = useParams() as { accountId: string; paymentId: string }
  const router = useRouter()
  const { accountId, paymentId } = params

  const [payment, setPayment] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [depositsCount, setDepositsCount] = useState<number | null>(null)
  const [paymentsCount, setPaymentsCount] = useState<number | null>(null)
  const [countsError, setCountsError] = useState<string | null>(null)

  useEffect(() => {
    if (!accountId || !paymentId) return
    ;(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/expense-account/${accountId}/payments/${paymentId}`, {
          credentials: 'include',
        })
        if (!res.ok) {
          router.push(`/expense-accounts/${accountId}`)
          return
        }
        const data = await res.json()
        setPayment(data.data.payment)
      } catch (err) {
        console.error('Error loading payment', err)
        router.push(`/expense-accounts/${accountId}`)
      } finally {
        setLoading(false)
      }
    })()
  }, [accountId, paymentId, router])

  useEffect(() => {
    if (!accountId) return
    ;(async () => {
      try {
        const res = await fetch(`/api/expense-account/${accountId}/balance`, { credentials: 'include' })
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) setCountsError('unauthorized')
          else setCountsError('unavailable')
          console.warn(`Failed to fetch balance counts: ${res.status}`)
          return
        }
        const data = await res.json()
        setDepositsCount(data.data.depositCount ?? 0)
        setPaymentsCount(data.data.paymentCount ?? 0)
        setCountsError(null)
      } catch (err) {
        console.error('Error loading counts', err)
        setCountsError('error')
      }
    })()
  }, [accountId])

  if (loading) return (
    <ContentLayout title="Payment Details">
      <div className="text-secondary">Loading payment details...</div>
    </ContentLayout>
  )

  if (!payment) return (
    <ContentLayout title="Payment Details">
      <div className="text-secondary">Payment not found</div>
    </ContentLayout>
  )

  const { hasPermission } = useBusinessPermissionsContext()

  const payeeName =
    payment.payeeUser?.name ||
    payment.payeeEmployee?.fullName ||
    payment.payeePerson?.fullName ||
    payment.payeeBusiness?.name ||
    'Unknown'

  const getPayeeRoute = () => {
    if (payment.payeeEmployee) return `/employees/${payment.payeeEmployee.id}`
    if (payment.payeeBusiness) return `/business/suppliers/${payment.payeeBusiness.id}`
    if (payment.payeeUser) return `/admin/users/${payment.payeeUser.id}`
    if (payment.payeePerson) return `/customers/${payment.payeePerson.id}`
    return null
  }

  const canViewPayee = () => {
    if (payment.payeeEmployee) return hasPermission('canViewEmployees')
    if (payment.payeeBusiness) return hasPermission('canViewSuppliers')
    if (payment.payeeUser) return hasPermission('canViewUsers')
    if (payment.payeePerson) return hasPermission('canViewCustomers')
    return false
  }

  // Header actions: counts showing deposits and payments
  const headerActions = (
    <div className="flex items-center gap-3">
      <div className="text-sm text-secondary">Deposits</div>
      <div>
        {depositsCount !== null ? (
          hasPermission('canAccessExpenseAccount') ? (
            <a
              href={`/expense-accounts/${accountId}/deposits`}
              onClick={(e) => { e.stopPropagation() }}
              className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-green-50 dark:bg-green-900/20 text-xs text-green-800 dark:text-green-200 font-semibold hover:underline"
              aria-label={`Open deposits for ${payment.expenseAccount?.accountName || 'expense account'}`}>
              <span className="font-semibold">{depositsCount}</span>
            </a>
          ) : (
            <span className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700/10 text-xs text-gray-700 dark:text-gray-200 font-semibold">{depositsCount}</span>
          )
        ) : (
          <div title={countsError ? `Counts not available (${countsError})` : 'Counts not loaded'} className="text-green-600 font-semibold">—</div>
        )}
      </div>
      <div className="text-sm text-secondary">Payments</div>
      <div title={countsError ? `Counts not available (${countsError})` : ''} className="text-orange-600 font-semibold">{paymentsCount ?? '—'}</div>
    </div>
  )

  return (
    <ContentLayout title={`Payment ${payment.id}`} description={`Payment for ${payment.expenseAccount?.accountName || 'expense account'}`} headerActions={headerActions}>
      <div className="space-y-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">{formatCurrency(payment.amount)}</h2>
              <div className="text-sm text-secondary">{new Date(payment.paymentDate).toLocaleString()}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-secondary">Payee</div>
              {canViewPayee() && getPayeeRoute() ? (
                <button
                  onClick={(e) => { e.stopPropagation(); router.push(getPayeeRoute()!) }}
                  aria-label={`Open payee ${payeeName}`}
                  className="font-medium text-blue-600 hover:underline"
                >
                  {payeeName}
                </button>
              ) : (
                <div className="font-medium">{payeeName}</div>
              )}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-secondary">Category</div>
              <div className="font-medium">{payment.category?.name || '—'}</div>
            </div>
            <div>
              <div className="text-sm text-secondary">Receipt</div>
              <div className="font-medium">{payment.receiptNumber || '—'}</div>
            </div>
          </div>

          <div className="mt-4 text-sm text-gray-700 dark:text-gray-300">
            <div><strong>Notes:</strong></div>
            <div className="mt-2">{payment.notes || 'No notes provided'}</div>
          </div>
        </div>
      </div>
    </ContentLayout>
  )
}

export const runtime = 'edge'
