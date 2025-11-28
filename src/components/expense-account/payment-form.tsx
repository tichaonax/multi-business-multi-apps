'use client'

import { useState, useEffect } from 'react'
import { useAlert, useConfirm } from '@/components/ui/confirm-modal'
import { DateInput } from '@/components/ui/date-input'
import { PayeeSelector } from './payee-selector'
import { CreateIndividualPayeeModal } from './create-individual-payee-modal'
import { PaymentBatchList } from './payment-batch-list'

interface ExpenseCategory {
  id: string
  name: string
  emoji: string
  color: string
  subcategories?: ExpenseSubcategory[]
}

interface ExpenseSubcategory {
  id: string
  name: string
  emoji: string
  subSubcategories?: ExpenseSubSubcategory[]
}

interface ExpenseSubSubcategory {
  id: string
  name: string
  emoji: string
}

interface BatchPayment {
  id: string
  payeeType: string
  payeeName: string
  payeeId: string
  categoryId: string
  categoryName: string
  categoryEmoji: string
  subcategoryId?: string
  subcategoryName?: string
  subSubcategoryId?: string
  subSubcategoryName?: string
  amount: number
  paymentDate: string
  notes?: string
  receiptNumber?: string
  receiptServiceProvider?: string
  receiptReason?: string
  isFullPayment?: boolean
}

interface PaymentFormProps {
  accountId: string
  currentBalance: number
  onSuccess?: () => void
  onAddFunds?: () => void
}

