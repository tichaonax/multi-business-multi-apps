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

    const persons = await prisma.person.findMany({
      where,
      include: {
        idFormatTemplates: true,
        driverLicenseTemplates: true,
        projectContractors: {
          include: {
            constructionProjects: {
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
            projectContractors: true,
            projectTransactions: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Map constructionProject to project for UI compatibility
    const personsWithMappedProjects = persons.map(person => ({
      ...person,
      projectContractors: person.projectContractors.map(contractor => ({
        ...contractor,
        project: (contractor as any).constructionProjects
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
      dateOfBirth,
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

    // Age validation for loan recipients (18+ years required)
    if (dateOfBirth) {
      const birthDate = new Date(dateOfBirth)
      const today = new Date()
      const age = today.getFullYear() - birthDate.getFullYear()
      const monthDiff = today.getMonth() - birthDate.getMonth()
      const dayDiff = today.getDate() - birthDate.getDate()

      // Adjust age if birthday hasn't occurred this year
      const actualAge = (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) ? age - 1 : age

      if (actualAge < 18) {
        return NextResponse.json(
          { error: 'Person must be at least 18 years old to receive loans.' },
          { status: 400 }
        )
      }
    }

    // Validate national ID format if template is provided
    if (idFormatTemplateId) {
      const template = await prisma.idFormatTemplate.findUnique({
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
    const existingPerson = await prisma.person.findUnique({
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
      const existingEmail = await prisma.person.findUnique({
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
      idFormatTemplateId: idFormatTemplateId || null,
      driverLicenseNumber: driverLicenseNumber || null,
      driverLicenseTemplateId: driverLicenseTemplateId || null,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      address: address || null,
      notes: notes || null,
      createdBy: session.user.id,
    }

    const newPerson = await prisma.person.create({
      data: createData as any,
      include: {
        idFormatTemplates: true,
        driverLicenseTemplates: true
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