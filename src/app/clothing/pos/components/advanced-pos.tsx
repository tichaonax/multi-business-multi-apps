'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { createPortal } from 'react-dom'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAlert } from '@/components/ui/confirm-modal'
import { useBusinessContext } from '@/components/universal'
import { BarcodeScanner, UniversalProduct } from '@/components/universal'
import { ReceiptPreview } from '@/components/printing/receipt-preview'
import { UnifiedReceiptPreviewModal } from '@/components/receipts/unified-receipt-preview-modal'
import { ReceiptPrintManager } from '@/lib/receipts/receipt-print-manager'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { useToastContext } from '@/components/ui/toast'
import { useGlobalCart } from '@/contexts/global-cart-context'
import { useCustomerDisplaySync } from '@/hooks/useCustomerDisplaySync'
import { SyncMode } from '@/lib/customer-display/sync-manager'
import { CustomerLookup } from '@/components/pos/customer-lookup'
import { AddCustomerModal } from '@/components/customers/add-customer-modal'
import type { ReceiptData } from '@/types/printing'
import { QuickStockFromScanModal } from '@/components/inventory/quick-stock-from-scan-modal'

interface CartItem {
  id: string
  productId: string
  variantId?: string
  name: string
  sku: string
  price: number
  quantity: number
  originalPrice?: number
  discount?: number
  attributes?: {
    size?: string
    color?: string
    condition?: string
    // WiFi token attributes
    isWiFiToken?: boolean
    r710Token?: boolean
    wifiToken?: boolean
    tokenConfigId?: string
    packageName?: string
    description?: string
    [key: string]: any
  }
  product?: UniversalProduct
  variant?: any
  isReturn?: boolean
  returnReason?: string
}

interface PaymentMethod {
  type: 'CASH' | 'CARD' | 'STORE_CREDIT' | 'GIFT_CARD' | 'SPLIT'
  amount: number
  reference?: string
}

interface SupervisorOverride {
  required: boolean
  reason: string
  employeeId?: string
  supervisorId?: string
  timestamp?: string
}

interface ClothingAdvancedPOSProps {
  businessId: string
  employeeId: string
  terminalId?: string
  onOrderComplete?: (orderId: string) => void
}

