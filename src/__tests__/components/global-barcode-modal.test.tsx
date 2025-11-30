import React from 'react'
import { renderWithProviders as render, screen, fireEvent, waitFor, act } from '../../../__tests__/helpers/render-with-providers'
import { GlobalBarcodeModal } from '../../components/global/global-barcode-modal'

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
  getGlobalBarcodeScanningAccess: jest.fn(),
  canStockInventoryFromModal: jest.fn()
}))

// Mock global barcode service
jest.mock('../../lib/services/global-barcode-service', () => ({
  globalBarcodeService: {
    emitBarcodeEvent: jest.fn()
  }
}))

// Mock business selection modal
jest.mock('../../components/global/business-selection-modal', () => ({
  BusinessSelectionModal: ({ isOpen, onClose, onBusinessSelected }: any) => (
    isOpen ? (
      <div data-testid="business-selection-modal">
        <button onClick={onClose}>Close Business Modal</button>
        <button onClick={() => onBusinessSelected('test-business', 'clothing')}>
          Select Business
        </button>
      </div>
    ) : null
  )
}))

// Mock fetch
global.fetch = jest.fn()

describe('GlobalBarcodeModal', () => {
  const mockOnClose = jest.fn()
  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    barcode: '1234567890123',
    confidence: 'high' as const
  }

  beforeEach(() => {
    jest.clearAllMocks()
    // Mock permission checks
    const mockPermissionUtils = require('../../lib/permission-utils')
    mockPermissionUtils.getGlobalBarcodeScanningAccess.mockReturnValue({
      canScan: true,
      canViewAcrossBusinesses: true,
      accessLevel: 'full'
    })
    mockPermissionUtils.canStockInventoryFromModal.mockReturnValue(true)

    // Mock successful inventory lookup
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: {
          businesses: [
            {
              businessId: 'business-1',
              businessName: 'Test Store',
              businessType: 'clothing',
              stockQuantity: 10,
              price: 29.99,
              hasAccess: true
            }
          ]
        }
      })
    })
  })

  it('should render modal when isOpen is true', () => {
    render(<GlobalBarcodeModal {...defaultProps} />)
    expect(screen.getByText('Product Found')).toBeInTheDocument()
    expect(screen.getByText('1234567890123')).toBeInTheDocument()
  })

  it('should not render modal when isOpen is false', () => {
    render(<GlobalBarcodeModal {...defaultProps} isOpen={false} />)
    expect(screen.queryByText('Product Found')).not.toBeInTheDocument()
  })

  it('should show barcode and confidence information', () => {
    render(<GlobalBarcodeModal {...defaultProps} />)
    expect(screen.getByText('1234567890123')).toBeInTheDocument()
    expect(screen.getByText('high confidence')).toBeInTheDocument()
  })

  it('should lookup barcode on mount when modal opens', async () => {
    render(<GlobalBarcodeModal {...defaultProps} />)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/global/inventory-lookup/1234567890123')
    })
  })

  it('should show loading state while looking up barcode', () => {
    render(<GlobalBarcodeModal {...defaultProps} />)
    expect(screen.getByText('Looking up product...')).toBeInTheDocument()
  })

  it('should display business information when lookup succeeds', async () => {
    await act(async () => {
      render(<GlobalBarcodeModal {...defaultProps} />)
    })

    await waitFor(() => {
      expect(screen.getByText('Test Store')).toBeInTheDocument()
      expect(screen.getByText('Stock: 10')).toBeInTheDocument()
      expect(screen.getByText('Price: $29.99')).toBeInTheDocument()
    })
  })

  it('should show "Product Not Found" when no businesses returned', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: { businesses: [] }
      })
    })

    render(<GlobalBarcodeModal {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Product Not Found')).toBeInTheDocument()
      expect(screen.getByText('⚠️ Product not found in any business.')).toBeInTheDocument()
    })
  })

  it('should show "Add to Inventory" button when product not found and user has permission', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: { businesses: [] }
      })
    })

    render(<GlobalBarcodeModal {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('📦 Add to Inventory')).toBeInTheDocument()
    })
  })

  it('should not show "Add to Inventory" button when user lacks permission', async () => {
    const mockPermissionUtils = require('../../lib/permission-utils')
    mockPermissionUtils.canStockInventoryFromModal.mockReturnValue(false)

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: { businesses: [] }
      })
    })

    render(<GlobalBarcodeModal {...defaultProps} />)

    await waitFor(() => {
      expect(screen.queryByText('📦 Add to Inventory')).not.toBeInTheDocument()
    })
  })

  it('should open business selection modal when "Add to Inventory" is clicked', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: { businesses: [] }
      })
    })

    render(<GlobalBarcodeModal {...defaultProps} />)

    await waitFor(() => {
      const addButton = screen.getByText('📦 Add to Inventory')
      fireEvent.click(addButton)
    })

    expect(screen.getByTestId('business-selection-modal')).toBeInTheDocument()
  })

  it('should allow custom SKU entry', async () => {
    await act(async () => {
      render(<GlobalBarcodeModal {...defaultProps} />)
    })

    // Wait for initial lookup to complete
    await waitFor(() => {
      expect(screen.getByText('Test Store')).toBeInTheDocument()
    })

    const customInput = screen.getByPlaceholderText('Enter custom SKU or scan new barcode...')
    fireEvent.change(customInput, { target: { value: '9876543210987' } })

    const lookupButton = screen.getByText('Lookup')
    fireEvent.click(lookupButton)

    await waitFor(() => {
      // Should have called fetch twice: once for initial barcode, once for custom SKU
      expect(global.fetch).toHaveBeenCalledWith('/api/global/inventory-lookup/9876543210987')
    })
  })

  it('should reset scan when reset button is clicked', async () => {
    await act(async () => {
      render(<GlobalBarcodeModal {...defaultProps} />)
    })

    // Wait for initial lookup to complete
    await waitFor(() => {
      expect(screen.getByText('Test Store')).toBeInTheDocument()
    })

    const resetButton = screen.getByTitle('Reset and scan again')
    fireEvent.click(resetButton)

    // After reset, barcode should be cleared and no businesses should be shown
    expect(screen.queryByText('Test Store')).not.toBeInTheDocument()
    expect(screen.getByText('Product Not Found')).toBeInTheDocument()
  })

  it('should select business when business card is clicked', async () => {
    render(<GlobalBarcodeModal {...defaultProps} />)

    await waitFor(() => {
      const businessCard = screen.getByText('Test Store').closest('div')
      fireEvent.click(businessCard!)
    })

    await waitFor(() => {
      const selectButton = screen.getByText('Select for POS')
      expect(selectButton).toBeInTheDocument()
    })
  })

  it('should emit barcode event when business is selected for POS', async () => {
    const mockGlobalBarcodeService = require('../../lib/services/global-barcode-service')

    render(<GlobalBarcodeModal {...defaultProps} />)

    await waitFor(() => {
      const businessCard = screen.getByText('Test Store').closest('div')
      fireEvent.click(businessCard!)
    })

    const selectButton = screen.getByText('Select for POS')
    fireEvent.click(selectButton)

    expect(mockGlobalBarcodeService.globalBarcodeService.emitBarcodeEvent).toHaveBeenCalledWith({
      barcode: '1234567890123',
      businessId: 'business-1',
      confidence: 'high',
      userId: 'test-user'
    })

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('should show error message when barcode lookup fails', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve('Internal server error')
    })

    render(<GlobalBarcodeModal {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Failed to lookup barcode (500). Please try again.')).toBeInTheDocument()
    })
  })

  it('should show permission error when user lacks global barcode scanning access', async () => {
    const mockPermissionUtils = require('../../lib/permission-utils')
    mockPermissionUtils.getGlobalBarcodeScanningAccess.mockReturnValue({
      canScan: false,
      canViewAcrossBusinesses: false,
      accessLevel: 'none'
    })

    render(<GlobalBarcodeModal {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('You do not have permission to use global barcode scanning')).toBeInTheDocument()
    })
  })

  it('should call onClose when close button is clicked', () => {
    render(<GlobalBarcodeModal {...defaultProps} />)

    const closeButton = screen.getByText('✕')
    fireEvent.click(closeButton)

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('should call onClose when Cancel button is clicked', () => {
    render(<GlobalBarcodeModal {...defaultProps} />)

    const cancelButton = screen.getByText('Cancel')
    fireEvent.click(cancelButton)

    expect(mockOnClose).toHaveBeenCalled()
  })
})