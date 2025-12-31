import { getGlobalBarcodeScanningAccess, SessionUser } from '@/lib/permission-utils'

export interface GlobalBarcodeEvent {
  barcode: string
  timestamp: number
  source: 'keyboard' | 'input' | 'paste'
  confidence: 'high' | 'medium' | 'low'
}

export interface GlobalBarcodeListener {
  onBarcodeScanned: (event: GlobalBarcodeEvent) => void
  priority?: number // Higher priority listeners get called first
}

class GlobalBarcodeService {
  private static instance: GlobalBarcodeService
  private listeners: GlobalBarcodeListener[] = []
  private isActive = false
  private scanBuffer = ''
  private lastKeyTime = 0
  private scanTimeout: NodeJS.Timeout | null = null
  private isInitialized = false
  private currentUser: SessionUser | null = null
  private cleanup: (() => void) | null = null

  private constructor() {}

  static getInstance(): GlobalBarcodeService {
    if (!GlobalBarcodeService.instance) {
      GlobalBarcodeService.instance = new GlobalBarcodeService()
    }
    return GlobalBarcodeService.instance
  }

  /**
   * Initialize the global barcode service with user session
   * Should be called once when the app starts
   */
  initialize(user: SessionUser | null): void {
    if (this.isInitialized) {
      this.updateUser(user)
      return
    }

    console.log('🔧 GlobalBarcodeService: Initializing with user:', user?.id || 'null', 'role:', user?.role || 'none')

    this.currentUser = user
    this.setupGlobalListeners()
    this.isInitialized = true

    // Auto-enable if user has permission
    if (this.canEnableGlobalScanning()) {
      console.log('✅ GlobalBarcodeService: Auto-enabling scanning for user')
      this.enable()
    } else {
      console.log('❌ GlobalBarcodeService: Not enabling scanning - user lacks permission')
    }
  }

  /**
   * Update the current user session
   */
  updateUser(user: SessionUser | null): void {
    const wasEnabled = this.isActive
    this.currentUser = user
    const canEnable = this.canEnableGlobalScanning()

    // Auto-enable/disable based on permission changes
    if (wasEnabled && !canEnable) {
      this.disable()
    } else if (!wasEnabled && canEnable) {
      this.enable()
    }
  }

  /**
   * Enable global barcode scanning
   */
  enable(): void {
    if (!this.canEnableGlobalScanning()) {
      console.warn('GlobalBarcodeService: Cannot enable - insufficient permissions')
      return
    }

    this.isActive = true
    console.log('GlobalBarcodeService: Global barcode scanning enabled')
  }

  /**
   * Disable global barcode scanning
   */
  disable(): void {
    this.isActive = false
    this.clearScanBuffer()
    console.log('GlobalBarcodeService: Global barcode scanning disabled')
  }

  /**
   * Check if global barcode scanning is currently enabled
   */
  isEnabled(): boolean {
    return this.isActive && this.canEnableGlobalScanning()
  }

