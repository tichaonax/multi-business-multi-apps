import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

// GET /api/expense-account/[accountId]/eod-submissions
// Returns pending EOD batch submissions for this account (depositId === null = not yet allocated)
export async function GET(
  req: NextRequest,
  { params }: { params: { accountId: string } }
) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { accountId } = params

  try {
    const submissions = await prisma.paymentBatchSubmissions.findMany({
      where: {
        expenseAccountId: accountId,
        depositId: null,
        eodBatch: {
          status: { not: 'CANCELLED' }
        }
      },
      include: {
        business: { select: { id: true, name: true } },
        cashier: { select: { id: true, name: true } },
        eodBatch: { select: { id: true, eodDate: true, status: true, paymentCount: true } }
      },
      orderBy: { submittedAt: 'desc' },
    })

    return NextResponse.json({ data: submissions })
  } catch (error) {
    console.error('EOD submissions fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch EOD submissions' }, { status: 500 })
  }
}
