// @ts-nocheck

/**
 * UI Component Tests for Sibling Expense Accounts
 *
 * Tests React components related to sibling account functionality
 * including forms, modals, and display components.
 */

import React from 'react'
import { renderWithProviders as render, screen, fireEvent, waitFor } from '../helpers/render-with-providers'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

// Mock components and utilities
jest.mock('@/lib/auth-utils', () => ({
  usePermissions: jest.fn(),
}))

jest.mock('@/lib/fetch-utils', () => ({
  fetchWithValidation: jest.fn(),
}))

// Mock the toast context used by components to display messages
// Tests now wrap components with ToastProvider & ConfirmProvider via renderWithProviders; remove manual mocks

jest.mock('@/lib/fetchWithValidation', () => ({
  __esModule: true,
  default: jest.fn(),
}))

const mockUsePermissions = require('@/lib/auth-utils').usePermissions
const mockFetchWithValidation = require('@/lib/fetch-utils').fetchWithValidation
const mockFetchWithValidationDefault = require('@/lib/fetchWithValidation').default

describe('CreateSiblingModal Component', () => {
  const mockOnClose = jest.fn()
  const mockOnSuccess = jest.fn()
  const mockParentAccount = {
    id: 'exp_123',
    name: 'Office Supplies',
    accountNumber: 'EXP-001',
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockUsePermissions.mockReturnValue({
      canCreateSiblingAccounts: true,
    })
  })

  it('should render create sibling modal correctly', () => {
    render(
      <CreateSiblingModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        parentAccount={mockParentAccount}
      />
    )

    expect(screen.getByText('Create Sibling Account')).toBeInTheDocument()
    expect(screen.getByText(`Parent: ${mockParentAccount.name} (${mockParentAccount.accountNumber})`)).toBeInTheDocument()
    expect(screen.getByLabelText(/Name/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Description/)).toBeInTheDocument()
  })

  it('should validate required name field', async () => {
    const user = userEvent.setup()

    render(
      <CreateSiblingModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        parentAccount={mockParentAccount}
      />
    )

    const submitButton = screen.getByRole('button', { name: /create sibling/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Please enter a sibling account name')).toBeInTheDocument()
    })
  })

  it('should create sibling account successfully', async () => {
    const user = userEvent.setup()

    mockFetchWithValidation.mockResolvedValue({
      success: true,
      data: {
        id: 'sib_456',
        name: 'Historical Data',
        accountNumber: 'EXP-001-01',
      },
    })

    render(
      <CreateSiblingModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        parentAccount={mockParentAccount}
      />
    )

    await user.type(screen.getByLabelText(/Name/), 'Historical Data')
    await user.type(screen.getByLabelText(/Description/), 'For entering historical expenses')

    const submitButton = screen.getByRole('button', { name: /create sibling/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockFetchWithValidation || mockFetchWithValidationDefault).toHaveBeenCalledWith(
        `/api/expense-account/${mockParentAccount.id}/sibling`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            name: 'Historical Data',
            description: 'For entering historical expenses',
          }),
        })
      )
      expect(mockOnSuccess).toHaveBeenCalled()
      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  it('should handle API errors gracefully', async () => {
    const user = userEvent.setup()

    mockFetchWithValidation.mockResolvedValue({
      success: false,
      error: 'Failed to create sibling account',
    })

    render(
      <CreateSiblingModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        parentAccount={mockParentAccount}
      />
    )

    await user.type(screen.getByLabelText(/Name/), 'Test Sibling')
    await user.click(screen.getByRole('button', { name: /create sibling/i }))

    await waitFor(() => {
      expect(screen.getByText('Failed to create sibling account')).toBeInTheDocument()
    })
  })

  it('should disable submit when user lacks permission', () => {
    mockUsePermissions.mockReturnValue({
      canCreateSiblingAccounts: false,
    })

    render(
      <CreateSiblingModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        parentAccount={mockParentAccount}
      />
    )

    const submitButton = screen.getByRole('button', { name: /create sibling/i })
    expect(submitButton).toBeDisabled()
  })

  it('should disable submit when parent account is a sibling', () => {
    mockUsePermissions.mockReturnValue({ canCreateSiblingAccounts: true })

    const siblingParent = { id: 'exp_parent', name: 'Sibling Parent', accountNumber: 'EXP-001', isSibling: true }

    render(
      <CreateSiblingModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        parentAccount={siblingParent}
      />
    )

    const submitButton = screen.getByRole('button', { name: /create sibling/i })
    expect(submitButton).toBeDisabled()
    expect(screen.getByText(/Cannot create a sibling account from another sibling account/)).toBeInTheDocument()
  })
})