  /**
   * Add a listener for global barcode events
   */
  addListener(listener: GlobalBarcodeListener): () => void {
    this.listeners.push(listener)
    // Sort by priority (higher first)
    this.listeners.sort((a, b) => (b.priority || 0) - (a.priority || 0))

    // Return cleanup function
    return () => {
      const index = this.listeners.indexOf(listener)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  /**
   * Check if global scanning can be enabled for current user
   */
  private canEnableGlobalScanning(): boolean {
    if (!this.currentUser) return false
    const access = getGlobalBarcodeScanningAccess(this.currentUser)
    return access.canScan
  }

  /**
   * Setup global keyboard and input listeners
   */
  private setupGlobalListeners(): void {
    if (typeof document === 'undefined') return

    const KEY_GAP_THRESHOLD = 80 // ms between keys to consider as continuous scan
    const COMPLETE_DELAY = 150

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Skip if global scanning is not enabled
      if (!this.isEnabled()) {
        console.log('🚫 GlobalBarcodeService: Scanning not enabled, ignoring key:', e.key)
        return
      }

      console.log('⌨️ GlobalBarcodeService: Processing key:', e.key, 'enabled:', this.isEnabled())

      // Ignore keys typed into inputs/textareas/contenteditable
      const target = e.target as HTMLElement | null
      if (target) {
        const tag = target.tagName
        const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || (target as any).isContentEditable
        if (isInput) {
          console.log('🚫 GlobalBarcodeService: Ignoring key in input field')
          return
        }
      }

      const now = Date.now()
      const timeDiff = now - this.lastKeyTime
      const isChar = e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey

      if (isChar) {
        // If keys are close together or we've already started a buffer, append
        if (timeDiff < KEY_GAP_THRESHOLD || this.scanBuffer.length > 0) {
          this.scanBuffer += e.key
        } else {
          // Start a new buffer
          this.scanBuffer = e.key
        }

        this.lastKeyTime = now

        // Reset timeout
        if (this.scanTimeout) {
          clearTimeout(this.scanTimeout)
        }

        this.scanTimeout = setTimeout(() => {
          const barcode = this.scanBuffer.trim()
          this.clearScanBuffer()

          if (barcode.length >= 4) { // Minimum barcode length
            this.emitBarcodeEvent({
              barcode,
              timestamp: Date.now(),
              source: 'keyboard',
              confidence: this.calculateConfidence(barcode)
            })
          }
        }, COMPLETE_DELAY)
      } else if (e.key === 'Enter' && this.scanBuffer.length > 0) {
        if (this.scanTimeout) {
          clearTimeout(this.scanTimeout)
        }

        const barcode = this.scanBuffer.trim()
        this.clearScanBuffer()

        this.emitBarcodeEvent({
          barcode,
          timestamp: Date.now(),
          source: 'keyboard',
          confidence: this.calculateConfidence(barcode)
        })
      }
    }

    // Listen for paste events (some scanners paste the barcode)
    const handlePaste = (e: ClipboardEvent) => {
      if (!this.isEnabled()) {
        return
      }

      // Check if paste is happening in an input field
      const target = e.target as HTMLElement | null
      if (target) {
        const tag = target.tagName
        const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || (target as any).isContentEditable
        if (isInput) {
          // Allow normal paste operation in input fields
          console.log('✅ GlobalBarcodeService: Allowing paste into input field')
          return
        }
      }

      // Only intercept paste if NOT in an input field (barcode scanner pasting to document)
      const pasted = (e.clipboardData || (window as any).clipboardData)?.getData('text') || ''
      if (pasted && pasted.trim().length >= 4) {
        e.preventDefault() // Prevent the paste from going to focused element

        console.log('📋 GlobalBarcodeService: Intercepting paste as barcode:', pasted.trim())

        this.emitBarcodeEvent({
          barcode: pasted.trim(),
          timestamp: Date.now(),
          source: 'paste',
          confidence: this.calculateConfidence(pasted.trim())
        })
      }
    }

    document.addEventListener('keydown', handleGlobalKeyDown)
    document.addEventListener('paste', handlePaste)

    // Store cleanup function for potential future use
    this.cleanup = () => {
      document.removeEventListener('keydown', handleGlobalKeyDown)
      document.removeEventListener('paste', handlePaste)
      if (this.scanTimeout) {
        clearTimeout(this.scanTimeout)
        this.scanTimeout = null
      }
    }
  }

  /**
   * Emit barcode event to all listeners
   */
  private emitBarcodeEvent(event: GlobalBarcodeEvent): void {
    // Call listeners in priority order
    for (const listener of this.listeners) {
      try {
        listener.onBarcodeScanned(event)
      } catch (error) {
        console.error('Error in global barcode listener:', error)
      }
    }
  }

  /**
   * Calculate confidence level for a barcode based on format
   */
  private calculateConfidence(barcode: string): 'high' | 'medium' | 'low' {
    // High confidence: looks like a standard barcode format
    if (/^\d{12}$/.test(barcode)) return 'high' // UPC-A
    if (/^\d{13}$/.test(barcode)) return 'high' // EAN-13
    if (/^\d{8}$/.test(barcode)) return 'high'  // EAN-8

    // Medium confidence: alphanumeric with reasonable length
    if (/^[A-Z0-9]{8,18}$/i.test(barcode)) return 'medium'

    // Low confidence: other patterns
    return 'low'
  }

  /**
   * Clear the scan buffer and timeout
   */
  private clearScanBuffer(): void {
    this.scanBuffer = ''
    if (this.scanTimeout) {
      clearTimeout(this.scanTimeout)
      this.scanTimeout = null
    }
  }

  /**
   * Destroy the service and clean up listeners
   */
  destroy(): void {
    if (this.cleanup) {
      this.cleanup()
    }
    this.listeners = []
    this.isInitialized = false
  }

  /**
   * Get current scan buffer (for debugging)
   */
  getScanBuffer(): string {
    return this.scanBuffer
  }

  /**
   * Manually trigger barcode processing (for custom SKU entry)
   */
  processBarcode(barcode: string, source: 'keyboard' | 'input' | 'paste' = 'input'): void {
    if (!this.isEnabled()) {
      console.log('🚫 GlobalBarcodeService: Scanning not enabled, ignoring manual barcode:', barcode)
      return
    }

    console.log('🔧 GlobalBarcodeService: Processing manual barcode:', barcode)

    // Calculate confidence for manual entry
    const confidence = this.calculateConfidence(barcode)

    // Emit the barcode event
    this.emitBarcodeEvent({
      barcode: barcode.trim(),
      timestamp: Date.now(),
      source,
      confidence
    })
  }

  /**
   * Check if service is active
   */
  isServiceActive(): boolean {
    return this.isActive
  }

  /**
   * Check if service is initialized
   */
  isServiceInitialized(): boolean {
    return this.isInitialized
  }

  /**
   * Get number of registered listeners
   */
  getListenerCount(): number {
    return this.listeners.length
  }
}

// Export singleton instance
export const globalBarcodeService = GlobalBarcodeService.getInstance()

// Export types
export type { GlobalBarcodeService }