'use client'

import { useState } from 'react'
import { CustomerLayby } from '@/types/layby'
import { LaybyStatusBadge } from './layby-status-badge'
import { Package, Calendar, DollarSign, User, FileText, CreditCard, AlertTriangle, Clock } from 'lucide-react'
import { formatDateByFormat } from '@/lib/country-codes'
import { useDateFormat } from '@/contexts/settings-context'

interface LaybyListProps {
  laybys: CustomerLayby[]
  loading: boolean
  onLaybyClick: (layby: CustomerLayby) => void
  onRefresh?: () => void
}

export function LaybyList({ laybys, loading, onLaybyClick, onRefresh }: LaybyListProps) {
  const { format: globalDateFormat } = useDateFormat()

  // Determine if layby is overdue or at risk
  const getLaybyRiskStatus = (layby: CustomerLayby): 'overdue' | 'at-risk' | 'normal' => {
    if (layby.status !== 'ACTIVE' || Number(layby.balanceRemaining) <= 0) {
      return 'normal'
    }

    if (!layby.paymentDueDate) return 'normal'

    const now = new Date()
    const dueDate = new Date(layby.paymentDueDate)
    const daysDifference = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

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

    // Overdue: payment date has passed AND there's an actual amount due
    if (daysDifference < 0 && overdueAmount > 0) {
      return 'overdue'
    }

    // At risk: approaching due date (within 3 days) with significant balance
    const balancePercentage = (Number(layby.balanceRemaining) / Number(layby.totalAmount)) * 100
    if (daysDifference <= 3 && daysDifference >= 0 && balancePercentage > 50) {
      return 'at-risk'
    }

    return 'normal'
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="card p-6 animate-pulse">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    )
  }

  if (laybys.length === 0) {
    return (
      <div className="card p-12 text-center">
        <Package className="h-12 w-12 text-secondary mx-auto mb-4" />
        <h3 className="text-lg font-medium text-primary mb-2">No laybys found</h3>
        <p className="text-secondary">Try adjusting your search or filters</p>
      </div>
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return formatDateByFormat(dateString, globalDateFormat)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {laybys.map((layby) => {
        const riskStatus = getLaybyRiskStatus(layby)
        const isOverdue = riskStatus === 'overdue'
        const isAtRisk = riskStatus === 'at-risk'

        return (
          <div
            key={layby.id}
            className={`card p-6 hover:shadow-lg transition-shadow cursor-pointer ${
              isOverdue
                ? 'border-2 border-red-500 bg-red-50 dark:bg-red-950'
                : isAtRisk
                ? 'border-2 border-orange-500 bg-orange-50 dark:bg-orange-950'
                : ''
            }`}
            onClick={() => onLaybyClick(layby)}
          >
            {/* Risk Alert Banner */}
            {(isOverdue || isAtRisk) && (
              <div className={`mb-3 p-2 rounded flex items-center gap-2 text-sm font-semibold ${
                isOverdue
                  ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                  : 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200'
              }`}>
                {isOverdue ? (
                  <>
                    <AlertTriangle className="h-4 w-4" />
                    <span>OVERDUE - Contact Customer</span>
                  </>
                ) : (
                  <>
                    <Clock className="h-4 w-4" />
                    <span>AT RISK - Payment Due Soon</span>
                  </>
                )}
              </div>
            )}

            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="font-semibold text-primary mb-1">
                  {layby.laybyNumber}
                </h3>
                <p className="text-sm text-secondary">
                  {layby.customer?.name || 'No customer'}
                </p>
              </div>
              <LaybyStatusBadge status={layby.status} />
            </div>

          {/* Financial Info */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-secondary">Total Amount:</span>
              <span className="font-semibold text-primary">
                {formatCurrency(layby.totalAmount)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-secondary">Paid:</span>
              <span className="font-semibold text-green-600 dark:text-green-400">
                {formatCurrency(layby.totalPaid)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-secondary">Balance:</span>
              <span className="font-semibold text-orange-600 dark:text-orange-400">
                {formatCurrency(layby.balanceRemaining)}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-secondary mb-1">
              <span>Progress</span>
              <span>
                {((layby.totalPaid / layby.totalAmount) * 100).toFixed(0)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all"
                style={{
                  width: `${Math.min((layby.totalPaid / layby.totalAmount) * 100, 100)}%`
                }}
              />
            </div>
          </div>

          {/* Additional Info */}
          <div className="space-y-2 text-sm text-secondary">
            {layby.paymentDueDate && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>Due: {formatDate(layby.paymentDueDate)}</span>
              </div>
            )}
            {layby._count?.payments !== undefined && (
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                <span>{layby._count.payments} payments</span>
              </div>
            )}
            {layby.installmentFrequency && (
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span>{layby.installmentFrequency} installments</span>
              </div>
            )}
          </div>

          {/* Items Released Badge */}
          {layby.itemsReleased && (
            <div className="mt-4 pt-4 border-t border-border">
              <span className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300 px-2 py-1 rounded-full">
                Items Released
              </span>
            </div>
          )}
          </div>
        )
      })}
    </div>
  )
}
