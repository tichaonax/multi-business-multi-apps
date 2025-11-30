import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createSiblingAccount, getSiblingAccounts } from '@/lib/expense-account-utils'
import { getEffectivePermissions } from '@/lib/permission-utils'

/**
 * GET /api/expense-account/[accountId]/sibling
 * Get all sibling accounts for the specified parent account
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { accountId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { accountId } = params

    if (!accountId || accountId === 'undefined' || accountId === 'null' || accountId.trim() === '') {
      return NextResponse.json({ error: 'Parent account ID is required' }, { status: 400 })
    }

    // Get user permissions
    const permissions = getEffectivePermissions(session.user)
    if (!permissions.canAccessExpenseAccount) {
      return NextResponse.json(
        { error: 'You do not have permission to access expense accounts' },
        { status: 403 }
      )
    }

    // Get all sibling accounts for this parent
    const siblingAccounts = await getSiblingAccounts(accountId)

    return NextResponse.json({
      success: true,
      data: {
        parentAccountId: accountId,
        siblingAccounts: siblingAccounts.map((account: any) => ({
          id: account.id,
          accountNumber: account.accountNumber,
          accountName: account.accountName,
          balance: Number(account.balance),
          description: account.description,
          isActive: account.isActive,
          lowBalanceThreshold: Number(account.lowBalanceThreshold),
          parentAccountId: account.parentAccountId,
          siblingNumber: account.siblingNumber,
          isSibling: account.isSibling,
          canMerge: account.canMerge,
          createdBy: account.createdBy,
          createdAt: account.createdAt.toISOString(),
          updatedAt: account.updatedAt.toISOString(),
          creator: account.creator,
        })),
      },
    })
  } catch (error) {
    console.error('Error fetching sibling accounts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sibling accounts' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/expense-account/[accountId]/sibling
 * Create a sibling account for the specified parent account
 *
 * Body:
 * - name: string (required) - Name for the sibling account
 * - description?: string - Optional description
 * - lowBalanceThreshold?: number - Optional low balance threshold
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

    if (!accountId || accountId === 'undefined' || accountId === 'null' || accountId.trim() === '') {
      return NextResponse.json({ error: 'Parent account ID is required' }, { status: 400 })
    }

    // Get user permissions
    const permissions = getEffectivePermissions(session.user)
    if (!permissions.canCreateSiblingAccounts) {
      return NextResponse.json(
        { error: 'You do not have permission to create sibling accounts' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, description, lowBalanceThreshold } = body

    // Validate required fields
    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'Sibling account name is required' },
        { status: 400 }
      )
    }

    // Validate name length
    if (name.trim().length > 100) {
      return NextResponse.json(
        { error: 'Sibling account name cannot exceed 100 characters' },
        { status: 400 }
      )
    }

    // Validate low balance threshold if provided
    if (lowBalanceThreshold !== undefined && lowBalanceThreshold < 0) {
      return NextResponse.json(
        { error: 'Low balance threshold must be non-negative' },
        { status: 400 }
      )
    }

    // Create the sibling account
    const siblingAccount = await createSiblingAccount(
      accountId,
      {
        name: name.trim(),
        description: description?.trim() || null,
        lowBalanceThreshold: lowBalanceThreshold || 0,
      },
      session.user.id
    )

    return NextResponse.json(
      {
        success: true,
        message: 'Sibling account created successfully',
        data: {
          siblingAccount: {
            id: siblingAccount.id,
            accountNumber: siblingAccount.accountNumber,
            accountName: siblingAccount.accountName,
            balance: Number(siblingAccount.balance),
            description: siblingAccount.description,
            isActive: siblingAccount.isActive,
            lowBalanceThreshold: Number(siblingAccount.lowBalanceThreshold),
            parentAccountId: siblingAccount.parentAccountId,
            siblingNumber: siblingAccount.siblingNumber,
            isSibling: siblingAccount.isSibling,
            canMerge: siblingAccount.canMerge,
            createdBy: siblingAccount.createdBy,
            createdAt: siblingAccount.createdAt.toISOString(),
            updatedAt: siblingAccount.updatedAt.toISOString(),
          },
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating sibling account:', error)

    // Handle specific error cases
    if (error instanceof Error) {
      if (error.message.includes('Parent account not found')) {
        return NextResponse.json(
          { error: 'Parent account not found' },
          { status: 404 }
        )
      }

      if (error.message.includes('Cannot create sibling account from another sibling account')) {
        return NextResponse.json(
          { error: 'Cannot create sibling account from another sibling account' },
          { status: 400 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to create sibling account' },
      { status: 500 }
    )
  }
}