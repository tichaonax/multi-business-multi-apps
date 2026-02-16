import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/permission-utils'

import { randomBytes } from 'crypto';
import { getServerUser } from '@/lib/get-server-user'
export async function GET() {
  try {
    const user = await getServerUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to view employee data
    if (!hasPermission(user, 'canViewEmployees')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const jobTitles = await prisma.jobTitles.findMany({
      include: {
        _count: {
          select: {
            employees: true
          }
        }
      },
      orderBy: { title: 'asc' }
    })

    return NextResponse.json(jobTitles)
  } catch (error) {
    console.error('Error fetching job titles:', error)
    return NextResponse.json({ error: 'Failed to fetch job titles' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await getServerUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to manage employee data
    if (!hasPermission(user, 'canManageEmployees')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const data = await request.json()
    const { title, description, responsibilities, department, level } = data

    const jobTitle = await prisma.jobTitles.create({
      data: {
        title,
        description,
        responsibilities,
        department,
        level
      }
    })

    return NextResponse.json(jobTitle, { status: 201 })
  } catch (error) {
    console.error('Error creating job title:', error)
    return NextResponse.json({ error: 'Failed to create job title' }, { status: 500 })
  }
}