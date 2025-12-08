import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getEffectivePermissions } from '@/lib/permission-utils'

/**
 * PATCH /api/payees/[type]/[id]/status
 * Toggle active/inactive status for a payee
 *
 * Path params:
 * - type: Payee type - USER|EMPLOYEE|PERSON|BUSINESS
 * - id: Payee ID
 *
 * Body:
 * - isActive: boolean
 *
 * Requires: canEditPayees permission
 */
export async function PATCH(
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
    if (!permissions.canEditPayees) {
      return NextResponse.json(
        { error: 'You do not have permission to edit payees' },
        { status: 403 }
      )
    }

    const { type, id } = params
    const { isActive } = await request.json()

    if (typeof isActive !== 'boolean') {
      return NextResponse.json(
        { error: 'isActive must be a boolean value' },
        { status: 400 }
      )
    }

    const typeUpper = type.toUpperCase()
    let updatedPayee: any = null

    switch (typeUpper) {
      case 'USER':
        // Check if user exists
        const existingUser = await prisma.users.findUnique({
          where: { id }
        })

        if (!existingUser) {
          return NextResponse.json(
            { error: 'User not found' },
            { status: 404 }
          )
        }

        updatedPayee = await prisma.users.update({
          where: { id },
          data: {
            isActive,
            updatedAt: new Date()
          }
        })
        break

      case 'EMPLOYEE':
        // Check if employee exists
        const existingEmployee = await prisma.employees.findUnique({
          where: { id }
        })

        if (!existingEmployee) {
          return NextResponse.json(
            { error: 'Employee not found' },
            { status: 404 }
          )
        }

        updatedPayee = await prisma.employees.update({
          where: { id },
          data: {
            isActive,
            updatedAt: new Date()
          }
        })
        break

      case 'PERSON':
        // Check if person exists
        const existingPerson = await prisma.persons.findUnique({
          where: { id }
        })

        if (!existingPerson) {
          return NextResponse.json(
            { error: 'Individual payee not found' },
            { status: 404 }
          )
        }

        updatedPayee = await prisma.persons.update({
          where: { id },
          data: {
            isActive,
            updatedAt: new Date()
          }
        })
        break

      case 'BUSINESS':
        // Check if business exists
        const existingBusiness = await prisma.businesses.findUnique({
          where: { id }
        })

        if (!existingBusiness) {
          return NextResponse.json(
            { error: 'Business not found' },
            { status: 404 }
          )
        }

        updatedPayee = await prisma.businesses.update({
          where: { id },
          data: {
            isActive,
            updatedAt: new Date()
          }
        })
        break

      default:
        return NextResponse.json(
          { error: 'Invalid payee type. Must be USER, EMPLOYEE, PERSON, or BUSINESS' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      message: `Payee ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: {
        id: updatedPayee.id,
        isActive: updatedPayee.isActive
      }
    })
  } catch (error) {
    console.error('Error updating payee status:', error)
    return NextResponse.json(
      { error: 'Failed to update payee status' },
      { status: 500 }
    )
  }
}
