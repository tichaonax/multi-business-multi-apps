import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Search users and employees for driver creation
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)

    if (!search || search.length < 2) {
      return NextResponse.json({
        success: true,
        data: []
      })
    }

    // Search users and employees in parallel
    const [users, employees] = await Promise.all([
      // Search users
      prisma.users.findMany({
        where: {
          isActive: true,
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } }
          ]
        },
        select: {
          id: true,
          name: true,
          email: true
        },
        take: limit
      }),
      // Search employees
      prisma.employees.findMany({
        where: {
          isActive: true,
          OR: [
            { fullName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { employeeNumber: { contains: search, mode: 'insensitive' } }
          ]
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          employeeNumber: true,
          dateOfBirth: true,
          address: true,
          driverLicenseNumber: true,
          driverLicenseTemplateId: true,
          userId: true
        },
        take: limit
      })
    ])

    // Transform and combine results
    const userResults = users.map(user => ({
      id: user.id,
      type: 'user' as const,
      name: user.name,
      email: user.email,
      phone: undefined,
      employeeNumber: undefined,
      hasUserAccount: true,
      driverLicenseNumber: undefined,
      driverLicenseTemplateId: undefined,
      dateOfBirth: undefined,
      address: undefined,
      userId: user.id
    }))

    const employeeResults = employees.map(employee => ({
      id: employee.id,
      type: 'employee' as const,
      name: employee.fullName,
      email: employee.email || undefined,
      phone: employee.phone || undefined,
      employeeNumber: employee.employeeNumber || undefined,
      hasUserAccount: !!employee.userId,
      driverLicenseNumber: employee.driverLicenseNumber || undefined,
      driverLicenseTemplateId: employee.driverLicenseTemplateId || undefined,
      dateOfBirth: employee.dateOfBirth ? employee.dateOfBirth.toISOString() : undefined,
      address: employee.address || undefined,
      userId: employee.userId || undefined
    }))

    // Combine and sort results (prioritize exact matches)
    const combinedResults = [...userResults, ...employeeResults]
      .sort((a, b) => {
        const searchLower = search.toLowerCase()
        const aNameMatch = a.name.toLowerCase().startsWith(searchLower)
        const bNameMatch = b.name.toLowerCase().startsWith(searchLower)

        if (aNameMatch && !bNameMatch) return -1
        if (!aNameMatch && bNameMatch) return 1

        return a.name.localeCompare(b.name)
      })
      .slice(0, limit)

    return NextResponse.json({
      success: true,
      data: combinedResults
    })

  } catch (error) {
    console.error('Error searching people:', error)
    return NextResponse.json(
      { error: 'Failed to search people', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
