// @ts-nocheck

import React from 'react'
// We'll set up a spy on `useRouter` from next/navigation after imports for better control
const pushMock = jest.fn(() => Promise.resolve(undefined))
import { renderWithProviders as render, screen, waitFor, within } from '../helpers/render-with-providers'
import { render as rtlRender } from '@testing-library/react'
import { ThemeProvider } from '@/contexts/theme-context'
import { ToastProvider } from '@/components/ui/toast'
import { ConfirmProvider } from '@/components/ui/confirm-modal'
import * as nextNavigation from 'next/navigation'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

import { AccountList } from '@/components/expense-account/account-list'

// Ensure the module's mock for useRouter returns the pushMock so we can assert calls
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    replace: () => Promise.resolve(undefined),
    refresh: () => undefined,
    back: () => undefined,
    forward: () => undefined,
    prefetch: () => Promise.resolve(undefined),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

describe('AccountList Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should show Create Sibling for parent account and not for sibling account', async () => {
    const accounts = [
      {
        id: 'parent_1',
        accountNumber: 'EXP-001',
        accountName: 'Office Supplies',
        description: 'Parent account',
        balance: 1000,
        depositsTotal: 1000,
        paymentsTotal: 100,
        depositCount: 5,
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
      {
        id: 'sib_1',
        accountNumber: 'EXP-001-01',
        accountName: 'Historical Q1',
        description: 'Sibling account',
        balance: 250,
        depositsTotal: 250,
        paymentsTotal: 50,
        depositCount: 2,
        paymentCount: 1,
        largestPayment: 50,
        largestPaymentPayee: 'Vendor B',
        largestPaymentId: 'pay_sib_1',
        lowBalanceThreshold: 100,
        isActive: true,
        createdAt: new Date().toISOString(),
        parentAccountId: 'parent_1',
        siblingNumber: 1,
        isSibling: true,
        canMerge: true,
        creator: { name: 'Test', email: 'test@example.com' },
      },
    ];

    // Mock fetch to return our accounts using global.fetch
    (global as any).fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: { accounts } }),
    })

    render(<AccountList canCreateAccount={false} canCreateSiblingAccounts={true} canViewExpenseReports={true} />)

    await waitFor(() => {
      expect(screen.getByText('Office Supplies')).toBeInTheDocument()
      expect(screen.getByText('Historical Q1')).toBeInTheDocument()
    })

    // Ensure deposits/payments show on the right side and only once per card
    const parentCard = screen.getByText('Office Supplies').closest('.card') as HTMLElement
    const siblingCard = screen.getByText('Historical Q1').closest('.card') as HTMLElement

    // Parent card checks: get label container to avoid duplicates (e.g., balance vs deposit)
    const parentDepositLabel = within(parentCard).getByText('Deposits')
    expect(within(parentCard).getByText('$1,000.00', { selector: '.font-semibold.text-green-600' })).toBeInTheDocument()
    const parentPaymentLabel = within(parentCard).getByText('Payments')
    expect(within(parentCard).getByText('$100.00', { selector: '.font-semibold.text-orange-600' })).toBeInTheDocument()

    // Sibling card checks
    const siblingDepositLabel = within(siblingCard).getByText('Deposits')
    expect(within(siblingCard).getByText('$250.00', { selector: '.font-semibold.text-green-600' })).toBeInTheDocument()
    const siblingPaymentLabel = within(siblingCard).getByText('Payments')
    expect(within(siblingCard).getByText('$50.00', { selector: '.font-semibold.text-orange-600' })).toBeInTheDocument()
    // Ensure largest payments and payees are shown
    // Largest payment + payee checks within each card
    const parentLargestLabel = within(parentCard).getByText('Largest Payment')
    expect(within(parentCard).getByText('to Vendor A')).toBeInTheDocument()
    expect(within(parentCard).getByText('$200.00', { selector: '.font-semibold.text-red-600' })).toBeInTheDocument()
    const siblingLargestLabel = within(siblingCard).getByText('Largest Payment')
    expect(within(siblingCard).getByText('to Vendor B')).toBeInTheDocument()
    expect(within(siblingCard).getByText('$50.00', { selector: '.font-semibold.text-red-600' })).toBeInTheDocument()

    // Parent account should have Create Sibling button
    const createButtons = await screen.findAllByRole('button', { name: /create sibling/i })
    // Only one parent (non-sibling) so only one Create Sibling button
    expect(createButtons).toHaveLength(1)

    // Ensure the sibling account card does not have a Create Sibling button
    const siblingCardElement = siblingCard
    if (siblingCard) {
      const siblingButton = siblingCard.querySelector('button')
      if (siblingButton) {
        expect(siblingButton.textContent?.toLowerCase()).not.toContain('create sibling')
      }
    }
      // Ensure right badge has left padding so text isn't touching container
      const rightBadge = parentCard.querySelector('.ml-4') as HTMLElement
      expect(rightBadge.className).toContain('pl-6')
      // Ensure parent card has horizontal padding to visually leave margin on left/right
      expect(parentCard.className).toContain('px-6')
      // Ensure left side content inside card has left padding so text isn't touching the container
      const leftContent = parentCard.querySelector('.flex-1') as HTMLElement
      expect(leftContent.className).toContain('pl-6')
      // Ensure deposit chip is present and link has correct href
      const depositChip = within(parentCard).getByRole('link', { name: /Open deposit report for Office Supplies/ })
      expect(depositChip).toBeInTheDocument()
      expect(depositChip).toHaveAttribute('href', '/expense-accounts/parent_1/deposits')
      expect(depositChip.className).toContain('rounded-full')
  })

  it('navigates to payment detail when largest payment clicked', async () => {
    const accounts = [
      {
        id: 'parent_1',
        accountNumber: 'EXP-001',
        accountName: 'Office Supplies',
        description: 'Parent account',
        balance: 1000,
        depositsTotal: 1000,
        paymentsTotal: 100,
        depositCount: 4,
        paymentCount: 1,
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
    ];

    (global as any).fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: { accounts } }),
    })

    render(<AccountList canCreateAccount={false} canCreateSiblingAccounts={true} canViewExpenseReports={true} />)
    await waitFor(() => expect(screen.getByText('Office Supplies')).toBeInTheDocument())

    const parentCard = screen.getByText('Office Supplies').closest('.card') as HTMLElement
    const largestAmountLink = within(parentCard).getByRole('link', { name: /Open largest payment/ })
    expect(largestAmountLink).toBeInTheDocument()
    expect(largestAmountLink).toHaveAttribute('href', '/expense-accounts/parent_1/payments/pay_parent_1')
    // Simulate server returning a valid page — ensure it should exist now
  })

  it('keeps deposit link clickable after merging a sibling', async () => {
    const parentAccount = {
      id: 'parent_1',
      accountNumber: 'EXP-001',
      accountName: 'Office Supplies',
      balance: 1000,
      depositsTotal: 1000,
      paymentsTotal: 100,
      depositCount: 1,
      paymentCount: 1,
      largestPayment: 100,
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
    }

    const siblingAccount = {
      id: 'sib_1',
      accountNumber: 'EXP-001-1',
      accountName: 'Historical Q1',
      balance: 0,
      depositsTotal: 0,
      paymentsTotal: 0,
      depositCount: 0,
      paymentCount: 0,
      largestPayment: 0,
      largestPaymentPayee: null,
      largestPaymentId: null,
      lowBalanceThreshold: 0,
      isActive: true,
      createdAt: new Date().toISOString(),
      parentAccountId: 'parent_1',
      siblingNumber: 1,
      isSibling: true,
      canMerge: true,
      creator: { name: 'Test', email: 'test@example.com' },
    }

    const updatedParent = { ...parentAccount, depositCount: 2, depositsTotal: 1100 }

    const settingsResponse = {
      allowSelfRegistration: true,
      defaultRegistrationRole: 'employee',
      requireAdminApproval: false,
      maxUsersPerBusiness: 50,
      globalDateFormat: 'dd/mm/yyyy',
      defaultCountryCode: 'ZW',
    }

    let accountLoads = 0
    const fetchMock = jest.fn(async (input: RequestInfo, init?: RequestInit) => {
      console.log('fetchMock called with', typeof input === 'string' ? input : (input as any)?.url || input.toString(), init)
      const url = typeof input === 'string' ? input : (input as any)?.url || input.toString()
      if (url.includes('/api/admin/settings')) {
        return { ok: true, json: async () => settingsResponse }
      }

      if (url.includes('/api/expense-account') && (!init || init.method === 'GET')) {
        accountLoads += 1
        // First account GET returns both parent and sibling
        if (accountLoads === 1) {
          return { ok: true, json: async () => ({ success: true, data: { accounts: [parentAccount, siblingAccount] } }) }
        }
        // Subsequent account GET returns updated parent only
        return { ok: true, json: async () => ({ success: true, data: { accounts: [updatedParent] } }) }
      }

      if (url.includes('/merge') && init?.method === 'POST') {
        return { ok: true, json: async () => ({ success: true, message: 'Merged', data: { mergedAccountId: siblingAccount.id, parentAccountId: parentAccount.id } }) }
      }

      // Default generic ok response for other endpoints
      return { ok: true, json: async () => ({}) }
    })

    ;(global as any).fetch = fetchMock

    const Wrapper: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
      <ThemeProvider>
        <ToastProvider>
          <ConfirmProvider>{children}</ConfirmProvider>
        </ToastProvider>
      </ThemeProvider>
    )
    rtlRender(<AccountList canCreateAccount={false} canCreateSiblingAccounts={true} canMergeSiblingAccounts={true} canViewExpenseReports={true} />, { wrapper: Wrapper })
    await waitFor(() => expect(screen.getByText('Office Supplies')).toBeInTheDocument())

    // Click Merge button for the sibling
    const siblingCard = screen.getByText('Historical Q1').closest('.card') as HTMLElement
    const mergeButton = within(siblingCard).getByRole('button', { name: /merge/i })
    await userEvent.click(mergeButton)

    // Modal should appear; click through steps
    const nextButton = await screen.findByRole('button', { name: /Next: Confirm Merge/i })
    await userEvent.click(nextButton)
    const confirmMergeButton = await screen.findByRole('button', { name: /Merge Accounts/i })
    await userEvent.click(confirmMergeButton)

    // After merge completes, account list reload should show updated parent only
    await waitFor(() => expect(screen.getByText('Office Supplies')).toBeInTheDocument())
    // Verify deposit link exists and has updated depositCount
    const parentCard = screen.getByText('Office Supplies').closest('.card') as HTMLElement
    const depositLink = within(parentCard).getByRole('link', { name: /Open deposit report for Office Supplies/ })
    expect(depositLink).toBeInTheDocument()
    expect(within(depositLink).getByText('2')).toBeInTheDocument()
  })
})

