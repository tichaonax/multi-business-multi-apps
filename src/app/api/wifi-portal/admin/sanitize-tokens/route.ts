import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { isSystemAdmin } from '@/lib/permission-utils'
import { sanitizeUnsoldTokens } from '@/lib/wifi-portal/token-expiration-job'

/**
 * POST /api/wifi-portal/admin/sanitize-tokens
 * Manually trigger token sanitization job
 * Verifies that unsold tokens exist on ESP32 and disables any that don't
 * Admin only
 */
export async function POST() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only system admins can trigger this
    if (!isSystemAdmin(session.user)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    console.log(`[SanitizeTokens] Manual trigger by ${session.user.email}`)

    const result = await sanitizeUnsoldTokens()

    return NextResponse.json({
      success: true,
      message: 'Token sanitization job completed',
      result,
    })
  } catch (error: any) {
    console.error('[SanitizeTokens] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to run sanitization job',
        details: error.message,
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/wifi-portal/admin/sanitize-tokens
 * Get sanitization job information
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isSystemAdmin(session.user)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    return NextResponse.json({
      message: 'Token sanitization verifies that unsold tokens exist on ESP32 devices',
      description: 'This job checks each business with active portal integration and verifies that all UNUSED tokens in the database ledger actually exist on the ESP32 device. Tokens that are not found on ESP32 are marked as DISABLED to prevent future sale attempts.',
      purpose: 'Prevents selling tokens that customers cannot redeem',
      hint: 'Use POST to trigger manual sanitization',
      automation: 'This job should be run periodically via the Windows sync service or a scheduled task',
    })
  } catch (error: any) {
    console.error('[SanitizeTokens] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to get sanitization info',
        details: error.message,
      },
      { status: 500 }
    )
  }
}
