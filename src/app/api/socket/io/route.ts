/**
 * Socket.io API Route
 *
 * Provides information about the Socket.io server status and connection details.
 * The actual Socket.io server runs on the custom Next.js server (server.ts).
 */

import { NextResponse } from 'next/server'
import { getSocketServer, isSocketServerInitialized } from '@/lib/customer-display/socket-server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/socket/io
 * Returns Socket.io server status and connection information
 */
export async function GET() {
  try {
    const isInitialized = isSocketServerInitialized()
    const io = getSocketServer()

    if (!isInitialized || !io) {
      return NextResponse.json(
        {
          status: 'not_initialized',
          message: 'Socket.io server is not initialized. Make sure you are running the custom server (npm run dev).',
          initialized: false
        },
        { status: 503 }
      )
    }

    // Get server statistics
    const sockets = await io.fetchSockets()
    const rooms = new Set<string>()

    sockets.forEach(socket => {
      socket.rooms.forEach(room => {
        if (room !== socket.id) { // Exclude default room (socket's own ID)
          rooms.add(room)
        }
      })
    })

    return NextResponse.json({
      status: 'running',
      initialized: true,
      stats: {
        connectedClients: sockets.length,
        activeRooms: rooms.size,
        rooms: Array.from(rooms)
      },
      connection: {
        url: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8080',
        transports: ['websocket', 'polling']
      }
    })
  } catch (error) {
    console.error('[Socket.io API] Error:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        initialized: false
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/socket/io/broadcast
 * Manually broadcast a message to a specific room (for testing)
 */
export async function POST(request: Request) {
  try {
    const io = getSocketServer()

    if (!io) {
      return NextResponse.json(
        { success: false, message: 'Socket.io server not initialized' },
        { status: 503 }
      )
    }

    const body = await request.json()
    const { room, event, data } = body

    if (!room || !event) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields: room, event' },
        { status: 400 }
      )
    }

    // Broadcast to room
    io.to(room).emit(event, data)

    return NextResponse.json({
      success: true,
      message: `Event "${event}" broadcast to room "${room}"`
    })
  } catch (error) {
    console.error('[Socket.io API] Broadcast error:', error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
