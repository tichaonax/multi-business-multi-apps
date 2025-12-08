import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getEffectivePermissions } from '@/lib/permission-utils'

/**
 * GET /api/payees/[type]/[id]
 * Get detailed information about a specific payee
 *
 * Path params:
 * - type: Payee type - USER|EMPLOYEE|PERSON|BUSINESS
 * - id: Payee ID
 *
 * Returns payee details including payment history
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { type: string; id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permission
    const permissions = getEffectivePermissions(session.user)
    if (!permissions.canViewPayees) {
      return NextResponse.json(
        { error: 'You do not have permission to view payees' },
        { status: 403 }
      )
    }

    const { type, id } = params
    const typeUpper = type.toUpperCase()

    let payeeData: any = null

    switch (typeUpper) {
      case 'USER':
        payeeData = await prisma.users.findUnique({
          where: { id },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true,
            expense_account_payments_as_payee: {
              select: {
                id: true,
                amount: true,
                description: true,
                paymentDate: true,
                expenseAccount: {
                  select: {
                    id: true,
                    accountName: true,
                  },
                },
              },
              orderBy: { paymentDate: 'desc' },
              take: 10,
            },
            _count: {
              select: {
                expense_account_payments_as_payee: true,
              },
            },
          },
        })
        break

      case 'EMPLOYEE':
        payeeData = await prisma.employees.findUnique({
          where: { id },
          select: {
            id: true,
            fullName: true,
            employeeNumber: true,
            email: true,
            phone: true,
            isActive: true,
            hireDate: true,
            business: {
              select: {
                id: true,
                businessName: true,
              },
            },
            expense_account_payments_as_payee: {
              select: {
                id: true,
                amount: true,
                description: true,
                paymentDate: true,
                expenseAccount: {
                  select: {
                    id: true,
                    accountName: true,
                  },
                },
              },
              orderBy: { paymentDate: 'desc' },
              take: 10,
            },
            _count: {
              select: {
                expense_account_payments_as_payee: true,
              },
            },
          },
        })
        break

      case 'PERSON':
        payeeData = await prisma.persons.findUnique({
          where: { id },
          select: {
            id: true,
            fullName: true,
            nationalId: true,
            email: true,
            phone: true,
            address: true,
            notes: true,
            isActive: true,
            createdAt: true,
            expense_account_payments_as_payee: {
              select: {
                id: true,
                amount: true,
                description: true,
                paymentDate: true,
                expenseAccount: {
                  select: {
                    id: true,
                    accountName: true,
                  },
                },
              },
              orderBy: { paymentDate: 'desc' },
              take: 10,
            },
            _count: {
              select: {
                expense_account_payments_as_payee: true,
              },
            },
          },
        })
        break

      case 'BUSINESS':
        payeeData = await prisma.businesses.findUnique({
          where: { id },
          select: {
            id: true,
            businessName: true,
            businessType: true,
            contactEmail: true,
            contactPhone: true,
            address: true,
            isActive: true,
            createdAt: true,
            expense_account_payments_as_payee: {
              select: {
                id: true,
                amount: true,
                description: true,
                paymentDate: true,
                expenseAccount: {
                  select: {
                    id: true,
                    accountName: true,
                  },
                },
              },
              orderBy: { paymentDate: 'desc' },
              take: 10,
            },
            _count: {
              select: {
                expense_account_payments_as_payee: true,
              },
            },
          },
        })
        break

      default:
        return NextResponse.json(
          { error: 'Invalid payee type. Must be USER, EMPLOYEE, PERSON, or BUSINESS' },
          { status: 400 }
        )
    }

    if (!payeeData) {
      return NextResponse.json(
        { error: 'Payee not found' },
        { status: 404 }
      )
    }

    // Calculate total payment amount
    const totalPayments = await prisma.expenseAccountPayments.aggregate({
      where: {
        OR: [
          { payeeUserId: typeUpper === 'USER' ? id : undefined },
          { payeeEmployeeId: typeUpper === 'EMPLOYEE' ? id : undefined },
          { payeePersonId: typeUpper === 'PERSON' ? id : undefined },
          { payeeBusinessId: typeUpper === 'BUSINESS' ? id : undefined },
        ],
      },
      _sum: {
        amount: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        type: typeUpper,
        payee: payeeData,
        summary: {
          totalPaymentCount: payeeData._count.expense_account_payments_as_payee,
          totalPaymentAmount: totalPayments._sum.amount || 0,
        },
        recentPayments: payeeData.expense_account_payments_as_payee,
      },
    })
  } catch (error) {
    console.error('Error fetching payee details:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payee details' },
      { status: 500 }
    )
  }
}
