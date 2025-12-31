# Phase 2: Print Job Form - Product Search Integration

## Changes Required to `src/app/universal/barcode-management/print-jobs/new/page.tsx`

### 1. Add Imports (After line 7)
```typescript
import ProductSearchModal from '@/components/barcode-management/product-search-modal';
import { Package } from 'lucide-react';
```

### 2. Add State Variables (After line 21)
```typescript
const [showProductSearch, setShowProductSearch] = useState(false);
const [selectedProduct, setSelectedProduct] = useState<any>(null);
const [selectedProductVariant, setSelectedProductVariant] = useState<any>(null);
```

### 3. Add Handler Function (After line 227)
```typescript
const handleProductSelect = (product: any, variant?: any) => {
  setSelectedProduct(product);
  setSelectedProductVariant(variant || null);

  // Auto-populate form fields from product
  const price = variant ? variant.price : product.sellPrice;
  const sku = variant ? variant.sku : product.sku;
  const variantName = variant ? variant.name : '';

  setFormData((prev) => ({
    ...prev,
    itemName: product.suggestedTemplateName || product.name,
    barcodeData: product.primaryBarcode?.code || sku,
    productName: product.name,
    price: `$${parseFloat(price).toFixed(2)}`,
    size: variantName,
    // Description from domain or product
    color: product.description || '',
  }));

  toast.push(`Product loaded: ${product.name}${variant ? ` - ${variant.name}` : ''}`, { type: 'success' });
};
```

### 4. Add Product Search Button (After line 400, inside Label Data section)
```typescript
{/* Product Search Button */}
<div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg">
  <div className="flex items-center justify-between">
    <div>
      <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100">
        💡 Quick Fill from Inventory
      </h3>
      <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
        Search your product inventory to automatically populate label fields
      </p>
    </div>
    <button
      type="button"
      onClick={() => setShowProductSearch(true)}
      disabled={!template?.business?.id}
      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
    >
      <Package className="w-4 h-4" />
      Search Products
    </button>
  </div>

  {selectedProduct && (
    <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded border border-blue-200 dark:border-blue-700">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            ✓ Loaded: {selectedProduct.name}
            {selectedProductVariant && ` - ${selectedProductVariant.name}`}
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            SKU: {selectedProductVariant?.sku || selectedProduct.sku} |
            Price: ${parseFloat(selectedProductVariant?.price || selectedProduct.sellPrice).toFixed(2)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setSelectedProduct(null);
            setSelectedProductVariant(null);
          }}
          className="text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
        >
          Clear
        </button>
      </div>
    </div>
  )}

  {!template?.business?.id && (
    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
      Please select a template first to enable product search
    </p>
  )}
</div>
```

### 5. Add Modal Component (Before closing </div> tag, around line 600)
```typescript
{/* Product Search Modal */}
{template?.business?.id && (
  <ProductSearchModal
    isOpen={showProductSearch}
    onClose={() => setShowProductSearch(false)}
    businessId={template.business.id}
    onSelectProduct={handleProductSelect}
    scope="current"
  />
)}
```

## Summary of Changes

**Added:**
- Import for `ProductSearchModal` component
- Import for `Package` icon from lucide-react
- State for modal visibility (`showProductSearch`)
- State for selected product and variant
- `handleProductSelect` handler function
- Product search button in Label Data section
- Selected product display card
- ProductSearchModal component at bottom of page

**Functionality:**
1. User clicks "Search Products" button
2. Modal opens showing product search
3. User searches and selects a product (or variant)
4. Form fields auto-populate:
   - `itemName`: Suggested template name
   - `barcodeData`: Primary barcode or SKU
   - `productName`: Product name
   - `price`: Sell price (formatted)
   - `size`: Variant name (if variant selected)
   - `color`: Product description or domain name
5. User can clear selection and manually edit fields
6. User submits print job as usual

## Testing Checklist
- [ ] Search button appears in Label Data section
- [ ] Button is disabled when no template selected
- [ ] Modal opens when button clicked
- [ ] Can search products by name, SKU, barcode
- [ ] Selecting product auto-populates fields correctly
- [ ] Selecting product variant uses variant data
- [ ] Can clear selected product
- [ ] Form submission works with auto-populated data
- [ ] Toast notification shows on product selection