export function ClothingAdvancedPOS({ businessId, employeeId, terminalId, onOrderComplete }: ClothingAdvancedPOSProps) {
  const { formatCurrency } = useBusinessContext()
  const { currentBusiness } = useBusinessPermissionsContext()
  const { data: session } = useSession()
  const { cart: globalCart, clearCart: clearGlobalCart, addToCart: addToGlobalCart, replaceCart: replaceGlobalCart } = useGlobalCart()
  const customAlert = useAlert()
  const toast = useToastContext()
  const searchParams = useSearchParams()
  const router = useRouter()

  // Full business details (phone, address, etc.) fetched from API — same as restaurant POS
  const [businessDetails, setBusinessDetails] = useState<any>(null)

  // Ref-based guard to prevent duplicate print calls
  const printInFlightRef = useRef(false)
  const [cart, setCart] = useState<CartItem[]>([])
  // Always-current ref so async callbacks (barcode scanner, event listeners) never
  // read a stale cart snapshot from a captured closure
  const cartRef = useRef<CartItem[]>([])
  const [mode, setMode] = useState<'sale' | 'return' | 'exchange'>('sale')
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [supervisorOverride, setSupervisorOverride] = useState<SupervisorOverride | null>(null)
  const [loading, setLoading] = useState(false)
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed' | 'none'>('none')
  const [discountValue, setDiscountValue] = useState(0)
  const [customerInfo, setCustomerInfo] = useState<{
    id: string
    customerNumber: string
    name: string
    email?: string
    phone?: string
    customerType: string
  } | null>(() => {
    if (typeof window === 'undefined') return null
    try {
      const saved = localStorage.getItem(`pos-customer-${businessId}`)
      return saved ? JSON.parse(saved) : null
    } catch { return null }
  })
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showSupervisorModal, setShowSupervisorModal] = useState(false)
  const [printReceipt, setPrintReceipt] = useState(true)
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false)
  const [quickStockBarcode, setQuickStockBarcode] = useState<string | null>(null)
  const [quickStockExistingProduct, setQuickStockExistingProduct] = useState<{ id: string; name: string; variantId?: string } | null>(null)
  const [autoAddProcessed, setAutoAddProcessed] = useState(false)
  const [showReceiptPreview, setShowReceiptPreview] = useState(false)
  const [completedOrderReceipt, setCompletedOrderReceipt] = useState<ReceiptData | null>(null)
  const [defaultPrinter, setDefaultPrinter] = useState<{ id: string; name: string } | null>(null)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'CASH' | 'CARD' | 'STORE_CREDIT' | 'GIFT_CARD' | 'ECOCASH'>('CASH')
  const [ecocashTxCode, setEcocashTxCode] = useState('')
  const [cashTendered, setCashTendered] = useState('')

  // Applied coupon (synced from mini-cart via localStorage + custom events)
  const [appliedCoupon, setAppliedCoupon] = useState<{
    id: string
    code: string
    discountAmount: number
    customerPhone: string
  } | null>(null)

  // Product data loaded from database
  const [quickAddProducts, setQuickAddProducts] = useState<any[]>([])
  const [productsLoading, setProductsLoading] = useState(false)
  const [productSearchTerm, setProductSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searchLoading, setSearchLoading] = useState(false)

  // Browse tab: 'quickadd' | 'bales'
  const [browseTab, setBrowseTab] = useState<'quickadd' | 'bales'>('quickadd')
  const [bales, setBales] = useState<any[]>([])
  const [balesLoading, setBalesLoading] = useState(false)
  const [baleSearch, setBaleSearch] = useState('')

  // Pinned quick-add products (persisted in localStorage)
  const [pinnedProductIds, setPinnedProductIds] = useState<Set<string>>(new Set())

  // Business tax configuration
  const [businessConfig, setBusinessConfig] = useState<{
    taxIncludedInPrice: boolean
    taxRate: number
    taxLabel: string
  }>({
    taxIncludedInPrice: true,
    taxRate: 0,
    taxLabel: 'Tax'
  })

  // Customer Display Sync (only if terminalId is provided)
  const { send: sendToDisplay } = useCustomerDisplaySync({
    businessId,
    terminalId: terminalId || '',
    mode: SyncMode.BROADCAST, // Force BroadcastChannel for same-origin communication
    autoConnect: !!terminalId,
    onError: (error) => console.error('[Customer Display] Sync error:', error)
  })

  // Broadcast cart state to customer display
  const broadcastCartState = (cartItems: CartItem[]) => {
    if (!terminalId) return // Skip if no terminal ID

    const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity - (item.discount || 0)), 0)

    // Calculate tax based on business config
    let tax: number
    let total: number

    if (businessConfig.taxIncludedInPrice) {
      // Tax is embedded in prices - calculate for display
      tax = subtotal * (businessConfig.taxRate / (100 + businessConfig.taxRate))
      total = subtotal // Total equals subtotal (tax already included)
    } else {
      // Tax is added on top
      tax = subtotal * (businessConfig.taxRate / 100)
      total = subtotal + tax
    }

    sendToDisplay('CART_STATE', {
      items: cartItems.map(item => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        variant: item.attributes?.size && item.attributes?.color
          ? `${item.attributes.size} - ${item.attributes.color}`
          : item.attributes?.size || item.attributes?.color || ''
      })),
      subtotal,
      tax,
      total
    })
  }

  // Keep cartRef in sync with cart state to prevent stale-closure bugs in async callbacks
  useEffect(() => { cartRef.current = cart }, [cart])

  // Fetch full business details (phone, address) for receipt — same pattern as restaurant POS
  useEffect(() => {
    if (!businessId) return
    fetch(`/api/business/${businessId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.business) setBusinessDetails(data.business) })
      .catch(() => {})
  }, [businessId])

  // Fetch business configuration on mount
  useEffect(() => {
    async function fetchBusinessConfig() {
      if (!businessId) return

      try {
        const response = await fetch(`/api/universal/business-config?businessId=${businessId}`)
        if (response.ok) {
          const result = await response.json()
          if (result.success && result.data) {
            setBusinessConfig({
              taxIncludedInPrice: result.data.taxIncludedInPrice ?? true,
              taxRate: result.data.taxRate != null ? result.data.taxRate : 0,
              taxLabel: result.data.taxLabel || 'Tax'
            })
          }
        }
      } catch (error) {
        console.error('Failed to fetch business config:', error)
      }
    }

    fetchBusinessConfig()
  }, [businessId])

  // Load pinned quick-add product IDs from localStorage
  useEffect(() => {
    if (!businessId) return
    try {
      const stored = localStorage.getItem(`pos-quickadd-${businessId}`)
      if (stored) setPinnedProductIds(new Set(JSON.parse(stored)))
    } catch { /* ignore */ }
  }, [businessId])

  // Clear coupon automatically when the cart becomes empty
  // (e.g. user removed the last item — coupon no longer applies to anything)
  useEffect(() => {
    if (cart.length === 0 && appliedCoupon) {
      setAppliedCoupon(null)
      try { localStorage.removeItem(`applied-coupon-${businessId}`) } catch {}
      window.dispatchEvent(new Event('coupon-removed'))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart.length])

  // Listen for coupon-applied / coupon-removed events dispatched by the mini-cart
  // so the POS totals update in real-time without requiring page navigation
  useEffect(() => {
    const handleCouponApplied = (e: Event) => {
      const couponData = (e as CustomEvent).detail
      setAppliedCoupon(couponData)
    }
    const handleCouponRemoved = () => {
      setAppliedCoupon(null)
    }
    window.addEventListener('coupon-applied', handleCouponApplied)
    window.addEventListener('coupon-removed', handleCouponRemoved)
    return () => {
      window.removeEventListener('coupon-applied', handleCouponApplied)
      window.removeEventListener('coupon-removed', handleCouponRemoved)
    }
  }, [])

  // Persist customerInfo to localStorage so Basic POS picks it up on switch
  useEffect(() => {
    if (!businessId) return
    try {
      if (customerInfo) localStorage.setItem(`pos-customer-${businessId}`, JSON.stringify(customerInfo))
      else localStorage.removeItem(`pos-customer-${businessId}`)
    } catch {}
  }, [customerInfo, businessId])

  // Listen for external cart-clear events (e.g. from mini-cart "Clear All" button)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (!detail || detail.businessId !== businessId) return
      setCart([])
      setSupervisorOverride(null)
      setCustomerInfo(null)
      setAppliedCoupon(null)
      try { localStorage.removeItem(`applied-coupon-${businessId}`) } catch {}
      try { localStorage.removeItem(`pos-customer-${businessId}`) } catch {}
    }
    window.addEventListener('pos:cart-cleared', handler)
    return () => window.removeEventListener('pos:cart-cleared', handler)
  }, [businessId])

  // Toggle pin/unpin a product for quick add
  const toggleQuickAdd = (productId: string) => {
    setPinnedProductIds(prev => {
      const next = new Set(prev)
      if (next.has(productId)) next.delete(productId)
      else next.add(productId)
      localStorage.setItem(`pos-quickadd-${businessId}`, JSON.stringify([...next]))
      return next
    })
  }

  // Send page context to customer display so it knows to show cart
  useEffect(() => {
    if (!terminalId) return // Skip if no terminal ID

    sendToDisplay('SET_PAGE_CONTEXT', {
      pageContext: 'pos'
    })
  }, [terminalId, sendToDisplay])

  // Track if cart has been loaded from localStorage to prevent overwriting on mount
  const [cartLoaded, setCartLoaded] = useState(false)
  const hasImportedFromGlobalCart = useRef(false)

  // Cart validation warning — populated when stale/invalid items are found on load
  const [cartValidationWarnings, setCartValidationWarnings] = useState<Array<{ name: string; reason: string }>>([])
  const [showCartWarning, setShowCartWarning] = useState(false)

  // Reset import flag when business changes
  useEffect(() => {
    hasImportedFromGlobalCart.current = false
  }, [businessId])

  // Load cart from localStorage on mount, and merge with global cart if needed
  useEffect(() => {
    if (!businessId || hasImportedFromGlobalCart.current) {
      console.log('[Cart Load] Skipped - businessId:', businessId, 'alreadyImported:', hasImportedFromGlobalCart.current)
      return
    }
    console.log('[Cart Load] Starting cart load for business:', businessId)

    const doLoad = async () => {
      try {
        // Load saved cart from localStorage
        const savedCart = localStorage.getItem(`cart-${businessId}`)
        let existingCart: CartItem[] = []

        if (savedCart) {
          existingCart = JSON.parse(savedCart).map((item: any) => {
            const normalized: any = { ...item }

            // Ensure id exists
            if (!normalized.id) {
              normalized.id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
            }

            // Normalize UniversalPOS format (uses `unitPrice`) into AdvancedPOS format (uses `price`)
            if (normalized.price === undefined && normalized.unitPrice !== undefined) {
              normalized.price = Number(normalized.unitPrice) || 0
            }

            // Extract name from nested product object if missing (Basic POS format)
            if (!normalized.name) {
              normalized.name =
                item.product?.name ||
                item.productName ||
                item.name ||
                'Unknown Item'
            }

            // Extract sku from nested product/variant if missing
            if (!normalized.sku) {
              normalized.sku =
                item.variant?.sku ||
                item.product?.sku ||
                item.sku ||
                normalized.variantId ||
                normalized.productId ||
                ''
            }

            // Extract attributes from nested product if missing (Basic POS stores them in product.attributes)
            if (!normalized.attributes) {
              normalized.attributes = item.product?.attributes || undefined
            }

            return normalized as CartItem
          })
        }

        let finalCart: CartItem[] = existingCart

        // Check if global cart has items to merge
        if (globalCart && globalCart.length > 0) {
          // Convert global cart items to local cart format
          const importedItems: CartItem[] = globalCart.map(item => ({
            id: item.id,
            productId: item.productId,
            variantId: item.variantId,
            name: item.name,
            sku: item.sku,
            price: item.price,
            quantity: item.quantity,
            attributes: item.attributes
          }))

          // Merge carts - global cart is the source of truth for price; avoid doubling quantities
          const mergedCart = [...existingCart]
          importedItems.forEach(newItem => {
            // Match by variantId first, then by productId (covers bale items where variantId may differ)
            const existingIndex = mergedCart.findIndex(item =>
              (newItem.variantId && item.variantId === newItem.variantId) ||
              (!newItem.variantId && item.productId === newItem.productId) ||
              // Bale items: match by baleId attribute or canonical productId
              (newItem.attributes?.baleId && item.attributes?.baleId === newItem.attributes.baleId) ||
              (newItem.productId?.startsWith('bale_') && item.productId === newItem.productId)
            )
            if (existingIndex >= 0) {
              // Item exists in both — always take the fresh price from global cart (localStorage may be stale)
              mergedCart[existingIndex].price = newItem.price
              mergedCart[existingIndex].name = newItem.name
              mergedCart[existingIndex].quantity = Math.max(mergedCart[existingIndex].quantity, newItem.quantity)
            } else {
              // New item from global cart — add it
              mergedCart.push(newItem)
            }
          })

          finalCart = mergedCart
          // Clear global cart after importing to prevent re-merge on next load
          clearGlobalCart()
        }

        // ── Validate cart against DB before loading ──────────────────────────
        if (finalCart.length > 0) {
          try {
            const res = await fetch('/api/pos/validate-cart', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                businessId,
                items: finalCart.map(item => ({
                  id: item.id,
                  productId: item.productId,
                  variantId: item.variantId,
                  name: item.name,
                  quantity: item.quantity,
                  attributes: item.attributes,
                })),
              }),
            })
            if (res.ok) {
              const { valid, invalid } = await res.json()
              if (invalid && invalid.length > 0) {
                const validIds = new Set((valid as CartItem[]).map(v => v.id))
                finalCart = finalCart.filter(item => validIds.has(item.id))
                setCartValidationWarnings(
                  (invalid as Array<{ item: CartItem; reason: string }>).map(({ item, reason }) => ({
                    name: item.name,
                    reason,
                  }))
                )
                setShowCartWarning(true)
              }
            }
          } catch (valErr) {
            console.warn('[Cart Validate] Validation request failed, loading cart as-is:', valErr)
          }
        }

        setCart(finalCart)
        // Mark as imported to prevent re-importing
        hasImportedFromGlobalCart.current = true
      } catch (error) {
        console.error('Failed to load cart from localStorage:', error)
        setCart([]) // Clear cart on error
      } finally {
        setCartLoaded(true)
      }
    }

    doLoad()
  }, [businessId, globalCart, clearGlobalCart])

  // Save cart to localStorage whenever it changes (but only after initial load)
  useEffect(() => {
    if (!businessId || !cartLoaded) return

    try {
      localStorage.setItem(`cart-${businessId}`, JSON.stringify(cart))
      console.log('💾 Cart saved to localStorage:', cart.length, 'items')
    } catch (error) {
      console.error('Failed to save cart to localStorage:', error)
    }
  }, [cart, businessId, cartLoaded])

  // Sync POS cart to global cart to keep mini cart in sync
  useEffect(() => {
    if (!businessId || !cartLoaded) return

    try {
      const globalCartItems = cart.map(item => ({
        id: item.id,
        productId: item.productId,
        variantId: item.variantId!,
        name: item.name,
        sku: item.sku,
        price: item.price,
        quantity: item.quantity,
        attributes: item.attributes,
        imageUrl: item.imageUrl
      }))
      replaceGlobalCart(globalCartItems)
    } catch (error) {
      console.error('❌ [POS] Failed to sync to global cart:', error)
    }
  }, [cart, businessId, cartLoaded, replaceGlobalCart])

  // Broadcast cart state to customer display after cart is loaded
  useEffect(() => {
    if (!businessId || !cartLoaded || !terminalId) return

    // Broadcast the current cart state to customer display
    broadcastCartState(cart)
  }, [cartLoaded, businessId, terminalId])

  // Fetch default printer on component mount
  useEffect(() => {
    async function fetchDefaultPrinter() {
      try {
        const response = await fetch('/api/printers?printerType=receipt&isOnline=true')
        if (response.ok) {
          const data = await response.json()
          const printers = data.printers || []

          // Use first available online receipt printer as default
          if (printers.length > 0) {
            setDefaultPrinter({
              id: printers[0].id,
              name: printers[0].printerName
            })
          }
        }
      } catch (error) {
        console.error('Failed to fetch default printer:', error)
      }
    }

    fetchDefaultPrinter()
  }, [])

  // Load products from database
  const loadProducts = useCallback(async () => {
    if (!currentBusiness?.businessId) {
      return
    }

    setProductsLoading(true)
    try {
      const response = await fetch(
        `/api/universal/products?businessId=${currentBusiness.businessId}&businessType=clothing&includeVariants=true&includeImages=true&isAvailable=true&limit=50`
      )

      if (response.ok) {
        const result = await response.json()

        if (result.success && result.data) {
          // Map API products to QuickAddProduct format
          const productsWithVariants = result.data.filter((p: any) => p.variants && p.variants.length > 0)

          const products = productsWithVariants
            .map((p: any) => {
              const validVariants = p.variants.filter((v: any) => {
                const price = parseFloat(v.price)
                return !isNaN(price) && price > 0
              })

              // Get primary image or first image
              const primaryImage = p.images?.find((img: any) => img.isPrimary) || p.images?.[0]
              const imageUrl = primaryImage?.imageUrl || primaryImage?.url

              return {
                id: p.id,
                name: p.name,
                imageUrl: imageUrl || null,
                category: p.category?.name || '',
                categoryEmoji: p.category?.emoji || '📦',
                variants: validVariants.map((v: any) => ({
                  id: v.id,
                  sku: v.sku,
                  price: parseFloat(v.price),
                  attributes: v.attributes || {},
                  stock: v.stockQuantity || 0
                }))
              }
            })
            .filter((p: any) => p.variants.length > 0) // Remove products with no valid variants

          // Load R710 WiFi tokens and add as products
          let wifiTokenProducts: any[] = []
          try {
            const r710Response = await fetch(`/api/business/${currentBusiness.businessId}/r710-tokens`)
            if (r710Response.ok) {
              const r710Data = await r710Response.json()
              if (r710Data.menuItems && r710Data.menuItems.length > 0) {
                wifiTokenProducts = r710Data.menuItems
                  .filter((item: any) => item.isActive && item.tokenConfig?.isActive)
                  .map((item: any) => {
                    const config = item.tokenConfig
                    return {
                      id: `r710_${config.id}`,
                      name: `📶 ${config.name}`,
                      imageUrl: null,
                      category: 'WiFi Passes',
                      categoryEmoji: '📶',
                      variants: [{
                        id: `r710_variant_${config.id}`,
                        sku: `R710-${config.id.slice(0, 8)}`,
                        price: parseFloat(item.businessPrice || config.basePrice || 0),
                        attributes: {
                          isWiFiToken: true,
                          r710Token: true,
                          tokenConfigId: config.id,
                          packageName: config.name,
                          description: config.description
                        },
                        stock: 999 // R710 tokens are generated on demand
                      }]
                    }
                  })
                console.log(`📶 Loaded ${wifiTokenProducts.length} R710 WiFi token products for clothing POS`)
              }
            }
          } catch (wifiError) {
            console.warn('Failed to load R710 WiFi tokens for clothing POS:', wifiError)
          }

          // Fetch any pinned products that aren't in the initial load (e.g., services)
          let pinnedProducts: any[] = []
          try {
            const stored = localStorage.getItem(`pos-quickadd-${currentBusiness.businessId}`)
            if (stored) {
              const pinnedIds: string[] = JSON.parse(stored)
              const loadedIds = new Set([...wifiTokenProducts, ...products].map((p: any) => p.id))
              const missingIds = pinnedIds.filter(id => !loadedIds.has(id))

              for (const pid of missingIds) {
                try {
                  const pRes = await fetch(`/api/universal/products?productId=${pid}&includeVariants=true&includeImages=true`)
                  if (!pRes.ok) continue
                  const pResult = await pRes.json()
                  if (!pResult.success || !pResult.data?.length) continue

                  const match = pResult.data[0]
                  const validVariants = (match.variants || []).filter((v: any) => {
                    const price = parseFloat(v.price)
                    return !isNaN(price) && price > 0
                  })

                  if (validVariants.length === 0 && match.productType === 'SERVICE' && parseFloat(match.basePrice) > 0) {
                    validVariants.push({
                      id: `svc_${match.id}`,
                      sku: match.sku || match.id,
                      price: parseFloat(match.basePrice),
                      attributes: { isService: true },
                      stock: 999
                    })
                  }

                  if (validVariants.length === 0) continue

                  const primaryImage = match.images?.find((img: any) => img.isPrimary) || match.images?.[0]
                  pinnedProducts.push({
                    id: match.id,
                    name: match.name,
                    imageUrl: primaryImage?.imageUrl || primaryImage?.url || null,
                    category: match.category?.name || '',
                    categoryEmoji: match.category?.emoji || '📦',
                    productType: match.productType,
                    variants: validVariants.map((v: any) => ({
                      id: v.id,
                      sku: v.sku,
                      price: parseFloat(v.price),
                      attributes: v.attributes || {},
                      stock: v.stockQuantity ?? v.stock ?? 999
                    }))
                  })
                } catch (err) {
                  console.warn(`Failed to fetch pinned product ${pid}:`, err)
                }
              }
            }
          } catch { /* ignore localStorage errors */ }

          setQuickAddProducts([...pinnedProducts, ...wifiTokenProducts, ...products].filter(
            p => p.variants.some((v: any) => v.price > 0)
          ))
        }
      }
    } catch (error) {
      console.error('Error loading products:', error)
    } finally {
      setProductsLoading(false)
    }
  }, [currentBusiness?.businessId])

  // Load products on mount and when business changes
  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  // Load bale items eagerly on mount (not just on tab click) so the search box can find them
  useEffect(() => {
    if (!currentBusiness?.businessId) return
    if (bales.length > 0) return // already loaded
    ;(async () => {
      try {
        setBalesLoading(true)
        const res = await fetch(`/api/clothing/bales?businessId=${currentBusiness.businessId}`)
        const data = await res.json()
        if (data.success) setBales(data.data)
      } catch (err) {
        console.error('Failed to load bales for Advanced POS:', err)
      } finally {
        setBalesLoading(false)
      }
    })()
  }, [currentBusiness?.businessId, bales.length])

  // Auto-reload products when window regains focus (e.g., after seeding)
  // DISABLED: This was causing issues when switching between businesses
  // Products are loaded when business changes, so focus reload is unnecessary
  // useEffect(() => {
  //   const handleFocus = () => {
  //     console.log('🔄 Window focused, reloading products...')
  //     loadProducts()
  //   }

  //   window.addEventListener('focus', handleFocus)
  //   return () => window.removeEventListener('focus', handleFocus)
  // }, [loadProducts])

  // Search products with debounce
  useEffect(() => {
    const searchProducts = async () => {
      if (!productSearchTerm.trim() || !currentBusiness?.businessId) {
        setSearchResults([])
        return
      }

      setSearchLoading(true)
      try {
        const searchUrl = `/api/universal/products?businessId=${currentBusiness.businessId}&businessType=clothing&includeVariants=true&includeImages=true&isAvailable=true&search=${encodeURIComponent(productSearchTerm)}&limit=10`
        const response = await fetch(searchUrl)

        if (response.ok) {
          const result = await response.json()

          if (result.success && result.data) {
            // Map API products to same format as quick add products
            const products = result.data
              .map((p: any) => {
                const validVariants = (p.variants || []).filter((v: any) => {
                  const price = parseFloat(v.price)
                  return !isNaN(price) && price > 0
                })

                // For SERVICE products without variants, create a virtual variant from base price
                if (validVariants.length === 0 && p.productType === 'SERVICE' && parseFloat(p.basePrice) > 0) {
                  validVariants.push({
                    id: `svc_${p.id}`,
                    sku: p.sku || p.id,
                    price: parseFloat(p.basePrice),
                    attributes: { isService: true },
                    stock: 999
                  })
                }

                // Get primary image or first image
                const primaryImage = p.images?.find((img: any) => img.isPrimary) || p.images?.[0]
                const imageUrl = primaryImage?.imageUrl || primaryImage?.url

                return {
                  id: p.id,
                  name: p.name,
                  imageUrl: imageUrl || null,
                  category: p.category?.name || '',
                  categoryEmoji: p.category?.emoji || '📦',
                  productType: p.productType,
                  variants: validVariants.map((v: any) => ({
                    id: v.id,
                    sku: v.sku,
                    price: parseFloat(v.price),
                    attributes: v.attributes || {},
                    stock: v.stockQuantity ?? v.stock ?? 999
                  }))
                }
              })
              .filter((p: any) => p.variants.length > 0)

            // Also include WiFi token products that match search term
            const searchLower = productSearchTerm.toLowerCase()
            const matchingWifiTokens = quickAddProducts.filter(p =>
              p.id.startsWith('r710_') && p.name.toLowerCase().includes(searchLower)
            )

            // Also search locally-loaded bales by SKU, batchNumber, or category name
            const matchingBales = bales
              .filter(b =>
                b.sku?.toLowerCase().includes(searchLower) ||
                b.batchNumber?.toLowerCase().includes(searchLower) ||
                b.category?.name?.toLowerCase().includes(searchLower)
              )
              .map(b => ({
                id: `bale_${b.id}`,
                name: `${b.category?.name || 'Bale'} - ${b.batchNumber}`,
                isBale: true,
                baleData: b,
                variants: [] as any[]
              }))

            setSearchResults([...matchingWifiTokens, ...matchingBales, ...products])
          }
        }
      } catch (error) {
        console.error('Error searching products:', error)
      } finally {
        setSearchLoading(false)
      }
    }

    const timer = setTimeout(searchProducts, 500)
    return () => clearTimeout(timer)
  }, [productSearchTerm, currentBusiness?.businessId, quickAddProducts])

  const addToCart = (productId: string, variantId: string, quantity?: number) => {
    // Search in both quick add products and search results
    const product = quickAddProducts.find(p => p.id === productId) || searchResults.find(p => p.id === productId)
    const variant = product?.variants.find(v => v.id === variantId)

    if (!product || !variant) return

    const existingItem = cart.find(item => item.productId === productId && item.variantId === variantId)

    let newCart: CartItem[]
    if (existingItem) {
      newCart = cart.map(item =>
        item.productId === productId && item.variantId === variantId
          ? { ...item, quantity: item.quantity + (quantity || 1) }
          : item
      )
    } else {
      const newItem: CartItem = {
        id: Date.now().toString(),
        productId,
        variantId,
        name: product.name,
        sku: variant.sku,
        price: variant.price,
        quantity: quantity || 1,
        attributes: variant.attributes,
        isReturn: mode === 'return'
      }
      newCart = [...cart, newItem]
    }

    setCart(newCart)
    // Note: Global cart sync happens automatically via useEffect

    // Broadcast updated cart to customer display
    broadcastCartState(newCart)
  }

  // Add a bale item directly to cart
  const addBaleToCart = (bale: any) => {
    const price = parseFloat(bale.unitPrice)
    const baleVariantId = `bale_${bale.id}`
    // Match by baleId attribute OR by the canonical variantId/productId (covers items added via Basic POS)
    const isSameBale = (item: CartItem) =>
      item.attributes?.baleId === bale.id ||
      item.variantId === baleVariantId ||
      item.productId === baleVariantId
    const currentCart = cartRef.current
    const existingItem = currentCart.find(isSameBale)
    let newCart: CartItem[]
    if (existingItem) {
      newCart = currentCart.map(item =>
        isSameBale(item)
          ? { ...item, quantity: item.quantity + 1 }
          : item
      )
    } else {
      const newItem: CartItem = {
        id: Date.now().toString(),
        productId: `bale_${bale.id}`,
        variantId: `bale_${bale.id}`,
        name: `${bale.category?.name || 'Bale'} - ${bale.batchNumber}`,
        sku: bale.sku || bale.batchNumber,
        price,
        quantity: 1,
        attributes: {
          baleId: bale.id,
          isBale: true,
          bogoActive: bale.bogoActive,
          bogoRatio: bale.bogoRatio,
        },
        isReturn: false,
      }
      newCart = [...currentCart, newItem]
    }
    setCart(newCart)
    broadcastCartState(newCart)
  }

  const addToCartFromScanner = (product: any, variantId?: string, quantity: number = 1) => {
    // When no specific variantId is given (product-level barcode), resolve to the
    // first valid variant so the cart item is consistent with quick-add entries
    const effectiveVariantId = variantId ||
      product.variants?.find((v: any) => (parseFloat(v.price) || product.basePrice) > 0)?.id

    const variant = effectiveVariantId
      ? product.variants?.find((v: any) => v.id === effectiveVariantId)
      : undefined
    const unitPrice = variant?.price ?? product.basePrice

    // Use cartRef.current to avoid stale-closure reading an outdated cart snapshot
    const currentCart = cartRef.current
    const existingItem = currentCart.find(item =>
      item.productId === product.id && item.variantId === effectiveVariantId
    )

    let newCart: CartItem[]
    if (existingItem) {
      newCart = currentCart.map(item =>
        item.productId === product.id && item.variantId === effectiveVariantId
          ? { ...item, quantity: item.quantity + quantity }
          : item
      )
    } else {
      const newItem: CartItem = {
        id: Date.now().toString(),
        productId: product.id,
        variantId: effectiveVariantId,
        name: product.name,
        sku: variant?.sku || product.sku || `SKU-${product.id}`,
        price: unitPrice,
        quantity,
        attributes: variant?.attributes || {},
        product,
        variant,
        isReturn: mode === 'return'
      }
      newCart = [...currentCart, newItem]
    }

    setCart(newCart)
    // Broadcast updated cart to customer display
    broadcastCartState(newCart)
  }

  // Listen for pos:add-to-cart dispatched by GlobalBarcodeModal when a product
  // is found in this business while on a POS page. Uses cartRef so the handler
  // never reads a stale cart snapshot regardless of when it was registered.
  useEffect(() => {
    const handler = async (e: Event) => {
      const { productId, variantId } = (e as CustomEvent).detail
      if (!productId) return
      try {
        const res = await fetch(`/api/universal/products/${productId}`)
        if (!res.ok) return
        const data = await res.json()
        if (data) addToCartFromScanner(data, variantId, 1)
      } catch (err) {
        console.error('[Clothing POS] pos:add-to-cart handler error:', err)
      }
    }
    window.addEventListener('pos:add-to-cart', handler)
    return () => window.removeEventListener('pos:add-to-cart', handler)
  // addToCartFromScanner is defined inside the component but stable via cartRef
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const removeFromCart = (itemId: string) => {
    const newCart = cart.filter(item => item.id !== itemId)
    setCart(newCart)
    // Broadcast updated cart to customer display
    broadcastCartState(newCart)
  }

  const updateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(itemId)
      return
    }

    const newCart = cart.map(item =>
      item.id === itemId ? { ...item, quantity: newQuantity } : item
    )
    setCart(newCart)
    // Broadcast updated cart to customer display
    broadcastCartState(newCart)
  }

  const applyDiscount = (itemId: string, discountAmount: number) => {
    // Check if supervisor override is required for discounts > 20%
    const item = cart.find(item => item.id === itemId)
    if (item && (discountAmount / item.price) > 0.20) {
      setSupervisorOverride({
        required: true,
        reason: `Discount over 20% (${((discountAmount / item.price) * 100).toFixed(1)}%) requires supervisor approval`,
        employeeId
      })
      setShowSupervisorModal(true)
      return
    }

    setCart(cart.map(item =>
      item.id === itemId ? { ...item, discount: discountAmount } : item
    ))
  }

  // Auto-add product from query parameters (from barcode scanner navigation)
  useEffect(() => {
    const addProductId = searchParams?.get('addProduct')
    const variantId = searchParams?.get('variantId')
    const queryBusinessId = searchParams?.get('businessId')

    if (addProductId && !autoAddProcessed) {
      setAutoAddProcessed(true)

      // Fetch the product and add it to cart
      const fetchAndAddProduct = async () => {
        try {
          // Use businessId from query params (the business where product was found)
          // Fall back to current businessId if not in query
          const targetBusinessId = queryBusinessId || currentBusiness?.businessId

          if (!targetBusinessId) return

          const response = await fetch(`/api/admin/products/${addProductId}?businessId=${targetBusinessId}`)
          if (!response.ok) {
            console.error('Failed to fetch product for auto-add')
            return
          }

          const data = await response.json()
          if (data.success && data.product) {
            // Add to cart with variant if specified
            addToCartFromScanner(data.product, variantId || undefined, 1)

            // Clean up the URL
            const currentPath = window.location.pathname
            router.replace(currentPath)
          }
        } catch (err) {
          console.error('Error auto-adding product:', err)
        }
      }

      fetchAndAddProduct()
    }
  }, [searchParams, autoAddProcessed, currentBusiness?.businessId, router])

  const handleReturn = (originalOrderId: string, reason: string) => {
    // In a real implementation, this would fetch the original order
    // and add items to cart with return flag
    const returnItem: CartItem = {
      id: Date.now().toString(),
      productId: 'return_prod',
      name: 'Return Item',
      sku: 'RETURN-001',
      price: -25.00, // Negative for return
      quantity: 1,
      isReturn: true,
      returnReason: reason
    }
    setCart([...cart, returnItem])
  }

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => {
      const itemPrice = item.price - (item.discount || 0)
      return sum + (itemPrice * item.quantity)
    }, 0)
  }

  const calculateTax = () => {
    const subtotal = calculateSubtotal()

    // If tax is included in price, don't add additional tax
    if (businessConfig.taxIncludedInPrice) {
      // Calculate the embedded tax amount for display purposes
      // If price includes 8% tax: tax = subtotal * (0.08 / 1.08)
      return subtotal * (businessConfig.taxRate / (100 + businessConfig.taxRate))
    }

    // Tax not included - add tax to subtotal
    return subtotal * (businessConfig.taxRate / 100)
  }

  const calculateTotal = () => {
    const subtotal = calculateSubtotal()
    const tax = calculateTax()

    // If tax is included, total equals subtotal (tax is embedded)
    // If tax is not included, total = subtotal + tax
    const baseTotal = businessConfig.taxIncludedInPrice ? subtotal : subtotal + tax

    // Subtract any coupon applied via the mini-cart
    const couponDiscount = appliedCoupon?.discountAmount || 0
    return Math.max(0, baseTotal - couponDiscount)
  }

  const requiresSupervisorOverride = () => {
    // Check various conditions that require supervisor override
    const hasLargeDiscount = cart.some(item => item.discount && (item.discount / item.price) > 0.20)
    const hasReturn = cart.some(item => item.isReturn)
    const totalAmount = Math.abs(calculateTotal())
    const isLargeTransaction = totalAmount > 500

    return hasLargeDiscount || (hasReturn && totalAmount > 100) || isLargeTransaction
  }

  const processPayment = async () => {
    if (requiresSupervisorOverride() && !supervisorOverride?.supervisorId) {
      setSupervisorOverride({
        required: true,
        reason: 'Transaction requires supervisor approval',
        employeeId
      })
      setShowSupervisorModal(true)
      return
    }

    setLoading(true)
    try {
      // Calculate totals
      const subtotal = calculateSubtotal()
      const tax = calculateTax()
      const total = calculateTotal() // already includes coupon discount
      const itemDiscount = cart.reduce((sum, item) => sum + (item.discount || 0) * item.quantity, 0)
      const couponDiscount = appliedCoupon?.discountAmount || 0
      const discount = itemDiscount + couponDiscount

      // Compute EcoCash fee upfront so it's available for both the order and the receipt
      const ecoFeeType = (currentBusiness as any)?.ecocashFeeType
      const ecoFeeValue = (currentBusiness as any)?.ecocashFeeValue ?? 0
      const computedEcocashFee = selectedPaymentMethod === 'ECOCASH'
        ? (ecoFeeType === 'PERCENTAGE' ? total * (ecoFeeValue / 100) : ecoFeeType === 'FIXED' ? ecoFeeValue : 0)
        : 0

      const totals = {
        subtotal,
        tax,
        discount,
        total
      }

      // Prepare order data
      const orderData = {
        businessId: currentBusiness?.businessId,
        customerId: customerInfo?.id || null,
        employeeId,
        orderType: mode === 'return' ? 'RETURN' : mode === 'exchange' ? 'EXCHANGE' : 'SALE',
        paymentMethod: selectedPaymentMethod,
        couponId: appliedCoupon?.id || null,
        discountAmount: totals.discount,
        taxAmount: totals.tax,
        businessType: 'clothing',
        attributes: {
          posOrder: true,
          mode,
          supervisorOverride: supervisorOverride || undefined,
          customerInfo: customerInfo || undefined,
          cashTendered: selectedPaymentMethod === 'CASH' && cashTendered ? parseFloat(cashTendered) : undefined,
          change: selectedPaymentMethod === 'CASH' && cashTendered ? parseFloat(cashTendered) - totals.total : undefined,
          couponCode: appliedCoupon?.code || undefined,
          couponDiscount: appliedCoupon?.discountAmount || undefined,
          ...(selectedPaymentMethod === 'ECOCASH' ? {
            ecocashTransactionCode: ecocashTxCode.trim(),
            ecocashFeeType: ecoFeeType,
            ecocashFeeValue: ecoFeeValue,
            ecocashFeeAmount: computedEcocashFee,
          } : {})
        },
        items: cart.map(item => {
          const isWiFiToken = item.attributes?.isWiFiToken === true
          return {
            productVariantId: isWiFiToken ? null : (item.variantId || item.id),
            quantity: item.isReturn ? -item.quantity : item.quantity,
            unitPrice: item.price,
            discountAmount: item.discount || 0,
            attributes: {
              productName: item.name,
              variantName: item.attributes?.size || item.attributes?.color ?
                `${item.attributes.size || ''} ${item.attributes.color || ''}`.trim() : null,
              sku: item.sku,
              isReturn: item.isReturn || false,
              returnReason: item.returnReason || null,
              ...item.attributes,
              // Ensure WiFi token attributes are passed for order processing
              ...(isWiFiToken ? {
                wifiToken: item.attributes?.r710Token ? false : true,
                r710Token: item.attributes?.r710Token || false,
                tokenConfigId: item.attributes?.tokenConfigId,
                packageName: item.attributes?.packageName
              } : {})
            }
          }
        })
      }

      // Create order via API
      const response = await fetch('/api/universal/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderData)
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to process order')
      }

      // Create receipt data — matching restaurant POS pattern
      const orderNumber = result.data.orderNumber || 'N/A'
      const actualBusiness = result.data.businessInfo || businessDetails || currentBusiness
      const ecocashFeeAmount = computedEcocashFee || result.data.ecocashFeeAmount || 0
      const receiptData: ReceiptData = {
        receiptNumber: {
          globalId: result.data.id || orderNumber,
          dailySequence: orderNumber.split('-').pop() || '001',
          formattedNumber: orderNumber,
        },
        businessId: currentBusiness?.businessId || '',
        businessType: 'clothing',
        businessName: actualBusiness?.name || actualBusiness?.businessName || 'Clothing Store',
        businessAddress: actualBusiness?.address || actualBusiness?.umbrellaBusinessAddress || '',
        businessPhone: actualBusiness?.phone || actualBusiness?.umbrellaBusinessPhone || currentBusiness?.phone || '',
        businessEmail: actualBusiness?.email,
        transactionId: orderNumber,
        transactionDate: new Date(),
        salespersonName: session?.user?.name || 'Staff',
        salespersonId: session?.user?.id || employeeId || '',
        items: cart.map(item => ({
          name: `${item.name}${item.attributes?.size ? ` (${item.attributes.size})` : ''}${item.attributes?.color ? ` - ${item.attributes.color}` : ''}`,
          sku: item.sku,
          quantity: item.quantity,
          unitPrice: item.price,
          totalPrice: item.price * item.quantity - (item.discount || 0)
        })),
        subtotal: totals.subtotal,
        tax: totals.tax,
        discount: totals.discount,
        total: totals.total,
        paymentMethod: selectedPaymentMethod,
        amountPaid: selectedPaymentMethod === 'CASH' && cashTendered
          ? parseFloat(cashTendered)
          : selectedPaymentMethod === 'ECOCASH'
            ? totals.total + ecocashFeeAmount   // EcoCash: total includes the fee
            : totals.total,
        changeDue: selectedPaymentMethod === 'CASH' && cashTendered ? parseFloat(cashTendered) - totals.total : undefined,
        ecocashFeeAmount: selectedPaymentMethod === 'ECOCASH' ? ecocashFeeAmount : undefined,
        ecocashTransactionCode: selectedPaymentMethod === 'ECOCASH' ? ecocashTxCode.trim() : undefined,
        customerName: customerInfo?.name || undefined,
        customerPhone: customerInfo?.phone || undefined,
        footerMessage: result.data.footerMessage || 'Thank you for shopping with us!',
        businessSpecificData: {
          supervisorOverride: supervisorOverride?.supervisorId ? 'Yes' : 'No',
          ...(appliedCoupon ? { couponCode: appliedCoupon.code, couponDiscount: appliedCoupon.discountAmount } : {})
        },
        // Include WiFi tokens from order result for receipt printing
        wifiTokens: result.data.wifiTokens || [],
        r710Tokens: result.data.r710Tokens || []
      }

      // Clear cart and reset state
      setCart([])
      clearGlobalCart() // Also clear the global/mini cart after successful payment
      setPaymentMethods([])
      setSupervisorOverride(null)
      setCustomerInfo(null)
      setShowPaymentModal(false)
      setCashTendered('')
      setSelectedPaymentMethod('CASH')
      // Clear any applied coupon after successful payment
      setAppliedCoupon(null)
      try { localStorage.removeItem(`applied-coupon-${businessId}`) } catch {}
      window.dispatchEvent(new Event('coupon-removed'))

      // Send CLEAR_CART to customer display after successful checkout
      if (terminalId) {
        sendToDisplay('CLEAR_CART', {
          subtotal: 0,
          tax: 0,
          total: 0
        })
      }

      // Always show unified receipt preview modal (like restaurant)
      // This gives user control over printing business copy, customer copy, and number of copies
      setCompletedOrderReceipt(receiptData)
      setShowReceiptPreview(true)

      onOrderComplete?.(result.data.id)
    } catch (error) {
      console.error('Payment failed:', error)
      await customAlert({
        title: 'Payment Failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred'
      })
    } finally {
      setLoading(false)
    }
  }

  // Handle printing receipt to configured printer
  const handlePrintReceipt = async (receiptData: ReceiptData, printerId?: string) => {
    try {
      if (!printerId) {
        throw new Error('No printer selected')
      }

      const response = await fetch('/api/print/receipt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          printerId,
          businessId: receiptData.businessId,
          businessType: receiptData.businessType,
          receiptNumber: receiptData.receiptNumber,
          transactionId: receiptData.transactionId,
          transactionDate: receiptData.transactionDate,
          salespersonName: receiptData.salespersonName,
          salespersonId: receiptData.salespersonId,
          businessName: receiptData.businessName,
          businessAddress: receiptData.businessAddress,
          businessPhone: receiptData.businessPhone,
          businessEmail: receiptData.businessEmail,
          items: receiptData.items,
          subtotal: receiptData.subtotal,
          tax: receiptData.tax,
          discount: receiptData.discount,
          total: receiptData.total,
          paymentMethod: receiptData.paymentMethod,
          amountPaid: receiptData.amountPaid,
          changeDue: receiptData.changeDue,
          businessSpecificData: receiptData.businessSpecificData,
          footerMessage: receiptData.footerMessage,
          returnPolicy: receiptData.returnPolicy,
          copies: 1,
          autoPrint: true
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Print request failed' }))
        throw new Error(errorData.error || `Print failed with status ${response.status}`)
      }

      const result = await response.json()
      console.log('Receipt printed successfully, job ID:', result.jobId)
    } catch (error) {
      console.error('Print error:', error)
      throw error
    }
  }

  const handleSupervisorAuth = (supervisorId: string, pin: string) => {
    // In real implementation, would validate supervisor credentials
    if (pin === '1234') { // Demo PIN
      setSupervisorOverride(prev => prev ? {
        ...prev,
        supervisorId,
        timestamp: new Date().toISOString()
      } : null)
      setShowSupervisorModal(false)
    } else {
      void customAlert({ title: 'Invalid supervisor PIN' })
    }
  }

  const getModeColor = () => {
    const colors = {
      sale: 'bg-green-50 text-green-800 border-green-200',
      return: 'bg-red-50 text-red-800 border-red-200',
      exchange: 'bg-blue-50 text-blue-800 border-blue-200'
    }
    return colors[mode]
  }

  const getReturnReasons = () => [
    'Defective item',
    'Wrong size',
    'Wrong color',
    'Not as described',
    'Customer dissatisfaction',
    'Damaged in shipping',
    'Other'
  ]

  return (
    <>
      {/* ── Cart validation warning dialog ────────────────────────────────── */}
      {showCartWarning && cartValidationWarnings.length > 0 && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999]">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
            <div className="px-5 py-4 bg-amber-500 dark:bg-amber-600 flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <h3 className="text-base font-bold text-white">Stale cart items removed</h3>
                <p className="text-xs text-amber-100">
                  {cartValidationWarnings.length} item{cartValidationWarnings.length !== 1 ? 's' : ''} from your saved cart
                  {cartValidationWarnings.length !== 1 ? ' were' : ' was'} no longer valid and{' '}
                  {cartValidationWarnings.length !== 1 ? 'have' : 'has'} been removed automatically.
                </p>
              </div>
            </div>
            <div className="px-5 py-4 space-y-2 max-h-64 overflow-y-auto">
              {cartValidationWarnings.map((w, i) => (
                <div key={i} className="flex items-start gap-2 py-1.5 border-b border-gray-100 dark:border-gray-700 last:border-0">
                  <span className="text-red-500 mt-0.5 shrink-0">✕</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{w.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{w.reason}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-5 pb-4 pt-2">
              <button
                onClick={() => {
                  setShowCartWarning(false)
                  setCartValidationWarnings([])
                }}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold text-sm"
              >
                OK — Continue with valid items
              </button>
            </div>
          </div>
        </div>
      )}

    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-6 items-start p-2 lg:p-4">
      {/* Main POS Interface */}
      <div className="xl:col-span-2 space-y-6">
        {/* Compact mode bar + search — single row */}
        <div className={`p-2 rounded-lg border ${getModeColor()}`}>
          <div className="flex items-center gap-2">
            {/* Sale / Return / Exchange */}
            <div className="flex gap-1 flex-shrink-0">
              {(['sale', 'return', 'exchange'] as const).map((modeOption) => (
                <button
                  type="button"
                  key={modeOption}
                  onClick={() => setMode(modeOption)}
                  className={`px-3 py-1.5 text-xs font-medium rounded capitalize ${
                    mode === modeOption ? 'bg-white shadow-sm' : 'hover:bg-white/50'
                  }`}
                >
                  {modeOption.charAt(0).toUpperCase() + modeOption.slice(1)}
                </button>
              ))}
            </div>
            {/* Search input — takes remaining width */}
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search products by name, SKU, or barcode…"
                value={productSearchTerm}
                onChange={(e) => setProductSearchTerm(e.target.value)}
                className="w-full px-3 py-1.5 pr-8 text-sm border border-white/40 rounded-md bg-white/20 dark:bg-black/20 placeholder-current/60 focus:outline-none focus:ring-2 focus:ring-white/60"
              />
              {productSearchTerm ? (
                <button
                  type="button"
                  onClick={() => setProductSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-current/60 hover:text-current"
                  title="Clear search"
                >
                  ✕
                </button>
              ) : (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-current/40 text-sm">🔍</span>
              )}
              {/* Floating search results — no layout shift */}
              {productSearchTerm.trim() && (
                <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl max-h-80 overflow-y-auto">
                  {searchLoading ? (
                    <div className="text-center py-4 text-sm text-gray-500">Searching…</div>
                  ) : searchResults.length === 0 ? (
                    <div className="text-center py-4 text-sm text-gray-500">No products found for &quot;{productSearchTerm}&quot;</div>
                  ) : (
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                      {searchResults.map((product) => (
                        <div key={product.id} className="px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700">
                          {product.isBale ? (
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">📦 {product.name}</p>
                                <p className="text-xs text-gray-500">
                                  {product.baleData.sku}{product.baleData.unitPrice ? ` · ${formatCurrency(parseFloat(product.baleData.unitPrice))}` : ''}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => { addBaleToCart(product.baleData); setProductSearchTerm('') }}
                                className="px-2 py-1 bg-emerald-600 text-white text-xs rounded hover:bg-emerald-700 flex-shrink-0"
                              >
                                Add Bale
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center justify-between mb-1">
                                <p className="text-sm font-medium text-gray-900 dark:text-white">{product.name}</p>
                                <button
                                  type="button"
                                  onClick={() => toggleQuickAdd(product.id)}
                                  className="text-base ml-2 hover:scale-110 transition-transform flex-shrink-0"
                                  title={pinnedProductIds.has(product.id) ? 'Remove from Quick Add' : 'Pin to Quick Add'}
                                >
                                  {pinnedProductIds.has(product.id) ? '★' : '☆'}
                                </button>
                              </div>
                              <div className="space-y-1">
                                {product.variants.map((variant: any) => (
                                  <div key={variant.id} className="flex items-center justify-between">
                                    <span className="text-xs text-gray-600 dark:text-gray-400">
                                      {[variant.attributes?.size, variant.attributes?.color].filter(Boolean).join(' ') || 'Standard'}
                                      <span className="ml-1 text-gray-400">({variant.stock} left)</span>
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-xs font-medium">{formatCurrency(variant.price)}</span>
                                      <button
                                        type="button"
                                        onClick={() => { addToCart(product.id, variant.id); setProductSearchTerm('') }}
                                        disabled={variant.stock === 0}
                                        className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50"
                                      >
                                        Add
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Add / Bale Items tabbed panel */}
        <div className="card p-4">
          {/* Tab selector */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              <button
                type="button"
                onClick={() => setBrowseTab('quickadd')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  browseTab === 'quickadd'
                    ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                }`}
              >
                Quick Add Products
              </button>
              <button
                type="button"
                onClick={() => setBrowseTab('bales')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  browseTab === 'bales'
                    ? 'bg-white dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                }`}
              >
                📦 Bale Items
              </button>
            </div>
            {browseTab === 'quickadd' && !productsLoading && quickAddProducts.length > 0 && (
              <span className="text-sm text-secondary">
                ({(() => {
                  const pinned = quickAddProducts.filter(p => pinnedProductIds.has(p.id))
                  const unpinned = quickAddProducts.filter(p => !pinnedProductIds.has(p.id))
                  return [...pinned, ...unpinned].slice(0, Math.max(20, pinned.length)).length
                })()} available)
              </span>
            )}
          </div>

          {/* ── Quick Add Products ── */}
          {browseTab === 'quickadd' && (
            <>
          {productsLoading ? (
            <div className="text-center py-8 text-secondary">
              Loading products...
            </div>
          ) : quickAddProducts.length === 0 ? (
            <div className="text-center py-8 text-secondary">
              <div className="text-4xl mb-2">📦</div>
              <div className="font-medium">No products available</div>
              <div className="text-sm mt-1">Add clothing products with variants in the Inventory page</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {(() => {
                // Pinned products first, then fill remaining slots up to 20
                const pinned = quickAddProducts.filter(p => pinnedProductIds.has(p.id))
                const unpinned = quickAddProducts.filter(p => !pinnedProductIds.has(p.id))
                const displayProducts = [...pinned, ...unpinned].slice(0, Math.max(20, pinned.length))
                return displayProducts.map((product) => (
                <div key={product.id} className={`border rounded-lg p-3 hover:shadow-md transition-shadow ${pinnedProductIds.has(product.id) ? 'border-yellow-400 dark:border-yellow-500' : ''}`}>
                  <div className="flex gap-3 mb-3">
                    {/* Product Image */}
                    <div className="flex-shrink-0">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-16 h-16 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center text-3xl">
                          {product.categoryEmoji || '👕'}
                        </div>
                      )}
                    </div>
                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <h4 className="font-medium text-primary truncate">{product.name}</h4>
                        <button
                          type="button"
                          onClick={() => toggleQuickAdd(product.id)}
                          className="flex-shrink-0 text-lg leading-none hover:scale-110 transition-transform"
                          title={pinnedProductIds.has(product.id) ? 'Remove from Quick Add' : 'Pin to Quick Add'}
                        >
                          {pinnedProductIds.has(product.id) ? '★' : '☆'}
                        </button>
                      </div>
                      {product.category && (
                        <p className="text-xs text-secondary flex items-center gap-1">
                          <span>{product.categoryEmoji}</span>
                          <span>{product.category}</span>
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    {product.variants.map((variant: any) => {
                      // Build variant display name
                      const variantName = [
                        variant.attributes?.size,
                        variant.attributes?.color
                      ].filter(Boolean).join(' ') || 'Standard'

                      return (
                        <div key={variant.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {variantName}
                            </span>
                            <span className="text-sm text-secondary">({variant.stock} left)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{formatCurrency(variant.price)}</span>
                            <button
                              type="button"
                              onClick={() => addToCart(product.id, variant.id)}
                              disabled={variant.stock === 0 || variant.price < 0}
                              className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Add
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
                ))
              })()}
            </div>
          )}
            </>
          )}

          {/* ── Bale Items Tab ── */}
          {browseTab === 'bales' && (
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Search by category, batch, or SKU…"
                value={baleSearch}
                onChange={e => setBaleSearch(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-gray-700 dark:text-white"
              />
              {balesLoading ? (
                <div className="flex justify-center py-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
                </div>
              ) : (() => {
                const filtered = bales.filter(b =>
                  !baleSearch ||
                  b.category?.name?.toLowerCase().includes(baleSearch.toLowerCase()) ||
                  b.batchNumber?.toLowerCase().includes(baleSearch.toLowerCase()) ||
                  b.sku?.toLowerCase().includes(baleSearch.toLowerCase())
                )
                if (filtered.length === 0) return (
                  <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                    {baleSearch ? 'No bale items match your search' : 'No bale items available'}
                  </div>
                )
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 pr-1">
                    {filtered.map(bale => {
                      const outOfStock = bale.remainingCount <= 0
                      const price = parseFloat(bale.unitPrice)
                      return (
                        <div
                          key={bale.id}
                          className={`rounded-xl border p-3 flex flex-col gap-2 ${
                            outOfStock
                              ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 opacity-60'
                              : 'bg-white dark:bg-gray-800 border-emerald-200 dark:border-emerald-800 hover:shadow-md'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-1">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                {bale.category?.emoji || '📦'} {bale.category?.name || 'Bale'}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">{bale.batchNumber}</p>
                              {bale.sku && <p className="text-xs text-gray-400">SKU: {bale.sku}</p>}
                            </div>
                            <span className={`text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                              outOfStock
                                ? 'bg-gray-100 text-gray-500'
                                : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                            }`}>
                              {outOfStock ? 'Out' : `${bale.remainingCount} left`}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-auto">
                            <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                              {formatCurrency(price)}
                            </span>
                            <button
                              type="button"
                              onClick={() => addBaleToCart(bale)}
                              disabled={outOfStock}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              Add
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
            </div>
          )}
        </div>

        {/* Barcode Scanner */}
        <BarcodeScanner
          onProductScanned={(product, variantId) => addToCartFromScanner(product, variantId)}
          onNotFound={(barcode) => setQuickStockBarcode(barcode)}
          onProductNeedsActivation={(product, barcode, variantId) => {
            setQuickStockExistingProduct({ id: product.id, name: product.name, variantId })
            setQuickStockBarcode(barcode)
          }}
          businessId={currentBusiness?.businessId || ''}
          showScanner={showBarcodeScanner}
          onToggleScanner={() => setShowBarcodeScanner(!showBarcodeScanner)}
        />
        {quickStockBarcode && (
          <QuickStockFromScanModal
            isOpen={true}
            barcode={quickStockBarcode}
            businessId={businessId}
            businessType="clothing"
            existingProduct={quickStockExistingProduct ?? undefined}
            suggestedName={quickStockExistingProduct?.name}
            onSuccess={async (productId, variantId) => {
              setQuickStockBarcode(null)
              setQuickStockExistingProduct(null)
              try {
                const res = await fetch(`/api/universal/products/${productId}`)
                if (res.ok) {
                  const data = await res.json()
                  addToCartFromScanner(data, variantId, 1)
                }
              } catch {
                // Product stocked — user can scan again to add to cart
              }
            }}
            onClose={() => {
              setQuickStockBarcode(null)
              setQuickStockExistingProduct(null)
            }}
          />
        )}

        {/* Return Processing */}
        {mode === 'return' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="font-semibold text-red-900 mb-4">Process Return</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Original Order ID or Receipt #"
                className="px-3 py-2 border border-red-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <select
                onChange={(e) => e.target.value && handleReturn('ORD-123', e.target.value)}
                className="px-3 py-2 border border-red-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="">Select return reason</option>
                {getReturnReasons().map((reason) => (
                  <option key={reason} value={reason}>{reason}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Cart and Checkout */}
      <div className="sticky top-20 self-start flex flex-col gap-3 max-h-[calc(100vh-5.5rem)]">
        {/* Customer lookup — shrink-0 so it never gets clipped */}
        <div className="card p-4 shrink-0">
          <CustomerLookup
            businessId={businessId}
            selectedCustomer={customerInfo}
            onSelectCustomer={(customer) => setCustomerInfo(customer)}
            onCreateCustomer={() => setShowAddCustomerModal(true)}
            allowWalkIn={true}
          />
        </div>

        {/* Cart — flex-1 so it takes remaining space, items scroll inside */}
        <div className="card p-4 flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-4 shrink-0">
            <h3 className="font-semibold text-primary">Cart ({cart.length})</h3>
            <button
              type="button"
              onClick={() => setCart([])}
              className="text-sm text-red-600 hover:text-red-700"
            >
              Clear All
            </button>
          </div>

          <div className="space-y-1.5 overflow-y-auto flex-1 min-h-0 pr-1">
            {cart.length === 0 ? (
              <div className="text-center py-6 text-secondary text-sm">
                Cart is empty
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.id} className={`flex items-start gap-2 p-2 rounded-lg border ${
                  item.isReturn ? 'bg-red-50 border-red-200 dark:bg-red-900/20' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                }`}>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {item.name || (item as any).product?.name || (item as any).productName || 'Unknown Item'}
                    </div>
                    {(item.attributes?.size || item.attributes?.color || item.variant?.name || item.sku || item.isReturn) && (
                      <div className="text-xs text-secondary truncate">
                        {item.sku && <span className="font-mono">{item.sku}</span>}
                        {item.attributes?.size && ` · ${item.attributes.size}`}
                        {item.attributes?.color && ` · ${item.attributes.color}`}
                        {item.variant?.name && ` · ${item.variant.name}`}
                        {item.isReturn && item.returnReason && ` · ${item.returnReason}`}
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 mt-1">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateQuantity(item.id, parseInt(e.target.value))}
                        className="w-12 px-1.5 py-0.5 text-xs text-center border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                      />
                      <span className="text-xs text-secondary">× {formatCurrency(item.price - (item.discount || 0))}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 flex-shrink-0 pt-0.5">
                    <span className="font-bold text-sm min-w-[56px] text-right">
                      {formatCurrency((item.price - (item.discount || 0)) * item.quantity)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.id)}
                      className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                      title="Remove"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Totals — shrink-0 so always visible at bottom */}
        {cart.length > 0 ? (
          <div className="card p-4 shrink-0">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatCurrency(calculateSubtotal())}</span>
              </div>
              <div className="flex justify-between">
                <span>
                  {businessConfig.taxLabel || 'Tax'}
                  {businessConfig.taxIncludedInPrice && <span className="text-xs text-gray-500 ml-1">(included)</span>}
                  :
                </span>
                <span>{formatCurrency(calculateTax())}</span>
              </div>
              {appliedCoupon && (
                <div className="flex justify-between items-center text-green-700 dark:text-green-400">
                  <div className="flex items-center gap-1">
                    <span className="text-xs">🏷️</span>
                    <span className="text-sm font-medium">Coupon ({appliedCoupon.code}):</span>
                    <button
                      type="button"
                      onClick={() => {
                        setAppliedCoupon(null)
                        try { localStorage.removeItem(`applied-coupon-${businessId}`) } catch {}
                        window.dispatchEvent(new Event('coupon-removed'))
                      }}
                      className="text-xs text-red-500 hover:text-red-700 ml-1"
                      title="Remove coupon"
                    >
                      ✕
                    </button>
                  </div>
                  <span className="text-sm font-medium">-{formatCurrency(appliedCoupon.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Total:</span>
                <span>{formatCurrency(calculateTotal())}</span>
              </div>
            </div>

            {/* Supervisor Override Indicator */}
            {requiresSupervisorOverride() && (
              <div className="mt-4 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                <div className="flex items-center gap-2">
                  <span>⚠️</span>
                  <span>Supervisor override required</span>
                  {supervisorOverride?.supervisorId && (
                    <span className="text-green-600">✓ Approved</span>
                  )}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => { setEcocashTxCode(''); setCashTendered(''); setShowPaymentModal(true) }}
              disabled={cart.length === 0}
              className="w-full mt-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed text-lg"
            >
              {mode === 'return' ? 'Process Return' : 'Proceed to Payment'}
            </button>
          </div>
        ) : null}

        {showAddCustomerModal && typeof document !== 'undefined' && createPortal(
          <AddCustomerModal
            onClose={() => setShowAddCustomerModal(false)}
            onCustomerCreated={(newCustomer) => {
              setShowAddCustomerModal(false)
              if (newCustomer?.id) {
                const displayName =
                  newCustomer.fullName ||
                  newCustomer.name ||
                  `${newCustomer.firstName || ''} ${newCustomer.lastName || ''}`.trim() ||
                  newCustomer.email ||
                  'New Customer'
                setCustomerInfo({
                  id: newCustomer.id,
                  customerNumber: newCustomer.customerNumber || '',
                  name: displayName,
                  email: newCustomer.email,
                  phone: newCustomer.phone,
                  customerType: newCustomer.customerType || 'INDIVIDUAL',
                })
              }
            }}
          />,
          document.body
        )}
      </div>

      {/* Payment Modal — styled like restaurant POS */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-primary mb-4">💳 Payment</h2>

            <div className="space-y-4">
              {/* Order Total — shown first like restaurant POS */}
              <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-medium text-primary">Total Amount:</span>
                  <span className="text-2xl font-bold text-green-600">{formatCurrency(calculateTotal())}</span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {cart.length} item{cart.length !== 1 ? 's' : ''}
                  {appliedCoupon && (
                    <span className="ml-2 text-green-600 dark:text-green-400">
                      · 🏷️ Coupon {appliedCoupon.code} (-{formatCurrency(appliedCoupon.discountAmount)})
                    </span>
                  )}
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium text-primary mb-2">Payment Method</label>
                <div className={`grid gap-2 ${(currentBusiness as any)?.ecocashEnabled ? 'grid-cols-4' : 'grid-cols-3'}`}>
                  <button
                    type="button"
                    onClick={() => { setSelectedPaymentMethod('CASH'); setEcocashTxCode('') }}
                    className={`py-3 px-4 rounded-lg font-medium transition-colors ${selectedPaymentMethod === 'CASH' ? 'bg-green-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-primary hover:bg-gray-300 dark:hover:bg-gray-600'}`}
                  >
                    💵 Cash
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSelectedPaymentMethod('CARD'); setEcocashTxCode(''); setCashTendered('') }}
                    className={`py-3 px-4 rounded-lg font-medium transition-colors ${selectedPaymentMethod === 'CARD' ? 'bg-green-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-primary hover:bg-gray-300 dark:hover:bg-gray-600'}`}
                  >
                    💳 Card
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSelectedPaymentMethod('STORE_CREDIT'); setEcocashTxCode(''); setCashTendered('') }}
                    className={`py-3 px-4 rounded-lg font-medium transition-colors ${selectedPaymentMethod === 'STORE_CREDIT' ? 'bg-green-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-primary hover:bg-gray-300 dark:hover:bg-gray-600'}`}
                  >
                    🏬 Credit
                  </button>
                  {(currentBusiness as any)?.ecocashEnabled && (
                    <button
                      type="button"
                      onClick={() => { setSelectedPaymentMethod('ECOCASH'); setCashTendered('') }}
                      className={`py-3 px-4 rounded-lg font-medium transition-colors ${selectedPaymentMethod === 'ECOCASH' ? 'bg-green-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-primary hover:bg-gray-300 dark:hover:bg-gray-600'}`}
                    >
                      <img src="/images/ecocash-logo.png" alt="" className="h-4 w-auto inline-block mr-1" />EcoCash
                    </button>
                  )}
                </div>
              </div>

              {/* Cash Amount Received */}
              {selectedPaymentMethod === 'CASH' && calculateTotal() > 0 && (
                <div>
                  <label className="block text-sm font-medium text-primary mb-2">Amount Received</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Enter amount received"
                    value={cashTendered}
                    onChange={(e) => setCashTendered(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white text-lg font-semibold"
                    autoFocus
                  />
                  {cashTendered && parseFloat(cashTendered) >= calculateTotal() && (
                    <div className="mt-2 p-2 bg-green-100 dark:bg-green-900 rounded text-green-800 dark:text-green-200 font-medium">
                      💵 Change: {formatCurrency(parseFloat(cashTendered) - calculateTotal())}
                    </div>
                  )}
                  {cashTendered && parseFloat(cashTendered) < calculateTotal() && (
                    <div className="mt-2 p-2 bg-red-100 dark:bg-red-900 rounded text-red-800 dark:text-red-200 text-sm">
                      ⚠️ Amount received is less than total ({formatCurrency(calculateTotal())})
                    </div>
                  )}
                </div>
              )}

              {/* Free item via cash */}
              {selectedPaymentMethod === 'CASH' && calculateTotal() === 0 && (
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-800 dark:text-green-200">
                  ✅ Free item — no payment required
                </div>
              )}

              {/* EcoCash Transaction Code */}
              {selectedPaymentMethod === 'ECOCASH' && (() => {
                const feeType = (currentBusiness as any)?.ecocashFeeType
                const feeValue = (currentBusiness as any)?.ecocashFeeValue ?? 0
                const fee = feeType === 'PERCENTAGE' ? calculateTotal() * (feeValue / 100) : (feeType === 'FIXED' ? feeValue : 0)
                const ecocashTotal = calculateTotal() + fee
                return (
                  <div className="space-y-2">
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">EcoCash Transaction Code</label>
                      <input
                        type="text"
                        value={ecocashTxCode}
                        onChange={(e) => setEcocashTxCode(e.target.value.toUpperCase())}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white text-lg font-semibold"
                        placeholder="Enter EcoCash transaction code"
                        autoComplete="off"
                        autoFocus
                      />
                    </div>
                    {fee > 0 && (
                      <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded text-sm text-yellow-800 dark:text-yellow-200 space-y-0.5">
                        <div className="flex justify-between"><span>Subtotal:</span><span>{formatCurrency(calculateTotal())}</span></div>
                        <div className="flex justify-between"><span>EcoCash fee ({feeType === 'PERCENTAGE' ? `${feeValue}%` : 'fixed'}):</span><span>{formatCurrency(fee)}</span></div>
                        <div className="flex justify-between font-bold"><span>Total to charge:</span><span>{formatCurrency(ecocashTotal)}</span></div>
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* Action Buttons */}
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowPaymentModal(false)
                    setCashTendered('')
                    setEcocashTxCode('')
                  }}
                  disabled={loading}
                  className="flex-1 py-3 bg-gray-500 text-white font-medium rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={processPayment}
                  disabled={loading || (selectedPaymentMethod === 'CASH' && calculateTotal() > 0 && (!cashTendered || parseFloat(cashTendered) < calculateTotal())) || (selectedPaymentMethod === 'ECOCASH' && !ecocashTxCode.trim())}
                  className="flex-1 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Processing...' : 'Complete Order'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Supervisor Override Modal */}
      {showSupervisorModal && supervisorOverride && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="card p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Supervisor Override Required</h3>
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 p-3 rounded">
                <p className="text-sm">{supervisorOverride.reason}</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Supervisor ID</label>
                <input
                  type="text"
                  placeholder="Enter supervisor ID"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Supervisor PIN</label>
                <input
                  type="password"
                  placeholder="Enter PIN"
                  className="w-full px-3 py-2 border rounded-lg"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      const pin = (e.target as HTMLInputElement).value
                      const supervisorId = ((e.target as HTMLInputElement).parentNode?.previousSibling?.querySelector('input') as HTMLInputElement)?.value
                      if (supervisorId && pin) {
                        handleSupervisorAuth(supervisorId, pin)
                      }
                    }
                  }}
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowSupervisorModal(false)}
                  className="flex-1 py-2 px-4 border rounded-lg hover:bg-gray-50 dark:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const supervisorId = (document.querySelector('input[placeholder="Enter supervisor ID"]') as HTMLInputElement)?.value
                    const pin = (document.querySelector('input[placeholder="Enter PIN"]') as HTMLInputElement)?.value
                    if (supervisorId && pin) {
                      handleSupervisorAuth(supervisorId, pin)
                    }
                  }}
                  className="flex-1 py-2 px-4 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                >
                  Authorize
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Unified Receipt Preview Modal (same as restaurant) */}
      <UnifiedReceiptPreviewModal
        isOpen={showReceiptPreview}
        onClose={() => {
          setShowReceiptPreview(false)
          setCompletedOrderReceipt(null)
        }}
        receiptData={completedOrderReceipt}
        businessType="clothing"
        onPrintConfirm={async (options) => {
          if (!completedOrderReceipt) return

          // Guard against duplicate calls
          if (printInFlightRef.current) {
            console.log('⚠️ [Clothing POS] Print already in progress, ignoring')
            return
          }

          printInFlightRef.current = true
          console.log('🖨️ [Clothing POS] onPrintConfirm starting:', options)

          try {
            await ReceiptPrintManager.printReceipt(completedOrderReceipt, 'clothing', {
              ...options,
              autoPrint: true,
              onSuccess: (jobId, receiptType) => {
                toast.push(`${receiptType} receipt sent to printer`)
              },
              onError: (error, receiptType) => {
                toast.error(`Error: ${error.message}`)
              }
            })

            console.log('✅ [Clothing POS] Print completed successfully')

            // Close modal
            setShowReceiptPreview(false)
            setCompletedOrderReceipt(null)

          } catch (error: any) {
            toast.error(`Print error: ${error.message}`)
          } finally {
            printInFlightRef.current = false
          }
        }}
      />
    </div>
    </>
  )
}