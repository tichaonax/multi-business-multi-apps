'use client'

import { useState, useEffect, useRef } from 'react'
import { globalBarcodeService, GlobalBarcodeEvent } from '@/lib/services/global-barcode-service'
import { useSession, signOut } from 'next-auth/react'
import { getGlobalBarcodeScanningAccess } from '@/lib/permission-utils'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { QuickStockFromScanModal } from '@/components/inventory/quick-stock-from-scan-modal'
import { useToast } from '@/components/ui/use-toast'
import { useRouter } from 'next/navigation'
import { ClockInModal } from '@/components/clock-in/clock-in-modal'
import { AddStockPanel } from '@/components/clothing/add-stock-panel'

interface BusinessInventory {
  businessId: string
  businessName: string
  businessType: string
  stockQuantity: number
  price: number
  hasAccess: boolean
  isInformational: boolean
  productId?: string
  variantId?: string | null
  productName?: string
  variantName?: string | null
  description?: string | null
  productAttributes?: any
  variantAttributes?: any
  // Bale-specific
  isBale?: boolean
  baleId?: string
  batchNumber?: string
  categoryName?: string
  remainingCount?: number
  itemCount?: number
  sku?: string
  bogoActive?: boolean
  bogoRatio?: number
  // Inventory item-specific (BarcodeInventoryItems via Add Stock)
  isInventoryItem?: boolean
  inventoryItemId?: string
}

interface ScannedCustomer {
  id: string; customerNumber: string; name: string; phone?: string
  customerType: string; businessId: string; businessType: string; businessName: string
}

interface GlobalBarcodeModalProps {
  isOpen: boolean
  onClose: () => void
  barcode: string
  confidence: 'high' | 'medium' | 'low'
  /** Current business context — enables "Stock in Current Business" flow */
  currentBusinessId?: string
  currentBusinessType?: string
  currentBusinessName?: string
}

