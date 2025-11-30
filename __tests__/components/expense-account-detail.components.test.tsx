// @ts-nocheck

import React from 'react'
import { renderWithProviders as render, screen, waitFor } from '../helpers/render-with-providers'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

const pushMock = jest.fn(() => Promise.resolve(undefined))
jest.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { id: 'admin', role: 'admin' } }, status: 'authenticated' }),
}))
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: () => Promise.resolve(undefined), refresh: () => undefined, back: () => undefined, forward: () => undefined, prefetch: () => Promise.resolve(undefined) }),
  useParams: () => ({ accountId: 'acc_1' }),
}))

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

import ExpenseAccountDetailPage from '@/app/expense-accounts/[accountId]/page'

describe('Expense Account Detail Page header actions', () => {
  beforeEach(() => jest.clearAllMocks())

  it('displays deposit & payment counts and navigates to deposits page on click', async () => {
    const account = {
      id: 'acc_1', accountName: 'General', accountNumber: 'EXP-1', balance: 1000, lowBalanceThreshold: 500, isActive: true, createdAt: new Date().toISOString(), isSibling: false
    }

      ;(global as any).fetch = jest.fn().mockImplementation(async (url: string) => {
        if (url.includes('/balance')) {
          return { ok: true, json: async () => ({ success: true, data: { depositCount: 4, paymentCount: 2 } }) }
        }
        if (url.includes('/api/admin/settings')) {
          return { ok: true, json: async () => ({
            allowSelfRegistration: true,
            defaultRegistrationRole: 'employee',
            defaultRegistrationPermissions: {},
            requireAdminApproval: false,
            maxUsersPerBusiness: 50,
            globalDateFormat: 'dd/mm/yyyy',
            defaultCountryCode: 'ZW',
            defaultIdFormatTemplateId: 'zw-national-id',
            defaultMileageUnit: 'km'
          }) }
        }
        if (url.includes('/api/expense-account') && !url.includes('/balance')) {
          return { ok: true, json: async () => ({ success: true, data: { account } }) }
        }
        return { ok: true, json: async () => ({ success: true, data: {} }) }
      })

    render(<ExpenseAccountDetailPage />)
    // Ensure our fetch mock is used
    await waitFor(() => expect((global as any).fetch).toHaveBeenCalled())
    await waitFor(() => expect(screen.getByRole('heading', { name: 'General', level: 1 })).toBeInTheDocument())

    const depLink = await screen.findByRole('link', { name: /Open deposits for/ })
    expect(depLink).toBeInTheDocument()
    expect(depLink.textContent).toBe('4')
    expect(depLink).toHaveAttribute('href', '/expense-accounts/acc_1/deposits')
  })
})

export {}
