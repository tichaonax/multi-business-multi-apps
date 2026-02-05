import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/permission-utils'

import { randomBytes } from 'crypto';
export async function GET(req: NextRequest) {
  try {
    console.log('🔍 Job titles API - Starting request')
    console.log('🔍 Prisma client available:', !!prisma)
    console.log('🔍 Prisma client keys:', Object.keys(prisma).slice(0, 10))
    console.log('🔍 Prisma.jobTitle available:', !!prisma?.jobTitle)
    console.log('🔍 Prisma.jobTitle available:', !!prisma?.jobTitle)
    console.log('🔍 Prisma.jobTitles available:', !!prisma?.jobTitles)
    console.log('🔍 Prisma.user available:', !!prisma?.user)
    console.log('🔍 Prisma.users available:', !!prisma?.users)
    
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const includeInactive = searchParams.get('includeInactive') === 'true'

    const whereClause = includeInactive ? {} : { isActive: true }

    const jobTitles = await prisma.jobTitles.findMany({
      where: whereClause,
      orderBy: [
        { level: 'asc' },
        { title: 'asc' }
      ]
    })

    return NextResponse.json(jobTitles)
  } catch (error) {
    console.error('Job titles fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch job titles' },
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

    // Check if user has permission to manage job titles
    if (!hasPermission(session.user, 'canManageJobTitles')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const data = await req.json()
    const {
      title,
      description,
      responsibilities,
      department,
      level,
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

    // Check for duplicate title
    const existingJobTitle = await prisma.jobTitles.findUnique({
      where: { title }
    })

    if (existingJobTitle) {
      return NextResponse.json(
        { error: 'A job title with this name already exists' },
        { status: 400 }
      )
    }

    const newJobTitle = await prisma.jobTitles.create({
      data: {
        title,
        description: description || null,
        responsibilities: Array.isArray(responsibilities) ? responsibilities : [],
        department: department || null,
        level: level || null,
        // Role template fields
        jobSummary: jobSummary || null,
        skillsRequired: Array.isArray(skillsRequired) ? skillsRequired : [],
        qualifications: Array.isArray(qualifications) ? qualifications : [],
        businessType: businessType || null,
        isRoleTemplate: isRoleTemplate === true,
        defaultNotes: defaultNotes || null,
        defaultPermissionPreset: defaultPermissionPreset || null
      }
    })

    return NextResponse.json(newJobTitle)
  } catch (error: any) {
    console.error('Job title creation error:', error)
    
    // Handle unique constraint violations
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A job title with this name already exists' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create job title' },
      { status: 500 }
    )
  }
}