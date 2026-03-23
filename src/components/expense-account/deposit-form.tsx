'use client'

import { useState, useEffect } from 'react'
import { useAlert } from '@/components/ui/confirm-modal'
import { DateInput } from '@/components/ui/date-input'
import { getTodayLocalDateString } from '@/lib/date-utils'
import { LenderSelector } from './lender-selector'
import { FundSourceManager } from './fund-source-manager'
import { SearchableSelect } from '@/components/ui/searchable-select'

interface Business {
  id: string
  name: string
  type: string
  balance: number
}

interface DepositSource {
  id: string
  name: string
  emoji: string
  isDefault: boolean
}

interface FundSource {
  id: string
  name: string
  emoji: string
  description: string | null
  usageCount: number
}

interface DepositFormProps {
  accountId: string
  accountType?: string
  onSuccess?: () => void
}

export function DepositForm({ accountId, accountType = 'GENERAL', onSuccess }: DepositFormProps) {
  const isPersonalAccount = accountType === 'PERSONAL'
  const customAlert = useAlert()
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [loadingBusinesses, setLoadingBusinesses] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [depositSources, setDepositSources] = useState<DepositSource[]>([])
  const [fundSources, setFundSources] = useState<FundSource[]>([])
  const [showFundSourceManager, setShowFundSourceManager] = useState(false)
  const [saveSenderNote, setSaveSenderNote] = useState(false)
  const [saveCourierNote, setSaveCourierNote] = useState(false)

  const [formData, setFormData] = useState({
    sourceType: 'MANUAL' as 'BUSINESS' | 'MANUAL' | 'OTHER' | 'LOAN',
    sourceBusinessId: '',
    depositSourceId: '',
    lenderId: '',
    lenderName: '',
    loanDueDate: '',
    loanNotes: '',
    amount: '',
    depositDate: getTodayLocalDateString(),
    transactionType: 'DEPOSIT' as string,
    manualNote: '',
    fundSourceId: '',
    subSourceId: '',
    fundSourceNote: '',
    subSourceNote: '',
    fundSourceMode: 'none' as 'none' | 'saved' | 'note',
    subSourceMode: 'none' as 'none' | 'saved' | 'note',
  })

  const [errors, setErrors] = useState({
    sourceBusinessId: '',
    amount: '',
    depositDate: '',
  })

  useEffect(() => {
    if (formData.sourceType === 'BUSINESS') {
      fetchBusinesses()
    }
  }, [formData.sourceType])

  useEffect(() => {
    if (isPersonalAccount) {
      fetch('/api/expense-account/deposit-sources', { credentials: 'include' })
        .then(r => r.json())
        .then(d => setDepositSources(d.data?.sources || []))
        .catch(() => {})
    }
  }, [isPersonalAccount])

  const fetchFundSources = () => {
    fetch('/api/expense-account/fund-sources', { credentials: 'include' })
      .then(r => r.json())
      .then(d => setFundSources(d.data || []))
      .catch(() => {})
  }

  useEffect(() => { fetchFundSources() }, [])

  const fetchBusinesses = async () => {
    try {
      setLoadingBusinesses(true)
      const response = await fetch('/api/businesses', {
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        const businessList = data.businesses || []
        const businessesWithAccounts = businessList.filter((b: any) => b.business_accounts)

        const transformedBusinesses = businessesWithAccounts.map((b: any) => ({
          id: b.id,
          name: b.name,
          type: b.type,
          balance: Number(b.business_accounts?.balance || 0)
        }))

        setBusinesses(transformedBusinesses)
      }
    } catch (error) {
      console.error('Error fetching businesses:', error)
    } finally {
      setLoadingBusinesses(false)
    }
  }

  const selectedBusiness = businesses.find(b => b.id === formData.sourceBusinessId)

  const generateAutoNote = () => {
    if (formData.sourceType === 'BUSINESS' && selectedBusiness) {
      return `Deposit from ${selectedBusiness.name} business account`
    }
    if (formData.sourceType === 'OTHER') {
      return 'Deposit from external source'
    }
    return 'Manual deposit'
  }

  const displayNote = formData.manualNote.trim() || generateAutoNote()

  const validateForm = () => {
    const newErrors = {
      sourceBusinessId: '',
      amount: '',
      depositDate: '',
    }

    // Validate business selection if source is BUSINESS
    if (formData.sourceType === 'BUSINESS' && !formData.sourceBusinessId) {
      newErrors.sourceBusinessId = 'Please select a business'
    }

    // Validate amount
    const amount = parseFloat(formData.amount)
    if (!formData.amount || isNaN(amount)) {
      newErrors.amount = 'Please enter a valid amount'
    } else if (amount <= 0) {
      newErrors.amount = 'Amount must be greater than 0'
    } else if (amount > 999999999.99) {
      newErrors.amount = 'Amount exceeds maximum allowed value'
    } else if (formData.sourceType === 'BUSINESS' && selectedBusiness && amount > Number(selectedBusiness.balance)) {
      newErrors.amount = `Insufficient business balance. Available: $${Number(selectedBusiness.balance).toFixed(2)}`
    }

    // Validate deposit date
    if (!formData.depositDate) {
      newErrors.depositDate = 'Please select a deposit date'
    } else {
      // Compare date strings only — avoids timezone/clock-skew false positives
      const todayStr = new Date().toLocaleDateString('en-CA') // 'YYYY-MM-DD' in local TZ
      if (formData.depositDate > todayStr) {
        newErrors.depositDate = 'Deposit date cannot be in the future'
      }
    }

    setErrors(newErrors)
    return !newErrors.sourceBusinessId && !newErrors.amount && !newErrors.depositDate
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setSubmitting(true)

    try {
      // If "Save for future use" is checked on typed names, create fund sources first
      let resolvedFundSourceId = formData.fundSourceMode === 'saved' ? formData.fundSourceId : undefined
      let resolvedSubSourceId = formData.subSourceMode === 'saved' ? formData.subSourceId : undefined
      let resolvedFundSourceNote = formData.fundSourceMode === 'note' && formData.fundSourceNote.trim() ? formData.fundSourceNote.trim() : undefined
      let resolvedSubSourceNote = formData.subSourceMode === 'note' && formData.subSourceNote.trim() ? formData.subSourceNote.trim() : undefined

      if (formData.fundSourceMode === 'note' && formData.fundSourceNote.trim() && saveSenderNote) {
        const res = await fetch('/api/expense-account/fund-sources', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ name: formData.fundSourceNote.trim() }),
        })
        if (res.ok) {
          const saved = await res.json()
          resolvedFundSourceId = saved.data.id
          resolvedFundSourceNote = undefined
          fetchFundSources()
        }
      }

      if (formData.subSourceMode === 'note' && formData.subSourceNote.trim() && saveCourierNote) {
        const res = await fetch('/api/expense-account/fund-sources', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ name: formData.subSourceNote.trim() }),
        })
        if (res.ok) {
          const saved = await res.json()
          resolvedSubSourceId = saved.data.id
          resolvedSubSourceNote = undefined
          fetchFundSources()
        }
      }

      const response = await fetch(`/api/expense-account/${accountId}/deposits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          sourceType: formData.sourceType,
          sourceBusinessId: formData.sourceType === 'BUSINESS' ? formData.sourceBusinessId : undefined,
          depositSourceId: isPersonalAccount && formData.depositSourceId ? formData.depositSourceId : undefined,
          lenderId: formData.sourceType === 'LOAN' ? formData.lenderId : undefined,
          loanDueDate: formData.sourceType === 'LOAN' && formData.loanDueDate ? formData.loanDueDate : undefined,
          loanNotes: formData.sourceType === 'LOAN' && formData.loanNotes ? formData.loanNotes : undefined,
          amount: parseFloat(formData.amount),
          depositDate: formData.depositDate,
          transactionType: formData.transactionType,
          manualNote: formData.manualNote.trim() || undefined,
          fundSourceId: resolvedFundSourceId,
          subSourceId: resolvedSubSourceId,
          fundSourceNote: resolvedFundSourceNote,
          subSourceNote: resolvedSubSourceNote,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        customAlert({
          title: 'Success',
          message: `Deposit of $${parseFloat(formData.amount).toFixed(2)} created successfully`,
          type: 'success',
        })

        // Reset form
        setFormData({
          sourceType: 'MANUAL',
          sourceBusinessId: '',
          depositSourceId: '',
          lenderId: '',
          lenderName: '',
          loanDueDate: '',
          loanNotes: '',
          amount: '',
          depositDate: getTodayLocalDateString(),
          transactionType: 'DEPOSIT',
          manualNote: '',
          fundSourceId: '',
          subSourceId: '',
          fundSourceNote: '',
          subSourceNote: '',
          fundSourceMode: 'none',
          subSourceMode: 'none',
        })
        setErrors({ sourceBusinessId: '', amount: '', depositDate: '' })
        setSaveSenderNote(false)
        setSaveCourierNote(false)

        if (onSuccess) {
          onSuccess()
        }
      } else {
        customAlert({
          title: 'Error',
          message: data.error || 'Failed to create deposit',
          type: 'error',
        })
      }
    } catch (error) {
      console.error('Error creating deposit:', error)
      customAlert({
        title: 'Error',
        message: 'An error occurred while creating the deposit',
        type: 'error',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Source Type Selection */}
      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
          Deposit Source <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-1.5 flex-wrap">
          {([
            { type: 'BUSINESS', emoji: '🏢', label: 'Business' },
            { type: 'MANUAL',   emoji: '✋', label: 'Manual'   },
            { type: 'OTHER',    emoji: '💼', label: 'Other'    },
            { type: 'LOAN',     emoji: '📚', label: 'Loan'     },
          ] as const).map(({ type, emoji, label }) => (
            <button
              key={type}
              type="button"
              onClick={() => setFormData({ ...formData, sourceType: type, sourceBusinessId: '' })}
              className={`px-3 py-1.5 text-xs rounded-full border-2 font-medium transition-colors ${
                formData.sourceType === type
                  ? type === 'LOAN'
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                    : 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                  : 'border-border hover:border-gray-400 dark:hover:border-gray-500 text-gray-600 dark:text-gray-400'
              }`}
            >
              {emoji} {label}
            </button>
          ))}
        </div>
      </div>

      {/* Loan Fields */}
      {formData.sourceType === 'LOAN' && (
        <div className="space-y-3 p-3 border border-purple-200 dark:border-purple-800 rounded-lg bg-purple-50 dark:bg-purple-900/10">
          <p className="text-xs font-semibold text-purple-700 dark:text-purple-300">Loan Details</p>
          <LenderSelector
            value={formData.lenderId}
            onChange={(id, name) => setFormData({ ...formData, lenderId: id, lenderName: name })}
            error={formData.sourceType === 'LOAN' && !formData.lenderId ? '' : undefined}
          />
          <div>
            <label className="block text-xs font-medium text-secondary mb-1">Due Date (optional)</label>
            <input
              type="date"
              value={formData.loanDueDate}
              onChange={e => setFormData({ ...formData, loanDueDate: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-primary text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-secondary mb-1">Loan Notes (optional)</label>
            <input
              type="text"
              value={formData.loanNotes}
              onChange={e => setFormData({ ...formData, loanNotes: e.target.value })}
              placeholder="e.g. House renovation loan"
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-primary text-sm"
            />
          </div>
        </div>
      )}

      {/* Deposit Source (personal accounts) */}
      {isPersonalAccount && depositSources.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Funding Source
          </label>
          <select
            value={formData.depositSourceId}
            onChange={(e) => setFormData({ ...formData, depositSourceId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
          >
            <option value="">-- Select funding source (optional) --</option>
            {depositSources.map(s => (
              <option key={s.id} value={s.id}>{s.emoji} {s.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Business Selection (only if source type is BUSINESS) */}
      {formData.sourceType === 'BUSINESS' && (
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Source Business <span className="text-red-500">*</span>
          </label>
          {loadingBusinesses ? (
            <div className="animate-pulse h-10 bg-gray-200 dark:bg-gray-600 rounded"></div>
          ) : (
            <select
              value={formData.sourceBusinessId}
              onChange={(e) => {
                setFormData({ ...formData, sourceBusinessId: e.target.value })
                setErrors({ ...errors, sourceBusinessId: '' })
              }}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.sourceBusinessId ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
            >
              <option value="">Select a business...</option>
              {businesses.map((business) => (
                <option key={business.id} value={business.id}>
                  {business.name} ({business.type}) - Balance: {formatCurrency(business.balance)}
                </option>
              ))}
            </select>
          )}
          {errors.sourceBusinessId && (
            <p className="mt-1 text-sm text-red-500">{errors.sourceBusinessId}</p>
          )}
        </div>
      )}

      {/* Business Balance Display */}
      {selectedBusiness && formData.sourceType === 'BUSINESS' && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-xs">
          <span className="font-medium text-blue-800 dark:text-blue-300">{selectedBusiness.name}</span>
          <span className="text-blue-500 dark:text-blue-500">·</span>
          <span className="text-blue-600 dark:text-blue-400">{selectedBusiness.type}</span>
          <span className="ml-auto font-bold text-blue-900 dark:text-blue-200">{formatCurrency(selectedBusiness.balance)} available</span>
        </div>
      )}

      {/* Fund Source section — MANUAL / OTHER only */}
      {(formData.sourceType === 'MANUAL' || formData.sourceType === 'OTHER') && (
        <div className="space-y-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg">

          {/* Manage saved sources toggle */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">Sender & Courier</span>
            <button
              type="button"
              onClick={() => setShowFundSourceManager(v => !v)}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              {showFundSourceManager ? 'Hide' : 'Manage saved sources'}
            </button>
          </div>

          {showFundSourceManager && (
            <div className="border border-blue-100 dark:border-blue-900 rounded-lg p-3 bg-blue-50 dark:bg-blue-900/10">
              <FundSourceManager onUpdated={fetchFundSources} />
            </div>
          )}

          {/* — WHO SENT THIS MONEY — */}
          <div>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">
              Who sent this money? <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <div className="flex gap-2 mb-2">
              <button type="button"
                onClick={() => setFormData({ ...formData, fundSourceMode: 'none', fundSourceId: '', fundSourceNote: '' })}
                className={`px-3 py-1.5 text-xs rounded border transition-colors ${formData.fundSourceMode === 'none' ? 'border-gray-500 bg-gray-100 dark:bg-gray-700 font-semibold' : 'border-border hover:bg-gray-50 dark:hover:bg-gray-700'}`}
              >Not specified</button>
              <button type="button"
                onClick={() => setFormData({ ...formData, fundSourceMode: 'saved', fundSourceNote: '' })}
                className={`px-3 py-1.5 text-xs rounded border transition-colors ${formData.fundSourceMode === 'saved' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 font-semibold' : 'border-border hover:bg-gray-50 dark:hover:bg-gray-700'}`}
              >Select from list</button>
              <button type="button"
                onClick={() => setFormData({ ...formData, fundSourceMode: 'note', fundSourceId: '' })}
                className={`px-3 py-1.5 text-xs rounded border transition-colors ${formData.fundSourceMode === 'note' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 font-semibold' : 'border-border hover:bg-gray-50 dark:hover:bg-gray-700'}`}
              >Type a name</button>
            </div>
            {formData.fundSourceMode === 'saved' && (
              <SearchableSelect
                options={fundSources.map(s => ({
                  id: s.id,
                  name: s.description ? `${s.name} — ${s.description}` : s.name,
                  emoji: s.emoji,
                }))}
                value={formData.fundSourceId}
                onChange={id => setFormData({ ...formData, fundSourceId: id })}
                placeholder="Select sender..."
                searchPlaceholder="Search senders..."
                emptyMessage="No saved sources. Add one via 'Manage saved sources'."
              />
            )}
            {formData.fundSourceMode === 'note' && (() => {
              const q = formData.fundSourceNote.trim().toLowerCase()
              const matches = q ? fundSources.filter(s => s.name.toLowerCase().includes(q)) : []
              const exactMatch = fundSources.find(s => s.name.toLowerCase() === q)
              return (
                <div className="space-y-1.5">
                  <input
                    type="text"
                    value={formData.fundSourceNote}
                    onChange={e => { setFormData({ ...formData, fundSourceNote: e.target.value }); setSaveSenderNote(false) }}
                    placeholder="e.g. John Smith"
                    className="w-full px-3 py-2 border border-border rounded text-sm bg-background text-primary"
                    maxLength={200}
                    autoComplete="off"
                  />
                  {matches.length > 0 && (
                    <div className="border border-border rounded bg-background shadow-sm overflow-hidden">
                      <p className="px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border-b border-border">
                        Matches in your saved list — click to use:
                      </p>
                      {matches.map(s => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setFormData({ ...formData, fundSourceMode: 'saved', fundSourceId: s.id, fundSourceNote: '' })}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-left"
                        >
                          <span>{s.emoji}</span>
                          <span className="font-medium text-primary">{s.name}</span>
                          {s.description && <span className="text-xs text-gray-400 dark:text-gray-500">— {s.description}</span>}
                          <span className="ml-auto text-xs text-blue-600 dark:text-blue-400">Use this</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {formData.fundSourceNote.trim() && !exactMatch && (
                    <label className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={saveSenderNote}
                        onChange={e => setSaveSenderNote(e.target.checked)}
                        className="rounded"
                      />
                      Save "{formData.fundSourceNote.trim()}" to my list for future deposits
                    </label>
                  )}
                  {exactMatch && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      "{exactMatch.name}" already exists in your list — click it above to use the saved version.
                    </p>
                  )}
                </div>
              )
            })()}
          </div>

          {/* — VIA (COURIER) — always visible, independent — */}
          <div className="border-t border-border pt-3">
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">
              Delivered via? <span className="font-normal text-gray-400">(optional courier / intermediary)</span>
            </label>
            <div className="flex gap-2 mb-2">
              <button type="button"
                onClick={() => setFormData({ ...formData, subSourceMode: 'none', subSourceId: '', subSourceNote: '' })}
                className={`px-3 py-1.5 text-xs rounded border transition-colors ${formData.subSourceMode === 'none' ? 'border-gray-500 bg-gray-100 dark:bg-gray-700 font-semibold' : 'border-border hover:bg-gray-50 dark:hover:bg-gray-700'}`}
              >No courier</button>
              <button type="button"
                onClick={() => setFormData({ ...formData, subSourceMode: 'saved', subSourceNote: '' })}
                className={`px-3 py-1.5 text-xs rounded border transition-colors ${formData.subSourceMode === 'saved' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 font-semibold' : 'border-border hover:bg-gray-50 dark:hover:bg-gray-700'}`}
              >Select from list</button>
              <button type="button"
                onClick={() => setFormData({ ...formData, subSourceMode: 'note', subSourceId: '' })}
                className={`px-3 py-1.5 text-xs rounded border transition-colors ${formData.subSourceMode === 'note' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 font-semibold' : 'border-border hover:bg-gray-50 dark:hover:bg-gray-700'}`}
              >Type a name</button>
            </div>
            {formData.subSourceMode === 'saved' && (
              <SearchableSelect
                options={fundSources
                  .filter(s => s.id !== formData.fundSourceId)
                  .map(s => ({
                    id: s.id,
                    name: s.description ? `${s.name} — ${s.description}` : s.name,
                    emoji: s.emoji,
                  }))}
                value={formData.subSourceId}
                onChange={id => setFormData({ ...formData, subSourceId: id })}
                placeholder="Select courier..."
                searchPlaceholder="Search couriers..."
                emptyMessage="No saved sources. Add one via 'Manage saved sources'."
              />
            )}
            {formData.subSourceMode === 'note' && (() => {
              const q = formData.subSourceNote.trim().toLowerCase()
              const matches = q ? fundSources.filter(s => s.id !== formData.fundSourceId && s.name.toLowerCase().includes(q)) : []
              const exactMatch = fundSources.find(s => s.name.toLowerCase() === q)
              return (
                <div className="space-y-1.5">
                  <input
                    type="text"
                    value={formData.subSourceNote}
                    onChange={e => { setFormData({ ...formData, subSourceNote: e.target.value }); setSaveCourierNote(false) }}
                    placeholder="e.g. Kurauone"
                    className="w-full px-3 py-2 border border-border rounded text-sm bg-background text-primary"
                    maxLength={200}
                    autoComplete="off"
                  />
                  {matches.length > 0 && (
                    <div className="border border-border rounded bg-background shadow-sm overflow-hidden">
                      <p className="px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border-b border-border">
                        Matches in your saved list — click to use:
                      </p>
                      {matches.map(s => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setFormData({ ...formData, subSourceMode: 'saved', subSourceId: s.id, subSourceNote: '' })}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-left"
                        >
                          <span>{s.emoji}</span>
                          <span className="font-medium text-primary">{s.name}</span>
                          {s.description && <span className="text-xs text-gray-400 dark:text-gray-500">— {s.description}</span>}
                          <span className="ml-auto text-xs text-blue-600 dark:text-blue-400">Use this</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {formData.subSourceNote.trim() && !exactMatch && (
                    <label className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={saveCourierNote}
                        onChange={e => setSaveCourierNote(e.target.checked)}
                        className="rounded"
                      />
                      Save "{formData.subSourceNote.trim()}" to my list for future deposits
                    </label>
                  )}
                  {exactMatch && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      "{exactMatch.name}" already exists in your list — click it above to use the saved version.
                    </p>
                  )}
                </div>
              )
            })()}
          </div>
        </div>
      )}

      {/* Amount + Date inline */}
      <div className="grid grid-cols-2 gap-3">
        {/* Amount */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Deposit Amount <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-gray-500 dark:text-gray-400 text-sm">$</span>
            <input
              type="number"
              step="0.10"
              min="0"
              max="999999999.99"
              value={formData.amount}
              onChange={(e) => {
                setFormData({ ...formData, amount: e.target.value })
                setErrors({ ...errors, amount: '' })
              }}
              className={`w-full pl-8 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm ${
                errors.amount ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="0.00"
            />
          </div>
          {errors.amount && (
            <p className="mt-1 text-xs text-red-500">{errors.amount}</p>
          )}
          {selectedBusiness && formData.amount && !errors.amount && formData.sourceType === 'BUSINESS' && (
            <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
              Remaining: {formatCurrency(selectedBusiness.balance - parseFloat(formData.amount || '0'))}
            </p>
          )}
        </div>

        {/* Deposit Date */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Deposit Date <span className="text-red-500">*</span>
          </label>
          <DateInput
            label=""
            value={formData.depositDate}
            onChange={(value) => {
              setFormData({ ...formData, depositDate: value })
              setErrors({ ...errors, depositDate: '' })
            }}
            required
            compact
          />
          {errors.depositDate && (
            <p className="mt-1 text-xs text-red-500">{errors.depositDate}</p>
          )}
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Past dates allowed; no future dates
          </p>
        </div>
      </div>

      {/* Custom Note (Optional) */}
      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
          Custom Note <span className="font-normal text-gray-400">(optional)</span>
        </label>
        <textarea
          value={formData.manualNote}
          onChange={(e) => setFormData({ ...formData, manualNote: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          rows={1}
          placeholder="Leave empty to use auto-generated note"
          maxLength={500}
        />
      </div>

      {/* Auto-Generated Note Preview */}
      {displayNote && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
          <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">Note:</span>
          <span className="text-xs text-gray-800 dark:text-gray-200 font-medium truncate">{displayNote}</span>
        </div>
      )}

      {/* Form Actions */}
      <div className="flex items-center justify-end space-x-3 pt-2 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={() => {
            setFormData({
              sourceType: 'MANUAL',
              sourceBusinessId: '',
              depositSourceId: '',
              lenderId: '',
              lenderName: '',
              loanDueDate: '',
              loanNotes: '',
              amount: '',
              depositDate: getTodayLocalDateString(),
              transactionType: 'DEPOSIT',
              manualNote: '',
              fundSourceId: '',
              subSourceId: '',
              fundSourceNote: '',
              fundSourceMode: 'none',
            })
            setErrors({ sourceBusinessId: '', amount: '', depositDate: '' })
          }}
          className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          Reset
        </button>
        <button
          type="submit"
          disabled={submitting || (formData.sourceType === 'BUSINESS' && loadingBusinesses)}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Creating...' : 'Create Deposit'}
        </button>
      </div>
    </form>
  )
}
