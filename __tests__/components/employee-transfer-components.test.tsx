/**
 * Employee Transfer Component Tests
 * 
 * Tests for all employee transfer UI components:
 * - BusinessSelector
 * - EmployeeTransferPreview
 * - EmployeeTransferModal
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { renderWithProviders as render, screen, fireEvent, waitFor } from '../helpers/render-with-providers'
import '@testing-library/jest-dom'
import { BusinessSelector } from '@/components/business/business-selector'
import { EmployeeTransferPreview } from '@/components/business/employee-transfer-preview'
import { EmployeeTransferModal } from '@/components/business/employee-transfer-modal'

// Mock fetch
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>

const mockBusinesses = [
  {
    id: 'biz1',
    name: 'Store 1',
    type: 'retail',
    isActive: true,
  },
  {
    id: 'biz2',
    name: 'Store 2',
    type: 'retail',
    isActive: true,
  }
]

const mockEmployees = [
  {
    id: 'emp1',
    fullName: 'John Doe',
    email: 'john@test.com',
    isActive: true,
    employee_contracts: [
      { id: 'contract1', status: 'active', position: 'Manager' }
    ]
  },
  {
    id: 'emp2',
    fullName: 'Jane Smith',
    email: 'jane@test.com',
    isActive: true,
    employee_contracts: [
      { id: 'contract2', status: 'active', position: 'Cashier' }
    ]
  }
]

describe('Employee Transfer Components', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockClear()
  })

  describe('BusinessSelector', () => {
    it('should render businesses as cards', () => {
      const onSelect = jest.fn()
      
      render(
        <BusinessSelector
          businesses={mockBusinesses}
          selectedBusinessId={null}
          onSelect={onSelect}
        />
      )

      expect(screen.getByText('Store 1')).toBeInTheDocument()
      expect(screen.getByText('Store 2')).toBeInTheDocument()
    })

    it('should call onSelect when business is clicked', () => {
      const onSelect = jest.fn()
      
      render(
        <BusinessSelector
          businesses={mockBusinesses}
          selectedBusinessId={null}
          onSelect={onSelect}
        />
      )

      const store1Card = screen.getByText('Store 1').closest('button')
      fireEvent.click(store1Card!)

      expect(onSelect).toHaveBeenCalledWith('biz1')
    })

    it('should highlight selected business', () => {
      const onSelect = jest.fn()
      
      render(
        <BusinessSelector
          businesses={mockBusinesses}
          selectedBusinessId="biz1"
          onSelect={onSelect}
        />
      )

      const store1Card = screen.getByText('Store 1').closest('button')
      expect(store1Card).toHaveClass('ring-2', 'ring-blue-500')
    })

    it('should render empty state when no businesses', () => {
      const onSelect = jest.fn()
      
      render(
        <BusinessSelector
          businesses={[]}
          selectedBusinessId={null}
          onSelect={onSelect}
        />
      )

      expect(screen.getByText(/No compatible businesses found/i)).toBeInTheDocument()
    })
  })

  describe('EmployeeTransferPreview', () => {
    it('should render employee list with contract info', () => {
      render(
        <EmployeeTransferPreview
          employees={mockEmployees}
          sourceBusiness={{ id: 'biz1', name: 'Store 1' }}
          targetBusiness={{ id: 'biz2', name: 'Store 2' }}
        />
      )

      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
      expect(screen.getByText('Manager')).toBeInTheDocument()
      expect(screen.getByText('Cashier')).toBeInTheDocument()
    })

    it('should show transfer summary', () => {
      render(
        <EmployeeTransferPreview
          employees={mockEmployees}
          sourceBusiness={{ id: 'biz1', name: 'Store 1' }}
          targetBusiness={{ id: 'biz2', name: 'Store 2' }}
        />
      )

      expect(screen.getByText(/2 employees/i)).toBeInTheDocument()
      expect(screen.getByText(/Store 1/i)).toBeInTheDocument()
      expect(screen.getByText(/Store 2/i)).toBeInTheDocument()
    })

    it('should highlight contract renewal creation', () => {
      render(
        <EmployeeTransferPreview
          employees={mockEmployees}
          sourceBusiness={{ id: 'biz1', name: 'Store 1' }}
          targetBusiness={{ id: 'biz2', name: 'Store 2' }}
        />
      )

      expect(screen.getByText(/contract renewals will be created/i)).toBeInTheDocument()
      expect(screen.getByText(/7 days/i)).toBeInTheDocument()
    })

    it('should render empty state when no employees', () => {
      render(
        <EmployeeTransferPreview
          employees={[]}
          sourceBusiness={{ id: 'biz1', name: 'Store 1' }}
          targetBusiness={{ id: 'biz2', name: 'Store 2' }}
        />
      )

      expect(screen.getByText(/No employees to transfer/i)).toBeInTheDocument()
    })
  })

  describe('EmployeeTransferModal', () => {
    const mockOnTransferComplete = jest.fn()
    const mockOnClose = jest.fn()

    beforeEach(() => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            count: 2,
            employees: mockEmployees
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            count: 2,
            businesses: mockBusinesses
          })
        })
    })

    it('should render modal when isOpen is true', () => {
      render(
        <EmployeeTransferModal
          isOpen={true}
          onClose={mockOnClose}
          sourceBusinessId="biz1"
          sourceBusinessName="Store 1"
          employeeCount={2}
          onTransferComplete={mockOnTransferComplete}
        />
      )

      expect(screen.getByText(/Transfer Employees/i)).toBeInTheDocument()
    })

    it('should not render modal when isOpen is false', () => {
      const { container } = render(
        <EmployeeTransferModal
          isOpen={false}
          onClose={mockOnClose}
          sourceBusinessId="biz1"
          sourceBusinessName="Store 1"
          employeeCount={2}
          onTransferComplete={mockOnTransferComplete}
        />
      )

      expect(container.firstChild).toBeNull()
    })

    it('should load employees and businesses on open', async () => {
      render(
        <EmployeeTransferModal
          isOpen={true}
          onClose={mockOnClose}
          sourceBusinessId="biz1"
          sourceBusinessName="Store 1"
          employeeCount={2}
          onTransferComplete={mockOnTransferComplete}
        />
      )

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/transferable-employees')
        )
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/compatible-targets')
        )
      })
    })

    it('should show loading state initially', () => {
      render(
        <EmployeeTransferModal
          isOpen={true}
          onClose={mockOnClose}
          sourceBusinessId="biz1"
          sourceBusinessName="Store 1"
          employeeCount={2}
          onTransferComplete={mockOnTransferComplete}
        />
      )

      expect(screen.getByText(/Loading/i)).toBeInTheDocument()
    })

    it('should handle business selection', async () => {
      render(
        <EmployeeTransferModal
          isOpen={true}
          onClose={mockOnClose}
          sourceBusinessId="biz1"
          sourceBusinessName="Store 1"
          employeeCount={2}
          onTransferComplete={mockOnTransferComplete}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Store 2')).toBeInTheDocument()
      })

      const store2Card = screen.getByText('Store 2').closest('button')
      fireEvent.click(store2Card!)

      expect(store2Card).toHaveClass('ring-2')
    })

    it('should enable continue button after business selection', async () => {
      render(
        <EmployeeTransferModal
          isOpen={true}
          onClose={mockOnClose}
          sourceBusinessId="biz1"
          sourceBusinessName="Store 1"
          employeeCount={2}
          onTransferComplete={mockOnTransferComplete}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Store 2')).toBeInTheDocument()
      })

      const store2Card = screen.getByText('Store 2').closest('button')
      fireEvent.click(store2Card!)

      const continueButton = screen.getByText(/Continue/i)
      expect(continueButton).not.toBeDisabled()
    })

    it('should show preview after business selection', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          validation: {
            isValid: true,
            errors: [],
            warnings: []
          }
        })
      })

      render(
        <EmployeeTransferModal
          isOpen={true}
          onClose={mockOnClose}
          sourceBusinessId="biz1"
          sourceBusinessName="Store 1"
          employeeCount={2}
          onTransferComplete={mockOnTransferComplete}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Store 2')).toBeInTheDocument()
      })

      const store2Card = screen.getByText('Store 2').closest('button')
      fireEvent.click(store2Card!)

      const continueButton = screen.getByText(/Continue/i)
      fireEvent.click(continueButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/transfer-preview'),
          expect.any(Object)
        )
      })
    })

    it('should handle transfer execution', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            transferredCount: 2,
            contractRenewalsCreated: 2
          }
        })
      })

      render(
        <EmployeeTransferModal
          isOpen={true}
          onClose={mockOnClose}
          sourceBusinessId="biz1"
          sourceBusinessName="Store 1"
          employeeCount={2}
          onTransferComplete={mockOnTransferComplete}
        />
      )

      // Navigate through flow and execute transfer
      await waitFor(() => {
        expect(screen.getByText('Store 2')).toBeInTheDocument()
      })

      // ... (would need to simulate full flow)

      // After successful transfer
      await waitFor(() => {
        expect(mockOnTransferComplete).toHaveBeenCalled()
      })
    })

    it('should call onClose when cancel is clicked', async () => {
      render(
        <EmployeeTransferModal
          isOpen={true}
          onClose={mockOnClose}
          sourceBusinessId="biz1"
          sourceBusinessName="Store 1"
          employeeCount={2}
          onTransferComplete={mockOnTransferComplete}
        />
      )

      await waitFor(() => {
        const cancelButton = screen.getByText(/Cancel/i)
        fireEvent.click(cancelButton)
      })

      expect(mockOnClose).toHaveBeenCalled()
    })

    it('should prevent backdrop click during transfer', async () => {
      render(
        <EmployeeTransferModal
          isOpen={true}
          onClose={mockOnClose}
          sourceBusinessId="biz1"
          sourceBusinessName="Store 1"
          employeeCount={2}
          onTransferComplete={mockOnTransferComplete}
        />
      )

      const backdrop = screen.getByRole('dialog').parentElement
      fireEvent.click(backdrop!)

      // Should not close during loading
      expect(mockOnClose).not.toHaveBeenCalled()
    })
  })
})
