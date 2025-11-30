// @ts-nocheck

import React from 'react'
import { renderWithProviders as render, screen, waitFor } from '../helpers/render-with-providers'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

// Mutable mock session
const sessionMock: any = { data: null, status: 'unauthenticated' }
jest.mock('next-auth/react', () => ({ useSession: () => sessionMock }))

// Keep default navigation mocks but allow tests to override the push
const pushMock = jest.fn()
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: pushMock }), usePathname: () => '/', useSearchParams: () => new URLSearchParams() }))

import ExpenseAccountsPage from '@/app/expense-accounts/page'

describe('ExpenseAccountsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders deposit link as clickable when user has canViewExpenseReports', async () => {
    // Mock authenticated session user that has canViewExpenseReports & canAccessExpenseAccount
    sessionMock.data = { user: { id: 'user1', role: 'user', businessMemberships: [{ businessId: 'b1', isActive: true, role: 'business-manager', permissions: { canViewExpenseReports: true, canAccessExpenseAccount: true } }] } }
    sessionMock.status = 'authenticated'

    const accounts = [
      {
        id: 'parent_1',
        accountNumber: 'EXP-001',
        accountName: 'Office Supplies',
        description: 'Parent account',
        balance: 1000,
        depositsTotal: 1000,
        paymentsTotal: 100,
        depositCount: 3,
        paymentCount: 2,
        largestPayment: 200,
        largestPaymentPayee: 'Vendor A',
        largestPaymentId: 'pay_parent_1',
        lowBalanceThreshold: 500,
        isActive: true,
        createdAt: new Date().toISOString(),
        parentAccountId: null,
        siblingNumber: null,
        isSibling: false,
        canMerge: true,
        creator: { name: 'Test', email: 'test@example.com' },
      },
    ]

    // Mock account list fetch
    (global as any).fetch = jest.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: { accounts } }) })

    render(<ExpenseAccountsPage />)

    await waitFor(() => expect(screen.getByText('Office Supplies')).toBeInTheDocument())

    const parentCard = screen.getByText('Office Supplies').closest('.card')
    const depositLink = parentCard ? parentCard.querySelector('a[title^="Open deposit report for"]') : null

    expect(depositLink).toBeTruthy()
    expect(depositLink).toHaveAttribute('href', '/expense-accounts/parent_1/deposits')
  })
})
