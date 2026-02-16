import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hasPermission, isSystemAdmin } from '@/lib/permission-utils'
import {
  exportPayrollToBuffer,
  getPayrollFilename,
  calculatePayrollSummary,
  PayrollEmployeeData
} from '@/lib/payroll-export'
import { getServerUser } from '@/lib/get-server-user'

// GET - Generate payroll export spreadsheet
export async function GET(req: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
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
    const employees = await prisma.employees.findMany({
      where: whereClause,
      include: {
        businesses: {
          select: {
            id: true,
            name: true,
            type: true
          }
        },
        // Current active contract with extended fields
        employee_contracts_employee_contracts_employeeIdToemployees: {
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
        employee_time_tracking: {
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
        employee_allowances_employee_allowances_employeeIdToemployees: {
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
        { businesses: { name: 'asc' } },
        { fullName: 'asc' }
      ]
    })

    // Transform data for payroll export matching Employee-Worksheet format
    const payrollData: PayrollEmployeeData[] = employees.map(employee => {
      const contract = employee.employee_contracts_employee_contracts_employeeIdToemployees[0]
      const timeTracking = employee.employee_time_tracking[0]

      // Group allowances by type
      const allowancesByType = employee.employee_allowances_employee_allowances_employeeIdToemployees.reduce((acc, allowance) => {
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

    const businessName = businessId ? employees[0]?.businesses?.name || 'Business' : 'All-Businesses'
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