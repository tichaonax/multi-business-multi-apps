import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { SessionUser, hasPermission, isSystemAdmin } from '@/lib/permission-utils'
import { 
  exportPayrollToBuffer, 
  getPayrollFilename, 
  calculatePayrollSummary,
  PayrollEmployeeData 
} from '@/lib/payroll-export'

// GET - Generate payroll export spreadsheet
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as SessionUser
    const { searchParams } = new URL(req.url)
    const month = searchParams.get('month') || new Date().getMonth() + 1
    const year = searchParams.get('year') || new Date().getFullYear()
    const businessId = searchParams.get('businessId')
    const format = searchParams.get('format') as 'xlsx' | 'csv' || 'xlsx'

    // Check if user is HR manager or system admin
    const isHRManager = hasPermission(user, 'canExportEmployeeData') && hasPermission(user, 'canViewEmployeeReports')
    if (!isHRManager && !isSystemAdmin(user)) {
      return NextResponse.json({ 
        error: 'Only HR managers can export payroll data' 
      }, { status: 403 })
    }

    // Build filter based on user permissions
    const whereClause: any = {
      isActive: true,
      employmentStatus: 'active'
    }

    // If specific business requested, filter by it
    if (businessId) {
      whereClause.primaryBusinessId = businessId
    } else if (!isSystemAdmin(user)) {
      // Non-admin users can only see employees from businesses they have access to
      const userBusinesses = user.businessMemberships?.map(m => m.businessId) || []
      if (userBusinesses.length > 0) {
        whereClause.primaryBusinessId = { in: userBusinesses }
      }
    }

    // Get employees with payroll data for the specified month/year
    const employees = await prisma.employee.findMany({
      where: whereClause,
      include: {
        business: {
          select: {
            id: true,
            name: true,
            type: true
          }
        },
        // Current active contract with extended fields
        employeeContracts: {
          where: { status: 'active' },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            baseSalary: true,
            livingAllowance: true,
            commissionAmount: true,
            startDate: true,
            endDate: true
          }
        },
        // Time tracking for the month
        employeeTimeTracking: {
          where: {
            year: Number(year),
            month: Number(month)
          },
          take: 1,
          select: {
            workDays: true
          }
        },
        // Allowances for the month
        employeeAllowances: {
          where: {
            payrollYear: Number(year),
            payrollMonth: Number(month)
          },
          select: {
            type: true,
            amount: true
          }
        }
      },
      orderBy: [
        { business: { name: 'asc' } },
        { fullName: 'asc' }
      ]
    })

    // Transform data for payroll export matching Employee-Worksheet format
    const payrollData: PayrollEmployeeData[] = employees.map(employee => {
      const contract = employee.employeeContracts[0]
      const timeTracking = employee.employeeTimeTracking[0]
      
      // Group allowances by type
      const allowancesByType = employee.employeeAllowances.reduce((acc, allowance) => {
        const type = allowance.type
        acc[type] = (acc[type] || 0) + parseFloat(allowance.amount.toString())
        return acc
      }, {} as Record<string, number>)

      return {
        idNumber: employee.nationalId || employee.employeeNumber,
        dateOfBirth: employee.dateOfBirth?.toISOString().split('T')[0] || '',
        firstName: employee.fullName.split(' ')[0] || '',
        lastName: employee.fullName.split(' ').slice(1).join(' ') || '',
        workDays: timeTracking?.workDays || 0,
        basicSalary: contract ? parseFloat(contract.baseSalary.toString()) : 0,
        commission: contract?.commissionAmount ? parseFloat(contract.commissionAmount.toString()) : undefined,
        livingAllowance: contract?.livingAllowance ? parseFloat(contract.livingAllowance.toString()) : undefined,
        vehicleReimbursement: allowancesByType['vehicle_reimbursement'] || undefined,
        travelAllowance: allowancesByType['travel_allowance'] || undefined,
        overtime: allowancesByType['overtime'] || undefined,
        advances: allowancesByType['advance'] || undefined,
        loans: allowancesByType['loan_deduction'] || undefined
      }
    })

    const businessName = businessId ? employees[0]?.business?.name || 'Business' : 'All-Businesses'
    const exportOptions = {
      month: Number(month),
      year: Number(year),
      businessName
    }

    if (format === 'xlsx') {
      // Generate Excel file using our payroll export library
      const fileBuffer = exportPayrollToBuffer(payrollData, exportOptions, 'xlsx')
      const filename = getPayrollFilename(exportOptions, 'xlsx')
      
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-cache'
        }
      })
    }

    // Generate CSV file using our payroll export library
    const fileBuffer = exportPayrollToBuffer(payrollData, exportOptions, 'csv')
    const filename = getPayrollFilename(exportOptions, 'csv')
    
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache'
      }
    })

  } catch (error) {
    console.error('Payroll export error:', error)
    return NextResponse.json(
      { error: 'Failed to export payroll data' },
      { status: 500 }
    )
  }
}