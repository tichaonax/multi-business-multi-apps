import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { InventorySubcategoryEditor } from './inventory-subcategory-editor'

describe('InventorySubcategoryEditor', () => {
  const mockOnSuccess = jest.fn()
  const mockOnCancel = jest.fn()
  const defaultProps = {
    category: { id: 'cat-1', name: 'Test', emoji: '🛒', businessType: 'grocery' },
    onSuccess: mockOnSuccess,
    onCancel: mockOnCancel,
    isOpen: true
  }

  beforeEach(() => jest.clearAllMocks())

  it('does not render a nested <form> when placed inside an outer form wrapper', async () => {
    const { container } = render(
      <form>
        <InventorySubcategoryEditor {...defaultProps as any} />
      </form>
    )

    // Ensure that there is no nested form (form inside form)
    const nested = container.querySelectorAll('form form')
    expect(nested.length).toBe(0)
  })
})
