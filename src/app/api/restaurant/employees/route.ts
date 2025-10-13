import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'

// GET - Fetch restaurant employees
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const department = searchParams.get('department')
    const position = searchParams.get('position')
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    // Mock data for now - replace with actual database queries later
    const mockEmployees = [
      {
        id: '1',
        employeeId: 'EMP-001',
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
        notes: 'Excellent leadership skills and culinary expertise'
      },
      {
        id: '2',
        employeeId: 'EMP-002',
        firstName: 'Maria',
        lastName: 'Garcia',
        email: 'maria.garcia@restaurant.com',
        phone: '+1555987654',
        position: 'Server',
        department: 'Front of House',
        status: 'Active',
        hireDate: '2023-03-20',
        hourlyRate: 15.00,
        salary: null,
        hoursPerWeek: 30,
        emergencyContact: {
          name: 'Carlos Garcia',
          relationship: 'Brother',
          phone: '+1555123456'
        },
        workSchedule: {
          monday: null,
          tuesday: { start: '17:00', end: '23:00' },
          wednesday: { start: '17:00', end: '23:00' },
          thursday: { start: '17:00', end: '23:00' },
          friday: { start: '17:00', end: '23:00' },
          saturday: { start: '17:00', end: '23:00' },
          sunday: { start: '17:00', end: '23:00' }
        },
        avatar: null,
        notes: 'Great customer service skills, very reliable'
      },
      {
        id: '3',
        employeeId: 'EMP-003',
        firstName: 'David',
        lastName: 'Wilson',
        email: 'david.wilson@restaurant.com',
        phone: '+1777888999',
        position: 'Manager',
        department: 'Management',
        status: 'Active',
        hireDate: '2022-08-10',
        hourlyRate: null,
        salary: 55000,
        hoursPerWeek: 45,
        emergencyContact: {
          name: 'Sarah Wilson',
          relationship: 'Wife',
          phone: '+1777888888'
        },
        workSchedule: {
          monday: { start: '08:00', end: '18:00' },
          tuesday: { start: '08:00', end: '18:00' },
          wednesday: { start: '08:00', end: '18:00' },
          thursday: { start: '08:00', end: '18:00' },
          friday: { start: '08:00', end: '18:00' },
          saturday: { start: '10:00', end: '16:00' },
          sunday: null
        },
        avatar: null,
        notes: 'Strong leadership and operational management experience'
      },
      {
        id: '4',
        employeeId: 'EMP-004',
        firstName: 'Lisa',
        lastName: 'Chen',
        email: 'lisa.chen@restaurant.com',
        phone: '+1333444555',
        position: 'Sous Chef',
        department: 'Kitchen',
        status: 'On Leave',
        hireDate: '2023-05-01',
        hourlyRate: 22.00,
        salary: null,
        hoursPerWeek: 40,
        emergencyContact: {
          name: 'Michael Chen',
          relationship: 'Husband',
          phone: '+1333444444'
        },
        workSchedule: {
          monday: { start: '10:00', end: '18:00' },
          tuesday: { start: '10:00', end: '18:00' },
          wednesday: { start: '10:00', end: '18:00' },
          thursday: { start: '10:00', end: '18:00' },
          friday: { start: '10:00', end: '18:00' },
          saturday: null,
          sunday: null
        },
        avatar: null,
        notes: 'Currently on maternity leave, expected return in 2 months'
      },
      {
        id: '5',
        employeeId: 'EMP-005',
        firstName: 'Robert',
        lastName: 'Johnson',
        email: 'robert.johnson@restaurant.com',
        phone: '+1666777888',
        position: 'Bartender',
        department: 'Bar',
        status: 'Inactive',
        hireDate: '2022-11-15',
        hourlyRate: 18.00,
        salary: null,
        hoursPerWeek: 25,
        emergencyContact: {
          name: 'Alice Johnson',
          relationship: 'Mother',
          phone: '+1666777777'
        },
        workSchedule: {
          monday: null,
          tuesday: null,
          wednesday: { start: '18:00', end: '02:00' },
          thursday: { start: '18:00', end: '02:00' },
          friday: { start: '18:00', end: '02:00' },
          saturday: { start: '18:00', end: '02:00' },
          sunday: null
        },
        avatar: null,
        notes: 'Terminated due to policy violations'
      }
    ]

    // Apply filters
    let filteredEmployees = mockEmployees

    if (department && department !== 'all') {
      filteredEmployees = filteredEmployees.filter(emp => emp.department === department)
    }

    if (position && position !== 'all') {
      filteredEmployees = filteredEmployees.filter(emp => emp.position === position)
    }

    if (status && status !== 'all') {
      filteredEmployees = filteredEmployees.filter(emp => emp.status === status)
    }

    if (search) {
      const searchTerm = search.toLowerCase()
      filteredEmployees = filteredEmployees.filter(emp =>
        emp.firstName.toLowerCase().includes(searchTerm) ||
        emp.lastName.toLowerCase().includes(searchTerm) ||
        emp.email.toLowerCase().includes(searchTerm) ||
        emp.employeeId.toLowerCase().includes(searchTerm) ||
        emp.position.toLowerCase().includes(searchTerm)
      )
    }

    return NextResponse.json({
      success: true,
      data: filteredEmployees,
      meta: {
        total: filteredEmployees.length,
        page: 1,
        limit: 50,
        totalPages: 1,
        hasMore: false
      }
    })

  } catch (error) {
    console.error('Error fetching restaurant employees:', error)
    return NextResponse.json(
      { error: 'Failed to fetch employees', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// POST - Create new employee
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userPermissions = session.users.permissions || {}
  if (!hasPermission(userPermissions, 'restaurant', 'write')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  try {
    const employeeData = await request.json()

    // Generate employee ID
    const employeeId = `EMP-${Date.now().toString().slice(-6).padStart(6, '0')}`

    // Create new employee object
    const newEmployee = {
      id: Date.now().toString(),
      employeeId,
      ...employeeData,
      status: employeeData.status || 'Active',
      hireDate: employeeData.hireDate || new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    // TODO: Save to database
    // For now, return mock success response

    return NextResponse.json({
      success: true,
      data: newEmployee,
      message: 'Employee created successfully'
    })

  } catch (error) {
    console.error('Error creating employee:', error)
    return NextResponse.json(
      { error: 'Failed to create employee', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}