import { useState, useCallback } from 'react'
import type { ExpenseAccountPayment, CreatePaymentInput, BatchPaymentInput } from '@/types/expense-account'

interface PaymentFilters {
  accountId?: string
  payeeType?: string
  categoryId?: string
  subcategoryId?: string
  status?: string
  startDate?: string
  endDate?: string
  limit?: number
  offset?: number
}

interface UpdatePaymentData {
  amount?: number
  notes?: string
  categoryId?: string
  subcategoryId?: string
  paymentDate?: string
  receiptNumber?: string
  receiptServiceProvider?: string
  receiptReason?: string
}

interface UseExpensePaymentsResult {
  payments: ExpenseAccountPayment[]
  loading: boolean
  error: string | null
  pagination: {
    total: number
    limit: number
    offset: number
    hasMore: boolean
  }
  fetchPayments: (accountId: string, filters?: PaymentFilters) => Promise<void>
  createPayment: (accountId: string, data: CreatePaymentInput) => Promise<ExpenseAccountPayment>
  createBatchPayments: (data: BatchPaymentInput) => Promise<ExpenseAccountPayment[]>
  updatePayment: (accountId: string, paymentId: string, data: UpdatePaymentData) => Promise<ExpenseAccountPayment>
  deletePayment: (accountId: string, paymentId: string) => Promise<void>
  submitPayment: (accountId: string, paymentId: string) => Promise<ExpenseAccountPayment>
}

export function useExpensePayments(): UseExpensePaymentsResult {
  const [payments, setPayments] = useState<ExpenseAccountPayment[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 20,
    offset: 0,
    hasMore: false,
  })

  const fetchPayments = useCallback(async (accountId: string, filters: PaymentFilters = {}) => {
    if (!accountId) return

    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, String(value))
        }
      })

      const response = await fetch(`/api/expense-account/${accountId}/payments?${params}`, {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to fetch payments')
      }

      const data = await response.json()
      setPayments(data.data.payments || [])
      setPagination(data.data.pagination)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Error fetching payments:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const createPayment = useCallback(
    async (accountId: string, data: CreatePaymentInput): Promise<ExpenseAccountPayment> => {
      if (!accountId) throw new Error('Account ID is required')

      try {
        setError(null)

        const response = await fetch(`/api/expense-account/${accountId}/payments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(data),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to create payment')
        }

        const result = await response.json()
        const newPayment = result.data.payment

        // Optimistic update
        setPayments((prev) => [newPayment, ...prev])

        return newPayment
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
        throw err
      }
    },
    []
  )

  const createBatchPayments = useCallback(
    async (data: BatchPaymentInput): Promise<ExpenseAccountPayment[]> => {
      if (!data.expenseAccountId) throw new Error('Account ID is required')

      try {
        setError(null)

        const response = await fetch(`/api/expense-account/${data.expenseAccountId}/payments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ payments: data.payments }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to create batch payments')
        }

        const result = await response.json()
        const newPayments = result.data.payments

        // Optimistic update
        setPayments((prev) => [...newPayments, ...prev])

        return newPayments
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
        throw err
      }
    },
    []
  )

  const updatePayment = useCallback(
    async (
      accountId: string,
      paymentId: string,
      data: UpdatePaymentData
    ): Promise<ExpenseAccountPayment> => {
      if (!accountId || !paymentId) throw new Error('Account ID and Payment ID are required')

      try {
        setError(null)

        // Optimistic update
        const previousPayments = [...payments]
        setPayments((prev) =>
          prev.map((p) => (p.id === paymentId ? { ...p, ...data } : p))
        )

        const response = await fetch(`/api/expense-account/${accountId}/payments/${paymentId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(data),
        })

        if (!response.ok) {
          // Revert optimistic update
          setPayments(previousPayments)
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to update payment')
        }

        const result = await response.json()
        const updatedPayment = result.data.payment

        // Update with actual server response
        setPayments((prev) =>
          prev.map((p) => (p.id === paymentId ? updatedPayment : p))
        )

        return updatedPayment
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
        throw err
      }
    },
    [payments]
  )

  const deletePayment = useCallback(
    async (accountId: string, paymentId: string): Promise<void> => {
      if (!accountId || !paymentId) throw new Error('Account ID and Payment ID are required')

      try {
        setError(null)

        // Optimistic update
        const previousPayments = [...payments]
        setPayments((prev) => prev.filter((p) => p.id !== paymentId))

        const response = await fetch(`/api/expense-account/${accountId}/payments/${paymentId}`, {
          method: 'DELETE',
          credentials: 'include',
        })

        if (!response.ok) {
          // Revert optimistic update
          setPayments(previousPayments)
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to delete payment')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
        throw err
      }
    },
    [payments]
  )

  const submitPayment = useCallback(
    async (accountId: string, paymentId: string): Promise<ExpenseAccountPayment> => {
      if (!accountId || !paymentId) throw new Error('Account ID and Payment ID are required')

      try {
        setError(null)

        const response = await fetch(
          `/api/expense-account/${accountId}/payments/${paymentId}/submit`,
          {
            method: 'POST',
            credentials: 'include',
          }
        )

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to submit payment')
        }

        const result = await response.json()
        const submittedPayment = result.data.payment

        // Update with server response
        setPayments((prev) =>
          prev.map((p) => (p.id === paymentId ? submittedPayment : p))
        )

        return submittedPayment
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
        throw err
      }
    },
    []
  )

  return {
    payments,
    loading,
    error,
    pagination,
    fetchPayments,
    createPayment,
    createBatchPayments,
    updatePayment,
    deletePayment,
    submitPayment,
  }
}
