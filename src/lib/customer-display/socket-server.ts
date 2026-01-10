/**
 * Socket.io Server Singleton
 *
 * Provides a global Socket.io server instance for customer display synchronization.
 * Uses singleton pattern to ensure only one server instance exists across API routes.
 */

import { Server as SocketIOServer } from 'socket.io'
import { Server as HTTPServer } from 'http'

let io: SocketIOServer | null = null

interface RoomJoinData {
  room: string
}

interface CartUpdateData {
  room: string
  message: any
}

/**
 * Initialize Socket.io server (call once)
 */
export function initSocketServer(httpServer: HTTPServer): SocketIOServer {
  if (io) {
    console.log('Socket.io server already initialized')
    return io
  }

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*', // Configure based on environment
      methods: ['GET', 'POST']
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000
  })

  // Connection handler
  io.on('connection', (socket) => {
    const clientId = socket.id
    console.log(`[Socket.io] Client connected: ${clientId}`)

    // Join room event
    socket.on('join-room', (data: RoomJoinData) => {
      try {
        const { room } = data
        socket.join(room)
        console.log(`[Socket.io] Client ${clientId} joined room: ${room}`)

        // Confirm room join
        socket.emit('room-joined', { room })
      } catch (error) {
        console.error('[Socket.io] Error joining room:', error)
        socket.emit('error', { message: 'Failed to join room' })
      }
    })

    // Cart update event
    socket.on('cart-update', (data: CartUpdateData) => {
      try {
        const { room, message } = data

        // Broadcast to all clients in the room except sender
        socket.to(room).emit('cart-update', message)

        console.log(`[Socket.io] Cart update broadcast to room: ${room}`)
      } catch (error) {
        console.error('[Socket.io] Error broadcasting cart update:', error)
        socket.emit('error', { message: 'Failed to broadcast cart update' })
      }
    })

    // Ping/pong for keepalive
    socket.on('ping', () => {
      socket.emit('pong')
    })

    // Disconnection
    socket.on('disconnect', (reason) => {
      console.log(`[Socket.io] Client disconnected: ${clientId}, reason: ${reason}`)
    })

    // Error handling
    socket.on('error', (error) => {
      console.error(`[Socket.io] Socket error for client ${clientId}:`, error)
    })
  })

  // Server-level error handling
  io.engine.on('connection_error', (err) => {
    console.error('[Socket.io] Connection error:', err)
  })

  console.log('[Socket.io] Server initialized successfully')
  return io
}

/**
 * Get existing Socket.io server instance
 */
export function getSocketServer(): SocketIOServer | null {
  return io
}

/**
 * Check if Socket.io server is initialized
 */
export function isSocketServerInitialized(): boolean {
  return io !== null
}

/**
 * Manually set the Socket.io server instance (for custom server setups)
 */
export function setSocketServer(server: SocketIOServer): void {
  io = server
}
