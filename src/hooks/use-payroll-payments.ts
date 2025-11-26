import { useState, useCallback } from 'react'

interface Employee {
  id: string
  employeeNumber: string
  firstName: string
  lastName: string
  fullName: string
  nationalId: string
}

interface Payment {
  id: string
  employeeId: string
  employee: Employee
  amount: number
  originalAmount?: number
  adjustmentNote?: string
  paymentType: string
  status: string
  isAdvance: boolean
  paymentDate: string
  paymentSchedule?: string
  isLocked: boolean
  createdAt: string
  updatedAt: string
  hasVoucher: boolean
  voucherNumber?: string
}

interface PaymentFilters {
  employeeId?: string
  status?: string
  paymentType?: string
  startDate?: string
  endDate?: string
  isAdvance?: string
  limit?: number
  offset?: number
}

interface CreatePaymentData {
  employeeId: string
  amount: number
  paymentType: string
  paymentSchedule?: string
  adjustmentNote?: string
  isAdvance?: boolean
}

interface UpdatePaymentData {
  amount?: number
  adjustmentNote?: string
  paymentType?: string
  paymentSchedule?: string
}

interface UsePayrollPaymentsResult {
  payments: Payment[]
  loading: boolean
  error: string | null
  pagination: {
    total: number
    limit: number
    offset: number
    hasMore: boolean
  }
  fetchPayments: (filters?: PaymentFilters) => Promise<void>
  createPayment: (data: CreatePaymentData) => Promise<Payment>
  createBatchPayments: (payments: CreatePaymentData[]) => Promise<Payment[]>
  updatePayment: (paymentId: string, data: UpdatePaymentData) => Promise<Payment>
  deletePayment: (paymentId: string) => Promise<void>
  signPayment: (paymentId: string) => Promise<Payment>
  completePayment: (paymentId: string) => Promise<Payment>
  generateVoucher: (paymentId: string) => Promise<string>
  regenerateVoucher: (paymentId: string) => Promise<string>
}

export function usePayrollPayments(): UsePayrollPaymentsResult {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 20,
    offset: 0,
    hasMore: false,
  })

  const fetchPayments = useCallback(async (filters: PaymentFilters = {}) => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, String(value))
        }
      })

      const response = await fetch(`/api/payroll/account/payments?${params}`, {
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

  const createPayment = useCallback(async (data: CreatePaymentData): Promise<Payment> => {
    try {
      setError(null)

      const response = await fetch('/api/payroll/account/payments', {
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
      const newPayment = result.data.payments[0]

      // Optimistic update
      setPayments((prev) => [newPayment, ...prev])

      return newPayment
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      throw err
    }
  }, [])

  const createBatchPayments = useCallback(
    async (paymentsData: CreatePaymentData[]): Promise<Payment[]> => {
      try {
        setError(null)

        const response = await fetch('/api/payroll/account/payments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ payments: paymentsData }),
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
    async (paymentId: string, data: UpdatePaymentData): Promise<Payment> => {
      try {
        setError(null)

        // Optimistic update
        const previousPayments = [...payments]
        setPayments((prev) =>
          prev.map((p) => (p.id === paymentId ? { ...p, ...data } : p))
        )

        const response = await fetch(`/api/payroll/account/payments/${paymentId}`, {
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
    async (paymentId: string): Promise<void> => {
      try {
        setError(null)

        // Optimistic update
        const previousPayments = [...payments]
        setPayments((prev) => prev.filter((p) => p.id !== paymentId))

        const response = await fetch(`/api/payroll/account/payments/${paymentId}`, {
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

  const signPayment = useCallback(
    async (paymentId: string): Promise<Payment> => {
      try {
        setError(null)

        const response = await fetch(`/api/payroll/account/payments/${paymentId}/sign`, {
          method: 'POST',
          credentials: 'include',
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to sign payment')
        }

        const result = await response.json()
        const signedPayment = result.data.payment

        // Update with server response
        setPayments((prev) =>
          prev.map((p) => (p.id === paymentId ? signedPayment : p))
        )

        return signedPayment
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
        throw err
      }
    },
    []
  )

  const completePayment = useCallback(
    async (paymentId: string): Promise<Payment> => {
      try {
        setError(null)

        const response = await fetch(`/api/payroll/account/payments/${paymentId}/complete`, {
          method: 'POST',
          credentials: 'include',
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to complete payment')
        }

        const result = await response.json()
        const completedPayment = result.data.payment

        // Update with server response
        setPayments((prev) =>
          prev.map((p) => (p.id === paymentId ? completedPayment : p))
        )

        return completedPayment
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
        throw err
      }
    },
    []
  )

  const generateVoucher = useCallback(async (paymentId: string): Promise<string> => {
    try {
      setError(null)

      const response = await fetch(`/api/payroll/account/payments/${paymentId}/voucher`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'generate',
          format: 'html',
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate voucher')
      }

      const html = await response.text()
      return html
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      throw err
    }
  }, [])

  const regenerateVoucher = useCallback(async (paymentId: string): Promise<string> => {
    try {
      setError(null)

      const response = await fetch(`/api/payroll/account/payments/${paymentId}/voucher`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'regenerate',
          format: 'html',
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to regenerate voucher')
      }

      const html = await response.text()
      return html
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      throw err
    }
  }, [])

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
    signPayment,
    completePayment,
    generateVoucher,
    regenerateVoucher,
  }
}