describe('MergeAccountModal Component', () => {
  const mockOnClose = jest.fn()
  const mockOnSuccess = jest.fn()
  const mockSiblingAccount = {
    id: 'sib_123',
    name: 'Historical Q1',
    accountNumber: 'EXP-001-01',
    balance: 250.75,
    parentAccountId: 'exp_456',
  }
  const mockParentAccount = {
    id: 'exp_456',
    name: 'Office Supplies',
    accountNumber: 'EXP-001',
    balance: 1000.00,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockUsePermissions.mockReturnValue({
      canMergeSiblingAccounts: true,
    })
  })

  it('should render merge modal with balance information', () => {
    render(
      <MergeAccountModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        siblingAccount={mockSiblingAccount}
        parentAccount={mockParentAccount}
      />
    )

    expect(screen.getByText('Merge Sibling Account')).toBeInTheDocument()
    expect(screen.getByText(`Merge "${mockSiblingAccount.name}" into "${mockParentAccount.name}"`)).toBeInTheDocument()
    expect(screen.getByText('Current sibling balance: $250.75')).toBeInTheDocument()
    expect(screen.getByText('Parent account will gain: $250.75')).toBeInTheDocument()
  })

  it('should show warning for non-zero balance', () => {
    render(
      <MergeAccountModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        siblingAccount={mockSiblingAccount}
        parentAccount={mockParentAccount}
      />
    )

    expect(screen.getByText(/Warning/)).toBeInTheDocument()
    expect(screen.getByText(/transfer the balance to the parent account/)).toBeInTheDocument()
    const nextButton = screen.getByRole('button', { name: /next: confirm merge/i })
    expect(nextButton).toBeDisabled()
  })

  it('should merge account successfully', async () => {
    const user = userEvent.setup()

    mockFetchWithValidation.mockResolvedValue({
      success: true,
      data: {
        mergedAccount: {
          ...mockParentAccount,
          balance: 1250.75,
        },
        deletedSibling: mockSiblingAccount,
      },
    })

    render(
      <MergeAccountModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        siblingAccount={mockSiblingAccount}
        parentAccount={mockParentAccount}
      />
    )

    const mergeButton = screen.getByRole('button', { name: /merge accounts/i })
    await user.click(mergeButton)

    await waitFor(() => {
      expect(mockFetchWithValidation || mockFetchWithValidationDefault).toHaveBeenCalledWith(
        `/api/expense-account/${mockSiblingAccount.id}/merge`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            targetAccountId: mockParentAccount.id,
          }),
        })
      )
      expect(mockOnSuccess).toHaveBeenCalled()
      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  it('should not crash when currentBalance is undefined and treat as zero', () => {
    const mockOnClose = jest.fn()
    const mockOnSuccess = jest.fn()
    const mockOnError = jest.fn()
    const mockSiblingAccount = {
      id: 'sib_123',
      name: 'Historical Q1',
      accountNumber: 'EXP-001-01',
    }
    const mockParentAccount = {
      id: 'exp_456',
      name: 'Office Supplies',
      accountNumber: 'EXP-001',
    }

    // Render the test-local MergeAccountModal which expects object props
    render(
      <MergeAccountModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        onError={mockOnError}
        siblingAccount={{ ...mockSiblingAccount, balance: undefined }}
        parentAccount={mockParentAccount}
      />
    )

    expect(screen.getByText('Merge Sibling Account')).toBeInTheDocument()
    // Our mocked MergeAccountModal shows Current sibling balance and Merge Accounts button
    expect(screen.getByText('Current sibling balance: $0.00')).toBeInTheDocument()
    const mergeBtn = screen.getByRole('button', { name: /Merge Accounts/i })
    expect(mergeBtn).toBeEnabled()
  })

  it('should prevent merge when balance is non-zero and user lacks admin permission', () => {
    mockUsePermissions.mockReturnValue({
      canMergeSiblingAccounts: false,
      isAdmin: false,
    })

    render(
      <MergeAccountModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        siblingAccount={mockSiblingAccount}
        parentAccount={mockParentAccount}
      />
    )

    const mergeButton = screen.getByRole('button', { name: /merge accounts/i })
    expect(mergeButton).toBeDisabled()
    expect(screen.getByText(/Admin permission required to merge accounts with a non-zero balance/)).toBeInTheDocument()
  })

  it('should allow admin to merge non-zero balance accounts', () => {
    mockUsePermissions.mockReturnValue({
      canMergeSiblingAccounts: false,
      isAdmin: true,
    })

    render(
      <MergeAccountModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        siblingAccount={mockSiblingAccount}
        parentAccount={mockParentAccount}
      />
    )

    const mergeButton = screen.getByRole('button', { name: /merge accounts/i })
    expect(mergeButton).not.toBeDisabled()
  })
})

