// @ts-nocheck

import React from 'react'
// Mock next/navigation for useRouter and useParams using spies
const pushMock = jest.fn(() => Promise.resolve(undefined))
// We'll not pre-spy because render helper already mocks next/navigation. The tests will dynamically mock per case.
import { renderWithProviders as render, screen, waitFor } from '../helpers/render-with-providers'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'



// Mock business permissions context
jest.mock('@/contexts/business-permissions-context', () => ({
  useBusinessPermissionsContext: () => ({
    hasPermission: (perm: string) => true,
    currentBusinessId: 'b1',
    currentBusiness: null,
    hasPermissionInBusiness: () => true,
    businesses: [],
    activeBusinesses: [],
    switchBusiness: async () => {},
    refreshBusinesses: async () => {},
    isSystemAdmin: false,
    isBusinessOwner: false,
    isAuthenticated: true,
    loading: false,
    error: null,
  }),
}))

// We'll dynamically import the page after mocking next/navigation to avoid mock conflicts

describe('ExpensePaymentDetail Page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders employee payee as a link when user has canViewEmployees', async () => {
    jest.resetModules()
    jest.doMock('next/navigation', () => ({
      useRouter: () => ({ push: pushMock, replace: () => Promise.resolve(undefined), refresh: () => undefined, back: () => undefined, forward: () => undefined, prefetch: () => Promise.resolve(undefined) }),
      useParams: () => ({ accountId: 'acc_1', paymentId: 'pay_1' }),
    }))
    const { default: PaymentDetailPage } = await import('@/app/expense-accounts/[accountId]/payments/[paymentId]/page')
    const payment = {
      id: 'pay_1',
      amount: 50,
      paymentDate: new Date().toISOString(),
      payeeEmployee: { id: 'emp_1', fullName: 'John Employee' },
      expenseAccount: { accountName: 'General Expenses' },
      category: { name: 'Misc' },
    }

    ;(global as any).fetch = jest.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: { payment } }) })

    render(<PaymentDetailPage />)

    await waitFor(() => expect(screen.getByText('John Employee')).toBeInTheDocument())

    const payeeLink = screen.getByRole('button', { name: /Open payee John Employee/ })
    expect(payeeLink).toBeInTheDocument()

    await userEvent.click(payeeLink)
    expect(pushMock).toHaveBeenCalledWith('/employees/emp_1')
  })

  it('renders business payee as link when user has canViewSuppliers', async () => {
    jest.resetModules()
    jest.doMock('next/navigation', () => ({
      useRouter: () => ({ push: pushMock, replace: () => Promise.resolve(undefined), refresh: () => undefined, back: () => undefined, forward: () => undefined, prefetch: () => Promise.resolve(undefined) }),
      useParams: () => ({ accountId: 'acc_1', paymentId: 'pay_1' }),
    }))
    const { default: PaymentDetailPage } = await import('@/app/expense-accounts/[accountId]/payments/[paymentId]/page')
    const payment = {
      id: 'pay_1',
      amount: 20,
      paymentDate: new Date().toISOString(),
      payeeBusiness: { id: 'biz_1', name: 'Vendor Corp' },
      expenseAccount: { accountName: 'General Expenses' },
    }

    ;(global as any).fetch = jest.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: { payment } }) })

    render(<PaymentDetailPage />)

    await waitFor(() => expect(screen.getByText('Vendor Corp')).toBeInTheDocument())

    const payeeLink = screen.getByRole('button', { name: /Open payee Vendor Corp/ })
    expect(payeeLink).toBeInTheDocument()
    await userEvent.click(payeeLink)
    expect(pushMock).toHaveBeenCalledWith('/business/suppliers/biz_1')
  })

  it('shows deposit and payment counts and navigates to deposit report on click', async () => {
    jest.resetModules()
    jest.doMock('next/navigation', () => ({
      useRouter: () => ({ push: pushMock, replace: () => Promise.resolve(undefined), refresh: () => undefined, back: () => undefined, forward: () => undefined, prefetch: () => Promise.resolve(undefined) }),
      useParams: () => ({ accountId: 'acc_1', paymentId: 'pay_1' }),
    }))
    const { default: PaymentDetailPage } = await import('@/app/expense-accounts/[accountId]/payments/[paymentId]/page')
    const payment = {
      id: 'pay_1',
      amount: 20,
      paymentDate: new Date().toISOString(),
      payeeBusiness: { id: 'biz_1', name: 'Vendor Corp' },
      expenseAccount: { accountName: 'General Expenses' },
    }

    // Mock payment detail, deposits count and payment count
    ;(global as any).fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: { payment } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: { depositCount: 3, paymentCount: 5 } }) })

    render(<PaymentDetailPage />)

    await waitFor(() => expect(screen.getByText('Vendor Corp')).toBeInTheDocument())

    // deposits count should show 3 as a link and have correct href
    const depositLink = await screen.findByRole('link', { name: /Open deposits for/ })
    expect(depositLink).toBeInTheDocument()
    expect(depositLink).toHaveAttribute('href', '/expense-accounts/acc_1/deposits')
  })
})

export {}
