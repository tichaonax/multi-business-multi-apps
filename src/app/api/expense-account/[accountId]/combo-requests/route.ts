import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { canUserViewAccount, canUserWriteAccount, getUserGrantLevel } from '@/lib/expense-account-access'
import { emitNotification } from '@/lib/notifications/notification-emitter'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { accountId } = await params
    const permissions = getEffectivePermissions(user)

    if (!permissions.canAccessExpenseAccount && user.role !== 'admin') {
      if (!(await canUserViewAccount(user.id, accountId))) {
        return NextResponse.json({ error: 'You do not have permission to access this expense account' }, { status: 403 })
      }
    }

    // UserAccess canViewOwnOnly=true OR PERSONAL grant → own requests only
    const [accessRecord, grantLevel] = await Promise.all([
      prisma.expenseAccountUserAccess.findUnique({
        where: { accountId_userId: { accountId, userId: user.id } },
        select: { canViewOwnOnly: true, isActive: true },
      }),
      getUserGrantLevel(user.id, accountId),
    ])
    const isRestricted = !!(accessRecord?.isActive && accessRecord?.canViewOwnOnly) || grantLevel === 'PERSONAL'

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const requests = await prisma.comboPaymentRequests.findMany({
      where: {
        accountId,
        ...(isRestricted ? { createdBy: user.id } : {}),
        ...(status ? { status: status as any } : {}),
      },
      include: {
        creator: { select: { id: true, name: true } },
        approver: { select: { id: true, name: true } },
        sections: {
          orderBy: { sortOrder: 'asc' },
          include: { items: { orderBy: { sortOrder: 'asc' } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: requests })
  } catch (error) {
    console.error('Error fetching combo requests:', error)
    return NextResponse.json({ error: 'Failed to fetch combo requests' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { accountId } = await params
    const permissions = getEffectivePermissions(user)

    if (!permissions.canMakeExpensePayments && user.role !== 'admin') {
      // Allow: UserAccess.canCreateRequests, PERSONAL grant, or FULL grant
      const [accessRecord, postGrantLevel] = await Promise.all([
        prisma.expenseAccountUserAccess.findUnique({
          where: { accountId_userId: { accountId, userId: user.id } },
          select: { canCreateRequests: true, isActive: true },
        }),
        getUserGrantLevel(user.id, accountId),
      ])
      const hasRestrictedAccess = (accessRecord?.isActive && accessRecord?.canCreateRequests) || postGrantLevel === 'PERSONAL'
      if (!hasRestrictedAccess && !(await canUserWriteAccount(user.id, accountId))) {
        return NextResponse.json({ error: 'You do not have permission to create requests on this account' }, { status: 403 })
      }
    }

    const body = await request.json()
    const { title, notes, status = 'DRAFT', sections = [] } = body

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    // Calculate requestedAmount from item estimatedAmounts
    let requestedAmount = 0
    for (const section of sections) {
      for (const item of (section.items || [])) {
        if (item.estimatedAmount) requestedAmount += Number(item.estimatedAmount)
      }
    }

    const isSubmitting = status === 'SUBMITTED'
    const now = new Date()

    const comboRequest = await prisma.$transaction(async (tx) => {
      const req = await tx.comboPaymentRequests.create({
        data: {
          accountId,
          title: title.trim(),
          notes: notes?.trim() || null,
          status: isSubmitting ? 'SUBMITTED' : 'DRAFT',
          requestedAmount,
          createdBy: user.id,
          submittedAt: isSubmitting ? now : null,
        },
      })

      for (const [sIdx, section] of sections.entries()) {
        const sec = await tx.comboPaymentRequestSections.create({
          data: {
            requestId: req.id,
            sectionType: section.sectionType,
            sectionName: section.sectionName || null,
            payeeType: section.payeeType || null,
            payeePersonId: section.payeePersonId || null,
            payeeUserId: section.payeeUserId || null,
            payeeEmployeeId: section.payeeEmployeeId || null,
            payeeBusinessId: section.payeeBusinessId || null,
            payeeSupplierId: section.payeeSupplierId || null,
            notes: section.notes || null,
            sortOrder: section.sortOrder ?? sIdx,
          },
        })

        for (const [iIdx, item] of (section.items || []).entries()) {
          await tx.comboPaymentRequestItems.create({
            data: {
              requestId: req.id,
              sectionId: sec.id,
              description: item.description,
              quantity: item.quantity ?? null,
              unit: item.unit || null,
              estimatedAmount: item.estimatedAmount ?? null,
              categoryId: item.categoryId || null,
              subcategoryId: item.subcategoryId || null,
              payeeType: item.payeeType || null,
              payeePersonId: item.payeePersonId || null,
              payeeUserId: item.payeeUserId || null,
              payeeEmployeeId: item.payeeEmployeeId || null,
              payeeBusinessId: item.payeeBusinessId || null,
              payeeSupplierId: item.payeeSupplierId || null,
              notes: item.notes || null,
              sortOrder: item.sortOrder ?? iIdx,
            },
          })
        }
      }

      return tx.comboPaymentRequests.findUnique({
        where: { id: req.id },
        include: {
          creator: { select: { id: true, name: true } },
          sections: {
            orderBy: { sortOrder: 'asc' },
            include: { items: { orderBy: { sortOrder: 'asc' } } },
          },
        },
      })
    })

    // Notify cashiers/managers when submitted (non-blocking)
    if (isSubmitting) {
      try {
        const grants = await prisma.expenseAccountGrants.findMany({
          where: { expenseAccountId: accountId, permissionLevel: 'FULL' },
          select: { userId: true },
        })
        const cashierIds = grants.map(g => g.userId).filter(id => id !== user.id)
        if (cashierIds.length > 0) {
          await emitNotification({
            userIds: cashierIds,
            type: 'COMBO_REQUEST_SUBMITTED',
            title: 'New Combo Request',
            message: `${user.name} submitted "${title.trim()}" — $${requestedAmount.toFixed(2)}`,
            linkUrl: `/expense-accounts/${accountId}/combo-requests/${comboRequest!.id}`,
          })
        }
      } catch (notifErr) {
        console.error('Notification error (non-blocking):', notifErr)
      }
    }

    return NextResponse.json({ success: true, data: comboRequest }, { status: 201 })
  } catch (error) {
    console.error('Error creating combo request:', error)
    return NextResponse.json({ error: 'Failed to create combo request' }, { status: 500 })
  }
}
