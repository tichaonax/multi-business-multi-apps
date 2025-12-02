import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BarcodeManager } from './barcode-manager'

describe('BarcodeManager', () => {
  const mockOnBarcodesChange = jest.fn()
  const defaultProps = {
    productId: 'test-product',
    businessId: 'test-business',
    barcodes: [],
    onBarcodesChange: mockOnBarcodesChange,
    readOnly: false
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render add barcode button', () => {
    render(<BarcodeManager {...defaultProps} />)
    expect(screen.getByText('+ Add Barcode')).toBeInTheDocument()
  })

  it('should open add barcode modal when add button is clicked', () => {
    render(<BarcodeManager {...defaultProps} />)
    fireEvent.click(screen.getByText('+ Add Barcode'))
    expect(screen.getByText('Add New Barcode')).toBeInTheDocument()
  })

  it('should show scanner when scan button is clicked', () => {
    render(<BarcodeManager {...defaultProps} />)
    fireEvent.click(screen.getByText('+ Add Barcode'))
    fireEvent.click(screen.getByText('📱 Scan'))
    expect(screen.getByText('Barcode Scanner')).toBeInTheDocument()
  })

  it('should populate barcode code field when Enter is pressed in scanner', async () => {
    render(<BarcodeManager {...defaultProps} />)
    fireEvent.click(screen.getByText('+ Add Barcode'))
    fireEvent.click(screen.getByText('📱 Scan'))

    const scannerInput = screen.getByPlaceholderText('Scan barcode here...')
    fireEvent.change(scannerInput, { target: { value: '1234567890123' } })
    fireEvent.keyDown(scannerInput, { key: 'Enter' })

    await waitFor(() => {
      const codeInput = screen.getByDisplayValue('1234567890123')
      expect(codeInput).toBeInTheDocument()
    })
  })

  it('should populate barcode code field when Capture button is clicked', async () => {
    render(<BarcodeManager {...defaultProps} />)
    fireEvent.click(screen.getByText('+ Add Barcode'))
    fireEvent.click(screen.getByText('📱 Scan'))

    const scannerInput = screen.getByPlaceholderText('Scan barcode here...')
    fireEvent.change(scannerInput, { target: { value: '1234567890123' } })
    
    const captureButton = screen.getByText('Capture')
    fireEvent.click(captureButton)

    await waitFor(() => {
      const codeInput = screen.getByDisplayValue('1234567890123')
      expect(codeInput).toBeInTheDocument()
    })
  })

  it('should not render a nested <form> when placed inside a parent form element', async () => {
    // Render BarcodeManager inside a parent <form> to simulate the inventory form case
    const { container } = render(
      <form>
        <BarcodeManager {...defaultProps} />
      </form>
    )

    // Open the modal (simulate the usual use case)
    fireEvent.click(screen.getByText('+ Add Barcode'))

    // There should be no <form> element nested within another <form>
    const nested = container.querySelectorAll('form form')
    expect(nested.length).toBe(0)
  })
})