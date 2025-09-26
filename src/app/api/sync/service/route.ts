/**
 * Sync Service Control API
 * Provides endpoints to monitor and control the background sync service
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'

const execAsync = promisify(exec)
const prisma = new PrismaClient()

/**
 * GET - Get sync service status
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has admin permissions
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
      select: { role: true }
    })

    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Try to get service status
    try {
      const servicePath = path.join(process.cwd(), 'sync-service.bat')
      const { stdout } = await execAsync(`"${servicePath}" status`)

      // Parse the output to determine if service is running
      const isRunning = stdout.includes('Running: true')

      return NextResponse.json({
        isRunning,
        output: stdout,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      return NextResponse.json({
        isRunning: false,
        error: 'Service not accessible',
        timestamp: new Date().toISOString()
      })
    }

  } catch (error) {
    console.error('Sync service status error:', error)
    return NextResponse.json(
      { error: 'Failed to get service status' },
      { status: 500 }
    )
  }
}

/**
 * POST - Control sync service (start/stop/restart/sync)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has admin permissions
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
      select: { role: true }
    })

    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { action } = await request.json()

    if (!['start', 'stop', 'restart', 'sync'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be start, stop, restart, or sync' },
        { status: 400 }
      )
    }

    try {
      const servicePath = path.join(process.cwd(), 'sync-service.bat')

      let command: string
      switch (action) {
        case 'start':
          command = `"${servicePath}" start`
          break
        case 'stop':
          command = `"${servicePath}" stop`
          break
        case 'restart':
          command = `"${servicePath}" restart`
          break
        case 'sync':
          command = `"${servicePath}" sync`
          break
        default:
          throw new Error('Invalid action')
      }

      const { stdout, stderr } = await execAsync(command)

      return NextResponse.json({
        success: true,
        action,
        output: stdout,
        error: stderr || null,
        timestamp: new Date().toISOString()
      })

    } catch (error: any) {
      return NextResponse.json({
        success: false,
        action,
        error: error.message,
        timestamp: new Date().toISOString()
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Sync service control error:', error)
    return NextResponse.json(
      { error: 'Failed to control service' },
      { status: 500 }
    )
  }
}