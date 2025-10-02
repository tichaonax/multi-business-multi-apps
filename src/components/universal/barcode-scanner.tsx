'use client'

import { useState, useEffect } from 'react'
import { UniversalProduct } from './product-card'

interface BarcodeScannerProps {
  onProductScanned: (product: UniversalProduct, variantId?: string) => void
  businessId: string
  showScanner?: boolean
  onToggleScanner?: () => void
}

interface BarcodeMapping {
  [barcode: string]: {
    productId: string
    variantId?: string
  }
}

export function BarcodeScanner({
  onProductScanned,
  businessId,
  showScanner = false,
  onToggleScanner
}: BarcodeScannerProps) {
  const [barcodeInput, setBarcodeInput] = useState('')
  const [lastScannedBarcode, setLastScannedBarcode] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Demo barcode mappings - in a real implementation, this would come from the database
  const getDemoBarcodeMapping = (businessId: string): BarcodeMapping => {
    // These would normally be fetched from the database for the specific business
    const baseMappings: BarcodeMapping = {
      // Universal demo barcodes
      '1111111111111': { productId: 'demo-product-1' },
      '2222222222222': { productId: 'demo-product-2' },
      '3333333333333': { productId: 'demo-product-3' },
    }

    // Add business-specific demo barcodes based on business type
    if (businessId.includes('grocery') || window?.location?.pathname?.includes('grocery')) {
      return {
        ...baseMappings,
        '1234567890123': { productId: 'grocery-banana', variantId: 'fresh' },
        '1234567890124': { productId: 'grocery-apple', variantId: 'red' },
        '1234567890125': { productId: 'grocery-milk', variantId: '2-percent' },
        '1234567890126': { productId: 'grocery-bread', variantId: 'whole-wheat' },
        '1234567890127': { productId: 'grocery-cheese', variantId: 'cheddar' },
      }
    }

    if (businessId.includes('clothing') || window?.location?.pathname?.includes('clothing')) {
      return {
        ...baseMappings,
        '1234567890123': { productId: 'clothing-tshirt', variantId: 'medium-black' },
        '1234567890124': { productId: 'clothing-tshirt', variantId: 'large-black' },
        '1234567890125': { productId: 'clothing-tshirt', variantId: 'medium-white' },
        '1234567890126': { productId: 'clothing-dress', variantId: 'size-8-floral' },
        '1234567890127': { productId: 'clothing-dress', variantId: 'size-10-floral' },
      }
    }

    if (businessId.includes('hardware') || window?.location?.pathname?.includes('hardware')) {
      return {
        ...baseMappings,
        '1234567890123': { productId: 'hardware-hammer', variantId: '16oz' },
        '1234567890124': { productId: 'hardware-screws', variantId: 'phillips-head' },
        '1234567890125': { productId: 'hardware-paint', variantId: 'white-gallon' },
        '1234567890126': { productId: 'hardware-drill', variantId: 'cordless' },
        '1234567890127': { productId: 'hardware-lumber', variantId: '2x4-8ft' },
      }
    }

    return baseMappings
  }

  const handleBarcodeInput = async (barcode: string) => {
    const trimmedBarcode = barcode.trim()
    if (!trimmedBarcode) return

    setIsLoading(true)
    setError(null)

    try {
      // First, try to find the product via API
      const response = await fetch(`/api/universal/products/barcode/${encodeURIComponent(trimmedBarcode)}?businessId=${businessId}`)

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          onProductScanned(data.data.product, data.data.variantId)
          setLastScannedBarcode(trimmedBarcode)
          setBarcodeInput('')
          clearLastScanned()
          return
        }
      }

      // Fallback to demo mapping if API doesn't find the product
      const demoMapping = getDemoBarcodeMapping(businessId)
      const productMapping = demoMapping[trimmedBarcode]

      if (productMapping) {
        // Create a demo product for the mapping
        const demoProduct: UniversalProduct = {
          id: productMapping.productId,
          name: getDemoProductName(productMapping.productId),
          description: `Demo product for barcode ${trimmedBarcode}`,
          basePrice: getDemoPrice(productMapping.productId),
          businessType: getBusinessTypeFromPath(),
          productType: 'PHYSICAL',
          condition: 'NEW',
          category: {
            id: 'demo-category',
            name: 'Demo Category'
          },
          sku: `SKU-${productMapping.productId}`,
          isActive: true,
          variants: productMapping.variantId ? [{
            id: productMapping.variantId,
            name: getDemoVariantName(productMapping.variantId),
            sku: `SKU-${productMapping.variantId}`,
            price: getDemoPrice(productMapping.productId),
            stockQuantity: 100,
            attributes: getDemoAttributes(productMapping.variantId)
          }] : undefined
        }

        onProductScanned(demoProduct, productMapping.variantId)
        setLastScannedBarcode(trimmedBarcode)
        setBarcodeInput('')
        clearLastScanned()
      } else {
        setError(`Product not found for barcode: ${trimmedBarcode}`)
        setTimeout(() => setError(null), 5000)
      }
    } catch (err) {
      setError('Failed to scan barcode')
      setTimeout(() => setError(null), 5000)
    } finally {
      setIsLoading(false)
    }
  }

  const clearLastScanned = () => {
    setTimeout(() => setLastScannedBarcode(null), 3000)
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleBarcodeInput(barcodeInput)
    }
  }

  const getDemoProductName = (productId: string): string => {
    const nameMap: { [key: string]: string } = {
      'grocery-banana': 'Fresh Bananas',
      'grocery-apple': 'Red Apples',
      'grocery-milk': '2% Milk',
      'grocery-bread': 'Whole Wheat Bread',
      'grocery-cheese': 'Cheddar Cheese',
      'clothing-tshirt': "Men's T-Shirt",
      'clothing-dress': "Women's Dress",
      'hardware-hammer': 'Claw Hammer',
      'hardware-screws': 'Phillips Head Screws',
      'hardware-paint': 'Interior Paint',
      'hardware-drill': 'Cordless Drill',
      'hardware-lumber': '2x4 Lumber'
    }
    return nameMap[productId] || 'Demo Product'
  }

  const getDemoVariantName = (variantId: string): string => {
    const nameMap: { [key: string]: string } = {
      'fresh': 'Fresh',
      'red': 'Red',
      '2-percent': '2% Fat',
      'whole-wheat': 'Whole Wheat',
      'cheddar': 'Cheddar',
      'medium-black': 'Medium, Black',
      'large-black': 'Large, Black',
      'medium-white': 'Medium, White',
      'size-8-floral': 'Size 8, Floral',
      'size-10-floral': 'Size 10, Floral',
      '16oz': '16 oz',
      'phillips-head': 'Phillips Head',
      'white-gallon': 'White, 1 Gallon',
      'cordless': 'Cordless',
      '2x4-8ft': '2x4, 8 feet'
    }
    return nameMap[variantId] || variantId
  }

  const getDemoPrice = (productId: string): number => {
    const priceMap: { [key: string]: number } = {
      'grocery-banana': 1.99,
      'grocery-apple': 2.49,
      'grocery-milk': 3.99,
      'grocery-bread': 2.79,
      'grocery-cheese': 5.99,
      'clothing-tshirt': 24.99,
      'clothing-dress': 49.99,
      'hardware-hammer': 19.99,
      'hardware-screws': 4.99,
      'hardware-paint': 34.99,
      'hardware-drill': 79.99,
      'hardware-lumber': 8.99
    }
    return priceMap[productId] || 9.99
  }

  const getDemoAttributes = (variantId: string): { [key: string]: any } => {
    const attributeMap: { [key: string]: any } = {
      'fresh': { freshness: 'Fresh', origin: 'Local' },
      'red': { color: 'Red', variety: 'Gala' },
      '2-percent': { fatContent: '2%', size: '1 Gallon' },
      'whole-wheat': { type: 'Whole Wheat', size: 'Standard Loaf' },
      'cheddar': { type: 'Cheddar', age: 'Sharp' },
      'medium-black': { size: 'M', color: 'Black' },
      'large-black': { size: 'L', color: 'Black' },
      'medium-white': { size: 'M', color: 'White' },
      'size-8-floral': { size: '8', pattern: 'Floral' },
      'size-10-floral': { size: '10', pattern: 'Floral' },
      '16oz': { weight: '16 oz', type: 'Claw' },
      'phillips-head': { headType: 'Phillips', material: 'Steel' },
      'white-gallon': { color: 'White', size: '1 Gallon' },
      'cordless': { type: 'Cordless', batteryType: 'Li-ion' },
      '2x4-8ft': { dimensions: '2x4', length: '8 feet' }
    }
    return attributeMap[variantId] || {}
  }

  const getBusinessTypeFromPath = (): string => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname
      if (path.includes('/grocery')) return 'grocery'
      if (path.includes('/clothing')) return 'clothing'
      if (path.includes('/hardware')) return 'hardware'
    }
    return 'general'
  }

  const getBusinessSpecificDemoBarcodes = () => {
    const businessType = getBusinessTypeFromPath()

    switch (businessType) {
      case 'grocery':
        return [
          { barcode: '1234567890123', product: 'Fresh Bananas' },
          { barcode: '1234567890124', product: 'Red Apples' },
          { barcode: '1234567890125', product: '2% Milk' },
          { barcode: '1234567890126', product: 'Whole Wheat Bread' },
          { barcode: '1234567890127', product: 'Cheddar Cheese' }
        ]
      case 'clothing':
        return [
          { barcode: '1234567890123', product: "Men's T-Shirt (M, Black)" },
          { barcode: '1234567890124', product: "Men's T-Shirt (L, Black)" },
          { barcode: '1234567890125', product: "Men's T-Shirt (M, White)" },
          { barcode: '1234567890126', product: "Women's Dress (8, Floral)" },
          { barcode: '1234567890127', product: "Women's Dress (10, Floral)" }
        ]
      case 'hardware':
        return [
          { barcode: '1234567890123', product: 'Claw Hammer (16 oz)' },
          { barcode: '1234567890124', product: 'Phillips Head Screws' },
          { barcode: '1234567890125', product: 'Interior Paint (White, 1 Gallon)' },
          { barcode: '1234567890126', product: 'Cordless Drill' },
          { barcode: '1234567890127', product: '2x4 Lumber (8 feet)' }
        ]
      default:
        return [
          { barcode: '1111111111111', product: 'Demo Product 1' },
          { barcode: '2222222222222', product: 'Demo Product 2' },
          { barcode: '3333333333333', product: 'Demo Product 3' }
        ]
    }
  }

  if (!showScanner) {
    return (
      <button
        onClick={onToggleScanner}
        className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
      >
        📱 Show Barcode Scanner
      </button>
    )
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">📱</span>
          <h3 className="font-semibold text-blue-900">Universal Barcode Scanner</h3>
        </div>
        {onToggleScanner && (
          <button
            onClick={onToggleScanner}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            Hide Scanner
          </button>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-sm text-blue-700 mb-2">
            Focus the input below and scan or type a barcode to add products to your cart
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Scan or enter barcode..."
              className="flex-1 px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              autoFocus
              disabled={isLoading}
            />
            <button
              onClick={() => handleBarcodeInput(barcodeInput)}
              disabled={!barcodeInput.trim() || isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Scanning...' : 'Add'}
            </button>
          </div>
        </div>

        {lastScannedBarcode && (
          <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-green-600">✅</span>
              <span className="text-sm text-green-800">
                Successfully scanned: <code className="bg-green-100 px-2 py-1 rounded">{lastScannedBarcode}</code>
              </span>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-red-600">❌</span>
              <span className="text-sm text-red-800">{error}</span>
            </div>
          </div>
        )}

        <div className="bg-gray-50 p-3 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Demo Barcodes for Testing:</h4>
          <div className="grid grid-cols-1 gap-1 text-xs text-gray-600">
            {getBusinessSpecificDemoBarcodes().map(({ barcode, product }) => (
              <div key={barcode} className="flex justify-between">
                <code className="bg-gray-100 px-1 rounded">{barcode}</code>
                <span>{product}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}