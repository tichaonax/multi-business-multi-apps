'use client'

import { useState, useEffect, useRef } from 'react'
import { UniversalProduct } from './product-card'

interface BarcodeScannerProps {
  onProductScanned: (product: UniversalProduct, variantId?: string) => void
  businessId: string
  showScanner?: boolean
  onToggleScanner?: () => void
  /** Minimum length of barcode before triggering a lookup (default: 4) */
  minBarcodeLength?: number
  /** Debounce window (ms) to coalesce rapid triggers into one lookup (default: 300) */
  lookupDebounceMs?: number
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
  onToggleScanner,
  minBarcodeLength,
  lookupDebounceMs
}: BarcodeScannerProps) {
  const [barcodeInput, setBarcodeInput] = useState('')
  const [lastScannedBarcode, setLastScannedBarcode] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scanBuffer, setScanBuffer] = useState('')
  const [inputFocused, setInputFocused] = useState(false)
  const [lastRawEvent, setLastRawEvent] = useState<string | null>(null)
  // Use refs for high-frequency mutable values to avoid re-render churn
  const scanBufferRef = useRef('')
  const lastKeyTimeRef = useRef(0)
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  // Abort controller for in-flight fetches so we can cancel redundant requests
  const fetchControllerRef = useRef<AbortController | null>(null)
  // Deduping last queried barcode to avoid repeated API calls for same code
  const lastQueriedBarcodeRef = useRef<string | null>(null)
  const lastQueriedAtRef = useRef<number>(0)
  // Scheduled/debounce lookup to coalesce multiple triggers into one API call
  const scheduledLookupRef = useRef<NodeJS.Timeout | null>(null)
  const scheduledBarcodeRef = useRef<string | null>(null)
  // minBarcodeLength and lookupDebounceMs are optional props; fall back to defaults below

  // Local show state fallback when parent does not provide onToggleScanner
  const [internalShow, setInternalShow] = useState<boolean>(showScanner)
  useEffect(() => {
    // keep internal in sync if parent is controlling
    setInternalShow(showScanner)
  }, [showScanner])

  const effectiveShow = typeof onToggleScanner === 'function' ? showScanner : internalShow
  const toggleScanner = () => {
    if (typeof onToggleScanner === 'function') {
      onToggleScanner()
    } else {
      setInternalShow((s) => !s)
    }
  }

  // Debug logging
  useEffect(() => {
    // component mounted
    if (effectiveShow && typeof document !== 'undefined') {
      try {
        // intentionally no-op: avoid noisy debug logs in production
      } catch (err) {}
    }
  }, [effectiveShow, businessId])

  // Auto-focus input when scanner becomes visible
  useEffect(() => {
    if (effectiveShow && inputRef.current) {
      inputRef.current.focus()
    }
  }, [effectiveShow])

  // Global keyboard listener for barcode scanner (stable handler using refs)
  useEffect(() => {
    if (!effectiveShow) return

    const KEY_GAP_THRESHOLD = 80 // ms between keys to consider as continuous scan
  const COMPLETE_DELAY = 150

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ignore keys typed into inputs/textareas/contenteditable to avoid double-handling
      // but allow if the target is our scanner input (so hardware that focuses the input still works)
      const target = e.target as HTMLElement | null
      let isTargetOurInput = false
      if (target && inputRef.current) {
        isTargetOurInput = target === inputRef.current
      }
      if (target) {
        const tag = target.tagName
        const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || (target as any).isContentEditable
        if (isInput && !isTargetOurInput) return
      }

      const now = Date.now()
      const timeDiff = now - lastKeyTimeRef.current
      const isChar = e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey

      if (isChar) {
        // If keys are close together or we've already started a buffer, append
        if (timeDiff < KEY_GAP_THRESHOLD || scanBufferRef.current.length > 0) {
          scanBufferRef.current += e.key
        } else {
          // start a new buffer
          scanBufferRef.current = e.key
        }

        // Mirror buffer to state for UI
        setScanBuffer(scanBufferRef.current)
        lastKeyTimeRef.current = now

        // reset timeout
        if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current)
        scanTimeoutRef.current = setTimeout(() => {
          const buf = scanBufferRef.current
          scanBufferRef.current = ''
          setScanBuffer('')
          const effectiveMin = typeof minBarcodeLength === 'number' ? minBarcodeLength : 4
          if (buf.length >= effectiveMin) {
            handleBarcodeInput(buf.trim())
          }
        }, COMPLETE_DELAY)
      } else if (e.key === 'Enter' && scanBufferRef.current.length > 0) {
        if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current)
        const buf = scanBufferRef.current
        scanBufferRef.current = ''
        setScanBuffer('')
        handleBarcodeInput(buf.trim())
      }
    }

    // Also attach capture-phase listeners to surface events that may be intercepted
    const handleCaptureKey = (e: KeyboardEvent) => {
      try {
        setLastRawEvent(`key:${e.key} code:${e.code} target:${(e.target as HTMLElement)?.tagName}`)
      } catch (err) {}
    }

    const handleDocInput = (e: Event) => {
      try {
        const val = (e.target as HTMLInputElement)?.value
        setLastRawEvent(`input target:${(e.target as HTMLElement)?.tagName} valueLen:${val?.length || 0}`)
      } catch (err) {}
    }

    const handleDocPaste = (e: ClipboardEvent) => {
      try {
        const pasted = (e.clipboardData || (window as any).clipboardData)?.getData('text') || ''
        setLastRawEvent(`paste:${pasted.slice(0,50)}`)
      } catch (err) {}
    }

    document.addEventListener('keydown', handleCaptureKey, true)
    document.addEventListener('input', handleDocInput, true)
    document.addEventListener('paste', handleDocPaste, true)

    document.addEventListener('keydown', handleGlobalKeyDown)
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown)
      document.removeEventListener('keydown', handleCaptureKey, true)
      document.removeEventListener('input', handleDocInput, true)
      document.removeEventListener('paste', handleDocPaste, true)
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current)
        scanTimeoutRef.current = null
      }
    }
  }, [effectiveShow])

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
  if ((businessId && businessId.includes('grocery')) || (typeof window !== 'undefined' && window.location.pathname.includes('grocery'))) {
      return {
        ...baseMappings,
        '1234567890123': { productId: 'grocery-banana', variantId: 'fresh' },
        '1234567890124': { productId: 'grocery-apple', variantId: 'red' },
        '1234567890125': { productId: 'grocery-milk', variantId: '2-percent' },
        '1234567890126': { productId: 'grocery-bread', variantId: 'whole-wheat' },
        '1234567890127': { productId: 'grocery-cheese', variantId: 'cheddar' },
      }
    }

  if ((businessId && businessId.includes('clothing')) || (typeof window !== 'undefined' && window.location.pathname.includes('clothing'))) {
      return {
        ...baseMappings,
        '1234567890123': { productId: 'clothing-tshirt', variantId: 'medium-black' },
        '1234567890124': { productId: 'clothing-tshirt', variantId: 'large-black' },
        '1234567890125': { productId: 'clothing-tshirt', variantId: 'medium-white' },
        '1234567890126': { productId: 'clothing-dress', variantId: 'size-8-floral' },
        '1234567890127': { productId: 'clothing-dress', variantId: 'size-10-floral' },
      }
    }

  if ((businessId && businessId.includes('hardware')) || (typeof window !== 'undefined' && window.location.pathname.includes('hardware'))) {
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

  // Schedule a lookup instead of firing immediately so multiple quick triggers
  // (global key buffer + input events) coalesce into a single API call.
  // Accept optional `forceImmediate` to bypass debounce for explicit Enter/submits.
  const handleBarcodeInput = (barcode: string, forceImmediate = false) => {
    const trimmedBarcode = barcode.trim()
    if (!trimmedBarcode) return
  // Scheduling barcode lookup

    // Minimal length to avoid firing API for short/partial inputs
    const effectiveMinLength = typeof minBarcodeLength === 'number' ? minBarcodeLength : 4
    if (trimmedBarcode.length < effectiveMinLength) {
      return
    }

    // If forceImmediate, cancel any scheduled lookup and run lookup now
    const performLookup = async (toLookup: string) => {
      // Dedupe identical queries in a short window to reduce noise
      const now = Date.now()
      if (lastQueriedBarcodeRef.current === toLookup && (now - lastQueriedAtRef.current) < 3000) {
        return
      }

      // Abort any previous in-flight request — we only care about the latest scan
      try {
        if (fetchControllerRef.current) {
          try { fetchControllerRef.current.abort() } catch (e) {}
        }
      } catch (e) {}

      const controller = new AbortController()
      fetchControllerRef.current = controller

      setIsLoading(true)
      setError(null)

    try {
  // Include current businessId in the path so server can scope lookups precisely
  const response = await fetch(`/api/products/by-barcode/${encodeURIComponent(businessId)}/${encodeURIComponent(toLookup)}`, { signal: controller.signal })
        // Record that we queried this barcode (even if 404) so we don't hammer the server
        lastQueriedBarcodeRef.current = toLookup
        lastQueriedAtRef.current = Date.now()

        if (response.ok) {
          const data = await response.json()
          // Support either legacy { success: true, data: { product }} or direct { product: {...} }
          const product = data?.data?.product ?? data?.product
          const variantId = data?.data?.variantId ?? data?.variantId ?? (product ? product.id : undefined)

          if (product) {
            onProductScanned(product as UniversalProduct, variantId)
            setLastScannedBarcode(toLookup)
            setBarcodeInput('')
            clearLastScanned()
            return
          }
        } else if (response.status !== 404) {
          // Non-404 errors should be surfaced
          const errText = await response.text().catch(() => '')
          // intentionally not logging here to avoid noisy client logs
        }

        // Fallback to demo mapping if API doesn't find the product
        const demoMapping = getDemoBarcodeMapping(businessId)
        const productMapping = demoMapping[toLookup]

        if (productMapping) {
          // Create a demo product for the mapping
          const demoProduct: UniversalProduct = {
            id: productMapping.productId,
            name: getDemoProductName(productMapping.productId),
            description: `Demo product for barcode ${toLookup}`,
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
          setLastScannedBarcode(toLookup)
          setBarcodeInput('')
          clearLastScanned()
        } else {
          setError(`Product not found for barcode: ${toLookup}`)
          setTimeout(() => setError(null), 5000)
        }
      } catch (err: any) {
        // Ignore aborts triggered by new incoming scans
        if (err?.name === 'AbortError') {
          return
        }
        console.error('📱 Scanner: error during barcode lookup', err)
        setError('Failed to scan barcode')
        setTimeout(() => setError(null), 5000)
      } finally {
        setIsLoading(false)
        fetchControllerRef.current = null
      }
    }

    if (forceImmediate) {
      if (scheduledLookupRef.current) {
        clearTimeout(scheduledLookupRef.current)
        scheduledLookupRef.current = null
      }
      scheduledBarcodeRef.current = null
      void performLookup(trimmedBarcode)
      return
    }

    // Update scheduled barcode: prefer the longer (more complete) value
    if (!scheduledBarcodeRef.current || trimmedBarcode.length >= scheduledBarcodeRef.current.length) {
      scheduledBarcodeRef.current = trimmedBarcode
    }

    if (scheduledLookupRef.current) {
      clearTimeout(scheduledLookupRef.current)
      scheduledLookupRef.current = null
    }

    // Increase debounce window slightly to allow all listeners to finish
    const effectiveDebounce = typeof lookupDebounceMs === 'number' ? lookupDebounceMs : 300
    scheduledLookupRef.current = setTimeout(() => {
      const toLookup = scheduledBarcodeRef.current
      scheduledBarcodeRef.current = null
      scheduledLookupRef.current = null
      if (!toLookup) return
      void performLookup(toLookup)
    }, effectiveDebounce)
  }

  const clearLastScanned = () => {
    setTimeout(() => setLastScannedBarcode(null), 3000)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Debug: log key events received by the input
  // input keydown received

    if (e.key === 'Enter' || (e as any).keyCode === 13) {
      e.preventDefault()
      // ensure we grab current value (barcodeInput may be stale in some fast-emitting scanners)
      const value = (e.currentTarget && (e.currentTarget as HTMLInputElement).value) || barcodeInput
      handleBarcodeInput(value)
      setBarcodeInput('')
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

  if (!effectiveShow) {
    return (
      <button
        onClick={toggleScanner}
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
          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
            Active
          </span>
        </div>
        <button
          onClick={toggleScanner}
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          Hide Scanner
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-sm text-blue-700 mb-2">
            Focus the input below and scan or type a barcode to add products to your cart.
            <strong> Scanner automatically detects rapid input.</strong>
          </p>
          {scanBuffer && (
            <div className="text-xs text-blue-600 mb-2">
              🔍 Scanning: <code className="bg-blue-100 px-1 rounded">{scanBuffer}</code>
            </div>
          )}
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={scanBuffer || barcodeInput}
              onChange={(e) => {
                const v = e.target.value
                setBarcodeInput(v)
                // clear internal scan buffer when manually typing in field
                scanBufferRef.current = ''
                setScanBuffer('')
              }}
              // onInput fires for input events and some scanners that emulate paste
              onInput={(e) => {
                const v = (e.currentTarget as HTMLInputElement).value
                // Heuristic: if we receive a rapid paste-like input (long string) treat it as a full barcode
                if (v && v.trim().length > 6) {
                  // slight debounce to allow scanner to finish
                  setTimeout(() => {
                    const current = (inputRef.current as HTMLInputElement)?.value || v
                    if (current && current.trim().length > 3) {
                      handleBarcodeInput(current.trim())
                      setBarcodeInput('')
                    }
                  }, 80)
                }
              }}
              onPaste={(e) => {
                const pasted = (e.clipboardData || (window as any).clipboardData)?.getData('text') || ''
                if (pasted && pasted.trim().length > 0) {
                  setTimeout(() => {
                    handleBarcodeInput(pasted.trim())
                    setBarcodeInput('')
                  }, 20)
                }
              }}
              onKeyDown={handleKeyDown}
              placeholder="Scan or enter barcode..."
              className="flex-1 px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              autoFocus
              disabled={isLoading}
            />
            <button
              onClick={() => handleBarcodeInput(scanBuffer || barcodeInput)}
              disabled={!(scanBuffer || barcodeInput).trim() || isLoading}
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
          <div className="mt-2 text-xs text-gray-500">
            💡 <strong>Troubleshooting:</strong> If scanner doesn't work, check that it's configured to send Enter key after scanning, or use manual entry.
          </div>
        </div>
      </div>
    </div>
  )
}