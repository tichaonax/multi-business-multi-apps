import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/permission-utils'
import { getServerUser } from '@/lib/get-server-user'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const jobTitle = await prisma.jobTitles.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            employees: true,
            contracts: true
          }
        }
      }
    })

    if (!jobTitle) {
      return NextResponse.json(
        { error: 'Job title not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(jobTitle)
  } catch (error) {
    console.error('Job title fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch job title' },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to manage job titles
    if (!hasPermission(user, 'canManageJobTitles')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { id } = await params
    const data = await req.json()
    const {
      title,
      description,
      responsibilities,
      department,
      level,
      isActive,
      // Role template fields
      jobSummary,
      skillsRequired,
      qualifications,
      businessType,
      isRoleTemplate,
      defaultNotes,
      defaultPermissionPreset
    } = data

    // Validation
    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    // Check if job title exists
    const existingJobTitle = await prisma.jobTitles.findUnique({
      where: { id }
    })

    if (!existingJobTitle) {
      return NextResponse.json(
        { error: 'Job title not found' },
        { status: 404 }
      )
    }

    // Check for duplicate title (if title is being changed)
    if (title !== existingJobTitle.title) {
      const duplicateTitle = await prisma.jobTitles.findUnique({
        where: { title }
      })

      if (duplicateTitle) {
        return NextResponse.json(
          { error: 'A job title with this name already exists' },
          { status: 400 }
        )
      }
    }

    const updatedJobTitle = await prisma.jobTitles.update({
      where: { id },
      data: {
        title,
        description: description || null,
        responsibilities: Array.isArray(responsibilities) ? responsibilities : [],
        department: department || null,
        level: level || null,
        isActive: isActive !== undefined ? isActive : existingJobTitle.isActive,
        // Role template fields (only update if provided)
        ...(jobSummary !== undefined && { jobSummary: jobSummary || null }),
        ...(skillsRequired !== undefined && { skillsRequired: Array.isArray(skillsRequired) ? skillsRequired : [] }),
        ...(qualifications !== undefined && { qualifications: Array.isArray(qualifications) ? qualifications : [] }),
        ...(businessType !== undefined && { businessType: businessType || null }),
        ...(isRoleTemplate !== undefined && { isRoleTemplate: isRoleTemplate === true }),
        ...(defaultNotes !== undefined && { defaultNotes: defaultNotes || null }),
        ...(defaultPermissionPreset !== undefined && { defaultPermissionPreset: defaultPermissionPreset || null })
      },
      include: {
        _count: {
          select: {
            employees: true,
            contracts: true
          }
        }
      }
    })

    return NextResponse.json(updatedJobTitle)
  } catch (error: any) {
    console.error('Job title update error:', error)
    
    // Handle unique constraint violations
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A job title with this name already exists' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update job title' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to manage job titles
    if (!hasPermission(user, 'canManageJobTitles')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { id } = await params

    // Check if job title exists
    const existingJobTitle = await prisma.jobTitles.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            employees: true,
            contracts: true
          }
        }
      }
    })

    if (!existingJobTitle) {
      return NextResponse.json(
        { error: 'Job title not found' },
        { status: 404 }
      )
    }

    // Check if job title is in use
    if (existingJobTitle._count.employees > 0 || existingJobTitle._count.contracts > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete job title that is currently assigned to employees or contracts. Please deactivate it instead.' 
        },
        { status: 400 }
      )
    }

    await prisma.jobTitles.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Job title deleted successfully' })
  } catch (error) {
    console.error('Job title deletion error:', error)
    return NextResponse.json(
      { error: 'Failed to delete job title' },
      { status: 500 }
    )
  }
}