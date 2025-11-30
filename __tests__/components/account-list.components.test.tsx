// @ts-nocheck

import React from 'react'
// We'll set up a spy on `useRouter` from next/navigation after imports for better control
const pushMock = jest.fn(() => Promise.resolve(undefined))
import { renderWithProviders as render, screen, waitFor, within } from '../helpers/render-with-providers'
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
