import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { mergeSiblingAccount, validateSiblingAccountForMerge } from '@/lib/expense-account-utils'
import { getEffectivePermissions } from '@/lib/permission-utils'

/**
 * POST /api/expense-account/[accountId]/merge
 * Merge a sibling account back into its parent account
 *
 * Body:
 * - confirmZeroBalance: boolean (required) - Confirmation that account has zero balance
 * - confirmIrreversible: boolean (required) - Confirmation that merge is irreversible
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { accountId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { accountId } = params

    // Get user permissions
    const permissions = getEffectivePermissions(session.user)
    if (!permissions.canMergeSiblingAccounts) {
      return NextResponse.json(
        { error: 'You do not have permission to merge sibling accounts' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { confirmZeroBalance, confirmIrreversible } = body

    // Validate required confirmations
    if (!confirmZeroBalance) {
      return NextResponse.json(
        { error: 'You must confirm that the account has zero balance' },
        { status: 400 }
      )
    }

    if (!confirmIrreversible) {
      return NextResponse.json(
        { error: 'You must confirm that the merge operation is irreversible' },
        { status: 400 }
      )
    }

    // First validate that the merge is possible
    const validation = await validateSiblingAccountForMerge(accountId)
    if (!validation.canMerge) {
      if (validation.error && validation.error.includes('Sibling account not found')) {
        return NextResponse.json({ error: validation.error }, { status: 404 })
      }
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    // Perform the merge
    const mergeResult = await mergeSiblingAccount(accountId, session.user.id)

    return NextResponse.json({
      success: true,
      message: mergeResult.message,
      data: {
        mergedAccountId: mergeResult.mergedAccountId,
        parentAccountId: mergeResult.parentAccountId,
      },
    })
  } catch (error) {
    console.error('Error merging sibling account:', error)

    // Handle specific error cases
    if (error instanceof Error) {
      if (error.message.includes('Sibling account not found')) {
        return NextResponse.json(
          { error: 'Sibling account not found' },
          { status: 404 }
        )
      }

      if (error.message.includes('Account is not a sibling account')) {
        return NextResponse.json(
          { error: 'Account is not a sibling account' },
          { status: 400 }
        )
      }

      if (error.message.includes('Cannot merge account with non-zero balance')) {
        return NextResponse.json(
          { error: 'Cannot merge account with non-zero balance' },
          { status: 400 }
        )
      }

      if (error.message.includes('not eligible for merging')) {
        return NextResponse.json(
          { error: 'Account is not eligible for merging' },
          { status: 400 }
        )
      }
      if (error.message.includes('Target account not found')) {
        return NextResponse.json(
          { error: 'Target account not found' },
          { status: 404 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to merge sibling account' },
      { status: 500 }
    )
  }
}