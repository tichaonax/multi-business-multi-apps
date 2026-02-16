import { NextResponse } from 'next/server'
import { isSystemAdmin } from '@/lib/permission-utils'
import { checkAndExpireTokens } from '@/lib/wifi-portal/token-expiration-job'
import { getServerUser } from '@/lib/get-server-user'

/**
 * POST /api/wifi-portal/admin/expire-tokens
 * Manually trigger token expiration job
 * Admin only
 */
export async function POST() {
  try {
    const user = await getServerUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only system admins can trigger this
    if (!isSystemAdmin(user)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    console.log(`[ExpireTokens] Manual trigger by ${user.email}`)

    const result = await checkAndExpireTokens()

    return NextResponse.json({
      success: true,
      message: 'Token expiration job completed',
      result,
    })
  } catch (error: any) {
    console.error('[ExpireTokens] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to run expiration job',
        details: error.message,
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/wifi-portal/admin/expire-tokens
 * Check job status (dry run - no actual expiration)
 */
export async function GET() {
  try {
    const user = await getServerUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isSystemAdmin(user)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // TODO: Return count of tokens that would be expired
    return NextResponse.json({
      message: 'Dry run not implemented yet',
      hint: 'Use POST to trigger actual expiration',
    })
  } catch (error: any) {
    console.error('[ExpireTokens] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to check expiration status',
        details: error.message,
      },
      { status: 500 }
    )
  }
}
