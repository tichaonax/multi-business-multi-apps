/**
 * WebSocket-based synchronization for customer display
 *
 * Provides real-time communication between POS and customer display
 * when they are on separate devices (different computers, tablets, etc.).
 *
 * Uses Socket.io for reliable WebSocket connections with automatic reconnection.
 */

import { io, Socket } from 'socket.io-client'
import type { CartMessage, CartMessageType } from './broadcast-sync'

export interface WebSocketSyncOptions {
  businessId: string
  terminalId: string
  serverUrl?: string
  onMessage?: (message: CartMessage) => void
  onConnected?: () => void
  onDisconnected?: () => void
  onError?: (error: Error) => void
}

export enum ConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error'
}

/**
 * WebSocket sync implementation using Socket.io
 * Real-time synchronization for separate-device displays
 */
export class WebSocketSync {
  private socket: Socket | null = null
  private options: WebSocketSyncOptions
  private status: ConnectionStatus = ConnectionStatus.DISCONNECTED
  private reconnectAttempts: number = 0
  private maxReconnectAttempts: number = 10

  constructor(options: WebSocketSyncOptions) {
    this.options = {
      serverUrl: options.serverUrl || (typeof window !== 'undefined' ? window.location.origin : ''),
      ...options
    }
  }

  /**
   * Get current connection status
   */
  getStatus(): ConnectionStatus {
    return this.status
  }

  /**
   * Initialize WebSocket connection
   */
  connect(): void {
    if (this.socket?.connected) {
      console.log('WebSocketSync: Already connected')
      return
    }

    try {
      this.status = ConnectionStatus.CONNECTING

      // Create Socket.io client
      this.socket = io(this.options.serverUrl!, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: this.maxReconnectAttempts,
        timeout: 10000
      })

      // Connection established
      this.socket.on('connect', () => {
        console.log('WebSocketSync: Connected to server')
        this.status = ConnectionStatus.CONNECTED
        this.reconnectAttempts = 0

        // Join business and terminal-specific room
        const room = `business-${this.options.businessId}-terminal-${this.options.terminalId}`
        this.socket?.emit('join-room', { room })

        this.options.onConnected?.()
      })

      // Disconnection
      this.socket.on('disconnect', (reason) => {
        console.log('WebSocketSync: Disconnected -', reason)
        this.status = ConnectionStatus.DISCONNECTED
        this.options.onDisconnected?.()
      })

      // Reconnection attempt
      this.socket.on('reconnect_attempt', (attemptNumber) => {
        console.log(`WebSocketSync: Reconnection attempt ${attemptNumber}`)
        this.status = ConnectionStatus.RECONNECTING
        this.reconnectAttempts = attemptNumber
      })

      // Reconnection success
      this.socket.on('reconnect', (attemptNumber) => {
        console.log(`WebSocketSync: Reconnected after ${attemptNumber} attempts`)
        this.status = ConnectionStatus.CONNECTED
        this.reconnectAttempts = 0
      })

      // Reconnection failed
      this.socket.on('reconnect_failed', () => {
        console.error('WebSocketSync: Reconnection failed after max attempts')
        this.status = ConnectionStatus.ERROR
        const error = new Error('Failed to reconnect after maximum attempts')
        this.options.onError?.(error)
      })

      // Connection error
      this.socket.on('connect_error', (error) => {
        console.error('WebSocketSync: Connection error -', error.message)
        this.status = ConnectionStatus.ERROR
        this.options.onError?.(error)
      })

      // Cart update message received
      this.socket.on('cart-update', (message: CartMessage) => {
        try {
          // Validate message is for this business/terminal
          if (
            message.businessId === this.options.businessId &&
            message.terminalId === this.options.terminalId
          ) {
            this.options.onMessage?.(message)
          }
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error))
          this.options.onError?.(err)
        }
      })

      // Heartbeat/keepalive
      this.socket.on('pong', () => {
        // Server acknowledged ping
      })

      // Start heartbeat
      this.startHeartbeat()

    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      this.status = ConnectionStatus.ERROR
      this.options.onError?.(err)
    }
  }

  /**
   * Send a cart update message via WebSocket
   */
  send(type: CartMessageType, payload: CartMessage['payload']): void {
    if (!this.socket?.connected) {
      console.warn('WebSocketSync: Cannot send message, socket not connected')
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

      const room = `business-${this.options.businessId}-terminal-${this.options.terminalId}`
      this.socket.emit('cart-update', { room, message })
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      this.options.onError?.(err)
    }
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    if (typeof window === 'undefined') return

    const heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('ping')
      } else {
        clearInterval(heartbeatInterval)
      }
    }, 30000) // Ping every 30 seconds
  }

  /**
   * Disconnect and clean up
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      this.status = ConnectionStatus.DISCONNECTED
      console.log('WebSocketSync: Disconnected')
    }
  }

  /**
   * Check if currently connected
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false
  }

  /**
   * Get number of reconnection attempts
   */
  getReconnectAttempts(): number {
    return this.reconnectAttempts
  }
}

/**
 * Utility function to create a WebSocketSync instance
 */
export function createWebSocketSync(options: WebSocketSyncOptions): WebSocketSync {
  return new WebSocketSync(options)
}
