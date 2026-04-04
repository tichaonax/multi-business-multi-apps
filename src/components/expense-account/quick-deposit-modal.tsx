"use client"

import { useState, useEffect } from 'react'
import type { OnSuccessArg } from '@/types/ui'
import fetchWithValidation from '@/lib/fetchWithValidation'
import { useToastContext } from '@/components/ui/toast'
import { useAlert, useConfirm } from '@/components/ui/confirm-modal'
import { DateInput } from '@/components/ui/date-input'
import { getTodayLocalDateString } from '@/lib/date-utils'
import { FundSourceManager } from './fund-source-manager'
import { SearchableSelect } from '@/components/ui/searchable-select'

interface Business {
  id: string
  name: string
  type: string
  balance: number
}

interface FundSource {
  id: string
  name: string
  emoji: string
  description?: string | null
}

interface IncomeCategory {
  id: string
  name: string
  emoji: string
  isDomainCategory?: boolean
}

interface QuickDepositModalProps {
  isOpen: boolean
  onClose: () => void
  accountId: string
  accountName: string
  onSuccess: (payload: OnSuccessArg) => void
  onError: (error: string) => void
  isLoanAccount?: boolean
  currentBalance?: number
  accountType?: string
  businessId?: string
}

export function QuickDepositModal({
  isOpen,
  onClose,
  accountId,
  accountName,
  onSuccess,
  onError,
  isLoanAccount = false,
  currentBalance = 0,
  accountType = 'GENERAL',
  businessId,
}: QuickDepositModalProps) {
  const isPersonalAccount = accountType === 'PERSONAL'
  const isBusinessAccount = !!businessId

  const [loading, setLoading] = useState(false)
  const [loadingBusinesses, setLoadingBusinesses] = useState(false)
  const toast = useToastContext()
  const customAlert = useAlert()
  const customConfirm = useConfirm()

  // Income domain/category/subcategory state
  const [allIncomeDomains, setAllIncomeDomains] = useState<IncomeCategory[]>([])
  const [loadingIncomeDomains, setLoadingIncomeDomains] = useState(false)
  const [selectedIncomeDomainId, setSelectedIncomeDomainId] = useState('')
  const [incomeCategories, setIncomeCategories] = useState<IncomeCategory[]>([])
  const [loadingIncomeCategories, setLoadingIncomeCategories] = useState(false)
  const [incomeSubcategories, setIncomeSubcategories] = useState<IncomeCategory[]>([])
  const [loadingIncomeSubcategories, setLoadingIncomeSubcategories] = useState(false)
  const [activeDomainId, setActiveDomainId] = useState<string | null>(null)
  const [incomeCategoryId, setIncomeCategoryId] = useState('')
  const [incomeSubcategoryId, setIncomeSubcategoryId] = useState('')
  const [incomeError, setIncomeError] = useState('')

  const [businesses, setBusinesses] = useState<Business[]>([])
  const [fundSources, setFundSources] = useState<FundSource[]>([])
  const [showFundSourceManager, setShowFundSourceManager] = useState(false)
  const [saveSenderNote, setSaveSenderNote] = useState(false)
  const [saveCourierNote, setSaveCourierNote] = useState(false)

  const [formData, setFormData] = useState({
    sourceType: 'MANUAL' as 'BUSINESS' | 'MANUAL' | 'OTHER',
    sourceBusinessId: '',
    amount: '',
    depositDate: getTodayLocalDateString(),
    manualNote: '',
    fundSourceMode: 'note' as 'none' | 'saved' | 'note',
    fundSourceId: '',
    fundSourceNote: '',
    subSourceMode: 'none' as 'none' | 'saved' | 'note',
    subSourceId: '',
    subSourceNote: '',
  })

  const [errors, setErrors] = useState({
    sourceBusinessId: '',
    amount: '',
    depositDate: '',
  })

  useEffect(() => {
    if (isOpen) {
      fetchFundSources()
      loadAllIncomeDomains()
    }
  }, [isOpen])

  // Load all income domains and auto-select based on account type
  const loadAllIncomeDomains = async () => {
    try {
      setLoadingIncomeDomains(true)
      const res = await fetch('/api/expense-categories/hierarchical', { credentials: 'include' })
      if (!res.ok) return
      const data = await res.json()
      const allDomains: IncomeCategory[] = (data.domains?.[0]?.expense_categories || [])
        .filter((c: any) => c.isDomainCategory && (c.name === 'Personal Income' || c.name === 'Business Income'))
      setAllIncomeDomains(allDomains)

      // Auto-select based on account type
      const autoName = isPersonalAccount ? 'Personal Income' : !!businessId ? 'Business Income' : null
      const autoDomain = autoName ? allDomains.find(d => d.name === autoName) : null
      if (autoDomain) {
        setSelectedIncomeDomainId(autoDomain.id)
        setActiveDomainId(autoDomain.id)
        await loadIncomeCategoriesForDomain(autoDomain.id)
      }
    } catch {
      // ignore
    } finally {
      setLoadingIncomeDomains(false)
    }
  }

  const loadIncomeCategoriesForDomain = async (domainId: string) => {
    try {
      setLoadingIncomeCategories(true)
      setIncomeCategories([])
      setIncomeCategoryId('')
      setIncomeSubcategories([])
      setIncomeSubcategoryId('')
      const catRes = await fetch(`/api/expense-categories/${domainId}/subcategories`, { credentials: 'include' })
      if (!catRes.ok) return
      const catData = await catRes.json()
      setIncomeCategories(catData.subcategories || [])
    } catch {
      // ignore
    } finally {
      setLoadingIncomeCategories(false)
    }
  }

  useEffect(() => {
    if (formData.sourceType === 'BUSINESS' && businesses.length === 0) {
      fetchBusinesses()
    }
  }, [formData.sourceType])

  const fetchFundSources = () => {
    fetch('/api/expense-account/fund-sources', { credentials: 'include' })
      .then(r => r.json())
      .then(d => setFundSources(d.data || []))
      .catch(() => {})
  }

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

  const loadIncomeSubcategories = async (categoryId: string) => {
    try {
      setLoadingIncomeSubcategories(true)
      setIncomeSubcategoryId('')
      setIncomeSubcategories([])
      const res = await fetch(`/api/expense-categories/${categoryId}/subcategories`, { credentials: 'include' })
      if (!res.ok) return
      const data = await res.json()
      setIncomeSubcategories(data.subcategories || [])
    } catch {
      // ignore
    } finally {
      setLoadingIncomeSubcategories(false)
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
    } else if (isLoanAccount && amount > Math.abs(currentBalance)) {
      newErrors.amount = `Exceeds remaining balance. Maximum deposit: $${Math.abs(currentBalance).toFixed(2)}`
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

    // Validate income category — required for personal accounts
    let incomeValid = true
    if (isPersonalAccount && !incomeCategoryId) {
      setIncomeError('Please select an income category')
      incomeValid = false
    } else {
      setIncomeError('')
    }

    setErrors(newErrors)
    return !newErrors.sourceBusinessId && !newErrors.amount && !newErrors.depositDate && incomeValid
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      // Resolve fund source — if "save for future" checked, create first then use the ID
      let resolvedFundSourceId = formData.fundSourceMode === 'saved' ? formData.fundSourceId : undefined
      let resolvedSubSourceId = formData.subSourceMode === 'saved' ? formData.subSourceId : undefined
      let resolvedFundSourceNote = formData.fundSourceMode === 'note' && formData.fundSourceNote.trim() ? formData.fundSourceNote.trim() : undefined
      let resolvedSubSourceNote = formData.subSourceMode === 'note' && formData.subSourceNote.trim() ? formData.subSourceNote.trim() : undefined

      if (formData.fundSourceMode === 'note' && formData.fundSourceNote.trim() && saveSenderNote) {
        const res = await fetch('/api/expense-account/fund-sources', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
          body: JSON.stringify({ name: formData.fundSourceNote.trim() }),
        })
        if (res.ok) { const saved = await res.json(); resolvedFundSourceId = saved.data.id; resolvedFundSourceNote = undefined; fetchFundSources() }
      }
      if (formData.subSourceMode === 'note' && formData.subSourceNote.trim() && saveCourierNote) {
        const res = await fetch('/api/expense-account/fund-sources', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
          body: JSON.stringify({ name: formData.subSourceNote.trim() }),
        })
        if (res.ok) { const saved = await res.json(); resolvedSubSourceId = saved.data.id; resolvedSubSourceNote = undefined; fetchFundSources() }
      }

      const result = await fetchWithValidation(`/api/expense-account/${accountId}/deposits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceType: formData.sourceType,
          sourceBusinessId: formData.sourceType === 'BUSINESS' ? formData.sourceBusinessId : undefined,
          amount: parseFloat(formData.amount),
          depositDate: formData.depositDate,
          transactionType: 'DEPOSIT',
          notes: formData.manualNote.trim() || generateAutoNote(),
          fundSourceId: resolvedFundSourceId,
          subSourceId: resolvedSubSourceId,
          fundSourceNote: resolvedFundSourceNote,
          subSourceNote: resolvedSubSourceNote,
          incomeDomainId: activeDomainId || undefined,
          incomeCategoryId: incomeCategoryId || undefined,
          incomeSubcategoryId: incomeSubcategoryId || undefined,
        })
      })

      // Success
      toast.push('Deposit created successfully')
      try {
        onSuccess({
          message: 'Deposit created successfully',
          id: result.data?.id,
          refresh: true
        })
      } catch (e) {}

      onClose()

      // Reset form
      resetForm()
    } catch (error) {
      console.error('Create deposit error:', error)
      const message = error instanceof Error ? error.message : 'Failed to create deposit'
      toast.error(message)
      try {
        onError(message)
      } catch (e) {}
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      sourceType: 'MANUAL',
      sourceBusinessId: '',
      amount: '',
      depositDate: getTodayLocalDateString(),
      manualNote: '',
      fundSourceMode: 'note',
      fundSourceId: '',
      fundSourceNote: '',
      subSourceMode: 'none',
      subSourceId: '',
      subSourceNote: '',
    })
    setSaveSenderNote(false)
    setSaveCourierNote(false)
    setShowFundSourceManager(false)
    setSelectedIncomeDomainId('')
    setActiveDomainId(null)
    setIncomeCategories([])
    setIncomeCategoryId('')
    setIncomeSubcategories([])
    setIncomeSubcategoryId('')
    setIncomeError('')
    setErrors({
      sourceBusinessId: '',
      amount: '',
      depositDate: '',
    })
  }

  const handleCancel = async () => {
    // Check if form has unsaved changes
    const hasChanges = formData.amount !== '' ||
                       formData.manualNote !== '' ||
                       formData.sourceBusinessId !== '' ||
                       formData.fundSourceId !== '' ||
                       formData.fundSourceNote !== '' ||
                       formData.subSourceId !== '' ||
                       formData.subSourceNote !== ''

    if (hasChanges) {
      const confirmed = await customConfirm(
        'You have unsaved changes. Are you sure you want to cancel?'
      )
      if (!confirmed) return
    }

    onClose()
    resetForm()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg p-6 w-full max-w-2xl shadow-2xl border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold text-primary mb-2">Quick Deposit</h2>
        <p className="text-sm text-secondary mb-4">
          to {accountName}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Source Type — hidden for personal accounts (always MANUAL) */}
          {!isPersonalAccount && (
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              Deposit Source <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.sourceType}
              onChange={(e) => {
                const newSourceType = e.target.value as 'BUSINESS' | 'MANUAL' | 'OTHER'
                setFormData({
                  ...formData,
                  sourceType: newSourceType,
                  sourceBusinessId: '' // Reset business selection
                })
                setErrors({ ...errors, sourceBusinessId: '' })
              }}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-primary focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="MANUAL">Manual Entry</option>
              <option value="BUSINESS">From Business Account</option>
              <option value="OTHER">Other Source</option>
            </select>
          </div>
          )}

          {/* Business Selection (if source is BUSINESS) */}
          {formData.sourceType === 'BUSINESS' && (
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
                Select Business <span className="text-red-500">*</span>
              </label>
              {loadingBusinesses ? (
                <div className="text-sm text-secondary">Loading businesses...</div>
              ) : (
                <>
                  <select
                    value={formData.sourceBusinessId}
                    onChange={(e) => {
                      setFormData({ ...formData, sourceBusinessId: e.target.value })
                      setErrors({ ...errors, sourceBusinessId: '' })
                    }}
                    className={`w-full px-3 py-2 border rounded-md bg-background text-primary focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.sourceBusinessId ? 'border-red-500' : 'border-border'
                    }`}
                  >
                    <option value="">Select a business...</option>
                    {businesses.map((business) => (
                      <option key={business.id} value={business.id}>
                        {business.name} (Balance: ${Number(business.balance).toFixed(2)})
                      </option>
                    ))}
                  </select>
                  {errors.sourceBusinessId && (
                    <p className="text-xs text-red-500 mt-1">{errors.sourceBusinessId}</p>
                  )}
                </>
              )}
            </div>
          )}

          {/* Loan account capacity banner */}
          {isLoanAccount && (
            <div className={`rounded-lg px-3 py-2 text-sm ${Math.abs(currentBalance) <= 0 ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'}`}>
              {Math.abs(currentBalance) <= 0 ? (
                <span>✓ Loan fully repaid — no further deposits required</span>
              ) : (
                <span>Remaining capacity: <strong>${Math.abs(currentBalance).toFixed(2)}</strong></span>
              )}
            </div>
          )}

          {/* Amount */}
          {/* Amount + Date — two columns */}
          <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              Amount <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary">
                $
              </span>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => {
                  setFormData({ ...formData, amount: e.target.value })
                  setErrors({ ...errors, amount: '' })
                }}
                className={`w-full pl-8 pr-3 py-2 border rounded-md bg-background text-primary focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.amount ? 'border-red-500' : 'border-border'
                }`}
                min="0"
                max={isLoanAccount ? Math.abs(currentBalance) : undefined}
                step="0.01"
                placeholder="0.00"
                disabled={isLoanAccount && Math.abs(currentBalance) <= 0}
              />
            </div>
            {errors.amount && (
              <p className="text-xs text-red-500 mt-1">{errors.amount}</p>
            )}
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              Deposit Date <span className="text-red-500">*</span>
            </label>
            <DateInput
              value={formData.depositDate}
              onChange={(value) => {
                setFormData({ ...formData, depositDate: value })
                setErrors({ ...errors, depositDate: '' })
              }}
              error={errors.depositDate}
              max={getTodayLocalDateString()}
            />
          </div>
          </div>

          {/* Income Source section — always shown */}
          <div className="space-y-3 p-3 border border-blue-200 dark:border-blue-700 rounded-lg bg-blue-50/30 dark:bg-blue-900/10">
            <span className="text-xs text-blue-600 dark:text-blue-400 font-medium uppercase tracking-wide">
              Income Source
            </span>

            {/* Income Type + Category in two columns */}
            <div className={`grid gap-3 ${selectedIncomeDomainId ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
                Income Type {isPersonalAccount && <span className="text-red-500">*</span>}
              </label>
              <SearchableSelect
                value={selectedIncomeDomainId}
                options={allIncomeDomains.map(d => ({
                  id: d.id,
                  label: `${d.emoji || ''} ${d.name}`.trim(),
                }))}
                onChange={(val) => {
                  setSelectedIncomeDomainId(val)
                  setActiveDomainId(val || null)
                  setIncomeCategoryId('')
                  setIncomeSubcategoryId('')
                  setIncomeSubcategories([])
                  setIncomeError('')
                  if (val) loadIncomeCategoriesForDomain(val)
                  else setIncomeCategories([])
                }}
                placeholder={loadingIncomeDomains ? 'Loading…' : 'Select income type…'}
                loading={loadingIncomeDomains}
              />
            </div>

            {/* Category picker — second column */}
            {selectedIncomeDomainId && (
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">
                  Category {isPersonalAccount && <span className="text-red-500">*</span>}
                </label>
                <SearchableSelect
                  value={incomeCategoryId}
                  options={incomeCategories.map(c => ({ id: c.id, label: `${c.emoji || ''} ${c.name}`.trim() }))}
                  onChange={(val) => {
                    setIncomeCategoryId(val)
                    setIncomeError('')
                    setIncomeSubcategoryId('')
                    setIncomeSubcategories([])
                    if (val) loadIncomeSubcategories(val)
                  }}
                  placeholder={loadingIncomeCategories ? 'Loading…' : 'Select a category…'}
                  loading={loadingIncomeCategories}
                />
                {incomeError && <p className="text-xs text-red-500 mt-1">{incomeError}</p>}
              </div>
            )}
            </div>

            {/* Subcategory picker — full width below */}
            {incomeCategoryId && (
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">
                  Subcategory
                </label>
                <SearchableSelect
                  value={incomeSubcategoryId}
                  options={incomeSubcategories.map(s => ({ id: s.id, label: `${s.emoji || ''} ${s.name}`.trim() }))}
                  onChange={(val) => setIncomeSubcategoryId(val)}
                  placeholder={loadingIncomeSubcategories ? 'Loading…' : 'Select a subcategory…'}
                  loading={loadingIncomeSubcategories}
                />
              </div>
            )}
          </div>

          {/* Fund source section — MANUAL / OTHER only */}
          {(formData.sourceType === 'MANUAL' || formData.sourceType === 'OTHER') && (
            <div className="space-y-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">Sender & Courier</span>
                <button type="button" onClick={() => setShowFundSourceManager(v => !v)} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                  {showFundSourceManager ? 'Hide' : 'Manage saved sources'}
                </button>
              </div>

              {showFundSourceManager && (
                <div className="border border-blue-100 dark:border-blue-900 rounded-lg p-3 bg-blue-50 dark:bg-blue-900/10">
                  <FundSourceManager onUpdated={fetchFundSources} />
                </div>
              )}

              {/* Who sent this money */}
              <div>
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                  Who sent this money? <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <div className="flex gap-2 mb-2">
                  {(['none', 'saved', 'note'] as const).map(mode => (
                    <button key={mode} type="button"
                      onClick={() => setFormData({ ...formData, fundSourceMode: mode, fundSourceId: '', fundSourceNote: '' })}
                      className={`px-3 py-1.5 text-xs rounded border transition-colors ${formData.fundSourceMode === mode ? (mode === 'none' ? 'border-gray-500 bg-gray-100 dark:bg-gray-700 font-semibold' : 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 font-semibold') : 'border-border hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                    >{mode === 'none' ? 'Not specified' : mode === 'saved' ? 'Select from list' : 'Type a name'}</button>
                  ))}
                </div>
                {formData.fundSourceMode === 'saved' && (
                  <SearchableSelect
                    options={fundSources.map(s => ({ id: s.id, name: s.description ? `${s.name} — ${s.description}` : s.name, emoji: s.emoji }))}
                    value={formData.fundSourceId}
                    onChange={id => setFormData({ ...formData, fundSourceId: id })}
                    placeholder="Select sender..." searchPlaceholder="Search senders..."
                    emptyMessage="No saved sources. Add one via 'Manage saved sources'."
                  />
                )}
                {formData.fundSourceMode === 'note' && (() => {
                  const q = formData.fundSourceNote.trim().toLowerCase()
                  const matches = q ? fundSources.filter(s => s.name.toLowerCase().includes(q)) : []
                  const exactMatch = fundSources.find(s => s.name.toLowerCase() === q)
                  return (
                    <div className="space-y-1.5">
                      <input type="text" value={formData.fundSourceNote}
                        onChange={e => { setFormData({ ...formData, fundSourceNote: e.target.value }); setSaveSenderNote(false) }}
                        placeholder="e.g. Ticha" className="w-full px-3 py-2 border border-border rounded text-sm bg-background text-primary"
                        maxLength={200} autoComplete="off"
                      />
                      {matches.length > 0 && (
                        <div className="border border-border rounded bg-background shadow-sm overflow-hidden">
                          <p className="px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border-b border-border">Matches in your saved list — click to use:</p>
                          {matches.map(s => (
                            <button key={s.id} type="button" onClick={() => setFormData({ ...formData, fundSourceMode: 'saved', fundSourceId: s.id, fundSourceNote: '' })}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-left">
                              <span>{s.emoji}</span><span className="font-medium text-primary">{s.name}</span>
                              {s.description && <span className="text-xs text-gray-400 dark:text-gray-500">— {s.description}</span>}
                              <span className="ml-auto text-xs text-blue-600 dark:text-blue-400">Use this</span>
                            </button>
                          ))}
                        </div>
                      )}
                      {formData.fundSourceNote.trim() && !exactMatch && (
                        <label className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 cursor-pointer select-none">
                          <input type="checkbox" checked={saveSenderNote} onChange={e => setSaveSenderNote(e.target.checked)} className="rounded" />
                          Save "{formData.fundSourceNote.trim()}" to my list for future deposits
                        </label>
                      )}
                      {exactMatch && <p className="text-xs text-amber-600 dark:text-amber-400">"{exactMatch.name}" already exists — click it above to use the saved version.</p>}
                    </div>
                  )
                })()}
              </div>

              {/* Via / courier */}
              <div className="border-t border-border pt-3">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                  Delivered via? <span className="font-normal text-gray-400">(optional courier / intermediary)</span>
                </label>
                <div className="flex gap-2 mb-2">
                  {(['none', 'saved', 'note'] as const).map(mode => (
                    <button key={mode} type="button"
                      onClick={() => setFormData({ ...formData, subSourceMode: mode, subSourceId: '', subSourceNote: '' })}
                      className={`px-3 py-1.5 text-xs rounded border transition-colors ${formData.subSourceMode === mode ? (mode === 'none' ? 'border-gray-500 bg-gray-100 dark:bg-gray-700 font-semibold' : 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 font-semibold') : 'border-border hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                    >{mode === 'none' ? 'No courier' : mode === 'saved' ? 'Select from list' : 'Type a name'}</button>
                  ))}
                </div>
                {formData.subSourceMode === 'saved' && (
                  <SearchableSelect
                    options={fundSources.filter(s => s.id !== formData.fundSourceId).map(s => ({ id: s.id, name: s.description ? `${s.name} — ${s.description}` : s.name, emoji: s.emoji }))}
                    value={formData.subSourceId}
                    onChange={id => setFormData({ ...formData, subSourceId: id })}
                    placeholder="Select courier..." searchPlaceholder="Search couriers..."
                    emptyMessage="No saved sources. Add one via 'Manage saved sources'."
                  />
                )}
                {formData.subSourceMode === 'note' && (() => {
                  const q = formData.subSourceNote.trim().toLowerCase()
                  const matches = q ? fundSources.filter(s => s.id !== formData.fundSourceId && s.name.toLowerCase().includes(q)) : []
                  const exactMatch = fundSources.find(s => s.name.toLowerCase() === q)
                  return (
                    <div className="space-y-1.5">
                      <input type="text" value={formData.subSourceNote}
                        onChange={e => { setFormData({ ...formData, subSourceNote: e.target.value }); setSaveCourierNote(false) }}
                        placeholder="e.g. Kurauone" className="w-full px-3 py-2 border border-border rounded text-sm bg-background text-primary"
                        maxLength={200} autoComplete="off"
                      />
                      {matches.length > 0 && (
                        <div className="border border-border rounded bg-background shadow-sm overflow-hidden">
                          <p className="px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border-b border-border">Matches in your saved list — click to use:</p>
                          {matches.map(s => (
                            <button key={s.id} type="button" onClick={() => setFormData({ ...formData, subSourceMode: 'saved', subSourceId: s.id, subSourceNote: '' })}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-left">
                              <span>{s.emoji}</span><span className="font-medium text-primary">{s.name}</span>
                              {s.description && <span className="text-xs text-gray-400 dark:text-gray-500">— {s.description}</span>}
                              <span className="ml-auto text-xs text-blue-600 dark:text-blue-400">Use this</span>
                            </button>
                          ))}
                        </div>
                      )}
                      {formData.subSourceNote.trim() && !exactMatch && (
                        <label className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 cursor-pointer select-none">
                          <input type="checkbox" checked={saveCourierNote} onChange={e => setSaveCourierNote(e.target.checked)} className="rounded" />
                          Save "{formData.subSourceNote.trim()}" to my list for future deposits
                        </label>
                      )}
                      {exactMatch && <p className="text-xs text-amber-600 dark:text-amber-400">"{exactMatch.name}" already exists — click it above to use the saved version.</p>}
                    </div>
                  )
                })()}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              Notes (Optional)
            </label>
            <textarea
              value={formData.manualNote}
              onChange={(e) => setFormData({ ...formData, manualNote: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-primary focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={2}
              placeholder={generateAutoNote()}
              maxLength={500}
            />
            <p className="text-xs text-secondary mt-1">
              Leave blank to use auto-generated note
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium text-secondary bg-background border border-border rounded-md hover:bg-muted"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Deposit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