export function PaymentForm({
  accountId,
  currentBalance,
  onSuccess,
  onAddFunds
}: PaymentFormProps) {
  const customAlert = useAlert()
  const customConfirm = useConfirm()

  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [subcategories, setSubcategories] = useState<ExpenseSubcategory[]>([])
  const [subSubcategories, setSubSubcategories] = useState<ExpenseSubSubcategory[]>([])
  const [loadingCategories, setLoadingCategories] = useState(true)
  const [loadingSubcategories, setLoadingSubcategories] = useState(false)
  const [loadingSubSubcategories, setLoadingSubSubcategories] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showIndividualModal, setShowIndividualModal] = useState(false)
  const [showReceiptSection, setShowReceiptSection] = useState(false)

  const [batchPayments, setBatchPayments] = useState<BatchPayment[]>([])
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    payee: null as { type: string; id: string; name: string } | null,
    categoryId: '',
    subcategoryId: '',
    subSubcategoryId: '',
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    notes: '',
    receiptNumber: '',
    receiptServiceProvider: '',
    receiptReason: '',
    isFullPayment: true
  })

  const [errors, setErrors] = useState({
    payee: '',
    categoryId: '',
    amount: '',
    paymentDate: ''
  })

  // Load categories
  useEffect(() => {
    loadCategories()
  }, [])

  // Load batch from sessionStorage
  useEffect(() => {
    const saved = sessionStorage.getItem(`expense-batch-${accountId}`)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setBatchPayments(parsed)
      } catch (e) {
        console.error('Failed to load batch from sessionStorage:', e)
      }
    }
  }, [accountId])

  // Save batch to sessionStorage
  useEffect(() => {
    if (batchPayments.length > 0) {
      sessionStorage.setItem(`expense-batch-${accountId}`, JSON.stringify(batchPayments))
    } else {
      sessionStorage.removeItem(`expense-batch-${accountId}`)
    }
  }, [batchPayments, accountId])

  // Load subcategories when category changes
  useEffect(() => {
    if (formData.categoryId) {
      loadSubcategories(formData.categoryId)
      setFormData(prev => ({ ...prev, subcategoryId: '', subSubcategoryId: '' }))
      setSubSubcategories([])
    } else {
      setSubcategories([])
      setSubSubcategories([])
    }
  }, [formData.categoryId])

  // Load sub-subcategories when subcategory changes
  useEffect(() => {
    if (formData.subcategoryId) {
      loadSubSubcategories(formData.subcategoryId)
      setFormData(prev => ({ ...prev, subSubcategoryId: '' }))
    } else {
      setSubSubcategories([])
    }
  }, [formData.subcategoryId])

  const loadCategories = async () => {
    try {
      setLoadingCategories(true)
      const response = await fetch('/api/expense-categories/hierarchical', {
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        // Flatten categories from all domains
        const flattenedCategories: ExpenseCategory[] = []

        if (data.domains && Array.isArray(data.domains)) {
          data.domains.forEach((domain: any) => {
            if (domain.expense_categories && Array.isArray(domain.expense_categories)) {
              domain.expense_categories.forEach((cat: any) => {
                flattenedCategories.push({
                  id: cat.id,
                  name: cat.name,
                  emoji: cat.emoji,
                  color: cat.color || '#000000',
                })
              })
            }
          })
        }

        setCategories(flattenedCategories)
      }
    } catch (error) {
      console.error('Error loading categories:', error)
    } finally {
      setLoadingCategories(false)
    }
  }

  const loadSubcategories = async (categoryId: string) => {
    if (!categoryId) {
      setSubcategories([])
      return
    }

    try {
      setLoadingSubcategories(true)
      const response = await fetch(`/api/expense-categories/${categoryId}/subcategories`, {
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        setSubcategories(data.subcategories || [])
      }
    } catch (error) {
      console.error('Error loading subcategories:', error)
      setSubcategories([])
    } finally {
      setLoadingSubcategories(false)
    }
  }

  const loadSubSubcategories = async (subcategoryId: string) => {
    if (!subcategoryId) {
      setSubSubcategories([])
      return
    }

    try {
      setLoadingSubSubcategories(true)
      const response = await fetch(`/api/expense-categories/subcategories/${subcategoryId}/sub-subcategories`, {
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        setSubSubcategories(data.subSubcategories || [])
      }
    } catch (error) {
      console.error('Error loading sub-subcategories:', error)
      setSubSubcategories([])
    } finally {
      setLoadingSubSubcategories(false)
    }
  }

  const selectedCategory = categories.find(c => c.id === formData.categoryId)
  const selectedSubcategory = subcategories.find(s => s.id === formData.subcategoryId)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const calculateAvailableBalance = () => {
    const totalBatch = batchPayments.reduce((sum, p) => sum + p.amount, 0)
    return currentBalance - totalBatch
  }

  const validateForm = () => {
    const newErrors = {
      payee: '',
      categoryId: '',
      amount: '',
      paymentDate: ''
    }

    if (!formData.payee) {
      newErrors.payee = 'Please select a payee'
    }

    if (!formData.categoryId) {
      newErrors.categoryId = 'Please select a category'
    }

    const amount = parseFloat(formData.amount)
    if (!formData.amount || isNaN(amount)) {
      newErrors.amount = 'Please enter a valid amount'
    } else if (amount <= 0) {
      newErrors.amount = 'Amount must be greater than 0'
    } else if (amount > 999999999.99) {
      newErrors.amount = 'Amount exceeds maximum allowed value'
    }

    if (!formData.paymentDate) {
      newErrors.paymentDate = 'Please select a payment date'
    } else {
      const paymentDate = new Date(formData.paymentDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      if (paymentDate > today) {
        newErrors.paymentDate = 'Payment date cannot be in the future'
      }
    }

    setErrors(newErrors)
    return !newErrors.payee && !newErrors.categoryId && !newErrors.amount && !newErrors.paymentDate
  }

  const handleAddToBatch = () => {
    if (!validateForm()) {
      return
    }

    const amount = parseFloat(formData.amount)
    const availableBalance = calculateAvailableBalance()

    // Check if adding this payment would cause negative balance
    if (amount > availableBalance) {
      customAlert({
        title: 'Insufficient Funds',
        message: `Adding this payment would exceed available balance. Available: ${formatCurrency(availableBalance)}. You can add funds before continuing.`,
        type: 'error'
      })
      return
    }

    const category = categories.find(c => c.id === formData.categoryId)
    const subcategory = subcategories.find(s => s.id === formData.subcategoryId)
    const subSubcategory = subSubcategories.find(s => s.id === formData.subSubcategoryId)

    const payment: BatchPayment = {
      id: editingPaymentId || `temp-${Date.now()}-${Math.random()}`,
      payeeType: formData.payee!.type,
      payeeName: formData.payee!.name,
      payeeId: formData.payee!.id,
      categoryId: formData.categoryId,
      categoryName: category?.name || '',
      categoryEmoji: category?.emoji || '',
      subcategoryId: formData.subcategoryId || undefined,
      subcategoryName: subcategory?.name || undefined,
      subSubcategoryId: formData.subSubcategoryId || undefined,
      subSubcategoryName: subSubcategory?.name || undefined,
      amount,
      paymentDate: formData.paymentDate,
      notes: formData.notes.trim() || undefined,
      receiptNumber: formData.receiptNumber.trim() || undefined,
      receiptServiceProvider: formData.receiptServiceProvider.trim() || undefined,
      receiptReason: formData.receiptReason.trim() || undefined,
      isFullPayment: formData.isFullPayment
    }

    if (editingPaymentId) {
      // Update existing payment
      setBatchPayments(prev => prev.map(p => p.id === editingPaymentId ? payment : p))
      setEditingPaymentId(null)
    } else {
      // Add new payment
      setBatchPayments(prev => [...prev, payment])
    }

    // Reset form
    resetForm()
  }

  const resetForm = () => {
    setFormData({
      payee: null,
      categoryId: '',
      subcategoryId: '',
      subSubcategoryId: '',
      amount: '',
      paymentDate: new Date().toISOString().split('T')[0],
      notes: '',
      receiptNumber: '',
      receiptServiceProvider: '',
      receiptReason: '',
      isFullPayment: true
    })
    setErrors({ payee: '', categoryId: '', amount: '', paymentDate: '' })
    setShowReceiptSection(false)
    setEditingPaymentId(null)
  }

  const handleEditPayment = (payment: BatchPayment) => {
    setFormData({
      payee: { type: payment.payeeType, id: payment.payeeId, name: payment.payeeName },
      categoryId: payment.categoryId,
      subcategoryId: payment.subcategoryId || '',
      subSubcategoryId: payment.subSubcategoryId || '',
      amount: payment.amount.toString(),
      paymentDate: payment.paymentDate,
      notes: payment.notes || '',
      receiptNumber: payment.receiptNumber || '',
      receiptServiceProvider: payment.receiptServiceProvider || '',
      receiptReason: payment.receiptReason || '',
      isFullPayment: payment.isFullPayment ?? true
    })
    setEditingPaymentId(payment.id)
    if (payment.receiptNumber || payment.receiptServiceProvider || payment.receiptReason) {
      setShowReceiptSection(true)
    }
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDeletePayment = async (paymentId: string) => {
    const confirmed = await customConfirm('Are you sure you want to remove this payment from the batch?')
    if (confirmed) {
      setBatchPayments(prev => prev.filter(p => p.id !== paymentId))
      if (editingPaymentId === paymentId) {
        resetForm()
      }
    }
  }

  const handleClearAll = async () => {
    const confirmed = await customConfirm(
      `Are you sure you want to clear all ${batchPayments.length} payment(s) from the batch?`
    )
    if (confirmed) {
      setBatchPayments([])
      resetForm()
    }
  }

  const handleSubmitBatch = async () => {
    if (batchPayments.length === 0) {
      customAlert({
        title: 'No Payments',
        message: 'Please add at least one payment to the batch',
        type: 'error'
      })
      return
    }

    const totalAmount = batchPayments.reduce((sum, p) => sum + p.amount, 0)
    if (totalAmount > currentBalance) {
      customAlert({
        title: 'Insufficient Funds',
        message: `Batch total (${formatCurrency(totalAmount)}) exceeds account balance (${formatCurrency(currentBalance)})`,
        type: 'error'
      })
      return
    }

    const confirmed = await customConfirm(
      `Submit batch of ${batchPayments.length} payment(s) totaling ${formatCurrency(totalAmount)}?`
    )

    if (!confirmed) return

    setSubmitting(true)

    try {
      const paymentsPayload = batchPayments.map(p => ({
        payeeType: p.payeeType,
        payeeUserId: p.payeeType === 'USER' ? p.payeeId : undefined,
        payeeEmployeeId: p.payeeType === 'EMPLOYEE' ? p.payeeId : undefined,
        payeePersonId: p.payeeType === 'PERSON' ? p.payeeId : undefined,
        payeeBusinessId: p.payeeType === 'BUSINESS' ? p.payeeId : undefined,
        categoryId: p.categoryId,
        subcategoryId: p.subcategoryId || null,
        subSubcategoryId: p.subSubcategoryId || null,
        amount: p.amount,
        paymentDate: p.paymentDate,
        notes: p.notes || null,
        receiptNumber: p.receiptNumber || null,
        receiptServiceProvider: p.receiptServiceProvider || null,
        receiptReason: p.receiptReason || null,
        isFullPayment: p.isFullPayment,
        status: 'SUBMITTED'
      }))

      const response = await fetch(`/api/expense-account/${accountId}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ payments: paymentsPayload }),
      })

      const data = await response.json()

      if (response.ok) {
        customAlert({
          title: 'Success',
          message: `Successfully submitted ${batchPayments.length} payment(s)`,
          type: 'success',
        })

        // Clear batch
        setBatchPayments([])
        sessionStorage.removeItem(`expense-batch-${accountId}`)
        resetForm()

        if (onSuccess) {
          onSuccess()
        }
      } else {
        customAlert({
          title: 'Error',
          message: data.error || 'Failed to submit payments',
          type: 'error',
        })
      }
    } catch (error) {
      console.error('Error submitting batch:', error)
      customAlert({
        title: 'Error',
        message: 'An error occurred while submitting payments',
        type: 'error',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleCreateIndividualSuccess = (payload: any) => {
    if (payload.payee) {
      setFormData({
        ...formData,
        payee: {
          type: 'PERSON',
          id: payload.payee.id,
          name: payload.payee.fullName
        }
      })
    }
  }

  const availableBalance = calculateAvailableBalance()
  const totalBatchAmount = batchPayments.reduce((sum, p) => sum + p.amount, 0)
  const hasInsufficientFunds = availableBalance < 0

  // Show loading overlay while categories are loading
  if (loadingCategories) {
    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading payment form...</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
              Fetching categories and payees
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Entry Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          {editingPaymentId ? 'Edit Payment' : 'Add Payment to Batch'}
        </h3>

        <div className="space-y-4">
          {/* Payee Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Payee <span className="text-red-500">*</span>
            </label>
            <PayeeSelector
              value={formData.payee}
              onChange={(payee) => {
                setFormData({ ...formData, payee })
                setErrors({ ...errors, payee: '' })
              }}
              onCreateIndividual={() => setShowIndividualModal(true)}
              error={errors.payee}
            />
          </div>

          {/* Category, Subcategory & Sub-subcategory */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.categoryId}
                onChange={(e) => {
                  setFormData({ ...formData, categoryId: e.target.value, subcategoryId: '', subSubcategoryId: '' })
                  setErrors({ ...errors, categoryId: '' })
                }}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.categoryId ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
              >
                <option value="">Select category...</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.emoji} {category.name}
                  </option>
                ))}
              </select>
              {errors.categoryId && (
                <p className="mt-1 text-sm text-red-500">{errors.categoryId}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Subcategory
              </label>
              <select
                value={formData.subcategoryId}
                onChange={(e) => setFormData({ ...formData, subcategoryId: e.target.value, subSubcategoryId: '' })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={!formData.categoryId || loadingSubcategories}
              >
                <option value="">
                  {loadingSubcategories ? 'Loading...' : 'None'}
                </option>
                {subcategories.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.emoji} {sub.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Sub-subcategory
              </label>
              <select
                value={formData.subSubcategoryId}
                onChange={(e) => setFormData({ ...formData, subSubcategoryId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={!formData.subcategoryId || loadingSubSubcategories}
              >
                <option value="">
                  {loadingSubSubcategories ? 'Loading...' : 'None'}
                </option>
                {subSubcategories.map((subSub) => (
                  <option key={subSub.id} value={subSub.id}>
                    {subSub.emoji} {subSub.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Amount & Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Amount <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-500 dark:text-gray-400">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="999999999.99"
                  value={formData.amount}
                  onChange={(e) => {
                    setFormData({ ...formData, amount: e.target.value })
                    setErrors({ ...errors, amount: '' })
                  }}
                  className={`w-full pl-8 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.amount ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="0.00"
                />
              </div>
              {errors.amount && (
                <p className="mt-1 text-sm text-red-500">{errors.amount}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Payment Date <span className="text-red-500">*</span>
              </label>
              <DateInput
                value={formData.paymentDate}
                onChange={(value) => {
                  setFormData({ ...formData, paymentDate: value })
                  setErrors({ ...errors, paymentDate: '' })
                }}
                required
              />
              {errors.paymentDate && (
                <p className="mt-1 text-sm text-red-500">{errors.paymentDate}</p>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={2}
              placeholder="Additional notes about this payment"
              maxLength={500}
            />
          </div>

          {/* Receipt Section (Collapsible) */}
          <div>
            <button
              type="button"
              onClick={() => setShowReceiptSection(!showReceiptSection)}
              className="flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
            >
              <svg
                className={`w-4 h-4 transition-transform ${showReceiptSection ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              Receipt Information (Optional)
            </button>

            {showReceiptSection && (
              <div className="mt-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Receipt Number
                  </label>
                  <input
                    type="text"
                    value={formData.receiptNumber}
                    onChange={(e) => setFormData({ ...formData, receiptNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., RCP-2025-001"
                    maxLength={100}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Service Provider
                  </label>
                  <input
                    type="text"
                    value={formData.receiptServiceProvider}
                    onChange={(e) => setFormData({ ...formData, receiptServiceProvider: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Name of service provider or vendor"
                    maxLength={200}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Reason for Payment
                  </label>
                  <textarea
                    value={formData.receiptReason}
                    onChange={(e) => setFormData({ ...formData, receiptReason: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={2}
                    placeholder="Reason or purpose for this payment"
                    maxLength={500}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Payment Type
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        checked={formData.isFullPayment}
                        onChange={() => setFormData({ ...formData, isFullPayment: true })}
                        className="mr-2"
                      />
                      <span className="text-sm">Full Payment</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        checked={!formData.isFullPayment}
                        onChange={() => setFormData({ ...formData, isFullPayment: false })}
                        className="mr-2"
                      />
                      <span className="text-sm">Partial Payment</span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Available Balance Display */}
          <div className={`p-4 rounded-lg ${availableBalance < 0 ? 'bg-red-50 dark:bg-red-900/10 border-2 border-red-500' : 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Available Balance</p>
                <p className={`text-2xl font-bold ${availableBalance < 0 ? 'text-red-600 dark:text-red-400' : 'text-blue-900 dark:text-blue-200'}`}>
                  {formatCurrency(availableBalance)}
                </p>
                {batchPayments.length > 0 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Current balance ({formatCurrency(currentBalance)}) - Batch total ({formatCurrency(totalBatchAmount)})
                  </p>
                )}
              </div>
              {hasInsufficientFunds && onAddFunds && (
                <button
                  type="button"
                  onClick={onAddFunds}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
                >
                  Add Funds
                </button>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              {editingPaymentId ? 'Cancel Edit' : 'Reset'}
            </button>
            <button
              type="button"
              onClick={handleAddToBatch}
              disabled={hasInsufficientFunds && !editingPaymentId}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {editingPaymentId ? 'Update Payment' : 'Add to Batch'}
            </button>
          </div>
        </div>
      </div>

      {/* Batch Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Payment Batch
          </h3>
          {batchPayments.length > 0 && (
            <button
              onClick={handleSubmitBatch}
              disabled={submitting || hasInsufficientFunds}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {submitting ? 'Submitting...' : `Submit ${batchPayments.length} Payment${batchPayments.length !== 1 ? 's' : ''}`}
            </button>
          )}
        </div>

        <PaymentBatchList
          payments={batchPayments}
          currentBalance={currentBalance}
          onEdit={handleEditPayment}
          onDelete={handleDeletePayment}
          onClearAll={handleClearAll}
        />
      </div>

      {/* Create Individual Payee Modal */}
      <CreateIndividualPayeeModal
        isOpen={showIndividualModal}
        onClose={() => setShowIndividualModal(false)}
        onSuccess={handleCreateIndividualSuccess}
        onError={(error) => console.error('Create individual error:', error)}
      />
    </div>
  )
}
