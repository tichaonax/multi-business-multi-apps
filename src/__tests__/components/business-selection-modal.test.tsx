import React from 'react'
import { renderWithProviders as render, screen, fireEvent, waitFor } from '../../../__tests__/helpers/render-with-providers'
import { BusinessSelectionModal } from '../../components/global/business-selection-modal'

// Mock next-auth
jest.mock('next-auth/react', () => ({
  useSession: () => ({
    data: {
      user: {
        id: 'test-user',
        email: 'test@example.com',
        name: 'Test User'
      }
    }
  })
}))

// Mock permission utils
jest.mock('../../lib/permission-utils', () => ({
  canAddInventoryFromModal: jest.fn((user, businessId) => {
    // Mock permission logic: allow for business-1, deny for business-2
    return businessId === 'business-1'
  })
}))

// Mock fetch
global.fetch = jest.fn()

describe('BusinessSelectionModal', () => {
  const mockOnBusinessSelected = jest.fn()
  const mockOnClose = jest.fn()
  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onBusinessSelected: mockOnBusinessSelected,
    barcode: '1234567890123'
  }

  beforeEach(() => {
    jest.clearAllMocks()
    // Mock successful fetch response
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        businesses: [
          {
            id: 'business-1',
            name: 'Test Clothing Store',
            type: 'clothing',
            canAddInventory: true
          },
          {
            id: 'business-2',
            name: 'Test Grocery Store',
            type: 'grocery',
            canAddInventory: false
          }
        ]
      })
    })
  })

  it('should render modal when isOpen is true', () => {
    render(<BusinessSelectionModal {...defaultProps} />)
    expect(screen.getByText('📦 Add Product to Inventory')).toBeInTheDocument()
    expect(screen.getByText('1234567890123')).toBeInTheDocument()
  })

  it('should not render modal when isOpen is false', () => {
    render(<BusinessSelectionModal {...defaultProps} isOpen={false} />)
    expect(screen.queryByText('📦 Add Product to Inventory')).not.toBeInTheDocument()
  })

  it('should show inventory type selection first', () => {
    render(<BusinessSelectionModal {...defaultProps} />)
    expect(screen.getByText('Select inventory type:')).toBeInTheDocument()
    expect(screen.getByText('Clothing')).toBeInTheDocument()
    expect(screen.getByText('Hardware')).toBeInTheDocument()
    expect(screen.getByText('Grocery')).toBeInTheDocument()
    expect(screen.getByText('Restaurant')).toBeInTheDocument()
  })

  it('should load businesses when inventory type is selected', async () => {
    render(<BusinessSelectionModal {...defaultProps} />)

    const clothingButton = screen.getByText('Clothing')
    fireEvent.click(clothingButton)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/global/user-businesses-for-inventory?inventoryType=clothing')
    })

    await waitFor(() => {
      expect(screen.getByText('Test Clothing Store')).toBeInTheDocument()
      expect(screen.getByText('Test Grocery Store')).toBeInTheDocument()
    })
  })

  it('should show business selection after inventory type is chosen', async () => {
    render(<BusinessSelectionModal {...defaultProps} />)

    const clothingButton = screen.getByText('Clothing')
    fireEvent.click(clothingButton)

    await waitFor(() => {
      expect(screen.getByText('Select business:')).toBeInTheDocument()
    })
  })

  it('should show permission indicators for businesses', async () => {
    render(<BusinessSelectionModal {...defaultProps} />)

    const clothingButton = screen.getByText('Clothing')
    fireEvent.click(clothingButton)

    await waitFor(() => {
      expect(screen.getByText('Can add inventory')).toBeInTheDocument()
      expect(screen.getByText('No permission')).toBeInTheDocument()
    })
  })

  it('should disable businesses without permission', async () => {
    render(<BusinessSelectionModal {...defaultProps} />)

    const clothingButton = screen.getByText('Clothing')
    fireEvent.click(clothingButton)

    await waitFor(() => {
      // Find the business card that contains "Test Grocery Store"
      const groceryStoreCard = screen.getByText('Test Grocery Store').parentElement?.parentElement?.parentElement?.parentElement
      expect(groceryStoreCard).toHaveClass('opacity-60')
      expect(groceryStoreCard).toHaveClass('cursor-not-allowed')
    })
  })

  it('should allow selection of businesses with permission', async () => {
    render(<BusinessSelectionModal {...defaultProps} />)

    const clothingButton = screen.getByText('Clothing')
    fireEvent.click(clothingButton)

    await waitFor(() => {
      const clothingStoreCard = screen.getByText('Test Clothing Store').parentElement?.parentElement?.parentElement?.parentElement
      fireEvent.click(clothingStoreCard!)
    })

    // Should show selected state (blue border and background)
    await waitFor(() => {
      const clothingStoreCard = screen.getByText('Test Clothing Store').parentElement?.parentElement?.parentElement?.parentElement
      expect(clothingStoreCard).toHaveClass('border-blue-500')
      expect(clothingStoreCard).toHaveClass('bg-blue-50')
    })
  })

  it('should call onBusinessSelected when Add Product is clicked', async () => {
    render(<BusinessSelectionModal {...defaultProps} />)

    const clothingButton = screen.getByText('Clothing')
    fireEvent.click(clothingButton)

    await waitFor(() => {
      const clothingStoreCard = screen.getByText('Test Clothing Store').parentElement?.parentElement?.parentElement?.parentElement
      fireEvent.click(clothingStoreCard!)
    })

    const addButton = screen.getByText('Add Product')
    fireEvent.click(addButton)

    expect(mockOnBusinessSelected).toHaveBeenCalledWith('business-1', 'clothing')
  })

  it('should show loading state while fetching businesses', async () => {
    // Mock slow response
    ;(global.fetch as jest.Mock).mockImplementation(() =>
      new Promise(resolve =>
        setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            businesses: []
          })
        }), 100)
      )
    )

    render(<BusinessSelectionModal {...defaultProps} />)

    const clothingButton = screen.getByText('Clothing')
    fireEvent.click(clothingButton)

    expect(screen.getByText('Loading businesses...')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.queryByText('Loading businesses...')).not.toBeInTheDocument()
    })
  })

  it('should show error message when API fails', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

    render(<BusinessSelectionModal {...defaultProps} />)

    const clothingButton = screen.getByText('Clothing')
    fireEvent.click(clothingButton)

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument()
    })
  })

  it('should call onClose when Cancel is clicked', () => {
    render(<BusinessSelectionModal {...defaultProps} />)

    const cancelButton = screen.getByText('Cancel')
    fireEvent.click(cancelButton)

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('should reset state when modal closes and reopens', async () => {
    const { rerender } = render(<BusinessSelectionModal {...defaultProps} />)

    const clothingButton = screen.getByText('Clothing')
    fireEvent.click(clothingButton)

    await waitFor(() => {
      expect(screen.getByText('Test Clothing Store')).toBeInTheDocument()
    })

    // Close modal
    rerender(<BusinessSelectionModal {...defaultProps} isOpen={false} />)

    // Reopen modal
    rerender(<BusinessSelectionModal {...defaultProps} isOpen={true} />)

    // Should be back to inventory type selection
    expect(screen.getByText('Select inventory type:')).toBeInTheDocument()
    expect(screen.queryByText('Test Clothing Store')).not.toBeInTheDocument()
  })
})