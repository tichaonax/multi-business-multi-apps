import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

/**
 * GET /api/projects/[projectId]/unlinked-payments
 * Returns expense account payments that are not yet linked to any project,
 * scoped to the expense accounts belonging to the project's business.
 *
 * Query params:
 * - search: filter by payee name, notes, or category (optional)
 * - limit: max results (default 50)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { projectId } = await params
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')?.trim() || ''
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)

    const project = await prisma.projects.findUnique({
      where: { id: projectId },
      select: { id: true, businessId: true },
    })
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    // Find expense accounts for this business (or all personal accounts if no businessId)
    const accountWhere: any = project.businessId
      ? { businessId: project.businessId, isActive: true }
      : { isActive: true }

    const accounts = await prisma.expenseAccounts.findMany({
      where: accountWhere,
      select: { id: true, accountName: true },
    })
    const accountIds = accounts.map(a => a.id)
    if (accountIds.length === 0) return NextResponse.json({ payments: [] })

    const searchFilter: any = search
      ? {
          OR: [
            { notes: { contains: search, mode: 'insensitive' } },
            { payeeEmployee: { fullName: { contains: search, mode: 'insensitive' } } },
            { payeePerson: { fullName: { contains: search, mode: 'insensitive' } } },
            { payeeBusiness: { name: { contains: search, mode: 'insensitive' } } },
            { payeeSupplier: { name: { contains: search, mode: 'insensitive' } } },
            { category: { name: { contains: search, mode: 'insensitive' } } },
          ],
        }
      : {}

    const payments = await prisma.expenseAccountPayments.findMany({
      where: {
        expenseAccountId: { in: accountIds },
        projectId: null,
        status: { in: ['PAID', 'SUBMITTED', 'APPROVED'] },
        ...searchFilter,
      },
      include: {
        payeeEmployee: { select: { id: true, fullName: true } },
        payeePerson: { select: { id: true, fullName: true } },
        payeeBusiness: { select: { id: true, name: true } },
        payeeSupplier: { select: { id: true, name: true } },
        category: { select: { id: true, name: true, emoji: true } },
        expenseAccount: { select: { id: true, accountName: true } },
      },
      orderBy: { paymentDate: 'desc' },
      take: limit,
    })

    const result = payments.map(p => {
      const payeeName =
        p.payeeEmployee?.fullName ||
        p.payeePerson?.fullName ||
        p.payeeBusiness?.name ||
        (p as any).payeeSupplier?.name ||
        p.payeeType

      return {
        id: p.id,
        expenseAccountId: p.expenseAccountId,
        expenseAccountName: (p as any).expenseAccount?.accountName ?? '',
        amount: Number(p.amount),
        paymentDate: p.paymentDate.toISOString(),
        notes: p.notes,
        status: p.status,
        payeeType: p.payeeType,
        payeeName,
        category: p.category,
      }
    })

    return NextResponse.json({ payments: result })
  } catch (err) {
    console.error('unlinked-payments error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
