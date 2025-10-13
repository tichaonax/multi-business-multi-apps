import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission, isSystemAdmin, getCustomPermissionValue } from '@/lib/permission-utils'
import { SessionUser } from '@/lib/permission-utils'

import { randomBytes } from 'crypto';
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as SessionUser
    const { searchParams } = new URL(req.url)
    const businessType = searchParams.get('businessType')
    const includeInactive = searchParams.get('includeInactive') === 'true'

    // Check if user has permission to view projects for the requested business type
    if (businessType && !isSystemAdmin(user)) {
      // For personal project types, check personal project permissions
      if (businessType === 'personal') {
        // For personal project types, check general view permission OR personal project permissions
        const canViewPersonalProjectTypes = user.permissions?.canViewProjects === true ||
                                           user.permissions?.canCreatePersonalProjects === true ||
                                           user.permissions?.canManagePersonalProjects === true
        if (!canViewPersonalProjectTypes) {
          return NextResponse.json({
            error: `Insufficient permissions to view ${businessType} project types`
          }, { status: 403 })
        }
      } else {
        // For business project types, check business-specific permissions
        const canViewProjects = getCustomPermissionValue(user, `${businessType}.canViewProjects`, undefined, false)
        if (!canViewProjects) {
          return NextResponse.json({
            error: `Insufficient permissions to view ${businessType} project types`
          }, { status: 403 })
        }
      }
    }

    // Build filter criteria
    const whereClause: any = {}

    if (businessType) {
      whereClause.businessType = businessType
    }

    if (!includeInactive) {
      whereClause.isActive = true
    }

    const projectTypes = await prisma.projectTypes.findMany({
      where: whereClause,
      orderBy: [
        { businessType: 'asc' },
        { name: 'asc' }
      ]
    })

    return NextResponse.json(projectTypes)
  } catch (error) {
    console.error('Project types fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch project types' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as SessionUser
    const data = await req.json()
    const { name, description, businessType } = data

    // Validation
    if (!name || !businessType) {
      return NextResponse.json(
        { error: 'Name and business type are required' },
        { status: 400 }
      )
    }

    // Check permissions for creating project types
    if (!isSystemAdmin(user)) {
      // Check if user has permission to create projects for this business type
      const canCreateProjects = getCustomPermissionValue(user, `${businessType}.canCreateProjects`, undefined, false)
      const canManageProjectTypes = getCustomPermissionValue(user, `${businessType}.canManageProjectTypes`, undefined, false)

      if (!canCreateProjects && !canManageProjectTypes) {
        return NextResponse.json({
          error: `Insufficient permissions to create ${businessType} project types`
        }, { status: 403 })
      }
    }

    // Check for duplicate name within the business type
    const existingProjectType = await prisma.projectTypes.findFirst({
      where: {
        name,
        businessType
      }
    })

    if (existingProjectType) {
      return NextResponse.json(
        { error: `A project type with name "${name}" already exists for ${businessType} business` },
        { status: 400 }
      )
    }

    const newProjectType = await prisma.projectTypes.create({
      data: {
        name,
        description: description || null,
        businessType,
        isSystem: false, // Custom project types are not system types
        isActive: true
      }
    })

    return NextResponse.json(newProjectType)
  } catch (error: any) {
    console.error('Project type creation error:', error)

    // Handle unique constraint violations
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A project type with this name already exists' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create project type' },
      { status: 500 }
    )
  }
}