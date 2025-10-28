'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { CheckCircle2, XCircle, AlertCircle, RefreshCw } from 'lucide-react'

interface LaybyBusinessRule {
  businessType: string
  depositPercent: {
    min: number
    max: number
    default: number
  }
  installmentFrequency: {
    allowed: string[]
    default: string
  }
  maxDurationDays: number
  fees: {
    serviceFeePercent: number
    lateFeeAmount: number
    administrationFeeAmount: number
  }
  policies: {
    allowPartialRelease: boolean
    inventoryReservation: string
    refundPolicy: string
    cancellationFeePercent: number
    requiresApproval: boolean
  }
  automation: {
    autoCompleteOnFullPayment: boolean
    sendPaymentReminders: boolean
    defaultAfterMissedPayments: number
    applyLateFeeAfterDays: number
  }
  validation: {
    minItemCount: number
    maxItemCount: number
    minTotalAmount: number
    maxTotalAmount: number
  }
}

interface BusinessType {
  type: string
  name: string
  rules: LaybyBusinessRule
}

interface BusinessLaybyRulesProps {
  businessType?: string
  showComparison?: boolean
}

export function BusinessLaybyRules({ businessType, showComparison = false }: BusinessLaybyRulesProps) {
  const [allBusinessTypes, setAllBusinessTypes] = useState<BusinessType[]>([])
  const [selectedType, setSelectedType] = useState<string>(businessType || 'clothing')
  const [selectedRules, setSelectedRules] = useState<BusinessType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAllRules()
  }, [])

  useEffect(() => {
    if (businessType) {
      setSelectedType(businessType)
    }
  }, [businessType])

  useEffect(() => {
    if (allBusinessTypes.length > 0) {
      const rules = allBusinessTypes.find(bt => bt.type === selectedType)
      setSelectedRules(rules || null)
    }
  }, [selectedType, allBusinessTypes])

  const fetchAllRules = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/layby-rules?all=true')
      if (!response.ok) {
        throw new Error('Failed to fetch business rules')
      }

      const data = await response.json()
      setAllBusinessTypes(data.data)
    } catch (err) {
      console.error('Error fetching rules:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const BooleanIndicator = ({ value }: { value: boolean }) => (
    value ? (
      <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
        <CheckCircle2 className="h-4 w-4" />
        Yes
      </span>
    ) : (
      <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
        <XCircle className="h-4 w-4" />
        No
      </span>
    )
  )

  if (loading) {
    return (
      <div className="card p-8 text-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
        <p className="text-secondary mt-4">Loading business rules...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card p-8">
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-4">
          <AlertCircle className="h-5 w-5" />
          <p className="font-semibold">Error loading rules</p>
        </div>
        <p className="text-secondary mb-4">{error}</p>
        <Button onClick={fetchAllRules} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    )
  }

  if (!selectedRules) {
    return (
      <div className="card p-8 text-center">
        <p className="text-secondary">No rules found for selected business type</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Business Type Selector */}
      <div className="card p-6">
        <Label htmlFor="businessType" className="mb-2 block font-semibold">
          Business Type
        </Label>
        <select
          id="businessType"
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="w-full max-w-md rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          {allBusinessTypes.map(bt => (
            <option key={bt.type} value={bt.type}>
              {bt.name}
            </option>
          ))}
        </select>
      </div>

      {/* Rules Display */}
      <div className="card p-6">
        <h2 className="text-2xl font-bold text-primary mb-6">
          {selectedRules.name} Layby Rules
        </h2>

        <div className="space-y-6">
          {/* Deposit Requirements */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-600"></span>
              Deposit Requirements
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded">
                <p className="text-secondary mb-1">Minimum Deposit</p>
                <p className="text-xl font-bold">{selectedRules.rules.depositPercent.min}%</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded">
                <p className="text-secondary mb-1">Maximum Deposit</p>
                <p className="text-xl font-bold">{selectedRules.rules.depositPercent.max}%</p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded">
                <p className="text-secondary mb-1">Recommended</p>
                <p className="text-xl font-bold text-blue-600">{selectedRules.rules.depositPercent.default}%</p>
              </div>
            </div>
          </div>

          {/* Payment Schedule */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-green-600"></span>
              Payment Schedule
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded">
                <p className="text-secondary mb-2">Allowed Frequencies</p>
                <div className="flex flex-wrap gap-2">
                  {selectedRules.rules.installmentFrequency.allowed.map(freq => (
                    <span key={freq} className="px-2 py-1 bg-background rounded text-xs font-medium">
                      {freq}
                    </span>
                  ))}
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded">
                <p className="text-secondary mb-1">Default Frequency</p>
                <p className="font-semibold">{selectedRules.rules.installmentFrequency.default}</p>
                <p className="text-secondary mt-2">Max Duration</p>
                <p className="font-semibold">{selectedRules.rules.maxDurationDays} days</p>
              </div>
            </div>
          </div>

          {/* Fees */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-orange-600"></span>
              Fees & Charges
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded">
                <p className="text-secondary mb-1">Service Fee</p>
                <p className="text-lg font-bold">{selectedRules.rules.fees.serviceFeePercent}%</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded">
                <p className="text-secondary mb-1">Late Fee</p>
                <p className="text-lg font-bold">{formatCurrency(selectedRules.rules.fees.lateFeeAmount)}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded">
                <p className="text-secondary mb-1">Admin Fee</p>
                <p className="text-lg font-bold">{formatCurrency(selectedRules.rules.fees.administrationFeeAmount)}</p>
              </div>
            </div>
          </div>

          {/* Policies */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-purple-600"></span>
              Policies
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-secondary">Partial Release</span>
                  <BooleanIndicator value={selectedRules.rules.policies.allowPartialRelease} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-secondary">Requires Approval</span>
                  <BooleanIndicator value={selectedRules.rules.policies.requiresApproval} />
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded space-y-2">
                <div>
                  <p className="text-secondary">Inventory Reservation</p>
                  <p className="font-semibold">{selectedRules.rules.policies.inventoryReservation}</p>
                </div>
                <div>
                  <p className="text-secondary">Refund Policy</p>
                  <p className="font-semibold">{selectedRules.rules.policies.refundPolicy}</p>
                </div>
                <div>
                  <p className="text-secondary">Cancellation Fee</p>
                  <p className="font-semibold">{selectedRules.rules.policies.cancellationFeePercent}%</p>
                </div>
              </div>
            </div>
          </div>

          {/* Automation */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-cyan-600"></span>
              Automation Settings
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-secondary">Auto-Complete</span>
                  <BooleanIndicator value={selectedRules.rules.automation.autoCompleteOnFullPayment} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-secondary">Payment Reminders</span>
                  <BooleanIndicator value={selectedRules.rules.automation.sendPaymentReminders} />
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded space-y-2">
                <div>
                  <p className="text-secondary">Default After</p>
                  <p className="font-semibold">{selectedRules.rules.automation.defaultAfterMissedPayments} missed payment(s)</p>
                </div>
                <div>
                  <p className="text-secondary">Apply Late Fee After</p>
                  <p className="font-semibold">{selectedRules.rules.automation.applyLateFeeAfterDays} day(s)</p>
                </div>
              </div>
            </div>
          </div>

          {/* Validation Rules */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-red-600"></span>
              Validation Rules
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded">
                <p className="text-secondary mb-1">Min Items</p>
                <p className="text-lg font-bold">{selectedRules.rules.validation.minItemCount}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded">
                <p className="text-secondary mb-1">Max Items</p>
                <p className="text-lg font-bold">
                  {selectedRules.rules.validation.maxItemCount === 0 ? 'Unlimited' : selectedRules.rules.validation.maxItemCount}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded">
                <p className="text-secondary mb-1">Min Amount</p>
                <p className="text-lg font-bold">{formatCurrency(selectedRules.rules.validation.minTotalAmount)}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded">
                <p className="text-secondary mb-1">Max Amount</p>
                <p className="text-lg font-bold">
                  {selectedRules.rules.validation.maxTotalAmount === 0 ? 'Unlimited' : formatCurrency(selectedRules.rules.validation.maxTotalAmount)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Comparison View */}
      {showComparison && allBusinessTypes.length > 0 && (
        <div className="card p-6">
          <h2 className="text-xl font-bold text-primary mb-4">
            Quick Comparison
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-2">Business Type</th>
                  <th className="text-center p-2">Default Deposit</th>
                  <th className="text-center p-2">Max Duration</th>
                  <th className="text-center p-2">Service Fee</th>
                  <th className="text-center p-2">Refund Policy</th>
                </tr>
              </thead>
              <tbody>
                {allBusinessTypes.map(bt => (
                  <tr
                    key={bt.type}
                    className={`border-b border-border ${bt.type === selectedType ? 'bg-blue-50 dark:bg-blue-950' : ''}`}
                  >
                    <td className="p-2 font-medium">{bt.name}</td>
                    <td className="text-center p-2">{bt.rules.depositPercent.default}%</td>
                    <td className="text-center p-2">{bt.rules.maxDurationDays} days</td>
                    <td className="text-center p-2">{bt.rules.fees.serviceFeePercent}%</td>
                    <td className="text-center p-2">{bt.rules.policies.refundPolicy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
