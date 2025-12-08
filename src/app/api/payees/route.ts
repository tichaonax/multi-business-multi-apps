import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAllAvailablePayees, searchPayees } from '@/lib/payee-utils'
import { getEffectivePermissions } from '@/lib/permission-utils'

/**
 * GET /api/payees
 * List all available payees with search and filter capabilities
 *
 * Query params:
 * - search: Filter payees by name/identifier (optional)
 * - type: Filter by payee type - USER|EMPLOYEE|PERSON|BUSINESS (optional)
 * - isActive: Filter by active status - true|false (optional)
 * - businessId: Filter employees by business (optional)
 *
 * Returns:
 * {
 *   success: true,
 *   data: {
 *     users: UserPayee[],
 *     employees: EmployeePayee[],
 *     persons: PersonPayee[],
 *     businesses: BusinessPayee[],
 *     totalCount: number
 *   }
 * }
 */
export async function GET(request: NextRequest) {
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

    // Get query params
    const { searchParams } = new URL(request.url)
    const searchTerm = searchParams.get('search')
    const type = searchParams.get('type') // USER, EMPLOYEE, PERSON, BUSINESS
    const isActive = searchParams.get('isActive')
    const businessId = searchParams.get('businessId')

    // Get payees (with search if provided)
    const allPayees = searchTerm
      ? await searchPayees(searchTerm, businessId || undefined)
      : await getAllAvailablePayees(session.user.id, businessId || undefined)

    // Filter by type if specified
    let filteredPayees = { ...allPayees }
    if (type) {
      const typeUpper = type.toUpperCase()
      filteredPayees = {
        users: typeUpper === 'USER' ? allPayees.users : [],
        employees: typeUpper === 'EMPLOYEE' ? allPayees.employees : [],
        persons: typeUpper === 'PERSON' ? allPayees.persons : [],
        businesses: typeUpper === 'BUSINESS' ? allPayees.businesses : [],
      }
    }

    // Filter by active status if specified
    if (isActive !== null && isActive !== undefined) {
      const activeFilter = isActive === 'true'

      // Filter persons by isActive status
      filteredPayees.persons = filteredPayees.persons.filter(
        (p: any) => p.isActive === activeFilter
      )

      // Filter employees by isActive status
      filteredPayees.employees = filteredPayees.employees.filter(
        (e: any) => e.isActive === activeFilter
      )

      // Filter users by isActive status
      filteredPayees.users = filteredPayees.users.filter(
        (u: any) => u.isActive === activeFilter
      )

      // Filter businesses by isActive status
      filteredPayees.businesses = filteredPayees.businesses.filter(
        (b: any) => b.isActive === activeFilter
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        users: filteredPayees.users,
        employees: filteredPayees.employees,
        persons: filteredPayees.persons,
        businesses: filteredPayees.businesses,
        totalCount:
          filteredPayees.users.length +
          filteredPayees.employees.length +
          filteredPayees.persons.length +
          filteredPayees.businesses.length,
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
