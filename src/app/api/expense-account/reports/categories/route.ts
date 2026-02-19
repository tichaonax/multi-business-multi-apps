import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

/**
 * GET /api/expense-account/reports/categories
 * Spending breakdown by category across all (or one) expense account
 *
 * Query params:
 * - startDate, endDate (optional)
 * - accountId (optional - filter to a single account)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const permissions = getEffectivePermissions(user)
    if (!permissions.canViewExpenseReports) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const accountId = searchParams.get('accountId')

    const where: any = { status: 'SUBMITTED', categoryId: { not: null } }
    if (accountId) where.expenseAccountId = accountId
    if (startDate || endDate) {
      where.paymentDate = {}
      if (startDate) where.paymentDate.gte = new Date(startDate)
      if (endDate) where.paymentDate.lte = new Date(endDate)
    }

    const payments = await prisma.expenseAccountPayments.findMany({
      where,
      select: {
        id: true,
        amount: true,
        categoryId: true,
        category: { select: { id: true, name: true, emoji: true, color: true } },
      },
    })

    const totalAmount = payments.reduce((sum, p) => sum + Number(p.amount), 0)

    // Aggregate by category (pattern from [accountId]/reports/route.ts)
    const categoryMap = new Map<string, any>()
    payments.forEach((p) => {
      if (!p.categoryId || !p.category) return
      const key = p.categoryId
      if (!categoryMap.has(key)) {
        categoryMap.set(key, {
          categoryId: key,
          categoryName: p.category.name,
          emoji: p.category.emoji,
          color: p.category.color,
          totalAmount: 0,
          paymentCount: 0,
          percentage: 0,
        })
      }
      const cat = categoryMap.get(key)!
      cat.totalAmount += Number(p.amount)
      cat.paymentCount++
    })

    const byCategory = Array.from(categoryMap.values())
      .map((cat) => ({ ...cat, percentage: totalAmount > 0 ? (cat.totalAmount / totalAmount) * 100 : 0 }))
      .sort((a, b) => b.totalAmount - a.totalAmount)

    return NextResponse.json({
      success: true,
      data: {
        byCategory,
        systemTotals: {
          totalSpent: totalAmount,
          totalPayments: payments.length,
          topCategory: byCategory[0]?.categoryName || null,
        },
      },
    })
  } catch (error) {
    console.error('Error generating category report:', error)
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}
