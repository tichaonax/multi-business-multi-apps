import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UniversalInventoryForm } from '@/components/universal/inventory/universal-inventory-form';

// Mock fetch globally
global.fetch = jest.fn();

// Mock the SupplierSelector and LocationSelector components
jest.mock('@/components/suppliers/supplier-selector', () => ({
  SupplierSelector: ({ value, onChange }) => (
    <div data-testid="supplier-selector">
      <select
        data-testid="supplier-select"
        value={value || ''}
        onChange={(e) => onChange(e.target.value || null)}
      >
        <option value="">Select supplier...</option>
        <option value="supplier-1">Test Supplier</option>
      </select>
    </div>
  )
}));

jest.mock('@/components/locations/location-selector', () => ({
  LocationSelector: ({ value, onChange }) => (
    <div data-testid="location-selector">
      <select
        data-testid="location-select"
        value={value || ''}
        onChange={(e) => onChange(e.target.value || null)}
      >
        <option value="">Select location...</option>
        <option value="location-1">Test Location</option>
      </select>
    </div>
  )
}));

describe('UniversalInventoryForm Component Tests', () => {
  const mockProps = {
    businessId: 'test-business',
    businessType: 'clothing',
    onCancel: jest.fn(),
    onSubmit: jest.fn(),
    isOpen: true,
    mode: 'create'
  };

  const mockCategoriesResponse = {
    categories: [
      {
        id: 'cat-1',
        name: 'T-Shirts',
        emoji: '👕',
        color: 'blue',
        subcategories: [
          { id: 'sub-1', name: 'Cotton T-Shirts', emoji: '👕', displayOrder: 1 },
          { id: 'sub-2', name: 'Polyester T-Shirts', emoji: '👕', displayOrder: 2 }
        ]
      },
      {
        id: 'cat-2',
        name: 'Pants',
        emoji: '👖',
        color: 'green',
        subcategories: [
          { id: 'sub-3', name: 'Jeans', emoji: '👖', displayOrder: 1 }
        ]
      }
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockCategoriesResponse)
    });
  });

  describe('Component Rendering', () => {
    it('renders the form with basic fields', () => {
      render(<UniversalInventoryForm {...mockProps} />);

      expect(screen.getByText('Add New Inventory Item')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter item name')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter SKU code')).toBeInTheDocument();
      expect(screen.getByText('Category *')).toBeInTheDocument();
      expect(screen.getByText('Subcategory (Optional)')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Create Item')).toBeInTheDocument();
    });

    it('renders in edit mode with correct title', () => {
      render(<UniversalInventoryForm {...mockProps} mode="edit" />);

      expect(screen.getByText('Edit Inventory Item')).toBeInTheDocument();
      expect(screen.getByText('Update Item')).toBeInTheDocument();
    });

    it('renders business-specific fields for clothing', () => {
      render(<UniversalInventoryForm {...mockProps} />);

      expect(screen.getByText('Clothing-Specific Fields')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Brand name')).toBeInTheDocument();
      expect(screen.getByText('Season')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Cotton, Polyester, etc.')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Comma-separated (e.g., XS, S, M, L, XL)')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Comma-separated (e.g., Red, Blue, Black)')).toBeInTheDocument();
    });

    it('renders business-specific fields for restaurant', () => {
      render(<UniversalInventoryForm {...mockProps} businessType="restaurant" />);

      expect(screen.getByText('Restaurant-Specific Fields')).toBeInTheDocument();
      expect(screen.getByText('Storage Temperature')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Days until expiration')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Prep time in minutes')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Comma-separated list (e.g., Dairy, Gluten, Nuts)')).toBeInTheDocument();
    });
  });

  describe('Category and Subcategory Functionality', () => {
    it('fetches and displays categories with emojis on mount', async () => {
      render(<UniversalInventoryForm {...mockProps} />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/inventory/test-business/categories');
      });

      expect(screen.getByText('Select category...')).toBeInTheDocument();

      // Wait for categories to load
      await waitFor(() => {
        expect(screen.getByText('👕 T-Shirts')).toBeInTheDocument();
        expect(screen.getByText('👖 Pants')).toBeInTheDocument();
      });
    });

    it('displays subcategories when category is selected', async () => {
      render(<UniversalInventoryForm {...mockProps} />);

      // Wait for categories to load
      await waitFor(() => {
        expect(screen.getByText('👕 T-Shirts')).toBeInTheDocument();
      });

      const categorySelect = screen.getByDisplayValue('Select category...');
      fireEvent.change(categorySelect, { target: { value: 'cat-1' } });

      // Wait for subcategories to appear
      await waitFor(() => {
        expect(screen.getByText('👕 Cotton T-Shirts')).toBeInTheDocument();
        expect(screen.getByText('👕 Polyester T-Shirts')).toBeInTheDocument();
      });

      const subcategorySelect = screen.getByDisplayValue('No subcategory');
      expect(subcategorySelect).not.toBeDisabled();
    });

    it('resets subcategory when category changes', async () => {
      render(<UniversalInventoryForm {...mockProps} />);

      // Wait for categories to load
      await waitFor(() => {
        expect(screen.getByText('👕 T-Shirts')).toBeInTheDocument();
      });

      // Select category and subcategory
      const categorySelect = screen.getByDisplayValue('Select category...');
      fireEvent.change(categorySelect, { target: { value: 'cat-1' } });

      await waitFor(() => {
        expect(screen.getByText('👕 Cotton T-Shirts')).toBeInTheDocument();
      });

      const subcategorySelect = screen.getByDisplayValue('No subcategory');
      fireEvent.change(subcategorySelect, { target: { value: 'sub-1' } });

      // Change category
      fireEvent.change(categorySelect, { target: { value: 'cat-2' } });

      // Subcategory should be reset
      await waitFor(() => {
        expect(screen.getByDisplayValue('No subcategory')).toBeInTheDocument();
      });
    });

    it('shows "No subcategory" option when category has no subcategories', async () => {
      render(<UniversalInventoryForm {...mockProps} />);

      // Wait for categories to load
      await waitFor(() => {
        expect(screen.getByText('👕 T-Shirts')).toBeInTheDocument();
      });

      const categorySelect = screen.getByDisplayValue('Select category...');
      fireEvent.change(categorySelect, { target: { value: 'cat-1' } });

      const subcategorySelect = screen.getByDisplayValue('No subcategory');
      expect(screen.getByText('No subcategory')).toBeInTheDocument();
    });

    it('disables subcategory select when no category is selected', () => {
      render(<UniversalInventoryForm {...mockProps} />);

      const subcategorySelect = screen.getByDisplayValue('No subcategory');
      expect(subcategorySelect).toBeDisabled();
      expect(screen.getByText('Select a category first')).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('shows validation errors for required fields', async () => {
      render(<UniversalInventoryForm {...mockProps} />);

      const submitButton = screen.getByText('Create Item');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Name is required')).toBeInTheDocument();
        expect(screen.getByText('SKU is required')).toBeInTheDocument();
        expect(screen.getByText('Category is required')).toBeInTheDocument();
        expect(screen.getByText('Unit is required')).toBeInTheDocument();
      });
    });

    it('validates numeric fields correctly', async () => {
      render(<UniversalInventoryForm {...mockProps} />);

      const stockInputs = screen.getAllByPlaceholderText('0.00');
      const stockInput = stockInputs[0]; // Current Stock input
      fireEvent.change(stockInput, { target: { value: '-5' } });

      const submitButton = screen.getByText('Create Item');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Stock cannot be negative')).toBeInTheDocument();
      });
    });

    it('clears validation errors when user starts typing', async () => {
      render(<UniversalInventoryForm {...mockProps} />);

      const submitButton = screen.getByText('Create Item');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Name is required')).toBeInTheDocument();
      });

      const nameInput = screen.getByPlaceholderText('Enter item name');
      fireEvent.change(nameInput, { target: { value: 'Test Item' } });

      await waitFor(() => {
        expect(screen.queryByText('Name is required')).not.toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('calls onSubmit with correct data when form is valid', async () => {
      render(<UniversalInventoryForm {...mockProps} />);

      // Wait for categories to load
      await waitFor(() => {
        expect(screen.getByText('👕 T-Shirts')).toBeInTheDocument();
      });

      // Fill required fields
      fireEvent.change(screen.getByPlaceholderText('Enter item name'), { target: { value: 'Test Item' } });
      fireEvent.change(screen.getByPlaceholderText('Enter SKU code'), { target: { value: 'TEST-001' } });
      fireEvent.change(screen.getByDisplayValue('Select category...'), { target: { value: 'cat-1' } });
      fireEvent.change(screen.getByPlaceholderText('lbs, each, gallons, etc.'), { target: { value: 'each' } });
      const numericInputs = screen.getAllByPlaceholderText('0.00');
      fireEvent.change(numericInputs[0], { target: { value: '10' } }); // Current Stock
      fireEvent.change(numericInputs[1], { target: { value: '15.99' } }); // Cost Price

      const submitButton = screen.getByText('Create Item');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockProps.onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            businessId: 'test-business',
            businessType: 'clothing',
            name: 'Test Item',
            sku: 'TEST-001',
            categoryId: 'cat-1',
            subcategoryId: '',
            unit: 'each',
            currentStock: 10,
            costPrice: 15.99,
            sellPrice: 0,
            isActive: true
          })
        );
      });
    });

    it('includes subcategory in submission when selected', async () => {
      render(<UniversalInventoryForm {...mockProps} />);

      // Wait for categories to load
      await waitFor(() => {
        expect(screen.getByText('👕 T-Shirts')).toBeInTheDocument();
      });

      // Fill required fields including subcategory
      fireEvent.change(screen.getByPlaceholderText('Enter item name'), { target: { value: 'Test Item' } });
      fireEvent.change(screen.getByPlaceholderText('Enter SKU code'), { target: { value: 'TEST-001' } });
      fireEvent.change(screen.getByDisplayValue('Select category...'), { target: { value: 'cat-1' } });

      // Wait for subcategories to load
      await waitFor(() => {
        expect(screen.getByText('👕 Cotton T-Shirts')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByDisplayValue('No subcategory'), { target: { value: 'sub-1' } });
      fireEvent.change(screen.getByPlaceholderText('lbs, each, gallons, etc.'), { target: { value: 'each' } });
      const numericInputs = screen.getAllByPlaceholderText('0.00');
      fireEvent.change(numericInputs[0], { target: { value: '10' } }); // Current Stock
      fireEvent.change(numericInputs[1], { target: { value: '15.99' } }); // Cost Price

      const submitButton = screen.getByText('Create Item');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockProps.onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            subcategoryId: 'sub-1'
          })
        );
      });
    });

    it('prevents submission when form is invalid', async () => {
      render(<UniversalInventoryForm {...mockProps} />);

      const submitButton = screen.getByText('Create Item');
      fireEvent.click(submitButton);

      // onSubmit should not be called
      expect(mockProps.onSubmit).not.toHaveBeenCalled();
    });
  });

  describe('SKU Scanner', () => {
    it('opens SKU scanner modal when scan button is clicked', () => {
      render(<UniversalInventoryForm {...mockProps} />);

      const scanButton = screen.getByTitle('Scan SKU');
      fireEvent.click(scanButton);

      expect(screen.getByText('📱 Scan SKU')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Scan or enter SKU...')).toBeInTheDocument();
    });

    it('applies scanned SKU value', () => {
      render(<UniversalInventoryForm {...mockProps} />);

      const scanButton = screen.getByTitle('Scan SKU');
      fireEvent.click(scanButton);

      const scanInput = screen.getByPlaceholderText('Scan or enter SKU...');
      fireEvent.change(scanInput, { target: { value: 'SCANNED-123' } });

      const applyButton = screen.getByText('Apply');
      fireEvent.click(applyButton);

      expect(screen.getByDisplayValue('SCANNED-123')).toBeInTheDocument();
      expect(screen.queryByText('📱 Scan SKU')).not.toBeInTheDocument();
    });

    it('handles Enter key in SKU scanner', () => {
      render(<UniversalInventoryForm {...mockProps} />);

      const scanButton = screen.getByTitle('Scan SKU');
      fireEvent.click(scanButton);

      const scanInput = screen.getByPlaceholderText('Scan or enter SKU...');
      fireEvent.change(scanInput, { target: { value: 'ENTER-456' } });
      fireEvent.keyPress(scanInput, { key: 'Enter', code: 'Enter' });

      expect(screen.getByDisplayValue('ENTER-456')).toBeInTheDocument();
    });
  });

  describe('Edit Mode', () => {
    const editItem = {
      id: 'item-1',
      businessId: 'test-business',
      businessType: 'clothing',
      name: 'Existing Item',
      sku: 'EXIST-001',
      categoryId: 'cat-1',
      subcategoryId: 'sub-1',
      unit: 'each',
      currentStock: 25,
      costPrice: 19.99,
      sellPrice: 29.99,
      isActive: true,
      attributes: {
        brand: 'Test Brand',
        season: 'summer'
      }
    };

    it('pre-populates form with item data', () => {
      render(<UniversalInventoryForm {...mockProps} mode="edit" item={editItem} />);

      expect(screen.getByDisplayValue('Existing Item')).toBeInTheDocument();
      expect(screen.getByDisplayValue('EXIST-001')).toBeInTheDocument();
      expect(screen.getByDisplayValue('25')).toBeInTheDocument();
      expect(screen.getByDisplayValue('19.99')).toBeInTheDocument();
      expect(screen.getByDisplayValue('29.99')).toBeInTheDocument();
    });

    it('loads correct subcategories when editing item with category', async () => {
      render(<UniversalInventoryForm {...mockProps} mode="edit" item={editItem} />);

      // Wait for categories and subcategories to load
      await waitFor(() => {
        expect(screen.getByText('👕 Cotton T-Shirts')).toBeInTheDocument();
      });

      const subcategorySelect = screen.getByDisplayValue('👕 Cotton T-Shirts');
      expect(subcategorySelect).toHaveValue('sub-1');
    });
  });

  describe('Modal Behavior', () => {
    it('does not render when isOpen is false', () => {
      render(<UniversalInventoryForm {...mockProps} isOpen={false} />);

      expect(screen.queryByText('Add New Inventory Item')).not.toBeInTheDocument();
    });

    it('calls onCancel when cancel button is clicked', () => {
      render(<UniversalInventoryForm {...mockProps} />);

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(mockProps.onCancel).toHaveBeenCalled();
    });

    it('calls onCancel when close button is clicked', () => {
      render(<UniversalInventoryForm {...mockProps} />);

      const closeButton = screen.getByLabelText('Close');
      fireEvent.click(closeButton);

      expect(mockProps.onCancel).toHaveBeenCalled();
    });
  });
});