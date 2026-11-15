import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { canUserViewAccount, canUserWriteAccount, getUserGrantLevel } from '@/lib/expense-account-access'
import { emitNotification } from '@/lib/notifications/notification-emitter'
import { comboRequestApproverIds } from '@/lib/expense-account/combo-request-approvers'
import { validateExpenseLinks, linkExpenseLineTx, ExpenseLinkError } from '@/lib/restaurant-expense-combo'
import { refreshRestaurantExpenseNoticeForAccount } from '@/lib/restaurant-expense-notify'
import { readComboLoanFields, loanComboProblems, comboSubmittedNotice } from '@/lib/expense-account/combo-business-loan'

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
        returnedByUser: { select: { id: true, name: true } },
        loanBusiness: { select: { id: true, name: true } }, // MBM-333
        _count: { select: { returns: true } },              // MBM-333
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

    // MBM-319: items may carry a recorded restaurant expense line to pay
    const linkError = await validateExpenseLinks(accountId, sections)
    if (linkError) return NextResponse.json({ error: linkError }, { status: 400 })

    const isSubmitting = status === 'SUBMITTED'
    const now = new Date()

    // MBM-333: business-loan fields (target business + receiving account)
    const loan = await readComboLoanFields(accountId, body)
    if (loan.error) return NextResponse.json({ error: loan.error }, { status: 400 })
    if (isSubmitting && loan.fields?.isBusinessLoan) {
      const problems = loanComboProblems({
        ...loan.fields, id: '', accountId, title, submittedAt: null, createdAt: now,
        sections: sections.map((s: any) => ({
          ...s, id: '',
          items: (s.items || []).map((i: any) => ({ ...i, id: '', restaurantExpenseLineId: i.expenseLineId ?? null })),
        })),
      })
      if (problems.length > 0) return NextResponse.json({ error: `This is a business loan — ${problems.join('; ')}.` }, { status: 400 })
    }

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
          ...(loan.fields ?? {}),
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
          const created = await tx.comboPaymentRequestItems.create({
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
          if (item.expenseLineId) await linkExpenseLineTx(tx, item.expenseLineId, created.id)
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
        const cashierIds = await comboRequestApproverIds(accountId, user.id) // MBM-326: admin fallback
        if (cashierIds.length > 0) {
          const loanBusiness = loan.fields?.isBusinessLoan && loan.fields.loanBusinessId
            ? await prisma.businesses.findUnique({ where: { id: loan.fields.loanBusinessId }, select: { name: true } })
            : null
          await emitNotification({
            userIds: cashierIds,
            ...comboSubmittedNotice({
              title: title.trim(),
              submitterName: user.name ?? 'Someone',
              amount: requestedAmount,
              loanBusinessName: loan.fields?.isBusinessLoan ? (loanBusiness?.name ?? 'a business') : null,
            }),
            linkUrl: `/expense-accounts/${accountId}/combo-requests/${comboRequest!.id}`,
          })
        }
      } catch (notifErr) {
        console.error('Notification error (non-blocking):', notifErr)
      }
    }

    // MBM-319: linked recorded expenses are no longer pending — update the notice
    if ((sections || []).some((s: any) => (s.items || []).some((i: any) => i.expenseLineId))) {
      refreshRestaurantExpenseNoticeForAccount(accountId).catch(() => {})
    }
    return NextResponse.json({ success: true, data: comboRequest }, { status: 201 })
  } catch (error) {
    if (error instanceof ExpenseLinkError) return NextResponse.json({ error: error.message }, { status: 409 })
    console.error('Error creating combo request:', error)
    return NextResponse.json({ error: 'Failed to create combo request' }, { status: 500 })
  }
}
