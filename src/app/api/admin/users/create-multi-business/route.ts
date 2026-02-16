import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { BUSINESS_PERMISSION_PRESETS, BusinessPermissions } from '@/types/permissions'

import { randomBytes } from 'crypto';
import { getServerUser } from '@/lib/get-server-user'
interface UserCreationRequest {
  basicInfo: {
    name: string
    email: string
    systemRole: 'admin' | 'manager' | 'employee' | 'user'
    password: string
    sendInvite: boolean
  }
  employee_business_assignments: {
    businessId: string
    businessName: string
    role: keyof typeof BUSINESS_PERMISSION_PRESETS
    customPermissions: Partial<BusinessPermissions>
    useCustomPermissions: boolean
  }[]
}

export async function POST(req: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to create users
    const userMemberships = await prisma.businessMemberships.findMany({
      where: {
        userId: user.id,
        isActive: true,
      },
      include: {
        businesses: true,
      }
    })

    if (userMemberships.length === 0) {
      return NextResponse.json({ error: 'No business access' }, { status: 403 })
    }

    const { basicInfo, businessAssignments }: UserCreationRequest = await req.json()

    // Validate required fields
    if (!basicInfo.name || !basicInfo.email || !businessAssignments || businessAssignments.length === 0) {
      return NextResponse.json(
        { error: 'Name, email, and at least one business assignment are required' },
        { status: 400 }
      )
    }

    if (!basicInfo.password && !basicInfo.sendInvite) {
      return NextResponse.json(
        { error: 'Password or send invite option is required' },
        { status: 400 }
      )
    }

    // Validate that the user has permission to assign users to the requested businesses
    const userBusinessIds = userMemberships.map(m => m.businessId)
    const requestedBusinessIds = businessAssignments.map(a => a.businessId)
    
    for (const businessId of requestedBusinessIds) {
      if (!userBusinessIds.includes(businessId)) {
        return NextResponse.json(
          { error: `You don't have permission to assign users to business ${businessId}` },
          { status: 403 }
        )
      }

      // Check if user has permission to manage users in this specific business
      const membership = userMemberships.find(m => m.businessId === businessId)
      const permissions = membership?.permissions as any
      
      if (!permissions?.canManageBusinessUsers && user.role !== 'admin') {
        return NextResponse.json(
          { error: `Insufficient permissions to manage users in business ${membership?.businesses.name}` },
          { status: 403 }
        )
      }
    }

    // Check if user already exists
    const existingUser = await prisma.users.findUnique({
      where: { email: basicInfo.email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      )
    }

    // Generate temporary password if sending invite
    const finalPassword = basicInfo.password || Math.random().toString(36).slice(-10)
    const hashedPassword = await hash(finalPassword, 12)

    // Create user with transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.users.create({
        data: {
          id: randomBytes(12).toString('hex'),
          name: basicInfo.name,
          email: basicInfo.email,
          passwordHash: hashedPassword,
          role: basicInfo.systemRole,
          isActive: true,
          passwordResetRequired: basicInfo.sendInvite,
        }
      })

      // Create business memberships
      const memberships = []
      for (const assignment of businessAssignments) {
        // Determine permissions to use
        let finalPermissions: BusinessPermissions
        
        if (assignment.useCustomPermissions) {
          // Start with preset permissions and merge custom ones
          const presetPermissions = BUSINESS_PERMISSION_PRESETS[assignment.role] || BUSINESS_PERMISSION_PRESETS.employee
          finalPermissions = {
            ...presetPermissions,
            ...assignment.customPermissions
          }
        } else {
          // Use preset permissions
          finalPermissions = BUSINESS_PERMISSION_PRESETS[assignment.role] || BUSINESS_PERMISSION_PRESETS.employee
        }

        const membership = await tx.businessMemberships.create({
        data: {
          id: randomBytes(12).toString('hex'),
            userId: user.id,
            businessId: assignment.businessId,
            role: assignment.role,
            permissions: finalPermissions,
            isActive: true,
            invitedBy: user.id,
            joinedAt: new Date(),
            lastAccessedAt: new Date(),
          },
          include: {
            businesses: {
              select: {
                name: true
              }
            }
          }
        })

        memberships.push(membership)
      }

      return { user, memberships }
    })

    // TODO: Send email invitation if sendInvite is true
    const response: any = {
      success: true,
      message: `User created successfully with access to ${result.memberships.length} business(es)`,
      user: {
        id: result.users.id,
        name: result.users.name,
        email: result.users.email,
        systemRole: result.user.role,
        passwordResetRequired: result.users.passwordResetRequired,
        businessMemberships: result.memberships.map(m => ({
          businessId: m.businessId,
          businessName: m.businesses.name,
          role: m.role,
          isActive: m.isActive
        }))
      }
    }

    if (basicInfo.sendInvite) {
      response.temporaryPassword = finalPassword
      response.message += ` Temporary password generated.`
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error creating multi-business user:', error)
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    )
  }
}