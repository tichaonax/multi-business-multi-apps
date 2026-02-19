import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { getServerUser } from '@/lib/get-server-user'
import { canUserAccessAccount } from '@/lib/expense-account-access'

/**
 * GET /api/expense-account/[accountId]
 * Fetch single expense account details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { accountId } = await params

    // Check access: admin, own-business member, or explicit grant
    const hasAccess = await canUserAccessAccount(user, accountId)
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'You do not have permission to access this expense account' },
        { status: 403 }
      )
    }

    // Get expense account
    const account = await prisma.expenseAccounts.findUnique({
      where: { id: accountId },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    if (!account) {
      return NextResponse.json(
        { error: 'Expense account not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        account: {
          id: account.id,
          accountNumber: account.accountNumber,
          accountName: account.accountName,
          balance: Number(account.balance),
          description: account.description,
          isActive: account.isActive,
          lowBalanceThreshold: Number(account.lowBalanceThreshold),
          createdBy: account.createdBy,
          createdAt: account.createdAt.toISOString(),
          updatedAt: account.updatedAt.toISOString(),
          creator: account.creator,
          businessId: account.businessId,
          accountType: account.accountType,
          // Sibling account fields
          parentAccountId: account.parentAccountId,
          siblingNumber: account.siblingNumber,
          isSibling: account.isSibling,
          canMerge: account.canMerge,
        },
      },
    })
  } catch (error) {
    console.error('Error fetching expense account:', error)
    return NextResponse.json(
      { error: 'Failed to fetch expense account' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/expense-account/[accountId]
 * Update expense account (name, description, threshold)
 *
 * Body:
 * - accountName?: string
 * - description?: string
 * - lowBalanceThreshold?: number
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user permissions (pass full user object, not just ID)
    const permissions = getEffectivePermissions(user)
    if (!permissions.canCreateExpenseAccount) {
      return NextResponse.json(
        { error: 'You do not have permission to update expense accounts' },
        { status: 403 }
      )
    }

    const { accountId} = await params
    const body = await request.json()
    const { accountName, description, lowBalanceThreshold } = body

    // Check if account exists
    const existing = await prisma.expenseAccounts.findUnique({
      where: { id: accountId },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Expense account not found' },
        { status: 404 }
      )
    }

    // If updating account name, check for duplicates
    if (accountName && accountName.trim() !== existing.accountName) {
      const duplicate = await prisma.expenseAccounts.findFirst({
        where: {
          accountName: accountName.trim(),
          id: { not: accountId },
        },
      })

      if (duplicate) {
        return NextResponse.json(
          { error: 'An expense account with this name already exists' },
          { status: 400 }
        )
      }
    }

    // Validate threshold if provided
    if (lowBalanceThreshold !== undefined && lowBalanceThreshold < 0) {
      return NextResponse.json(
        { error: 'Low balance threshold must be non-negative' },
        { status: 400 }
      )
    }

    // Build update data
    const updateData: any = {}
    if (accountName !== undefined) updateData.accountName = accountName.trim()
    if (description !== undefined) updateData.description = description?.trim() || null
    if (lowBalanceThreshold !== undefined) updateData.lowBalanceThreshold = lowBalanceThreshold

    // Update account
    const account = await prisma.expenseAccounts.update({
      where: { id: accountId },
      data: updateData,
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Expense account updated successfully',
      data: {
        account: {
          id: account.id,
          accountNumber: account.accountNumber,
          accountName: account.accountName,
          balance: Number(account.balance),
          description: account.description,
          isActive: account.isActive,
          lowBalanceThreshold: Number(account.lowBalanceThreshold),
          createdBy: account.createdBy,
          createdAt: account.createdAt.toISOString(),
          updatedAt: account.updatedAt.toISOString(),
          creator: account.creator,
        },
      },
    })
  } catch (error) {
    console.error('Error updating expense account:', error)
    return NextResponse.json(
      { error: 'Failed to update expense account' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/expense-account/[accountId]
 * Soft delete expense account (admin only, check for active balance)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user permissions (pass full user object, not just ID)
    const permissions = getEffectivePermissions(user)
    if (!permissions.canDeleteExpenseAccounts) {
      return NextResponse.json(
        { error: 'You do not have permission to delete expense accounts' },
        { status: 403 }
      )
    }

    const { accountId } = await params

    // Check if account exists
    const account = await prisma.expenseAccounts.findUnique({
      where: { id: accountId },
    })

    if (!account) {
      return NextResponse.json(
        { error: 'Expense account not found' },
        { status: 404 }
      )
    }

    // Check if account has balance
    if (Number(account.balance) > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete account with active balance. Please transfer or withdraw funds first.',
        },
        { status: 400 }
      )
    }

    // Soft delete (mark as inactive)
    await prisma.expenseAccounts.update({
      where: { id: accountId },
      data: { isActive: false },
    })

    return NextResponse.json({
      success: true,
      message: 'Expense account deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting expense account:', error)
    return NextResponse.json(
      { error: 'Failed to delete expense account' },
      { status: 500 }
    )
  }
}
