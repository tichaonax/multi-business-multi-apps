import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAllAvailablePayees, searchPayees } from '@/lib/payee-utils'
import { getEffectivePermissions } from '@/lib/permission-utils'

/**
 * GET /api/expense-account/payees
 * Return all available payees grouped by type
 *
 * Query params:
 * - search: Filter payees by name/identifier (optional)
 * - businessId: Filter employees by business (optional)
 *
 * Returns:
 * {
 *   users: UserPayee[],
 *   employees: EmployeePayee[],
 *   persons: PersonPayee[],
 *   businesses: BusinessPayee[]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user permissions
    const permissions = getEffectivePermissions(session.user)
    if (!permissions.canAccessExpenseAccount) {
      return NextResponse.json(
        { error: 'You do not have permission to access expense accounts' },
        { status: 403 }
      )
    }

    // Get query params
    const { searchParams } = new URL(request.url)
    const searchTerm = searchParams.get('search')
    const businessId = searchParams.get('businessId')

    // Get payees (with search if provided)
    const payees = searchTerm
      ? await searchPayees(searchTerm, businessId || undefined)
      : await getAllAvailablePayees(session.user.id, businessId || undefined)

    return NextResponse.json({
      success: true,
      data: {
        users: payees.users,
        employees: payees.employees,
        persons: payees.persons,
        businesses: payees.businesses,
        totalCount:
          payees.users.length +
          payees.employees.length +
          payees.persons.length +
          payees.businesses.length,
      },
    })
  } catch (error) {
    console.error('Error fetching payees:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payees' },
      { status: 500 }
    )
  }
}
