'use client'

import { useState, useEffect } from 'react'
import { LandlordSelect } from './landlord-select'
import { RentMonthlySummary } from './rent-monthly-summary'

interface RentConfig {
  id: string
  monthlyRentAmount: number
  dailyTransferAmount: number
  operatingDaysPerMonth: number
  rentDueDay: number
  autoTransferOnEOD: boolean
  isActive: boolean
  landlordSupplier: { id: string; name: string; contactPerson?: string | null; phone?: string | null; email?: string | null }
}

interface RentAccount {
  id: string
  accountNumber: string
  accountName: string
  balance: number
}

interface RentAccountManageModalProps {
  businessId: string
  businessType: string
  businessName: string
  onSuccess: () => void
  onClose: () => void
}

function indicatorColor(pct: number) {
  if (pct >= 100) return 'text-green-600 dark:text-green-400'
  if (pct >= 75) return 'text-orange-500 dark:text-orange-400'
  return 'text-red-500 dark:text-red-400'
}

function indicatorBg(pct: number) {
  if (pct >= 100) return 'bg-green-500'
  if (pct >= 75) return 'bg-orange-500'
  return 'bg-red-500'
}

export function RentAccountManageModal({
  businessId,
  businessType,
  businessName,
  onSuccess,
  onClose,
}: RentAccountManageModalProps) {
  const [config, setConfig] = useState<RentConfig | null>(null)
  const [account, setAccount] = useState<RentAccount | null>(null)
  const [fundingPercent, setFundingPercent] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deactivating, setDeactivating] = useState(false)
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'settings' | 'transactions'>('settings')

  // Form state
  const [monthlyRent, setMonthlyRent] = useState('')
  const [operatingDays, setOperatingDays] = useState('')
  const [rentDueDay, setRentDueDay] = useState('')
  const [landlordSupplierId, setLandlordSupplierId] = useState('')
  const [autoTransfer, setAutoTransfer] = useState(true)

  useEffect(() => {
    const fetchConfig = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/rent-account/${businessId}`)
        if (res.ok) {
          const data = await res.json()
          if (data.config) {
            setConfig(data.config)
            setAccount(data.account)
            setFundingPercent(data.fundingPercent || 0)
            setMonthlyRent(String(data.config.monthlyRentAmount))
            setOperatingDays(String(data.config.operatingDaysPerMonth))
            setRentDueDay(String(data.config.rentDueDay))
            setLandlordSupplierId(data.config.landlordSupplier.id)
            setAutoTransfer(data.config.autoTransferOnEOD)
          }
        }
      } catch {
        setError('Failed to load rent account')
      } finally {
        setLoading(false)
      }
    }
    fetchConfig()
  }, [businessId])

  const newMonthly = parseFloat(monthlyRent) || 0
  const newDays = parseInt(operatingDays) || 0
  const newDailyTransfer = newMonthly > 0 && newDays > 0 ? Math.ceil(newMonthly / newDays) : 0

  const handleSave = async () => {
    if (newMonthly <= 0) { setError('Monthly rent must be > 0'); return }
    if (newDays < 1 || newDays > 31) { setError('Operating days must be 1–31'); return }
    const due = parseInt(rentDueDay)
    if (!due || due < 1 || due > 28) { setError('Due day must be 1–28'); return }
    if (!landlordSupplierId) { setError('Please select a landlord'); return }

    setSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/rent-account/${businessId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monthlyRentAmount: newMonthly,
          operatingDaysPerMonth: newDays,
          rentDueDay: due,
          landlordSupplierId,
          autoTransferOnEOD: autoTransfer,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update')
      setSuccess('Rent account updated successfully')
      setTimeout(() => { onSuccess() }, 1200)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeactivate = async () => {
    setDeactivating(true)
    setError(null)
    try {
      const res = await fetch(`/api/rent-account/${businessId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to deactivate')
      setSuccess('Rent account deactivated')
      setTimeout(() => { onSuccess() }, 1200)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setDeactivating(false)
      setShowDeactivateConfirm(false)
    }
  }

  const inputCls =
    'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:opacity-60'

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="card max-w-lg md:max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-primary">⚙️ Manage Rent Account</h2>
            <p className="text-xs text-secondary mt-0.5">{businessName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2.5 text-sm font-medium transition-colors ${activeTab === 'settings' ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
          >
            ⚙️ Settings
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-4 py-2.5 text-sm font-medium transition-colors ${activeTab === 'transactions' ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
          >
            📋 Transactions
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-secondary">Loading...</div>
        ) : activeTab === 'transactions' ? (
          <div className="p-5">
            {account && config ? (
              <RentMonthlySummary
                businessId={businessId}
                accountId={account.id}
                monthlyRentAmount={config.monthlyRentAmount}
                dailyTransferAmount={config.dailyTransferAmount}
                rentDueDay={config.rentDueDay}
                landlordSupplier={config.landlordSupplier}
              />
            ) : (
              <p className="text-sm text-gray-400">No rent account data available.</p>
            )}
          </div>
        ) : (
          <div className="p-5 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-md text-sm text-red-700 dark:text-red-300">
                {error}
              </div>
            )}
            {success && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-md text-sm text-green-700 dark:text-green-300">
                ✓ {success}
              </div>
            )}

            {/* Balance card — full width */}
            {account && config && (
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-secondary">Current Balance</span>
                  <span className={`text-lg font-bold ${indicatorColor(fundingPercent)}`}>
                    {account.balance.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-secondary">Monthly Rent</span>
                  <span className="text-primary">{config.monthlyRentAmount.toFixed(2)}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${indicatorBg(fundingPercent)}`}
                    style={{ width: `${Math.min(fundingPercent, 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-secondary">Funding</span>
                  <span className={`font-semibold ${indicatorColor(fundingPercent)}`}>
                    {fundingPercent.toFixed(1)}%
                    {fundingPercent >= 100 ? ' 🟢 Ready' : fundingPercent >= 75 ? ' 🟠 Good' : ' 🔴 Building'}
                  </span>
                </div>
                <div className="text-xs text-secondary">{account.accountNumber} · {account.accountName}</div>
              </div>
            )}

            {/* Two-column layout on desktop */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">

              {/* Left column: numeric fields */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-secondary mb-1">Monthly Rent *</label>
                    <input type="number" step="0.01" min="0.01" value={monthlyRent} onChange={e => setMonthlyRent(e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-secondary mb-1">Operating Days *</label>
                    <input type="number" min="1" max="31" value={operatingDays} onChange={e => setOperatingDays(e.target.value)} className={inputCls} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-secondary mb-1">Daily Transfer (calculated)</label>
                    <div className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-800 text-sm font-mono text-green-700 dark:text-green-400">
                      {newDailyTransfer > 0 ? newDailyTransfer.toLocaleString() : '—'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-secondary mb-1">Rent Due Day (1–28) *</label>
                    <input type="number" min="1" max="28" value={rentDueDay} onChange={e => setRentDueDay(e.target.value)} className={inputCls} />
                  </div>
                </div>
              </div>

              {/* Right column: landlord + auto-transfer + deactivate */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-secondary mb-1">Landlord *</label>
                  <LandlordSelect
                    businessId={businessId}
                    businessType={businessType}
                    value={landlordSupplierId}
                    onChange={setLandlordSupplierId}
                    initialSupplier={config?.landlordSupplier ?? null}
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                  <div>
                    <p className="text-sm font-medium text-primary">Auto-transfer on EOD</p>
                    <p className="text-xs text-secondary">Suggest daily transfer at close of day</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAutoTransfer(!autoTransfer)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      autoTransfer ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${autoTransfer ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                {/* Deactivate section */}
                {config?.isActive && (
                  <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                    {!showDeactivateConfirm ? (
                      <button
                        type="button"
                        onClick={() => setShowDeactivateConfirm(true)}
                        className="text-sm text-red-600 dark:text-red-400 hover:underline"
                      >
                        Deactivate Rent Account
                      </button>
                    ) : (
                      <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-md space-y-2">
                        <p className="text-sm text-red-700 dark:text-red-300 font-medium">Are you sure? No further auto-transfers will be suggested. Existing balance is preserved.</p>
                        <div className="flex gap-2">
                          <button
                            onClick={handleDeactivate}
                            disabled={deactivating}
                            className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                          >
                            {deactivating ? 'Deactivating...' : 'Yes, Deactivate'}
                          </button>
                          <button
                            onClick={() => setShowDeactivateConfirm(false)}
                            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded text-secondary hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {!loading && activeTab === 'settings' && (
          <div className="p-5 border-t border-gray-200 dark:border-gray-700 flex gap-3">
            <button onClick={handleSave} disabled={saving} className="btn-primary disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button onClick={onClose} disabled={saving} className="btn-secondary">Close</button>
          </div>
        )}
        {!loading && activeTab === 'transactions' && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
            <button onClick={onClose} className="btn-secondary">Close</button>
          </div>
        )}
      </div>
    </div>
  )
}
