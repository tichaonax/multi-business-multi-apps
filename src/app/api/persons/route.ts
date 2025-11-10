import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search')
    const isActive = searchParams.get('isActive')

    const where: any = {}
    
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { nationalId: { contains: search, mode: 'insensitive' } },
        { driverLicenseNumber: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } }
      ]
    }
    
    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === 'true'
    }

    const persons = await prisma.persons.findMany({
      where,
      include: {
        id_format_templates: true,
        driver_license_templates: true,
        project_contractors: {
          include: {
            construction_projects: {
              select: {
                id: true,
                name: true,
                status: true
              }
            }
          }
        },
        _count: {
          select: {
            project_contractors: true,
            project_transactions: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Map constructionProject to project for UI compatibility
    const personsWithMappedProjects = persons.map(person => ({
      ...person,
      projectContractors: person.project_contractors.map(contractor => ({
        ...contractor,
        project: (contractor as any).construction_projects
      }))
    }))

    return NextResponse.json(personsWithMappedProjects)
  } catch (error) {
    console.error('Persons fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch persons' },
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

    const data = await req.json()
    const {
      fullName,
      email,
      phone,
      nationalId,
      idFormatTemplateId,
      driverLicenseNumber,
      driverLicenseTemplateId,
      address,
      notes
    } = data

    // Validation
    if (!fullName || !phone || !nationalId) {
      return NextResponse.json(
        { error: 'Full name, phone, and national ID are required' },
        { status: 400 }
      )
    }

    // Validate national ID format if template is provided
    if (idFormatTemplateId) {
      const template = await prisma.idFormatTemplates.findUnique({
        where: { id: idFormatTemplateId }
      })
      
      if (!template) {
        return NextResponse.json(
          { error: 'Invalid ID format template' },
          { status: 400 }
        )
      }

      const regex = new RegExp(template.pattern)
      if (!regex.test(nationalId)) {
        return NextResponse.json(
          { error: `National ID format is invalid. Expected format: ${template.example}` },
          { status: 400 }
        )
      }
    }

    // Check for duplicate national ID
    const existingPerson = await prisma.persons.findUnique({
      where: { nationalId }
    })

    if (existingPerson) {
      return NextResponse.json(
        { error: 'A person with this national ID already exists' },
        { status: 400 }
      )
    }

    // Check for duplicate email if provided
    if (email) {
      const existingEmail = await prisma.persons.findUnique({
        where: { email }
      })

      if (existingEmail) {
        return NextResponse.json(
          { error: 'A person with this email already exists' },
          { status: 400 }
        )
      }
    }

    const createData: any = {
      fullName,
      email: email || null,
      phone,
      nationalId,
      driverLicenseNumber: driverLicenseNumber || null,
      address: address || null,
      notes: notes || null,
    }

    // Add user relation for createdBy
    if (session.user.id) {
      createData.users = {
        connect: { id: session.user.id }
      }
    }

    // Add ID format template relation if provided
    if (idFormatTemplateId) {
      createData.id_format_templates = {
        connect: { id: idFormatTemplateId }
      }
    }

    // Add driver license template relation if provided
    if (driverLicenseTemplateId) {
      createData.driver_license_templates = {
        connect: { id: driverLicenseTemplateId }
      }
    }

    const newPerson = await prisma.persons.create({
      data: createData as any,
      include: {
        id_format_templates: true,
        driver_license_templates: true
      }
    })

    return NextResponse.json(newPerson)
  } catch (error: any) {
    console.error('Person creation error:', error)
    
    // Handle unique constraint violations
    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0]
      if (field === 'nationalId') {
        return NextResponse.json(
          { error: 'A person with this national ID already exists' },
          { status: 400 }
        )
      }
      if (field === 'email') {
        return NextResponse.json(
          { error: 'A person with this email already exists' },
          { status: 400 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to create person' },
      { status: 500 }
    )
  }
}