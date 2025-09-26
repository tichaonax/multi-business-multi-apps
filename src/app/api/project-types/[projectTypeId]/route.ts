import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isSystemAdmin, getCustomPermissionValue } from '@/lib/permission-utils'
import { SessionUser } from '@/lib/permission-utils'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectTypeId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as SessionUser
    const { projectTypeId } = await params

    const projectType = await prisma.projectType.findUnique({
      where: { id: projectTypeId }
    })

    if (!projectType) {
      return NextResponse.json({ error: 'Project type not found' }, { status: 404 })
    }

    // Check if user has permission to view projects for this business type
    if (!isSystemAdmin(user)) {
      const canViewProjects = getCustomPermissionValue(user, `${projectType.businessType}.canViewProjects`, undefined, false)
      if (!canViewProjects) {
        return NextResponse.json({
          error: `Insufficient permissions to view ${projectType.businessType} project types`
        }, { status: 403 })
      }
    }

    return NextResponse.json(projectType)
  } catch (error) {
    console.error('Project type fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch project type' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectTypeId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as SessionUser
    const { projectTypeId } = await params
    const data = await request.json()
    const { name, description, isActive } = data

    // Find the existing project type
    const existingProjectType = await prisma.projectType.findUnique({
      where: { id: projectTypeId }
    })

    if (!existingProjectType) {
      return NextResponse.json({ error: 'Project type not found' }, { status: 404 })
    }

    // Check permissions
    if (!isSystemAdmin(user)) {
      // System types can only be modified by system admins
      if (existingProjectType.isSystem) {
        return NextResponse.json({
          error: 'Only system administrators can modify system project types'
        }, { status: 403 })
      }

      // Check if user has permission to manage project types for this business type
      const canCreateProjects = getCustomPermissionValue(user, `${existingProjectType.businessType}.canCreateProjects`, undefined, false)
      const canManageProjectTypes = getCustomPermissionValue(user, `${existingProjectType.businessType}.canManageProjectTypes`, undefined, false)

      if (!canCreateProjects && !canManageProjectTypes) {
        return NextResponse.json({
          error: `Insufficient permissions to modify ${existingProjectType.businessType} project types`
        }, { status: 403 })
      }
    }

    // Validation
    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    // Check for duplicate name (excluding current record)
    if (name !== existingProjectType.name) {
      const duplicateProjectType = await prisma.projectType.findFirst({
        where: {
          name,
          businessType: existingProjectType.businessType,
          id: { not: projectTypeId }
        }
      })

      if (duplicateProjectType) {
        return NextResponse.json(
          { error: `A project type with name "${name}" already exists for ${existingProjectType.businessType} business` },
          { status: 400 }
        )
      }
    }

    const updatedProjectType = await prisma.projectType.update({
      where: { id: projectTypeId },
      data: {
        name,
        description: description || null,
        isActive: isActive !== undefined ? isActive : existingProjectType.isActive
      }
    })

    return NextResponse.json(updatedProjectType)
  } catch (error: any) {
    console.error('Project type update error:', error)

    // Handle unique constraint violations
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A project type with this name already exists' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update project type' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectTypeId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as SessionUser
    const { projectTypeId } = await params

    // Find the existing project type
    const existingProjectType = await prisma.projectType.findUnique({
      where: { id: projectTypeId }
    })

    if (!existingProjectType) {
      return NextResponse.json({ error: 'Project type not found' }, { status: 404 })
    }

    // Check permissions
    if (!isSystemAdmin(user)) {
      // System types cannot be deleted by non-admins
      if (existingProjectType.isSystem) {
        return NextResponse.json({
          error: 'System project types cannot be deleted'
        }, { status: 403 })
      }

      // Check if user has permission to manage project types for this business type
      const canCreateProjects = getCustomPermissionValue(user, `${existingProjectType.businessType}.canCreateProjects`, undefined, false)
      const canManageProjectTypes = getCustomPermissionValue(user, `${existingProjectType.businessType}.canManageProjectTypes`, undefined, false)

      if (!canCreateProjects && !canManageProjectTypes) {
        return NextResponse.json({
          error: `Insufficient permissions to delete ${existingProjectType.businessType} project types`
        }, { status: 403 })
      }
    }

    // Check if project type is in use before deletion
    const projectsCount = await prisma.project.count({
      where: { projectTypeId: projectTypeId }
    })

    const constructionProjectsCount = await prisma.constructionProject.count({
      where: { projectTypeId: projectTypeId }
    })

    if (projectsCount > 0 || constructionProjectsCount > 0) {
      return NextResponse.json({
        error: 'Cannot delete project type that is currently in use by projects',
        details: {
          projectsCount,
          constructionProjectsCount,
          totalUsageCount: projectsCount + constructionProjectsCount
        }
      }, { status: 400 })
    }

    await prisma.projectType.delete({
      where: { id: projectTypeId }
    })

    return NextResponse.json({
      message: 'Project type deleted successfully'
    })

  } catch (error: any) {
    console.error('Project type deletion error:', error)

    // Handle specific database errors
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Project type not found or already deleted' },
        { status: 404 }
      )
    }

    if (error.code === 'P2003') {
      return NextResponse.json(
        { error: 'Cannot delete project type due to database constraints' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to delete project type' },
      { status: 500 }
    )
  }
}