export function GlobalBarcodeModal({ isOpen, onClose, barcode, confidence, currentBusinessId, currentBusinessType, currentBusinessName }: GlobalBarcodeModalProps) {
  const { data: session } = useSession()
  const { hasPermission } = useBusinessPermissionsContext()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  // True while the initial card-scan check is in-flight (before we know if it's a card or product)
  const [isIdentifying, setIsIdentifying] = useState(false)
  // True once the barcode matched an employee card — prevents the inventory modal from ever showing
  const [cardScanHandled, setCardScanHandled] = useState(false)
  const [businesses, setBusinesses] = useState<BusinessInventory[]>([])
  const [selectedBusiness, setSelectedBusiness] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [customSku, setCustomSku] = useState('')
  const [currentBarcode, setCurrentBarcode] = useState(barcode)
  const [currentConfidence, setCurrentConfidence] = useState(confidence)
  const [showQuickStock, setShowQuickStock] = useState(false)
  const [newlyAddedProduct, setNewlyAddedProduct] = useState<{ id: string; variantId: string; name: string } | null>(null)
  // True when on a POS page and the scanned product exists in other businesses but NOT in the current one
  const [isPosCrossBiz, setIsPosCrossBiz] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<{ url: string, business: BusinessInventory } | null>(null)
  const [isSwitching, setIsSwitching] = useState(false)
  const { push: showToast } = useToast()

  // Clock-in state
  const [clockInEmployee, setClockInEmployee] = useState<any>(null)
  const [clockInState, setClockInState] = useState<'notYetClockedIn' | 'clockedIn' | 'clockedOut'>('notYetClockedIn')
  const [clockInAttendance, setClockInAttendance] = useState<any>(null)
  const [clockInIsOwnCard, setClockInIsOwnCard] = useState(false)
  const [showClockInModal, setShowClockInModal] = useState(false)

  // Logout prompt state (shown when admin/manager card is scanned while another user is active)
  const [showLogoutPrompt, setShowLogoutPrompt] = useState(false)
  const [logoutPromptEmployee, setLogoutPromptEmployee] = useState<any>(null)
  // Set to true when a non-exempt admin/manager scans — logout prompt shows AFTER ClockInModal closes
  const [pendingLogoutAfterClockIn, setPendingLogoutAfterClockIn] = useState(false)

  // Logout prompt camera
  const logoutVideoRef = useRef<HTMLVideoElement>(null)
  const logoutCanvasRef = useRef<HTMLCanvasElement>(null)
  const logoutStreamRef = useRef<MediaStream | null>(null)
  const [logoutCameraActive, setLogoutCameraActive] = useState(false)
  const [logoutCameraError, setLogoutCameraError] = useState(false)

  // Customer card scan state (Step 2 — between employee check and product lookup)
  const [scannedCustomer, setScannedCustomer] = useState<ScannedCustomer | null>(null)
  const [showCustomerConfirm, setShowCustomerConfirm] = useState(false)

  // Clothing no-match workflow state
  const [showAddStockPanel, setShowAddStockPanel] = useState(false)
  const [showLinkExisting, setShowLinkExisting] = useState(false)
  const [linkSearch, setLinkSearch] = useState('')
  const [linkResults, setLinkResults] = useState<any[]>([])
  const [linkLoading, setLinkLoading] = useState(false)
  const [linkSuccess, setLinkSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && barcode) {
      setCurrentBarcode(barcode)
      setCurrentConfidence(confidence)
      setNewlyAddedProduct(null)
      setIsPosCrossBiz(false)
      lookupBarcode(barcode)
    }
  }, [isOpen, barcode])

  // Start/stop camera when logout prompt opens or closes
  useEffect(() => {
    if (showLogoutPrompt) {
      if (!navigator.mediaDevices) {
        setLogoutCameraError(true)
        return
      }
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
        .then(stream => {
          logoutStreamRef.current = stream
          if (logoutVideoRef.current) logoutVideoRef.current.srcObject = stream
          setLogoutCameraActive(true)
          setLogoutCameraError(false)
        })
        .catch(() => setLogoutCameraError(true))
    } else {
      logoutStreamRef.current?.getTracks().forEach(t => t.stop())
      logoutStreamRef.current = null
      setLogoutCameraActive(false)
      setLogoutCameraError(false)
    }
  }, [showLogoutPrompt])

  const lookupBarcode = async (barcodeToLookup: string) => {
    if (!session?.user) return

    setIsLoading(true)
    setIsIdentifying(true)
    setError(null)
    setBusinesses([])
    setSelectedBusiness(null)

    try {
      // --- Employee clock-in intercept: check if barcode is an employee number ---
      const clockScanRes = await fetch('/api/clock-in/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scanToken: barcodeToLookup }),
      })
      if (clockScanRes.ok) {
        const clockData = await clockScanRes.json()
        if (clockData.found) {
          // Log every scan invocation that triggers a workflow (fire-and-forget)
          if (clockData.employee?.id) {
            fetch('/api/clock-in/login-log', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ employeeId: clockData.employee.id, action: 'scan', method: 'card' }),
            }).catch(() => {})
          }
          const isExempt: boolean = !!clockData.employee?.isClockInExempt
          // Management is determined by job title level, not auth system role
          const isManagement: boolean = !!clockData.isManagement

          if (isManagement) {
            // Management employees never clock in — always trigger logout prompt
            setLogoutPromptEmployee(clockData.employee)
            setShowLogoutPrompt(true)
          } else if (isExempt) {
            // Exempt non-management: silently skip — no clock-in, no prompt
          } else {
            // Regular employee: normal clock-in/out flow
            setClockInEmployee(clockData.employee)
            setClockInState(clockData.clockState)
            setClockInAttendance(clockData.attendance)
            setClockInIsOwnCard(!!clockData.isOwnCard)
            setShowClockInModal(true)
          }
          setCardScanHandled(true)
          setIsLoading(false)
          setIsIdentifying(false)
          return // Stop — do not proceed with inventory lookup
        }
      }
      // --- End employee clock-in intercept ---

      // --- Step 2: Customer loyalty card check ---
      // Customer numbers match pattern: XXX-CUST-NNNNNN (e.g. RES-CUST-000001)
      const isCustomerNumber = /^[A-Z]{2,5}-CUST-\d{4,8}$/i.test(barcodeToLookup)
      if (isCustomerNumber) {
        try {
          const custRes = await fetch(`/api/customers/scan-lookup?barcode=${encodeURIComponent(barcodeToLookup)}`)
          if (custRes.ok) {
            const custData = await custRes.json()
            if (custData.found && custData.customer) {
              const customer: ScannedCustomer = custData.customer
              const posRoutes: Record<string, string> = {
                restaurant: '/restaurant/pos',
                grocery: '/grocery/pos',
                clothing: '/clothing/pos',
                hardware: '/hardware/pos',
              }
              const targetPosPath = posRoutes[customer.businessType] ?? '/universal/pos'
              const currentPath = typeof window !== 'undefined' ? window.location.pathname : ''
              const isOnCorrectPOS = currentPath.startsWith(targetPosPath) && currentBusinessId === customer.businessId
              const isOnAnyPOS = currentPath.includes('/pos')

              if (isOnCorrectPOS) {
                // Scenario A: already on the right POS — dispatch event to pre-select customer
                window.dispatchEvent(new CustomEvent('pos:select-customer', { detail: customer }))
                onClose()
              } else if (isOnAnyPOS && currentBusinessId && currentBusinessId !== customer.businessId) {
                // Scenario C: on a different business's POS — ask for confirmation
                setScannedCustomer(customer)
                setShowCustomerConfirm(true)
              } else {
                // Scenario B: navigate to correct POS with customer in URL params
                const params = new URLSearchParams({ customerId: customer.id, customerNumber: customer.customerNumber, customerName: customer.name })
                if (customer.phone) params.set('customerPhone', customer.phone)
                router.push(`${targetPosPath}?${params.toString()}`)
                onClose()
              }
              setCardScanHandled(true)
              setIsLoading(false)
              setIsIdentifying(false)
              return
            }
          }
        } catch { /* non-fatal — fall through to product lookup */ }
      }
      // --- End customer card check ---

      // Not a card — proceed to product lookup
      setIsIdentifying(false)

      // Check user permissions — canScan gates cross-business visibility only;
      // users always get results scoped to their own accessible businesses
      const access = getGlobalBarcodeScanningAccess(session.user as any)

      // Call the inventory lookup API
      const response = await fetch(`/api/global/inventory-lookup/${encodeURIComponent(barcodeToLookup)}`)

      // Don't throw on non-200 responses, handle gracefully
      if (!response.ok) {
        const errorText = await response.text()
        console.warn('API returned non-200 status:', response.status, errorText)
        setError(`Failed to lookup barcode (${response.status}). Please try again.`)
        return
      }

      const data = await response.json()

      if (!data.success) {
        setError(data.error || 'Failed to lookup barcode')
        return
      }

      // Transform the response into our business inventory format
      const businessInventory: BusinessInventory[] = []

      // Process the businesses data from the API
      if (data.data?.businesses) {
        data.data.businesses.forEach((biz: any) => {
          businessInventory.push({
            businessId: biz.businessId,
            businessName: biz.businessName,
            businessType: biz.businessType || 'unknown',
            stockQuantity: biz.stockQuantity || 0,
            price: biz.price || 0,
            hasAccess: biz.hasAccess || false,
            isInformational: access.canViewAcrossBusinesses && !biz.hasAccess,
            productId: biz.productId,
            variantId: biz.variantId,
            productName: biz.productName,
            variantName: biz.variantName,
            description: biz.description,
            productAttributes: biz.productAttributes || {},
            variantAttributes: biz.variantAttributes || {},
            isBale: biz.isBale,
            baleId: biz.baleId,
            batchNumber: biz.batchNumber,
            categoryName: biz.categoryName,
            remainingCount: biz.remainingCount,
            itemCount: biz.itemCount,
            sku: biz.sku,
            bogoActive: biz.bogoActive,
            bogoRatio: biz.bogoRatio,
            isInventoryItem: biz.isInventoryItem,
            inventoryItemId: biz.inventoryItemId,
          })
        })
      }

      // Filter based on permissions
      let filteredBusinesses = businessInventory.filter(biz => biz.hasAccess)
      if (access.canViewAcrossBusinesses) {
        // Add informational businesses
        const informationalBusinesses = businessInventory
          .filter(biz => !biz.hasAccess)
          .map(biz => ({ ...biz, isInformational: true }))
        filteredBusinesses = [...filteredBusinesses, ...informationalBusinesses]
      }

      setBusinesses(filteredBusinesses)

      // Auto-add to cart on POS pages: when the scanned product is found in the
      // current business, dispatch an event and close the modal silently.
      // Clock-in is never affected here because employee-card scans return early
      // (before this code) via the setCardScanHandled(true) + return path above.
      const isOnPOSPage =
        typeof window !== 'undefined' && window.location.pathname.includes('/pos')
      if (isOnPOSPage && currentBusinessId) {
        const currentBizMatch = filteredBusinesses.find(
          b => b.businessId === currentBusinessId && b.hasAccess && b.productId
        )
        if (currentBizMatch) {
          if (currentBizMatch.isBale) {
            // ✅ Bale in current business — dispatch bale-specific cart event
            window.dispatchEvent(
              new CustomEvent('pos:add-bale-to-cart', {
                detail: {
                  id: currentBizMatch.baleId,
                  batchNumber: currentBizMatch.batchNumber,
                  unitPrice: currentBizMatch.price,
                  sku: currentBizMatch.sku,
                  remainingCount: currentBizMatch.remainingCount,
                  itemCount: currentBizMatch.itemCount,
                  category: { name: currentBizMatch.categoryName },
                  categoryName: currentBizMatch.categoryName,
                  bogoActive: currentBizMatch.bogoActive,
                  bogoRatio: currentBizMatch.bogoRatio,
                },
              })
            )
          } else if (currentBizMatch.isInventoryItem) {
            // ✅ Inventory item (BarcodeInventoryItems) — dispatch inventory-specific cart event
            window.dispatchEvent(
              new CustomEvent('pos:add-inventory-item-to-cart', {
                detail: { ...currentBizMatch, barcodeData: barcodeToLookup },
              })
            )
          } else {
            // ✅ Product in current business — add to cart silently
            window.dispatchEvent(
              new CustomEvent('pos:add-to-cart', {
                detail: {
                  productId: currentBizMatch.productId,
                  variantId: currentBizMatch.variantId ?? undefined,
                  productName: currentBizMatch.productName,
                  price: currentBizMatch.price,
                  variantAttributes: currentBizMatch.variantAttributes,
                },
              })
            )
          }
          onClose()
          return
        }
        // Product NOT in current business — show focused POS cross-biz dialog
        // (filteredBusinesses.length === 0 means not found anywhere; still opens modal for "add to inventory")
        if (filteredBusinesses.length > 0) {
          setIsPosCrossBiz(true)
        }
        // Fall through to open modal with POS-specific UI
      }

      // Auto-select the first accessible business (used by normal non-POS modal flow)
      const firstAccessible = filteredBusinesses.find(biz => biz.hasAccess)
      if (firstAccessible) {
        setSelectedBusiness(firstAccessible.businessId)
      }

    } catch (err) {
      console.error('Error looking up barcode:', err)
      setError('Failed to lookup barcode. Please check your connection and try again.')
    } finally {
      setIsLoading(false)
      setIsIdentifying(false)
    }
  }

  // Synchronously grab the current video frame as a data URL (no async)
  const captureLogoutFrame = (): string | null => {
    const video = logoutVideoRef.current
    const canvas = logoutCanvasRef.current
    if (!video || !canvas || !video.videoWidth || !video.videoHeight) return null
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')?.drawImage(video, 0, 0)
    const d = canvas.toDataURL('image/jpeg', 0.8)
    return d && d !== 'data:,' ? d : null
  }

  // Upload a data URL to the images API and return the stored URL
  const uploadLogoutFrame = async (dataUrl: string): Promise<string | undefined> => {
    try {
      const blob = await (await fetch(dataUrl)).blob()
      const fd = new FormData()
      fd.append('files', blob, 'logout-photo.jpg')
      fd.append('expiresInDays', '60')
      const res = await fetch('/api/universal/images', { method: 'POST', body: fd })
      const upData = await res.json()
      return upData.data?.[0]?.url
    } catch { return undefined }
  }

  const stopLogoutCamera = () => {
    logoutStreamRef.current?.getTracks().forEach(t => t.stop())
    logoutStreamRef.current = null
    setLogoutCameraActive(false)
    setLogoutCameraError(false)
  }

  const handleLogoutConfirm = () => {
    // 1. Capture frame NOW — before closing unmounts the video element
    const dataUrl = captureLogoutFrame()
    const currentUserId = (session?.user as any)?.id
    // 2. Stop camera and close everything immediately — prevents inventory modal flash
    stopLogoutCamera()
    setShowLogoutPrompt(false)
    onClose()
    // 3. Upload photo + log in background (fire-and-forget; signOut navigates away)
    ;(async () => {
      try {
        const photoUrl = dataUrl ? await uploadLogoutFrame(dataUrl) : undefined
        if (currentUserId) {
          await fetch('/api/clock-in/login-log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUserId, action: 'logout', method: 'card', photoUrl: photoUrl ?? null }),
          })
        }
      } catch { /* non-fatal */ }
    })()
    signOut({ callbackUrl: window.location.origin })
  }

  const handleResetScan = () => {
    setError(null)
    setBusinesses([])
    setSelectedBusiness(null)
    setCurrentBarcode('')
    setCurrentConfidence('low')
    setCustomSku('')
    setIsLoading(false)
  }

  const handleCustomSkuSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (customSku.trim()) {
      setCurrentBarcode(customSku.trim())
      setCurrentConfidence('high') // Custom entry is considered high confidence
      lookupBarcode(customSku.trim())
      setCustomSku('') // Clear the input
    }
  }

  const handleBusinessSelect = async (businessId: string) => {
    if (!selectedBusiness || !session?.user) return

    setIsLoading(true)
    try {
      // Emit the barcode event for the selected business
      globalBarcodeService.emitBarcodeEvent({
        barcode: currentBarcode,
        businessId,
        confidence: currentConfidence,
        userId: session.user.id
      })

      // Close the modal
      onClose()
    } catch (err) {
      console.error('Error selecting business:', err)
      setError('Failed to select business. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleViewProduct = (business: BusinessInventory) => {
    // Get current business from localStorage
    const currentBusinessId = localStorage.getItem('currentBusinessId')
    
    // Use the item ID (which is the inventory item ID) for navigation
    const itemId = business.productId // This is actually the item ID from the lookup
    const url = `/${business.businessType}/inventory${itemId ? `?productId=${itemId}` : ''}`
    
    // If different business, show confirmation
    if (currentBusinessId && currentBusinessId !== business.businessId) {
      setPendingNavigation({ url, business })
    } else {
      // Same business or no current business, navigate directly
      switchBusinessAndNavigate(business.businessId, url)
    }
  }

  const switchBusinessAndNavigate = (businessId: string, url: string) => {
    // Set loading state
    setIsSwitching(true)
    // Update localStorage with new business
    localStorage.setItem('currentBusinessId', businessId)
    // Use window.location.href for full page reload to ensure context updates
    // This prevents race condition where page loads before context updates
    window.location.href = url
    // Note: onClose and setIsSwitching(false) won't execute due to page reload
  }

  const handleConfirmBusinessSwitch = () => {
    if (pendingNavigation) {
      switchBusinessAndNavigate(pendingNavigation.business.businessId, pendingNavigation.url)
      setPendingNavigation(null)
    }
  }

  const handleCancelBusinessSwitch = () => {
    setPendingNavigation(null)
  }

  const handleSellItem = () => {
    // Find the first accessible business
    const firstAccessible = businesses.find(biz => biz.hasAccess)
    if (!firstAccessible || !firstAccessible.productId) return

    const url = firstAccessible.isInventoryItem
      ? `/${firstAccessible.businessType}/pos?businessId=${firstAccessible.businessId}&addInventoryItem=${firstAccessible.inventoryItemId}`
      : firstAccessible.isBale
      ? `/${firstAccessible.businessType}/pos?businessId=${firstAccessible.businessId}&addBale=${firstAccessible.baleId}`
      : `/${firstAccessible.businessType}/pos?businessId=${firstAccessible.businessId}&addProduct=${firstAccessible.productId}${firstAccessible.variantId ? `&variantId=${firstAccessible.variantId}` : ''}`
    const currentBusinessId = localStorage.getItem('currentBusinessId')

    if (currentBusinessId && currentBusinessId !== firstAccessible.businessId) {
      setPendingNavigation({ url, business: firstAccessible })
    } else {
      switchBusinessAndNavigate(firstAccessible.businessId, url)
    }
  }

  // Helper function to format product attributes for display
  const getProductDetails = (business: BusinessInventory) => {
    const details: string[] = []

    // Variant name (usually contains size/color info for clothing)
    if (business.variantName && business.variantName !== business.productName) {
      details.push(business.variantName)
    }

    // Variant attributes (size, color, etc.)
    const variantAttrs = business.variantAttributes || {}
    if (variantAttrs.size) details.push(`Size: ${variantAttrs.size}`)
    if (variantAttrs.color) details.push(`Color: ${variantAttrs.color}`)
    if (variantAttrs.condition) details.push(`Condition: ${variantAttrs.condition}`)

    // Product attributes
    const productAttrs = business.productAttributes || {}
    if (productAttrs.size && !variantAttrs.size) details.push(`Size: ${productAttrs.size}`)
    if (productAttrs.color && !variantAttrs.color) details.push(`Color: ${productAttrs.color}`)
    if (productAttrs.material) details.push(`Material: ${productAttrs.material}`)
    if (productAttrs.brand) details.push(`Brand: ${productAttrs.brand}`)

    // Business-type specific attributes
    if (business.businessType === 'grocery') {
      if (productAttrs.expiryDate) details.push(`Expires: ${productAttrs.expiryDate}`)
      if (productAttrs.organic) details.push('Organic')
    }

    if (business.businessType === 'hardware') {
      if (productAttrs.dimensions) details.push(`Size: ${productAttrs.dimensions}`)
      if (productAttrs.weight) details.push(`Weight: ${productAttrs.weight}`)
    }

    if (business.businessType === 'restaurant') {
      if (productAttrs.spiceLevel) details.push(`Spice: ${productAttrs.spiceLevel}`)
      if (productAttrs.allergens) details.push(`Allergens: ${productAttrs.allergens}`)
    }

    return details
  }

  if (!isOpen) return null

  // ── Route: clock-in / clock-out flow ─────────────────────────────────────
  // Rendered as a top-level early return so it is NOT inside the z-50
  // stacking context of the inventory-lookup overlay. This gives the
  // ClockInModal its own independent z-index on the page.
  if (showClockInModal && clockInEmployee) {
    return (
      <ClockInModal
        isOpen={true}
        onClose={() => {
          setShowClockInModal(false)
          onClose()
        }}
        employee={clockInEmployee}
        clockState={clockInState}
        attendance={clockInAttendance}
        isOwnCard={clockInIsOwnCard}
        onBeforeSignOut={async () => {
          if (clockInEmployee?.id) {
            await fetch('/api/clock-in/login-log', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ employeeId: clockInEmployee.id, action: 'logout', method: 'card' }),
            }).catch(() => {})
          }
        }}
      />
    )
  }

  // ── Route: logout prompt ──────────────────────────────────────────────────
  if (showLogoutPrompt) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[90]">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-sm w-full mx-4 overflow-hidden">
          <div className="px-6 py-4 bg-red-600">
            <h3 className="text-lg font-semibold text-white">Switch User?</h3>
          </div>
          <div className="p-5 space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <strong>{logoutPromptEmployee?.fullName}</strong> is in management.
              Confirming will sign out the current session.
            </p>
            {/* Camera viewfinder — always rendered so ref exists before stream arrives */}
            {logoutCameraError ? (
              <p className="text-xs text-gray-400 text-center py-1">
                Camera unavailable — proceeding without photo
              </p>
            ) : (
              <div className="relative rounded-lg overflow-hidden bg-black" style={{ minHeight: '120px' }}>
                <video ref={logoutVideoRef} autoPlay playsInline muted
                  className="w-full rounded-lg"
                  style={{ maxHeight: '160px', objectFit: 'cover' }} />
                {!logoutCameraActive && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="animate-spin h-5 w-5 border-2 border-gray-400 border-t-white rounded-full" />
                  </div>
                )}
                {logoutCameraActive && (
                  <div className="absolute bottom-1 right-2 text-white/70 text-xs bg-black/30 px-1.5 py-0.5 rounded">
                    Photo taken on action
                  </div>
                )}
              </div>
            )}
            <canvas ref={logoutCanvasRef} className="hidden" />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  const dataUrl = captureLogoutFrame()
                  const emp = logoutPromptEmployee
                  stopLogoutCamera()
                  setShowLogoutPrompt(false)
                  setPendingLogoutAfterClockIn(false)
                  setShowClockInModal(false)
                  onClose()
                  if (emp?.id) {
                    ;(async () => {
                      const photoUrl = dataUrl ? await uploadLogoutFrame(dataUrl) : undefined
                      fetch('/api/clock-in/login-log', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ employeeId: emp.id, action: 'declined', method: 'card', photoUrl: photoUrl ?? null }),
                      }).catch(() => {})
                    })()
                  }
                }}
                className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleLogoutConfirm}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Route: customer cross-business confirmation (Scenario C) ─────────────
  if (showCustomerConfirm && scannedCustomer) {
    const posRoutes: Record<string, string> = {
      restaurant: '/restaurant/pos', grocery: '/grocery/pos',
      clothing: '/clothing/pos', hardware: '/hardware/pos',
    }
    const targetPosPath = posRoutes[scannedCustomer.businessType] ?? '/universal/pos'
    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[90]">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-sm w-full mx-4 overflow-hidden">
          <div className="px-6 py-4 bg-teal-600">
            <h3 className="text-lg font-semibold text-white">Load Customer?</h3>
          </div>
          <div className="p-5 space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <strong>{scannedCustomer.name}</strong> is a customer of{' '}
              <strong>{scannedCustomer.businessName}</strong>.
              Navigate to that POS with this customer?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowCustomerConfirm(false); setScannedCustomer(null); onClose() }}
                className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const params = new URLSearchParams({ customerId: scannedCustomer.id, customerNumber: scannedCustomer.customerNumber, customerName: scannedCustomer.name })
                  if (scannedCustomer.phone) params.set('customerPhone', scannedCustomer.phone)
                  router.push(`${targetPosPath}?${params.toString()}`)
                  setShowCustomerConfirm(false)
                  onClose()
                }}
                className="flex-1 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-semibold hover:bg-teal-700"
              >
                Go to POS
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Route: inventory lookup modal ─────────────────────────────────────────
  // If a valid card scan was already handled, never fall through to inventory lookup
  if (cardScanHandled) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="mb-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {isPosCrossBiz
                  ? 'Item Not In Your Current POS'
                  : isIdentifying ? 'Scanning…'
                  : isLoading ? 'Searching for Product…'
                  : businesses.length === 0 ? 'Product Not Found'
                  : `Product Found in ${businesses.length} Business${businesses.length > 1 ? 'es' : ''}`}
              </h2>
              <button
                onClick={onClose}
                disabled={isSwitching}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ✕
              </button>
            </div>

            {/* Sell this Item button - shown when products are found */}
            {!isLoading && businesses.length > 0 && businesses.some(biz => biz.hasAccess) && !isPosCrossBiz && (
              <div className="mt-3">
                <button
                  onClick={handleSellItem}
                  disabled={isSwitching}
                  className="w-full px-4 py-3 bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  🛒 Sell this Item
                </button>
              </div>
            )}
          </div>

          {/* Barcode info + custom SKU — hidden during initial card-check phase */}
          {!isIdentifying && <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Barcode:</span>
              <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-sm text-gray-900 dark:text-gray-100">{currentBarcode}</code>
              <span className={`text-xs px-2 py-1 rounded ${
                currentConfidence === 'high' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                currentConfidence === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
              }`}>
                {currentConfidence} confidence
              </span>
            </div>

            {/* Custom SKU Input and Reset */}
            <div className="flex items-center gap-2 mb-2">
              <form onSubmit={handleCustomSkuSubmit} className="flex-1 flex gap-2">
                <input
                  type="text"
                  value={customSku}
                  onChange={(e) => setCustomSku(e.target.value)}
                  placeholder="Enter custom SKU or scan new barcode..."
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={isLoading || !customSku.trim()}
                  className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Lookup
                </button>
              </form>
              <button
                onClick={handleResetScan}
                disabled={isLoading}
                className="px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Reset and scan again"
              >
                🔄 Reset
              </button>
            </div>
          </div>}

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
            </div>
          )}

          {/* ── Success panel: always shown first when a product was just added ── */}
          {!isLoading && newlyAddedProduct ? (
            <div className="text-center py-8">
              <div className="space-y-4">
                <div className="flex items-center justify-center w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 mx-auto">
                  <span className="text-3xl">✅</span>
                </div>
                <div>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">{newlyAddedProduct.name}</p>
                  <p className="text-sm text-green-600 dark:text-green-400 mt-1">Successfully added to inventory</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                  <button
                    onClick={() => {
                      const inventoryPath = currentBusinessType ?? 'clothing'
                      router.push(`/${inventoryPath}/inventory?businessId=${currentBusinessId}&highlight=${newlyAddedProduct.id}`)
                      onClose()
                    }}
                    className="px-5 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 font-medium text-sm"
                  >
                    View in Inventory →
                  </button>
                  <button
                    onClick={onClose}
                    className="px-5 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
              <span className="ml-2 text-gray-600 dark:text-gray-400">{isIdentifying ? 'Identifying scan…' : 'Looking up product…'}</span>
            </div>
          ) : isPosCrossBiz ? (
            // ── POS cross-business view: item exists in other businesses but not current POS ──
            <div className="space-y-4">
              {/* Warning banner */}
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">⚠️</span>
                  <div>
                    <p className="font-semibold text-amber-800 dark:text-amber-200">
                      Not stocked in your current POS
                    </p>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                      This item is carried by{' '}
                      <strong>{businesses.length} other business{businesses.length !== 1 ? 'es' : ''}</strong>.
                      Stock it in{' '}
                      <strong>{currentBusinessName ?? 'your current business'}</strong> to sell it here.
                    </p>
                  </div>
                </div>
              </div>

              {/* Compact list of businesses that have it */}
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Found in:
                </p>
                {businesses.map((biz) => (
                  <div
                    key={biz.businessId}
                    className="flex items-center justify-between px-3 py-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-gray-900 dark:text-white block truncate">
                        {biz.productName}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mt-0.5">
                        {biz.businessName}
                        <span className={`px-1.5 py-0.5 rounded text-xs ${
                          biz.businessType === 'clothing'     ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' :
                          biz.businessType === 'grocery'      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                          biz.businessType === 'restaurant'   ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                          biz.businessType === 'hardware'     ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' :
                          'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                        }`}>{biz.businessType}</span>
                      </span>
                    </div>
                    <div className="text-right ml-3 shrink-0">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 block">
                        ${biz.price.toFixed(2)}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Stock: {biz.stockQuantity}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Primary CTA: stock here and add to cart */}
              {currentBusinessId && currentBusinessType && hasPermission('canManageMenu') ? (
                <button
                  onClick={() => setShowQuickStock(true)}
                  className="w-full py-3 bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 font-semibold flex items-center justify-center gap-2 shadow-sm"
                >
                  📦 Stock in {currentBusinessName ?? 'Current Business'} &amp; Add to Cart
                </button>
              ) : (
                <p className="text-sm text-center text-gray-500 dark:text-gray-400 py-2">
                  You don&apos;t have permission to add inventory to this business.
                </p>
              )}
              <button
                onClick={onClose}
                className="w-full py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          ) : businesses.length === 0 ? (
            <div className="py-4">
              {/* Clothing-specific no-match workflow */}
              {currentBusinessType === 'clothing' && currentBusinessId ? (
                <div className="space-y-3">
                  <div className="text-center pb-2">
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      ⚠️ Barcode <code className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-xs">{currentBarcode}</code> not found.
                    </p>
                  </div>

                  {linkSuccess ? (
                    <div className="text-center py-4">
                      <p className="text-green-600 dark:text-green-400 font-medium">✅ {linkSuccess}</p>
                      <button onClick={onClose} className="mt-3 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-400">
                        Close
                      </button>
                    </div>
                  ) : showLinkExisting ? (
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Search for a bale to link this barcode to:</p>
                      <input
                        type="text"
                        value={linkSearch}
                        onChange={async e => {
                          setLinkSearch(e.target.value)
                          if (e.target.value.trim().length < 2) { setLinkResults([]); return }
                          setLinkLoading(true)
                          try {
                            const res = await fetch(`/api/clothing/bales?businessId=${currentBusinessId}`)
                            const data = await res.json()
                            const q = e.target.value.toLowerCase()
                            const list = (data.data ?? []).filter((b: any) =>
                              b.category?.name?.toLowerCase().includes(q) ||
                              b.batchNumber?.toLowerCase().includes(q) ||
                              b.sku?.toLowerCase().includes(q)
                            ).slice(0, 8)
                            setLinkResults(list)
                          } catch { setLinkResults([]) }
                          finally { setLinkLoading(false) }
                        }}
                        placeholder="Search by category, batch, or SKU…"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        autoFocus
                      />
                      {linkLoading && <p className="text-xs text-gray-400 text-center">Searching…</p>}
                      {linkResults.length > 0 && (
                        <div className="space-y-1 max-h-48 overflow-y-auto">
                          {linkResults.map((b: any) => (
                            <button
                              key={b.id}
                              onClick={async () => {
                                setLinkLoading(true)
                                try {
                                  const res = await fetch('/api/clothing/products/link-barcode', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ itemId: b.id, itemType: 'bale', barcode: currentBarcode }),
                                  })
                                  const data = await res.json()
                                  if (data.success) {
                                    setLinkSuccess(`Barcode linked to ${b.category?.name} — Batch ${b.batchNumber}`)
                                    setShowLinkExisting(false)
                                  }
                                } catch { /* ignore */ }
                                finally { setLinkLoading(false) }
                              }}
                              className="w-full text-left px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-purple-50 dark:hover:bg-purple-900/20 text-sm"
                            >
                              <span className="font-medium text-gray-900 dark:text-white">{b.category?.name}</span>
                              <span className="text-gray-500 dark:text-gray-400 ml-2 text-xs font-mono">{b.batchNumber}</span>
                              <span className="text-gray-400 dark:text-gray-500 ml-2 text-xs">{b.remainingCount} left</span>
                            </button>
                          ))}
                        </div>
                      )}
                      <button
                        onClick={() => { setShowLinkExisting(false); setLinkSearch(''); setLinkResults([]) }}
                        className="w-full py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700"
                      >
                        ← Back
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => setShowLinkExisting(true)}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
                      >
                        🔗 Link to Existing Bale
                      </button>
                      <button
                        onClick={() => setShowAddStockPanel(true)}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
                      >
                        📦 Create New Stock
                      </button>
                      <button
                        onClick={onClose}
                        className="w-full py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* Non-clothing businesses: original flow */
                <div className="text-center py-8">
                  <div className="mb-4">
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      {typeof window !== 'undefined' && window.location.pathname.includes('/pos')
                        ? '⚠️ This item is not stocked in any business.'
                        : '⚠️ Product not found in any business.'}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
                      {typeof window !== 'undefined' && window.location.pathname.includes('/pos')
                        ? 'Add it to your current business inventory to sell it now.'
                        : 'This product is not in your inventory. Would you like to add it?'}
                    </p>
                    {currentBusinessId && currentBusinessType && hasPermission('canManageMenu') && (
                      <button
                        onClick={() => setShowQuickStock(true)}
                        disabled={isLoading}
                        className="px-6 py-3 bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                      >
                        {typeof window !== 'undefined' && window.location.pathname.includes('/pos')
                          ? '📦 Add to Inventory & Sell'
                          : `📦 Add to ${currentBusinessName ?? 'Current Business'} Inventory`}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <h3 className="font-medium text-gray-900 dark:text-white">Select Business:</h3>

              {/* 4.3 — Stock Here callout when current business has no match in cross-business results */}
              {currentBusinessId && currentBusinessType &&
                !businesses.some(b => b.businessId === currentBusinessId) &&
                hasPermission('canManageMenu') && (
                <div className="border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
                    ℹ️ This barcode is not stocked in your current business.
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mb-3">
                    Other businesses below carry this barcode — or stock it in your current business.
                  </p>
                  <button
                    onClick={() => setShowQuickStock(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                  >
                    📦 Stock in {currentBusinessName ?? 'Current Business'}
                  </button>
                </div>
              )}

              {businesses.map((business) => (
                <div
                  key={business.businessId}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    business.isInformational
                      ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 opacity-75'
                      : selectedBusiness === business.businessId
                        ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                  onClick={() => !business.isInformational && setSelectedBusiness(business.businessId)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900 dark:text-white">{business.productName}</h4>
                        <span className={`text-xs px-2 py-1 rounded ${
                          business.businessType === 'grocery' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                          business.businessType === 'hardware' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                          business.businessType === 'clothing' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                          business.businessType === 'restaurant' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                          {business.businessType}
                        </span>
                        {business.bogoActive && (
                          <span className="text-xs px-2 py-1 rounded font-semibold bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300">
                            🎁 BOGO {business.bogoRatio === 2 ? '1+2' : '1+1'}
                          </span>
                        )}
                        {business.isInformational && (
                          <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded">
                            View Only
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{business.businessName}</p>

                      {/* Product Details */}
                      {(() => {
                        const details = getProductDetails(business)
                        return details.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {details.map((detail, idx) => (
                              <span key={idx} className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                                {detail}
                              </span>
                            ))}
                          </div>
                        )
                      })()}

                      {/* Description */}
                      {business.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
                          {business.description}
                        </p>
                      )}

                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                        <span>Stock: {business.stockQuantity}</span>
                        <span>Price: ${business.price.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {/* View button - always available */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleViewProduct(business)
                        }}
                        disabled={isSwitching}
                        className="px-3 py-2 bg-gray-600 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        View
                      </button>
                      {/* Add to Cart - only for businesses with full access */}
                      {!business.isInformational && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            if (!business.productId) return
                            const url = business.isInventoryItem
                              ? `/${business.businessType}/pos?businessId=${business.businessId}&addInventoryItem=${business.inventoryItemId}`
                              : business.isBale
                              ? `/${business.businessType}/pos?businessId=${business.businessId}&addBale=${business.baleId}`
                              : `/${business.businessType}/pos?businessId=${business.businessId}&addProduct=${business.productId}${business.variantId ? `&variantId=${business.variantId}` : ''}`
                            const currentBusinessId = localStorage.getItem('currentBusinessId')
                            if (currentBusinessId && currentBusinessId !== business.businessId) {
                              setPendingNavigation({ url, business })
                            } else {
                              switchBusinessAndNavigate(business.businessId, url)
                            }
                          }}
                          disabled={isSwitching}
                          className="px-3 py-2 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Add to Cart
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={onClose}
              disabled={isSwitching}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* Clothing no-match: Add Stock Panel */}
      {showAddStockPanel && currentBusinessId && (
        <AddStockPanel
          businessId={currentBusinessId}
          prefillBarcode={currentBarcode}
          hideBaleTab={true}
          disablePrint={true}
          isPosRoute={typeof window !== 'undefined' && window.location.pathname.includes('/pos')}
          showBusinessSelector={typeof window !== 'undefined' && !window.location.pathname.includes('/pos')}
          businessName={currentBusinessName}
          onClose={() => setShowAddStockPanel(false)}
          onItemAdded={() => {
            setShowAddStockPanel(false)
            onClose()
          }}
          onBaleAdded={() => {
            setShowAddStockPanel(false)
            onClose()
          }}
        />
      )}

      {currentBusinessId && currentBusinessType && (
        <QuickStockFromScanModal
          isOpen={showQuickStock}
          barcode={currentBarcode}
          businessId={currentBusinessId}
          businessType={currentBusinessType}
          suggestedName={
            businesses.find(b => b.businessId === currentBusinessId)?.productName ??
            // In cross-biz mode the current business has no entry — use the first known name instead
            businesses[0]?.productName ??
            ''
          }
          onSuccess={(productId, variantId, productName) => {
            setShowQuickStock(false)
            if (typeof window !== 'undefined' && window.location.pathname.includes('/pos')) {
              // On POS page: dispatch directly to cart so the item appears immediately
              window.dispatchEvent(
                new CustomEvent('pos:add-to-cart', {
                  detail: {
                    productId,
                    variantId: variantId || undefined,
                    productName,
                    price: 0,
                  },
                })
              )
              onClose()
            } else {
              setNewlyAddedProduct({ id: productId, variantId, name: productName })
              // Refresh the lookup so the newly stocked item appears
              lookupBarcode(currentBarcode)
            }
          }}
          onClose={() => setShowQuickStock(false)}
        />
      )}

      {/* Business Switch Confirmation Dialog */}
      {pendingNavigation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Switch Business?
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              This product belongs to <span className="font-semibold">{pendingNavigation.business.businessName}</span>.
              Do you want to switch to this business to view the product?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleCancelBusinessSwitch}
                disabled={isSwitching}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmBusinessSwitch}
                disabled={isSwitching}
                className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Switch & View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay during Business Switch */}
      {isSwitching && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[70]">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-sm w-full mx-4">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 dark:border-blue-400 mb-4"></div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Switching Business...
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                Please wait while we load the product details
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}