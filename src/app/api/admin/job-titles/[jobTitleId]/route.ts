import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/permission-utils'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ jobTitleId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to view employee data
    if (!hasPermission(session.user, 'canViewEmployees')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { jobTitleId } = await params
    const jobTitle = await prisma.jobTitles.findUnique({
      where: { id: jobTitleId },
      include: {
        _count: {
          select: {
            employeeContracts: true,
            employees: true
          }
        }
      }
    })

    if (!jobTitle) {
      return NextResponse.json({ error: 'Job title not found' }, { status: 404 })
    }

    return NextResponse.json(jobTitle)
  } catch (error) {
    console.error('Error fetching job title:', error)
    return NextResponse.json({ error: 'Failed to fetch job title' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ jobTitleId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to manage employee data
    if (!hasPermission(session.user, 'canManageEmployees')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { jobTitleId } = await params
    const data = await request.json()
    const { title, description, responsibilities, department, level, isActive } = data

    const jobTitle = await prisma.jobTitles.update({
      where: { id: jobTitleId },
      data: {
        title,
        description,
        responsibilities,
        department,
        level,
        isActive: isActive
      }
    })

    return NextResponse.json(jobTitle)
  } catch (error) {
    console.error('Error updating job title:', error)
    return NextResponse.json({ error: 'Failed to update job title' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ jobTitleId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to manage employee data
    if (!hasPermission(session.user, 'canManageEmployees')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { jobTitleId } = await params
    // Check if job title is being used
    const jobTitleInUse = await prisma.jobTitles.findUnique({
      where: { id: jobTitleId },
      include: {
        _count: {
          select: {
            employeeContracts: true,
            employees: true
          }
        }
      }
    })

    if (!jobTitleInUse) {
      return NextResponse.json({ error: 'Job title not found' }, { status: 404 })
    }

    const totalUsage = jobTitleInUse._count.employeeContracts + jobTitleInUse._count.employees
    if (totalUsage > 0) {
      return NextResponse.json({ 
        error: `Cannot delete job title. It is currently assigned to ${totalUsage} employee(s)/contract(s). Please deactivate instead.` 
      }, { status: 400 })
    }

    await prisma.jobTitles.delete({
      where: { id: params.jobTitleId }
    })

    return NextResponse.json({ message: 'Job title deleted successfully' })
  } catch (error) {
    console.error('Error deleting job title:', error)
    return NextResponse.json({ error: 'Failed to delete job title' }, { status: 500 })
  }
}