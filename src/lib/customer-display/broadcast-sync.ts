/**
 * BroadcastChannel-based synchronization for customer display
 *
 * Provides instant, zero-latency communication between POS and customer display
 * when both are running on the same device (same browser, different windows/tabs).
 *
 * Uses the native BroadcastChannel API - no server infrastructure needed.
 */

export type CartMessageType =
  | 'ADD_ITEM'
  | 'REMOVE_ITEM'
  | 'UPDATE_QUANTITY'
  | 'CLEAR_CART'
  | 'CART_STATE'
  | 'SET_GREETING'
  | 'SET_PAGE_CONTEXT'

export interface CartItem {
  id: string
  name: string
  quantity: number
  price: number
  variant?: string
  imageUrl?: string
}

export interface CartMessage {
  type: CartMessageType
  payload: {
    items?: CartItem[]
    item?: CartItem
    itemId?: string
    quantity?: number
    subtotal: number
    tax: number
    total: number
    employeeName?: string
    businessName?: string
    businessPhone?: string
    customMessage?: string
    pageContext?: 'pos' | 'marketing' // Track which page user is on
  }
  timestamp: number
  businessId: string
  terminalId: string
}

export interface BroadcastSyncOptions {
  businessId: string
  terminalId: string
  onMessage?: (message: CartMessage) => void
  onError?: (error: Error) => void
}

/**
 * BroadcastChannel sync implementation
 * Instant synchronization for same-device displays
 */
export class BroadcastSync {
  private channel: BroadcastChannel | null = null
  private options: BroadcastSyncOptions
  private messageHandler: ((event: MessageEvent<CartMessage>) => void) | null = null

  constructor(options: BroadcastSyncOptions) {
    this.options = options
  }

  /**
   * Check if BroadcastChannel is supported by the browser
   */
  static isSupported(): boolean {
    return typeof BroadcastChannel !== 'undefined'
  }

  /**
   * Initialize the broadcast channel
   */
  connect(): void {
    if (!BroadcastSync.isSupported()) {
      const error = new Error('BroadcastChannel API is not supported in this browser')
      this.options.onError?.(error)
      return
    }

    try {
      // Create channel with unique name per business/terminal
      const channelName = `customer-display-${this.options.businessId}-${this.options.terminalId}`
      this.channel = new BroadcastChannel(channelName)

      // Expose channel for debugging
      if (typeof window !== 'undefined') {
        (window as any)._customerDisplayChannel = this.channel
        console.log('🔍 [DEBUG] Channel created:', {
          channelName,
          businessId: this.options.businessId,
          terminalId: this.options.terminalId
        })
      }

      // Set up message handler
      this.messageHandler = (event: MessageEvent<CartMessage>) => {
        try {
          const message = event.data

          console.log('🔍 [DEBUG] Message received on channel:', {
            messageType: message?.type,
            messageBusinessId: message?.businessId,
            messageTerminalId: message?.terminalId,
            expectedBusinessId: this.options.businessId,
            expectedTerminalId: this.options.terminalId,
            willAccept: message?.businessId === this.options.businessId && message?.terminalId === this.options.terminalId
          })

          // Validate message structure
          if (!message || typeof message !== 'object') {
            console.warn('BroadcastSync: Invalid message received', message)
            return
          }

          // Ensure message is for this business/terminal
          if (
            message.businessId !== this.options.businessId ||
            message.terminalId !== this.options.terminalId
          ) {
            // Ignore messages from other business/terminals
            console.log('🔍 [DEBUG] Message ignored - businessId/terminalId mismatch')
            return
          }

          console.log('✅ [DEBUG] Message accepted and forwarding to onMessage callback')
          // Call message callback
          this.options.onMessage?.(message)
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error))
          this.options.onError?.(err)
        }
      }

      this.channel.addEventListener('message', this.messageHandler)

      console.log(`BroadcastSync: Connected to channel ${channelName}`)
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      this.options.onError?.(err)
    }
  }

  /**
   * Send a cart update message
   */
  send(type: CartMessageType, payload: CartMessage['payload']): void {
    if (!this.channel) {
      console.warn('BroadcastSync: Cannot send message, channel not connected')
      return
    }

    try {
      const message: CartMessage = {
        type,
        payload,
        timestamp: Date.now(),
        businessId: this.options.businessId,
        terminalId: this.options.terminalId
      }

      console.log('📤 [DEBUG] Sending message:', {
        type: message.type,
        businessId: message.businessId,
        terminalId: message.terminalId,
        channelName: this.channel.name,
        payloadKeys: Object.keys(payload)
      })

      this.channel.postMessage(message)
      console.log('✅ [DEBUG] Message posted to BroadcastChannel')
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      console.error('❌ [DEBUG] Error sending message:', err)
      this.options.onError?.(err)
    }
  }

  /**
   * Disconnect and clean up
   */
  disconnect(): void {
    if (this.channel && this.messageHandler) {
      this.channel.removeEventListener('message', this.messageHandler)
      this.channel.close()
      this.channel = null
      this.messageHandler = null
      console.log('BroadcastSync: Disconnected')
    }
  }

  /**
   * Check if currently connected
   */
  isConnected(): boolean {
    return this.channel !== null
  }
}

/**
 * Utility function to create a BroadcastSync instance
 */
export function createBroadcastSync(options: BroadcastSyncOptions): BroadcastSync {
  return new BroadcastSync(options)
}
