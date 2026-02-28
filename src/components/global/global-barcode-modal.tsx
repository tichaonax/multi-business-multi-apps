'use client'

import { useState, useEffect, useRef } from 'react'
import { globalBarcodeService, GlobalBarcodeEvent } from '@/lib/services/global-barcode-service'
import { useSession, signOut } from 'next-auth/react'
import { getGlobalBarcodeScanningAccess, canStockInventoryFromModal } from '@/lib/permission-utils'
import { BusinessSelectionModal, InventoryType, ProductData } from './business-selection-modal'
import { useToast } from '@/components/ui/use-toast'
import { useRouter } from 'next/navigation'
import { ClockInModal } from '@/components/clock-in/clock-in-modal'

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
}

interface GlobalBarcodeModalProps {
  isOpen: boolean
  onClose: () => void
  barcode: string
  confidence: 'high' | 'medium' | 'low'
}

export function GlobalBarcodeModal({ isOpen, onClose, barcode, confidence }: GlobalBarcodeModalProps) {
  const { data: session } = useSession()
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
  const [showBusinessSelection, setShowBusinessSelection] = useState(false)
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

  useEffect(() => {
    if (isOpen && barcode) {
      setCurrentBarcode(barcode)
      setCurrentConfidence(confidence)
      lookupBarcode(barcode)
    }
  }, [isOpen, barcode])

  // Start/stop camera when logout prompt opens or closes
  useEffect(() => {
    if (showLogoutPrompt) {
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
        body: JSON.stringify({ employeeNumber: barcodeToLookup }),
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
          const scannedRole: string | null = clockData.scannedUserRole ?? null
          const isExempt: boolean = !!clockData.employee?.isClockInExempt
          const isDifferentAdminOrManager =
            !clockData.isOwnCard && (scannedRole === 'admin' || scannedRole === 'manager')

          if (isExempt && (isDifferentAdminOrManager || clockData.isOwnCard)) {
            // Exempt employee (own card or different admin/manager): skip clock-in, show logout prompt
            setLogoutPromptEmployee(clockData.employee)
            setShowLogoutPrompt(true)
          } else if (isDifferentAdminOrManager && !isExempt) {
            // Non-exempt admin/manager (different user): clock-in first, then logout prompt after it closes
            setClockInEmployee(clockData.employee)
            setClockInState(clockData.clockState)
            setClockInAttendance(clockData.attendance)
            setClockInIsOwnCard(false)
            setLogoutPromptEmployee(clockData.employee)
            setPendingLogoutAfterClockIn(true)
            setShowClockInModal(true)
          } else {
            // Own card non-exempt, or regular employee: normal clock-in/out flow
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
      // Card check complete — not a card scan, switching to product lookup
      setIsIdentifying(false)

      // Check user permissions
      const access = getGlobalBarcodeScanningAccess(session.user as any)
      if (!access.canScan) {
        setError('You do not have permission to use global barcode scanning')
        return
      }

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
            variantAttributes: biz.variantAttributes || {}
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

      // Auto-select the first accessible business
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

  const handleAddToInventory = () => {
    setShowBusinessSelection(true)
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

    const url = `/${firstAccessible.businessType}/pos?businessId=${firstAccessible.businessId}&addProduct=${firstAccessible.productId}${firstAccessible.variantId ? `&variantId=${firstAccessible.variantId}` : ''}`
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

  const handleBusinessSelectedForInventory = async (businessId: string, inventoryType: InventoryType, productData: ProductData) => {
    if (!session?.user) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/global/inventory-add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          barcode: currentBarcode,
          businessId,
          inventoryType,
          productData
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Failed to add inventory: ${response.status}`)
      }

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to add inventory')
      }

      // Show success message
      showToast(`✅ Product "${productData.name}" added successfully with ${productData.quantity} ${productData.unit}(s) in stock!`)

      // Close both modals
      setShowBusinessSelection(false)
      onClose()

      // Reset state
      setError(null)
      setBusinesses([])
      setSelectedBusiness(null)

    } catch (err) {
      console.error('Error adding inventory:', err)
      setError(err instanceof Error ? err.message : 'Failed to add inventory. Please try again.')
    } finally {
      setIsLoading(false)
    }
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
          if (pendingLogoutAfterClockIn) {
            setPendingLogoutAfterClockIn(false)
            setShowLogoutPrompt(true)
          } else {
            onClose()
          }
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
              <strong>{logoutPromptEmployee?.fullName}</strong> is an admin/manager.
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
                {isIdentifying ? 'Scanning…' : isLoading ? 'Searching for Product…' : businesses.length === 0 ? 'Product Not Found' : `Product Found in ${businesses.length} Business${businesses.length > 1 ? 'es' : ''}`}
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
            {!isLoading && businesses.length > 0 && businesses.some(biz => biz.hasAccess) && (
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

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
              <span className="ml-2 text-gray-600 dark:text-gray-400">{isIdentifying ? 'Identifying scan…' : 'Looking up product…'}</span>
            </div>
          ) : businesses.length === 0 ? (
            <div className="text-center py-8">
              <div className="mb-4">
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  ⚠️ Product not found in any business.
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
                  This product is not in your inventory. Would you like to add it?
                </p>
                {canStockInventoryFromModal(session?.user as any) && (
                  <button
                    onClick={handleAddToInventory}
                    disabled={isLoading}
                    className="px-6 py-3 bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    📦 Add to Inventory
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <h3 className="font-medium text-gray-900 dark:text-white">Select Business:</h3>
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
                            if (business.productId) {
                              const url = `/${business.businessType}/pos?businessId=${business.businessId}&addProduct=${business.productId}${business.variantId ? `&variantId=${business.variantId}` : ''}`
                              const currentBusinessId = localStorage.getItem('currentBusinessId')
                              if (currentBusinessId && currentBusinessId !== business.businessId) {
                                setPendingNavigation({ url, business })
                              } else {
                                switchBusinessAndNavigate(business.businessId, url)
                              }
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

      <BusinessSelectionModal
        isOpen={showBusinessSelection}
        onClose={() => setShowBusinessSelection(false)}
        onBusinessSelected={handleBusinessSelectedForInventory}
        barcode={currentBarcode}
      />

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