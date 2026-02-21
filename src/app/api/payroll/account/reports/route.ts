import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getGlobalPayrollAccount } from '@/lib/payroll-account-utils'
import { getServerUser } from '@/lib/get-server-user'

function paymentTypeLabel(type: string): string {
  switch (type) {
    case 'SALARY': return 'Salary Payment'
    case 'LOAN_DISBURSEMENT': return 'Loan Disbursement'
    case 'ADVANCE': return 'Salary Advance'
    case 'BONUS': return 'Bonus Payment'
    case 'COMMISSION': return 'Commission Payment'
    default: return type
  }
}

/**
 * GET /api/payroll/account/reports
 * Generate payroll payment reports with comprehensive filtering
 *
 * Query params:
 * - startDate: Filter from this date (optional)
 * - endDate: Filter up to this date (optional)
 * - employeeId: Filter by employee (optional)
 * - paymentType: Filter by type (REGULAR_SALARY | ADVANCE | BONUS | COMMISSION) (optional)
 * - status: Filter by status (PENDING | VOUCHER_ISSUED | SIGNED | COMPLETED) (optional)
 * - isAdvance: Filter advances only (true | false) (optional)
 * - groupBy: Group results by (employee | paymentType | status | month) (optional)
 * - format: Output format (json | csv) (default: json)
 * - limit: Number of records to return (default: 100, ignored for CSV)
 * - offset: Number of records to skip (default: 0, ignored for CSV)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // TODO: Add permission check for canViewPayrollHistory or canExportPayrollPayments

    // Get global payroll account
    const payrollAccount = await getGlobalPayrollAccount()
    if (!payrollAccount) {
      return NextResponse.json(
        { error: 'Payroll account not found' },
        { status: 404 }
      )
    }

    // Get query params
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const employeeId = searchParams.get('employeeId')
    const paymentType = searchParams.get('paymentType')
    const status = searchParams.get('status')
    const isAdvance = searchParams.get('isAdvance')
    const groupBy = searchParams.get('groupBy')
    const format = searchParams.get('format') || 'json'
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build where clause
    const where: any = {
      payrollAccountId: payrollAccount.id,
    }

    if (employeeId) {
      where.employeeId = employeeId
    }

    if (startDate || endDate) {
      where.paymentDate = {}
      if (startDate) {
        where.paymentDate.gte = new Date(startDate)
      }
      if (endDate) {
        // Use start of next day so the full endDate day is included
        const end = new Date(endDate)
        end.setDate(end.getDate() + 1)
        where.paymentDate.lt = end
      }
    }

    if (status) {
      where.status = status
    }

    if (paymentType) {
      where.paymentType = paymentType
    }

    if (isAdvance !== null && isAdvance !== undefined) {
      where.isAdvance = isAdvance === 'true'
    }

    // Fetch payments
    const payments = await prisma.payrollAccountPayments.findMany({
      where,
      include: {
        employees: {
          select: {
            id: true,
            employeeNumber: true,
            firstName: true,
            lastName: true,
            fullName: true,
            nationalId: true,
          },
        },
        users_created: {
          select: { id: true, name: true, email: true },
        },
        users_signed: {
          select: { id: true, name: true, email: true },
        },
        users_completed: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { paymentDate: 'desc' },
      ...(format !== 'csv' && { take: limit, skip: offset }),
    })

    // Get total count
    const totalCount = await prisma.payrollAccountPayments.count({ where })

    // Transform payments to report format
    const reportData = payments.map((p) => ({
      id: p.id,
      employeeId: p.employeeId,
      employeeNumber: p.employees.employeeNumber,
      employeeName: p.employees.fullName || `${p.employees.firstName} ${p.employees.lastName}`,
      employeeNationalId: p.employees.nationalId,
      amount: Number(p.amount),
      netAmount: p.netAmount != null ? Number(p.netAmount) : null,
      notes: p.notes,
      paymentType: p.paymentType,
      paymentDate: p.paymentDate,
      status: p.status,
      isAdvance: p.isAdvance,
      isLocked: p.isLocked,
      createdBy: p.users_created?.name || 'Unknown',
      signedBy: p.users_signed?.name || null,
      signedAt: p.signedAt,
      completedBy: p.users_completed?.name || null,
      completedAt: p.completedAt,
      createdAt: p.createdAt,
    }))

    // Calculate summary statistics
    const summary = {
      totalPayments: reportData.length,
      totalAmount: reportData.reduce((sum, p) => sum + p.amount, 0),
      byStatus: {} as any,
      byPaymentType: {} as any,
      advancePayments: reportData.filter((p) => p.isAdvance).length,
      advanceAmount: reportData.filter((p) => p.isAdvance).reduce((sum, p) => sum + p.amount, 0),
    }

    // Group by status
    reportData.forEach((p) => {
      if (!summary.byStatus[p.status]) {
        summary.byStatus[p.status] = { count: 0, amount: 0 }
      }
      summary.byStatus[p.status].count++
      summary.byStatus[p.status].amount += p.amount
    })

    // Group by payment type
    reportData.forEach((p) => {
      if (!summary.byPaymentType[p.paymentType]) {
        summary.byPaymentType[p.paymentType] = { count: 0, amount: 0 }
      }
      summary.byPaymentType[p.paymentType].count++
      summary.byPaymentType[p.paymentType].amount += p.amount
    })

    // Handle grouping if requested
    let groupedData: any = null
    if (groupBy) {
      groupedData = {}

      reportData.forEach((payment) => {
        let key: string

        switch (groupBy) {
          case 'employee':
            key = payment.employeeName
            break
          case 'paymentType':
            key = payment.paymentType
            break
          case 'status':
            key = payment.status
            break
          case 'month':
            const date = new Date(payment.paymentDate)
            key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
            break
          default:
            key = 'Other'
        }

        if (!groupedData[key]) {
          groupedData[key] = {
            count: 0,
            totalAmount: 0,
            payments: [],
          }
        }

        groupedData[key].count++
        groupedData[key].totalAmount += payment.amount
        groupedData[key].payments.push(payment)
      })
    }

    // Handle CSV export
    if (format === 'csv') {
      const csvRows: string[] = []

      // Header
      csvRows.push(
        [
          'Payment ID',
          'Employee Number',
          'Employee Name',
          'National ID',
          'Gross Amount',
          'Net Amount',
          'Payment Type',
          'Payment Date',
          'Status',
          'Notes',
          'Created By',
          'Signed By',
          'Completed By',
        ].join(',')
      )

      // Data rows
      reportData.forEach((p) => {
        csvRows.push(
          [
            p.id,
            p.employeeNumber,
            `"${p.employeeName}"`,
            p.employeeNationalId,
            p.amount.toFixed(2),
            p.netAmount != null ? p.netAmount.toFixed(2) : '',
            paymentTypeLabel(p.paymentType),
            new Date(p.paymentDate).toISOString().split('T')[0],
            p.status,
            p.notes ? `"${p.notes}"` : '',
            `"${p.createdBy}"`,
            p.signedBy ? `"${p.signedBy}"` : '',
            p.completedBy ? `"${p.completedBy}"` : '',
          ].join(',')
        )
      })

      const csv = csvRows.join('\n')

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="payroll-report-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      })
    }

    // Return JSON
    return NextResponse.json({
      success: true,
      data: {
        payments: reportData,
        summary,
        ...(groupedData && { groupedData }),
        pagination: {
          total: totalCount,
          limit,
          offset,
          hasMore: offset + limit < totalCount,
        },
        filters: {
          startDate,
          endDate,
          employeeId,
          paymentType,
          status,
          isAdvance,
          groupBy,
        },
      },
    })
  } catch (error) {
    console.error('Error generating payroll report:', error)
    return NextResponse.json(
      { error: 'Failed to generate payroll report' },
      { status: 500 }
    )
  }
}
