import { NextRequest, NextResponse } from 'next/server'
import {
  runAllAutomation,
  processPaymentReminders,
  processOverdueNotifications,
  applyLateFees,
  processDefaults,
  getLaybyStatistics
} from '@/lib/layby/automation'

/**
 * GET /api/layby-automation
 * Get layby statistics for monitoring
 *
 * Query params:
 * - businessId: optional, filter by business
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId') || undefined

    const statistics = await getLaybyStatistics(businessId)

    return NextResponse.json({
      data: statistics,
      message: 'Layby statistics retrieved successfully'
    })
  } catch (error) {
    console.error('Error fetching layby statistics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch layby statistics' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/layby-automation
 * Run automation tasks manually or via scheduled job
 *
 * Body:
 * - task: 'all' | 'reminders' | 'overdue' | 'late-fees' | 'defaults'
 * - businessId: optional, filter by business
 * - apiKey: required for security (in production)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { task = 'all', businessId, apiKey } = body

    // In production, verify apiKey for security
    // const expectedApiKey = process.env.LAYBY_AUTOMATION_API_KEY
    // if (apiKey !== expectedApiKey) {
    //   return NextResponse.json(
    //     { error: 'Unauthorized' },
    //     { status: 401 }
    //   )
    // }

    let result: any

    switch (task) {
      case 'reminders':
        result = await processPaymentReminders(businessId)
        break

      case 'overdue':
        result = await processOverdueNotifications(businessId)
        break

      case 'late-fees':
        result = await applyLateFees(businessId)
        break

      case 'defaults':
        result = await processDefaults(businessId)
        break

      case 'all':
      default:
        result = await runAllAutomation(businessId)
        break
    }

    return NextResponse.json({
      data: result,
      message: `Layby automation ${task} completed successfully`
    })
  } catch (error) {
    console.error('Error running layby automation:', error)
    return NextResponse.json(
      { error: 'Failed to run layby automation' },
      { status: 500 }
    )
  }
}
