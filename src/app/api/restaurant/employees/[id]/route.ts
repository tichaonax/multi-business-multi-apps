import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'

// GET - Get specific employee
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
)
 {

    const { id } = await params
  try {
    const employeeId = id

    // Mock employee data - replace with actual database query
    const mockEmployee = {
      id: employeeId,
      employeeId: `EMP-${employeeId.padStart(3, '0')}`,
      firstName: 'John',
      lastName: 'Smith',
      email: 'john.smith@restaurant.com',
      phone: '+1234567890',
      position: 'Head Chef',
      department: 'Kitchen',
      status: 'Active',
      hireDate: '2023-01-15',
      hourlyRate: 25.00,
      salary: null,
      hoursPerWeek: 40,
      emergencyContact: {
        name: 'Jane Smith',
        relationship: 'Spouse',
        phone: '+1987654321'
      },
      workSchedule: {
        monday: { start: '09:00', end: '17:00' },
        tuesday: { start: '09:00', end: '17:00' },
        wednesday: { start: '09:00', end: '17:00' },
        thursday: { start: '09:00', end: '17:00' },
        friday: { start: '09:00', end: '17:00' },
        saturday: null,
        sunday: null
      },
      avatar: null,
      notes: 'Excellent leadership skills and culinary expertise',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    return NextResponse.json({
      success: true,
      data: mockEmployee
    })

  } catch (error) {
    console.error('Error fetching employee:', error)
    return NextResponse.json(
      { error: 'Failed to fetch employee', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// PUT - Update employee
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
)
 {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
  }

  const userPermissions = session.user.permissions || {}
  if (!hasPermission(userPermissions, 'restaurant', 'write')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  try {
    const employeeId = id
    const updateData = await request.json()

    // TODO: Update employee in database
    // For now, return mock success response

    const updatedEmployee = {
      id: employeeId,
      ...updateData,
      updatedAt: new Date().toISOString()
    }

    return NextResponse.json({
      success: true,
      data: updatedEmployee,
      message: 'Employee updated successfully'
    })

  } catch (error) {
    console.error('Error updating employee:', error)
    return NextResponse.json(
      { error: 'Failed to update employee', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete employee
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
)
 {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
  }

  const userPermissions = session.user.permissions || {}
  if (!hasPermission(userPermissions, 'restaurant', 'write')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  try {
    const employeeId = id

    // TODO: Delete employee from database
    // For now, return mock success response

    return NextResponse.json({
      success: true,
      message: 'Employee deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting employee:', error)
    return NextResponse.json(
      { error: 'Failed to delete employee', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}