it('shows counts and navigates to deposit report when deposit count clicked', async () => {
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
  ];

  (global as any).fetch = jest.fn().mockResolvedValueOnce({
    ok: true,
    json: async () => ({ success: true, data: { accounts } }),
  })

  render(<AccountList canCreateAccount={false} canCreateSiblingAccounts={true} canViewExpenseReports={true} />)
  await waitFor(() => expect(screen.getByText('Office Supplies')).toBeInTheDocument())

  const parentCard = screen.getByText('Office Supplies').closest('.card') as HTMLElement
  // The deposit chip has separate spans for the count and label; assert both
  const depositLink = within(parentCard).getByRole('link', { name: /Open deposit report for Office Supplies/ })
  expect(within(depositLink).getByText('3')).toBeInTheDocument()
  expect(within(depositLink).getByText('deposits')).toBeInTheDocument()
  // Check payments chip content (not a link)
  const paymentsChip = parentCard.querySelector('.bg-orange-50') as HTMLElement
  expect(paymentsChip).toBeTruthy()
  expect(paymentsChip.textContent?.trim()).toContain('2')

  // Find the deposit count link and assert href
  expect(depositLink).toBeInTheDocument()
  expect(depositLink).toHaveAttribute('href', '/expense-accounts/parent_1/deposits')
})