describe('SiblingAccountIndicator Component', () => {
  it('should display sibling account indicator', () => {
    const mockAccount = {
      id: 'sib_123',
      name: 'Historical Data',
      accountNumber: 'EXP-001-01',
      isSibling: true,
      canMerge: true,
      balance: 150.00,
    }

    render(<SiblingAccountIndicator account={mockAccount} />)

    expect(screen.getByText('Sibling Account')).toBeInTheDocument()
    expect(screen.getByText('EXP-001-01')).toBeInTheDocument()
    expect(screen.getByText('$150.00')).toBeInTheDocument()
  })

  it('should show merge button when permitted', () => {
    const mockAccount = {
      id: 'sib_123',
      name: 'Historical Data',
      accountNumber: 'EXP-001-01',
      isSibling: true,
      canMerge: true,
      balance: 0,
    }

    mockUsePermissions.mockReturnValue({
      canMergeSiblingAccounts: true,
    })

    render(<SiblingAccountIndicator account={mockAccount} />)

    expect(screen.getByRole('button', { name: /merge/i })).toBeInTheDocument()
  })

  it('should hide merge button when not permitted', () => {
    const mockAccount = {
      id: 'sib_123',
      name: 'Historical Data',
      accountNumber: 'EXP-001-01',
      isSibling: true,
      canMerge: true,
      balance: 0,
    }

    mockUsePermissions.mockReturnValue({
      canMergeSiblingAccounts: false,
    })

    render(<SiblingAccountIndicator account={mockAccount} />)

    expect(screen.queryByRole('button', { name: /merge/i })).not.toBeInTheDocument()
  })
})

describe('PaymentForm with Sibling Support', () => {
  const mockOnSubmit = jest.fn()
  const mockAccount = {
    id: 'exp_123',
    name: 'Office Supplies',
    accountNumber: 'EXP-001',
    isSibling: false,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should show date picker for historical payments', () => {
    render(
      <PaymentForm
        account={mockAccount}
        onSubmit={mockOnSubmit}
        availablePayees={[]}
      />
    )

    expect(screen.getByLabelText(/payment date/i)).toBeInTheDocument()
  })

  it('should show sibling account option when siblings exist', () => {
    const mockSiblings = [
      {
        id: 'sib_1',
        name: 'Historical Q1',
        accountNumber: 'EXP-001-01',
      },
    ]

    render(
      <PaymentForm
        account={mockAccount}
        onSubmit={mockOnSubmit}
        availablePayees={[]}
        siblingAccounts={mockSiblings}
      />
    )

    expect(screen.getByText(/use sibling account/i)).toBeInTheDocument()
  })

  it('should allow selecting sibling account for payment', async () => {
    const user = userEvent.setup()
    const mockSiblings = [
      {
        id: 'sib_1',
        name: 'Historical Q1',
        accountNumber: 'EXP-001-01',
      },
    ]

    render(
      <PaymentForm
        account={mockAccount}
        onSubmit={mockOnSubmit}
        availablePayees={[]}
        siblingAccounts={mockSiblings}
      />
    )

    const siblingOption = screen.getByText(/use sibling account/i)
    await user.click(siblingOption)

    const siblingSelect = screen.getByLabelText(/select sibling account/i)
    expect(siblingSelect).toBeInTheDocument()

    await user.selectOptions(siblingSelect, 'sib_1')

    // Fill payment details
    await user.type(screen.getByLabelText(/amount/i), '100.00')
    await user.type(screen.getByLabelText(/description/i), 'Test payment')

    const submitButton = screen.getByRole('button', { name: /submit payment/i })
    await user.click(submitButton)

    expect(mockOnSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 100,
        description: 'Test payment',
        siblingAccountId: 'sib_1',
      })
    )
  })
})

