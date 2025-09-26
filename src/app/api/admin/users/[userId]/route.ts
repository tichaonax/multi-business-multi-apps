import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isSystemAdmin } from '@/lib/permission-utils'
import { SessionUser } from '@/lib/permission-utils'
import { BUSINESS_PERMISSION_PRESETS, BusinessPermissions, UserLevelPermissions } from '@/types/permissions'

interface UserUpdateRequest {
  basicInfo: {
    name: string
    email: string
    systemRole: string
    isActive: boolean
  }
  userLevelPermissions: Partial<UserLevelPermissions>
  businessMemberships: {
    businessId: string
    businessName: string
    role: keyof typeof BUSINESS_PERMISSION_PRESETS
    isActive: boolean
    useCustomPermissions: boolean
    customPermissions: Partial<BusinessPermissions>
    selectedTemplate?: string
  }[]
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userId } = await params
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Check permissions - system admins can view any user
    if (session.user.role !== 'admin') {
      const userMemberships = await prisma.businessMembership.findMany({
        where: {
          userId: session.user.id,
          isActive: true,
        }
      })

      const hasBusinessAdminPermission = userMemberships.some(membership => {
        const permissions = membership.permissions as any
        return permissions?.canManageBusinessUsers
      })

      if (!hasBusinessAdminPermission) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      }
    }

    // Fetch user with business memberships
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        businessMemberships: {
          include: {
            business: {
              select: {
                id: true,
                name: true,
                type: true
              }
            }
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Format response for the modal
    const formattedUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      passwordResetRequired: user.passwordResetRequired || false,
      permissions: user.permissions,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      businessMemberships: user.businessMemberships.map(membership => ({
        businessId: membership.businessId,
        businessName: membership.business.name,
        businessType: membership.business.type,
        role: membership.role,
        permissions: membership.permissions,
        templateId: membership.templateId,
        isActive: membership.isActive,
        business: {
          id: membership.business.id,
          name: membership.business.name,
          type: membership.business.type
        }
      }))
    }

    return NextResponse.json(formattedUser)

  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userId } = await params
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Check if current user has permission to edit users
    // System admins can edit any user
    if (session.user.role !== 'admin') {
      const userMemberships = await prisma.businessMembership.findMany({
        where: {
          userId: session.user.id,
          isActive: true,
        },
        include: {
          business: true,
        }
      })

      const hasBusinessAdminPermission = userMemberships.some(membership => {
        const permissions = membership.permissions as any
        return permissions?.canManageBusinessUsers
      })

      if (!hasBusinessAdminPermission) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      }
    }

    const { basicInfo, userLevelPermissions, businessMemberships }: UserUpdateRequest = await req.json()

    // Validate required fields
    if (!basicInfo.name || !basicInfo.email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      )
    }

    // Validate that the user has permission to assign users to the requested businesses
    if (session.user.role !== 'admin') {
      const userMemberships = await prisma.businessMembership.findMany({
        where: {
          userId: session.user.id,
          isActive: true,
        }
      })
      
      const userBusinessIds = userMemberships.map(m => m.businessId)
      const requestedBusinessIds = businessMemberships.map(a => a.businessId)
      
      for (const businessId of requestedBusinessIds) {
        if (!userBusinessIds.includes(businessId)) {
          return NextResponse.json(
            { error: `You don't have permission to manage users in business ${businessId}` },
            { status: 403 }
          )
        }
      }
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        businessMemberships: {
          include: {
            business: {
              select: { name: true }
            }
          }
        }
      }
    })

    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Update user and business memberships with transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update basic user info and user-level permissions
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          name: basicInfo.name,
          email: basicInfo.email,
          role: basicInfo.systemRole,
          isActive: basicInfo.isActive,
          permissions: userLevelPermissions || {},
        }
      })

      // Get current business memberships
      const currentMemberships = await tx.businessMembership.findMany({
        where: { userId }
      })

      // Delete existing memberships that are not in the new list
      const newBusinessIds = businessMemberships.map(m => m.businessId)
      await tx.businessMembership.deleteMany({
        where: {
          userId,
          businessId: {
            notIn: newBusinessIds
          }
        }
      })

      // Update or create business memberships
      const updatedMemberships = []
      for (const membershipData of businessMemberships) {
        // Determine permissions to use
        let finalPermissions: BusinessPermissions
        let finalTemplateId: string | null = null
        
        if (membershipData.useCustomPermissions) {
          // Start with preset permissions and merge custom ones
          const presetPermissions = BUSINESS_PERMISSION_PRESETS[membershipData.role] || BUSINESS_PERMISSION_PRESETS.employee
          finalPermissions = {
            ...presetPermissions,
            ...membershipData.customPermissions
          }
          // Keep template ID if provided
          finalTemplateId = membershipData.selectedTemplate || null
        } else {
          // Use preset permissions and clear template
          finalPermissions = BUSINESS_PERMISSION_PRESETS[membershipData.role] || BUSINESS_PERMISSION_PRESETS.employee
          finalTemplateId = null
        }

        const membership = await tx.businessMembership.upsert({
          where: {
            userId_businessId: {
              userId,
              businessId: membershipData.businessId
            }
          },
          create: {
            userId,
            businessId: membershipData.businessId,
            role: membershipData.role,
            permissions: finalPermissions,
            templateId: finalTemplateId,
            isActive: membershipData.isActive,
            invitedBy: session.user.id,
            joinedAt: new Date(),
            lastAccessedAt: new Date(),
          },
          update: {
            role: membershipData.role,
            permissions: finalPermissions,
            templateId: finalTemplateId,
            isActive: membershipData.isActive,
            lastAccessedAt: new Date(),
          },
          include: {
            business: {
              select: { name: true }
            }
          }
        })

        updatedMemberships.push(membership)
      }

      return { user: updatedUser, memberships: updatedMemberships }
    })

    return NextResponse.json({
      success: true,
      message: `User updated successfully`,
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        systemRole: result.user.role,
        isActive: result.user.isActive,
        businessMemberships: result.memberships.map(m => ({
          businessId: m.businessId,
          businessName: m.business.name,
          role: m.role,
          isActive: m.isActive
        }))
      }
    })

  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userId } = await params
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Check permissions - system admins can delete any user
    if (session.user.role !== 'admin') {
      const userMemberships = await prisma.businessMembership.findMany({
        where: {
          userId: session.user.id,
          isActive: true,
        }
      })

      const hasBusinessAdminPermission = userMemberships.some(membership => {
        const permissions = membership.permissions as any
        return permissions?.canManageBusinessUsers
      })

      if (!hasBusinessAdminPermission) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      }
    }

    // Soft delete user (set inactive instead of actual deletion)
    await prisma.user.update({
      where: { id: userId },
      data: { isActive: false }
    })

    // Also deactivate all business memberships
    await prisma.businessMembership.updateMany({
      where: { userId },
      data: { isActive: false }
    })

    return NextResponse.json({
      success: true,
      message: 'User deactivated successfully'
    })

  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    )
  }
}