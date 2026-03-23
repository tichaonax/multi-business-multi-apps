import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { hasPermission, isSystemAdmin } from '@/lib/permission-utils'

/**
 * POST /api/stock-take/reports/[id]/sign-off
 *
 * Body: { role: 'employee' | 'manager', employeeId? }
 *
 * - role='employee': marks the calling user's StockTakeReportEmployees row as signed.
 *   The employeeId must be provided and must match a responsible employee on this report
 *   linked to the current user's email.
 *
 * - role='manager': sets managerSignedAt on the report.
 *   Requires canAccessFinancialData permission.
 *
 * After each sign-off: if ALL employees have signed AND manager has signed,
 * status → SIGNED_OFF and fullySignedOffAt is set.
 */

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await context.params
    const body = await request.json()
    const { role } = body

    if (!role || !['employee', 'manager'].includes(role)) {
      return NextResponse.json({ error: 'role must be "employee" or "manager"' }, { status: 400 })
    }

    const report = await prisma.stockTakeReports.findUnique({
      where: { id },
      include: {
        employees: true,
      },
    })

    if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    if (report.status === 'VOIDED') return NextResponse.json({ error: 'Report is voided' }, { status: 409 })
    if (report.status === 'SIGNED_OFF') return NextResponse.json({ error: 'Report already fully signed off' }, { status: 409 })

    const now = new Date()

    if (role === 'manager') {
      const canManage = isSystemAdmin(user) || hasPermission(user, 'canAccessFinancialData', report.businessId)
      if (!canManage) return NextResponse.json({ error: 'Forbidden — requires financial access' }, { status: 403 })
      if (report.managerSignedAt) return NextResponse.json({ error: 'Manager already signed off' }, { status: 409 })

      await prisma.stockTakeReports.update({
        where: { id },
        data: { managerSignedAt: now, managerSignedById: user.id },
      })
    } else {
      // Employee sign-off — find the responsible employee row linked to this user
      const employee = await prisma.employees.findFirst({
        where: { email: user.email, isActive: true },
        select: { id: true },
      })

      if (!employee) {
        return NextResponse.json({ error: 'No active employee record found for your account' }, { status: 403 })
      }

      const empRow = report.employees.find(e => e.employeeId === employee.id)
      if (!empRow) return NextResponse.json({ error: 'You are not listed as a responsible employee on this report' }, { status: 403 })
      if (empRow.signedAt) return NextResponse.json({ error: 'You have already signed off this report' }, { status: 409 })

      await prisma.stockTakeReportEmployees.update({
        where: { id: empRow.id },
        data: { signedAt: now, signedByUserId: user.id },
      })
    }

    // Re-fetch updated report to check if fully signed off
    const updated = await prisma.stockTakeReports.findUnique({
      where: { id },
      include: { employees: true },
    })

    if (updated) {
      const allEmployeesSigned = updated.employees.every(e => e.signedAt !== null)
      const managerSigned = updated.managerSignedAt !== null

      if (allEmployeesSigned && managerSigned && updated.status !== 'SIGNED_OFF') {
        await prisma.stockTakeReports.update({
          where: { id },
          data: { status: 'SIGNED_OFF', fullySignedOffAt: now },
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[stock-take/reports/sign-off POST]', error)
    return NextResponse.json({ error: 'Sign-off failed' }, { status: 500 })
  }
}