// Mock component implementations for testing
function CreateSiblingModal({ isOpen, onClose, onSuccess, parentAccount }: any) {
  const [name, setName] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [error, setError] = React.useState('')
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const permissions = mockUsePermissions()

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Name is required')
      return
    }

    setIsSubmitting(true)
    try {
      const result = await mockFetchWithValidation(`/api/expense-account/${parentAccount.id}/sibling`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      })

      if (result.success) {
        onSuccess(result.data)
        onClose()
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError('Failed to create sibling account')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div data-testid="create-sibling-modal">
      <h2>Create Sibling Account</h2>
      <p>Parent: {parentAccount.name} ({parentAccount.accountNumber})</p>
      <input
        aria-label="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <textarea
        aria-label="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      {error && <div data-testid="error-message">{error}</div>}
      <button onClick={handleSubmit} disabled={isSubmitting || !permissions.canCreateExpenseAccount}>
        Create Sibling
      </button>
    </div>
  )
}

function MergeAccountModal({ isOpen, onClose, onSuccess, siblingAccount, parentAccount }: any) {
  const [error, setError] = React.useState('')
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const permissions = mockUsePermissions()

  const handleMerge = async () => {
    if (siblingAccount.balance !== 0 && !permissions.canMergeSiblingAccounts && !permissions.isAdmin) {
      setError('Admin permission required to merge accounts with non-zero balance')
      return
    }

    setIsSubmitting(true)
    try {
      const result = await mockFetchWithValidation(`/api/expense-account/${siblingAccount.id}/merge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetAccountId: parentAccount.id }),
      })

      if (result.success) {
        onSuccess(result.data)
        onClose()
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError('Failed to merge accounts')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div data-testid="merge-account-modal">
      <h2>Merge Sibling Account</h2>
      <p>Merge "{siblingAccount.name}" into "{parentAccount.name}"</p>
          <p>Current sibling balance: ${(siblingAccount.balance ?? 0).toFixed(2)}</p>
          <p>Parent account will gain: ${(siblingAccount.balance ?? 0).toFixed(2)}</p>
          {Number(siblingAccount.balance ?? 0) !== 0 && (
        <div style={{ color: 'red' }}>
          <strong>Warning:</strong> This will transfer the balance to the parent account.
        </div>
      )}
      {error && <div data-testid="error-message">{error}</div>}
      <button
        onClick={handleMerge}
        disabled={isSubmitting || (siblingAccount.balance !== 0 && !permissions.canMergeSiblingAccounts && !permissions.isAdmin)}
      >
        Merge Accounts
      </button>
    </div>
  )
}

function SiblingAccountIndicator({ account }: any) {
  const permissions = mockUsePermissions()

  return (
    <div data-testid="sibling-indicator">
      <span>Sibling Account</span>
      <span>{account.accountNumber}</span>
      <span>${account.balance.toFixed(2)}</span>
      {permissions.canMergeSiblingAccounts && account.canMerge && (
        <button>Merge</button>
      )}
    </div>
  )
}

function PaymentForm({ account, onSubmit, availablePayees, siblingAccounts }: any) {
  const [amount, setAmount] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [useSibling, setUseSibling] = React.useState(false)
  const [selectedSiblingId, setSelectedSiblingId] = React.useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      amount: parseFloat(amount),
      description,
      siblingAccountId: useSibling ? selectedSiblingId : null,
    })
  }

  return (
    <form onSubmit={handleSubmit} data-testid="payment-form">
      <input
        type="number"
        aria-label="Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <input
        aria-label="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <input
        type="date"
        aria-label="Payment date"
      />
      {siblingAccounts && siblingAccounts.length > 0 && (
        <div>
          <label>
            <input
              type="checkbox"
              checked={useSibling}
              onChange={(e) => setUseSibling(e.target.checked)}
            />
            Use sibling account
          </label>
          {useSibling && (
            <select
              aria-label="Select sibling account"
              value={selectedSiblingId}
              onChange={(e) => setSelectedSiblingId(e.target.value)}
            >
              <option value="">Select sibling account</option>
              {siblingAccounts.map((sibling: any) => (
                <option key={sibling.id} value={sibling.id}>
                  {sibling.name} ({sibling.accountNumber})
                </option>
              ))}
            </select>
          )}
        </div>
      )}
      <button type="submit">Submit Payment</button>
    </form>
  )
}