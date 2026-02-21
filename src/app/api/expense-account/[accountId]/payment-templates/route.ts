import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { canUserViewAccount } from '@/lib/expense-account-access'
import { getServerUser } from '@/lib/get-server-user'

/**
 * GET /api/expense-account/[accountId]/payment-templates
 * Returns up to 7 most recently used distinct category+subcategory combos
 * for the Smart Daily Expenses quick-pay panel.
 *
 * Payee data is intentionally excluded — the user must select a payee fresh
 * each time to prevent incorrect payment attribution.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const permissions = getEffectivePermissions(user)
    const { accountId } = await params

    if (!permissions.canAccessExpenseAccount && user.role !== 'admin') {
      if (!(await canUserViewAccount(user.id, accountId))) {
        return NextResponse.json(
          { error: 'You do not have permission to access this expense account' },
          { status: 403 }
        )
      }
    }

    const account = await prisma.expenseAccounts.findUnique({
      where: { id: accountId },
      select: { id: true },
    })

    if (!account) {
      return NextResponse.json(
        { error: 'Expense account not found' },
        { status: 404 }
      )
    }

    // Fetch recent payments ordered newest-first. We scan up to 100 to find
    // 7 distinct category+subcategory combos without a heavy GROUP BY query.
    const recentPayments = await prisma.expenseAccountPayments.findMany({
      where: {
        expenseAccountId: accountId,
        categoryId: { not: null },
      },
      orderBy: { paymentDate: 'desc' },
      take: 100,
      select: {
        categoryId: true,
        subcategoryId: true,
        subSubcategoryId: true,
        paymentDate: true,
        category: { select: { id: true, name: true, emoji: true } },
        subcategory: { select: { id: true, name: true } },
      },
    })

    // Deduplicate in JS — first occurrence per key is the most recent use.
    const seen = new Set<string>()
    const templates: {
      templateKey: string
      categoryId: string
      categoryName: string | null
      categoryEmoji: string | null
      subcategoryId: string | null
      subcategoryName: string | null
      subSubcategoryId: string | null
      lastUsed: string
    }[] = []

    for (const payment of recentPayments) {
      const key = `${payment.categoryId}_${payment.subcategoryId ?? 'null'}`
      if (!seen.has(key)) {
        seen.add(key)
        templates.push({
          templateKey: key,
          categoryId: payment.categoryId!,
          categoryName: payment.category?.name ?? null,
          categoryEmoji: payment.category?.emoji ?? null,
          subcategoryId: payment.subcategoryId,
          subcategoryName: payment.subcategory?.name ?? null,
          subSubcategoryId: payment.subSubcategoryId,
          lastUsed: payment.paymentDate.toISOString(),
        })
        if (templates.length >= 7) break
      }
    }

    return NextResponse.json({ success: true, data: templates })
  } catch (error) {
    console.error('Error fetching payment templates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payment templates' },
      { status: 500 }
    )
  }
}
