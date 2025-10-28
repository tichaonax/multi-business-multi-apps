'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, Clock, Phone, DollarSign } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { CustomerLayby } from '@/types/layby'

interface LaybyAlertsWidgetProps {
  businessId?: string
}

export function LaybyAlertsWidget({ businessId }: LaybyAlertsWidgetProps) {
  const router = useRouter()
  const [overdueLaybys, setOverdueLaybys] = useState<CustomerLayby[]>([])
  const [atRiskLaybys, setAtRiskLaybys] = useState<CustomerLayby[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!businessId) {
      setLoading(false)
      return
    }

    const fetchAlerts = async () => {
      try {
        const response = await fetch(`/api/laybys?businessId=${businessId}&status=ACTIVE&limit=100`)
        if (!response.ok) return

        const data = await response.json()
        const laybys = data.data || []

        // Filter overdue and at-risk laybys
        const now = new Date()
        const overdue: CustomerLayby[] = []
        const atRisk: CustomerLayby[] = []

        laybys.forEach((layby: CustomerLayby) => {
          if (!layby.paymentDueDate || Number(layby.balanceRemaining) <= 0) return

          const dueDate = new Date(layby.paymentDueDate)
          const daysDiff = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

          // Calculate what payment is actually overdue
          const totalPaid = Number(layby.totalPaid)
          const depositAmount = Number(layby.depositAmount)
          const installmentAmount = Number(layby.installmentAmount)

          let overdueAmount = 0
          if (totalPaid === 0) {
            overdueAmount = depositAmount
          } else {
            overdueAmount = installmentAmount
          }

          // Only mark as overdue if payment date has passed AND there's an actual amount due
          if (daysDiff < 0 && overdueAmount > 0) {
            overdue.push(layby)
          } else if (daysDiff <= 3 && daysDiff >= 0) {
            const balancePercent = (Number(layby.balanceRemaining) / Number(layby.totalAmount)) * 100
            if (balancePercent > 50) {
              atRisk.push(layby)
            }
          }
        })

        setOverdueLaybys(overdue)
        setAtRiskLaybys(atRisk)
      } catch (error) {
        console.error('Failed to fetch layby alerts:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAlerts()
    // Refresh every 5 minutes
    const interval = setInterval(fetchAlerts, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [businessId])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="card p-6 animate-pulse">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    )
  }

  if (!businessId || (overdueLaybys.length === 0 && atRiskLaybys.length === 0)) {
    return null
  }

  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="h-5 w-5 text-orange-600" />
        <h3 className="font-semibold text-lg">Layby Payment Alerts</h3>
      </div>

      {/* Overdue Laybys */}
      {overdueLaybys.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-3 text-red-600 font-semibold">
            <AlertTriangle className="h-4 w-4" />
            <span>{overdueLaybys.length} Overdue {overdueLaybys.length === 1 ? 'Layby' : 'Laybys'}</span>
          </div>
          <div className="space-y-3">
            {overdueLaybys.slice(0, 5).map((layby) => {
              const dueDate = new Date(layby.paymentDueDate!)
              const now = new Date()
              const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
              const items = layby.items as any[]
              const itemCount = items?.length || 0
              const totalAmount = Number(layby.totalAmount)
              const totalPaid = Number(layby.totalPaid)
              const balance = Number(layby.balanceRemaining)
              const paymentProgress = (totalPaid / totalAmount) * 100

              // Calculate specific overdue amount
              const depositAmount = Number(layby.depositAmount)
              const installmentAmount = Number(layby.installmentAmount)
              let overdueAmount = 0
              let overdueDescription = ''

              if (totalPaid === 0) {
                // No payments made - deposit is overdue
                overdueAmount = depositAmount
                overdueDescription = 'Deposit Overdue'
              } else {
                // Payment(s) made - calculate missed installments
                // This is the installment payment that should have been made
                overdueAmount = installmentAmount
                overdueDescription = 'Payment Overdue'
              }

              return (
                <div
                  key={layby.id}
                  className="p-4 bg-red-50 dark:bg-red-950 border-2 border-red-200 dark:border-red-800 rounded-lg cursor-pointer hover:bg-red-100 dark:hover:bg-red-900 transition-colors shadow-sm"
                  onClick={() => router.push(`/business/laybys/${layby.id}`)}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <p className="font-bold text-red-900 dark:text-red-100 text-base">
                        {layby.laybyNumber}
                      </p>
                      <p className="text-sm text-red-700 dark:text-red-300 font-medium">
                        {layby.customer?.name || 'No customer'}
                      </p>
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-semibold">
                        ⚠️ {daysOverdue} {daysOverdue === 1 ? 'day' : 'days'} OVERDUE
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-red-700 dark:text-red-300 mb-1">Items</p>
                      <p className="text-lg font-bold text-red-900 dark:text-red-100">
                        {itemCount}
                      </p>
                    </div>
                  </div>

                  {/* Financial Summary */}
                  <div className="bg-white dark:bg-red-900/30 rounded p-3 mb-3">
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="text-red-700 dark:text-red-300 mb-1">Original Amount</p>
                        <p className="font-bold text-red-900 dark:text-red-100">
                          {formatCurrency(totalAmount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-red-700 dark:text-red-300 mb-1">Total Paid</p>
                        <p className="font-bold text-green-700 dark:text-green-400">
                          {formatCurrency(totalPaid)}
                        </p>
                      </div>
                      <div>
                        <p className="text-red-700 dark:text-red-300 mb-1">{overdueDescription}</p>
                        <p className="font-bold text-red-700 dark:text-red-400 text-lg">
                          {formatCurrency(overdueAmount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-red-700 dark:text-red-300 mb-1">Balance Remaining</p>
                        <p className="font-bold text-red-900 dark:text-red-100 text-lg">
                          {formatCurrency(balance)}
                        </p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-red-700 dark:text-red-300">Payment Progress</span>
                        <span className="font-semibold text-red-900 dark:text-red-100">
                          {paymentProgress.toFixed(0)}%
                        </span>
                      </div>
                      <div className="w-full bg-red-200 dark:bg-red-800 rounded-full h-2">
                        <div
                          className="bg-red-600 dark:bg-red-500 h-2 rounded-full"
                          style={{ width: `${Math.min(paymentProgress, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Contact Info */}
                  {layby.customer?.phone && (
                    <div className="flex items-center gap-2 text-sm text-red-800 dark:text-red-200 font-medium bg-red-100 dark:bg-red-900/50 p-2 rounded">
                      <Phone className="h-4 w-4" />
                      <span>{layby.customer.phone}</span>
                    </div>
                  )}
                </div>
              )
            })}
            {overdueLaybys.length > 5 && (
              <button
                onClick={() => router.push(`/business/laybys?status=ACTIVE`)}
                className="text-sm text-red-600 hover:underline"
              >
                +{overdueLaybys.length - 5} more overdue
              </button>
            )}
          </div>
        </div>
      )}

      {/* At-Risk Laybys */}
      {atRiskLaybys.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3 text-orange-600 font-semibold">
            <Clock className="h-4 w-4" />
            <span>{atRiskLaybys.length} At Risk {atRiskLaybys.length === 1 ? 'Layby' : 'Laybys'}</span>
          </div>
          <div className="space-y-3">
            {atRiskLaybys.slice(0, 3).map((layby) => {
              const dueDate = new Date(layby.paymentDueDate!)
              const now = new Date()
              const daysLeft = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
              const items = layby.items as any[]
              const itemCount = items?.length || 0
              const totalAmount = Number(layby.totalAmount)
              const totalPaid = Number(layby.totalPaid)
              const balance = Number(layby.balanceRemaining)
              const paymentProgress = (totalPaid / totalAmount) * 100

              // Calculate next payment due
              const depositAmount = Number(layby.depositAmount)
              const installmentAmount = Number(layby.installmentAmount)
              let nextPaymentAmount = 0
              let nextPaymentDescription = ''

              if (totalPaid === 0) {
                // No payments made - deposit is due
                nextPaymentAmount = depositAmount
                nextPaymentDescription = 'Deposit Due'
              } else {
                // Next installment is due
                nextPaymentAmount = installmentAmount
                nextPaymentDescription = 'Payment Due'
              }

              return (
                <div
                  key={layby.id}
                  className="p-4 bg-orange-50 dark:bg-orange-950 border-2 border-orange-200 dark:border-orange-800 rounded-lg cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-900 transition-colors shadow-sm"
                  onClick={() => router.push(`/business/laybys/${layby.id}`)}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <p className="font-bold text-orange-900 dark:text-orange-100 text-base">
                        {layby.laybyNumber}
                      </p>
                      <p className="text-sm text-orange-700 dark:text-orange-300 font-medium">
                        {layby.customer?.name || 'No customer'}
                      </p>
                      <p className="text-xs text-orange-600 dark:text-orange-400 mt-1 font-semibold">
                        ⏰ Payment due in {daysLeft} {daysLeft === 1 ? 'day' : 'days'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-orange-700 dark:text-orange-300 mb-1">Items</p>
                      <p className="text-lg font-bold text-orange-900 dark:text-orange-100">
                        {itemCount}
                      </p>
                    </div>
                  </div>

                  {/* Financial Summary */}
                  <div className="bg-white dark:bg-orange-900/30 rounded p-3 mb-3">
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="text-orange-700 dark:text-orange-300 mb-1">Original Amount</p>
                        <p className="font-bold text-orange-900 dark:text-orange-100">
                          {formatCurrency(totalAmount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-orange-700 dark:text-orange-300 mb-1">Total Paid</p>
                        <p className="font-bold text-green-700 dark:text-green-400">
                          {formatCurrency(totalPaid)}
                        </p>
                      </div>
                      <div>
                        <p className="text-orange-700 dark:text-orange-300 mb-1">{nextPaymentDescription}</p>
                        <p className="font-bold text-orange-700 dark:text-orange-400 text-lg">
                          {formatCurrency(nextPaymentAmount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-orange-700 dark:text-orange-300 mb-1">Balance Remaining</p>
                        <p className="font-bold text-orange-900 dark:text-orange-100 text-lg">
                          {formatCurrency(balance)}
                        </p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-orange-700 dark:text-orange-300">Payment Progress</span>
                        <span className="font-semibold text-orange-900 dark:text-orange-100">
                          {paymentProgress.toFixed(0)}%
                        </span>
                      </div>
                      <div className="w-full bg-orange-200 dark:bg-orange-800 rounded-full h-2">
                        <div
                          className="bg-orange-600 dark:bg-orange-500 h-2 rounded-full"
                          style={{ width: `${Math.min(paymentProgress, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Contact Info */}
                  {layby.customer?.phone && (
                    <div className="flex items-center gap-2 text-sm text-orange-800 dark:text-orange-200 font-medium bg-orange-100 dark:bg-orange-900/50 p-2 rounded">
                      <Phone className="h-4 w-4" />
                      <span>{layby.customer.phone}</span>
                    </div>
                  )}
                </div>
              )
            })}
            {atRiskLaybys.length > 3 && (
              <button
                onClick={() => router.push(`/business/laybys?status=ACTIVE`)}
                className="text-sm text-orange-600 hover:underline"
              >
                +{atRiskLaybys.length - 3} more at risk
              </button>
            )}
          </div>
        </div>
      )}

      <div className="mt-4 pt-4 border-t">
        <button
          onClick={() => router.push('/business/laybys')}
          className="text-sm text-blue-600 hover:underline font-medium"
        >
          View All Laybys →
        </button>
      </div>
    </div>
  )
}
