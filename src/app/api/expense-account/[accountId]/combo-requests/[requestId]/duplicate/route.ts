import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { canUserViewAccount } from '@/lib/expense-account-access'

/**
 * POST /api/expense-account/[accountId]/combo-requests/[requestId]/duplicate
 * Creates a DRAFT copy of an existing combo request (all sections + items).
 * Returns { newRequestId } so the frontend can redirect to the edit page.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ accountId: string; requestId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { accountId, requestId } = await params
    const permissions = getEffectivePermissions(user)

    if (!permissions.canAccessExpenseAccount && user.role !== 'admin') {
      if (!(await canUserViewAccount(user.id, accountId))) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const original = await prisma.comboPaymentRequests.findFirst({
      where: { id: requestId, accountId },
      include: {
        sections: {
          orderBy: { sortOrder: 'asc' },
          include: {
            items: { orderBy: { sortOrder: 'asc' } },
          },
        },
      },
    })

    if (!original) {
      return NextResponse.json({ error: 'Combo request not found' }, { status: 404 })
    }

    const newRequest = await prisma.comboPaymentRequests.create({
      data: {
        accountId,
        title: `Copy of ${original.title}`,
        notes: original.notes ?? undefined,
        status: 'DRAFT',
        createdBy: user.id,
        sections: {
          create: original.sections.map(section => ({
            sectionType:      section.sectionType,
            sectionName:      section.sectionName ?? undefined,
            payeeType:        section.payeeType ?? undefined,
            payeePersonId:    section.payeePersonId ?? undefined,
            payeeUserId:      section.payeeUserId ?? undefined,
            payeeEmployeeId:  section.payeeEmployeeId ?? undefined,
            payeeBusinessId:  section.payeeBusinessId ?? undefined,
            payeeSupplierId:  section.payeeSupplierId ?? undefined,
            notes:            section.notes ?? undefined,
            sortOrder:        section.sortOrder,
            items: {
              create: section.items.map(item => ({
                description:    item.description,
                quantity:       item.quantity ?? undefined,
                unit:           item.unit ?? undefined,
                estimatedAmount: item.estimatedAmount ?? undefined,
                categoryId:     item.categoryId ?? undefined,
                subcategoryId:  item.subcategoryId ?? undefined,
                payeeType:      item.payeeType ?? undefined,
                payeePersonId:  item.payeePersonId ?? undefined,
                payeeUserId:    item.payeeUserId ?? undefined,
                payeeEmployeeId: item.payeeEmployeeId ?? undefined,
                payeeBusinessId: item.payeeBusinessId ?? undefined,
                payeeSupplierId: item.payeeSupplierId ?? undefined,
                notes:          item.notes ?? undefined,
                sortOrder:      item.sortOrder,
              })),
            },
          })),
        },
      },
      select: { id: true },
    })

    return NextResponse.json({ newRequestId: newRequest.id }, { status: 201 })
  } catch (err) {
    console.error('[POST combo-requests/duplicate]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
