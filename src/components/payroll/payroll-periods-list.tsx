'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface PayrollPeriod {
  id: string
  year: number
  month: number
  periodStart: string
  periodEnd: string
  status: string
  totalEmployees: number
  totalGrossPay: number
  totalDeductions: number
  totalNetPay: number
  createdAt: string
  creator?: {
    name: string
    email: string
  }
  approver?: {
    name: string
    email: string
  }
  business?: {
    id: string
    name: string
    type: string
    shortName?: string
  }
}

interface PayrollPeriodsListProps {
  businessId?: string
  onSelectPeriod?: (period: PayrollPeriod) => void
}

export function PayrollPeriodsList({ businessId, onSelectPeriod }: PayrollPeriodsListProps) {
  const router = useRouter()
  const [periods, setPeriods] = useState<PayrollPeriod[]>([])
  const [loading, setLoading] = useState(true)
  const [filterYear, setFilterYear] = useState<number>(new Date().getFullYear())
  const [filterStatus, setFilterStatus] = useState<string>('')

  useEffect(() => {
    loadPeriods()
  }, [businessId, filterYear, filterStatus])

  const loadPeriods = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()

      // If a businessId was provided, include it; otherwise fetch periods across all businesses
      if (businessId) params.append('businessId', businessId)

      if (filterYear) params.append('year', filterYear.toString())
      if (filterStatus) params.append('status', filterStatus)

      const response = await fetch(`/api/payroll/periods?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setPeriods(data)
      }
    } catch (error) {
      console.error('Failed to load payroll periods:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      in_progress: 'bg-blue-100 text-blue-800',
      review: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      exported: 'bg-purple-100 text-purple-800',
      closed: 'bg-gray-200 text-gray-600'
    }

    return badges[status] || 'bg-gray-100 text-gray-800'
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount)
  }

  const getMonthName = (month: number) => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December']
    return months[month - 1]
  }

  const handlePeriodClick = (period: PayrollPeriod) => {
    if (onSelectPeriod) {
      onSelectPeriod(period)
    } else {
      router.push(`/payroll/${period.id}`)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-secondary">Loading payroll periods...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div>
          <label className="block text-sm font-medium text-secondary mb-1">Year</label>
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(parseInt(e.target.value))}
            className="px-3 py-2 border border-border rounded-md bg-background text-primary focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {[2024, 2025, 2026].map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-secondary mb-1">Status</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-border rounded-md bg-background text-primary focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="in_progress">In Progress</option>
            <option value="review">Review</option>
            <option value="approved">Approved</option>
            <option value="exported">Exported</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      {/* Periods List */}
      {periods.length === 0 ? (
        <div className="text-center py-12 card">
          <p className="text-secondary">No payroll periods found</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {periods.map((period) => (
            <div
              key={period.id}
              onClick={() => handlePeriodClick(period)}
              className="card hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-primary">
                      {getMonthName(period.month)} {period.year}
                    </h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(period.status)}`}>
                      {period.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>

                  {period.business && (
                    <div className="text-sm text-secondary mb-2">
                      <strong className="text-primary">{period.business.name}</strong>
                      <span className="ml-2">({period.business.type})</span>
                    </div>
                  )}

                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-secondary">Employees:</span>
                      <span className="ml-2 font-medium text-primary">{period.totalEmployees}</span>
                    </div>
                    <div>
                      <span className="text-secondary">Gross Pay:</span>
                      <span className="ml-2 font-medium text-primary">{formatCurrency(period.totalGrossPay)}</span>
                    </div>
                    <div>
                      <span className="text-secondary">Deductions:</span>
                      <span className="ml-2 font-medium text-primary">{formatCurrency(period.totalDeductions)}</span>
                    </div>
                    <div>
                      <span className="text-secondary">Net Gross:</span>
                      <span className="ml-2 font-medium text-green-600 dark:text-green-400">{formatCurrency(period.totalNetPay)}</span>
                    </div>
                  </div>

                  <div className="mt-2 text-xs text-secondary">
                    Created by {period.creator?.name || 'Unknown'} on {new Date(period.createdAt).toLocaleDateString()}
                    {period.approver && (
                      <span className="ml-4">
                        Approved by {period.approver.name}
                      </span>
                    )}
                  </div>
                </div>

                <div className="ml-4">
                  <svg className="w-6 h-6 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
