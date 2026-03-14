/**
 * Socket.io Server Singleton
 *
 * Provides a global Socket.io server instance for customer display synchronization.
 * Uses singleton pattern to ensure only one server instance exists across API routes.
 */

import { Server as SocketIOServer } from 'socket.io'
import { Server as HTTPServer } from 'http'

// Use global to share the instance across Next.js webpack bundles and the custom server ts-node process
const g = global as typeof globalThis & { __socketio?: SocketIOServer }

function getIo(): SocketIOServer | null { return g.__socketio ?? null }
function setIo(server: SocketIOServer): void { g.__socketio = server }

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
  if (getIo()) {
    console.log('Socket.io server already initialized')
    return getIo()!
  }

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*', // Configure based on environment
      methods: ['GET', 'POST']
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000
  })

  setIo(io)

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

    // Join global chat room
    socket.on('join-chat-room', () => {
      socket.join('chat:general')
      console.log(`[Socket.io] Client ${clientId} joined chat:general`)
    })

    // Join personal notification room — client sends their userId
    socket.on('join-notification-room', (data: { userId: string }) => {
      try {
        const room = `user:${data.userId}`
        socket.join(room)
        console.log(`[Socket.io] Client ${clientId} joined notification room: ${room}`)
        socket.emit('notification-room-joined', { room })
      } catch (error) {
        console.error('[Socket.io] Error joining notification room:', error)
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
  return getIo()
}

/**
 * Check if Socket.io server is initialized
 */
export function isSocketServerInitialized(): boolean {
  return getIo() !== null
}

/**
 * Manually set the Socket.io server instance (for custom server setups)
 */
export function setSocketServer(server: SocketIOServer): void {
  setIo(server)
}

/**
 * Emit a notification event to all sockets in a user's personal room.
 * Room name convention: "user:{userId}"
 * No-op if the socket server is not initialized (server still saves to DB).
 */
export function emitToUser(userId: string, eventName: string, payload: unknown): void {
  const io = getIo()
  if (!io) return
  io.to(`user:${userId}`).emit(eventName, payload)
}

/**
 * Emit an event to all sockets in a named room (e.g. "chat:general").
 */
export function emitToRoom(room: string, eventName: string, payload: unknown): void {
  const io = getIo()
  if (!io) return
  io.to(room).emit(eventName, payload)
}
