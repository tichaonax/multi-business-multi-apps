// @ts-nocheck

import React from 'react'
import { renderWithProviders as render, screen, waitFor } from '../helpers/render-with-providers'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

// jsdom doesn't implement ResizeObserver; the sticky-filters height hook
// used by TransactionHistory needs a stub to avoid a ReferenceError.
if (typeof (global as any).ResizeObserver === 'undefined') {
  ;(global as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

jest.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { id: 'admin', role: 'admin' } }, status: 'authenticated' }),
}))

// jspdf (pulled in transitively via the payment-voucher PDF generator) needs
// TextEncoder/TextDecoder, which this jsdom test environment doesn't provide.
// Not exercised by this test, so stub the module out rather than the PDF lib.
jest.mock('@/components/expense-account/payment-voucher-pdf', () => ({
  generatePaymentVoucherPdf: jest.fn(),
}))

import { TransactionHistory } from '@/components/expense-account/transaction-history'

const basePayment = {
  id: 'pay_1',
  type: 'PAYMENT',
  amount: 100,
  date: new Date().toISOString(),
  description: 'Payment to Vendor Corp',
  balanceAfter: 900,
  status: 'SUBMITTED',
  payeeType: 'BUSINESS',
  createdAt: new Date().toISOString(),
}

function mockFetchImpl(transactions: any[], reverseResponse: { ok: boolean; body: any }) {
  return jest.fn().mockImplementation(async (url: string, init?: any) => {
    if (typeof url === 'string' && url.includes('/reverse') && init?.method === 'POST') {
      return {
        ok: reverseResponse.ok,
        json: async () => reverseResponse.body,
      }
    }
    if (typeof url === 'string' && url.includes('/transactions')) {
      return {
        ok: true,
        json: async () => ({ success: true, data: { transactions, pagination: { total: transactions.length } } }),
      }
    }
    // receipt-counts and any other incidental calls
    return { ok: true, json: async () => ({ success: true, data: {} }) }
  })
}

describe('TransactionHistory — reverse payment balance refresh', () => {
  const originalPrompt = window.prompt
  const originalConfirm = window.confirm

  beforeEach(() => {
    jest.clearAllMocks()
    window.prompt = jest.fn(() => 'duplicate payment')
    window.confirm = jest.fn(() => true)
    window.alert = jest.fn()
  })

  afterAll(() => {
    window.prompt = originalPrompt
    window.confirm = originalConfirm
  })

  it('notifies the parent to refresh the balance after a successful reversal', async () => {
    ;(global as any).fetch = mockFetchImpl([basePayment], {
      ok: true,
      body: { success: true, message: 'Payment reversed', newBalance: 1000 },
    })
    const onDataChanged = jest.fn()

    render(
      <TransactionHistory
        accountId="acc_1"
        isAdmin={true}
        canEditPayments={true}
        onDataChanged={onDataChanged}
      />
    )

    const reverseBtn = await screen.findByRole('button', { name: 'Reverse' })
    await userEvent.click(reverseBtn)

    await waitFor(() => expect(onDataChanged).toHaveBeenCalledTimes(1))
    expect((global as any).fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/expense-account/payments/pay_1/reverse'),
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('does not refresh the balance and leaves the payment unchanged when the reversal fails', async () => {
    ;(global as any).fetch = mockFetchImpl([basePayment], {
      ok: false,
      body: { success: false, error: 'Payment already reversed' },
    })
    const onDataChanged = jest.fn()

    render(
      <TransactionHistory
        accountId="acc_1"
        isAdmin={true}
        canEditPayments={true}
        onDataChanged={onDataChanged}
      />
    )

    const reverseBtn = await screen.findByRole('button', { name: 'Reverse' })
    await userEvent.click(reverseBtn)

    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Payment already reversed'))
    expect(onDataChanged).not.toHaveBeenCalled()
    // The row is still shown as reversible — UI did not advance past the failed action.
    expect(screen.getByRole('button', { name: 'Reverse' })).toBeInTheDocument()
  })
})

export {}
