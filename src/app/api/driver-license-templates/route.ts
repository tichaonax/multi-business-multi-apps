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
    const isActive = searchParams.get('isActive')
    const countryCode = searchParams.get('countryCode')

    const where: any = {}
    
    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === 'true'
    }
    
    if (countryCode) {
      where.countryCode = countryCode
    }

    const templates = await prisma.driverLicenseTemplates.findMany({
      where,
      include: {
        _count: {
          select: {
            persons: true,
            employees: true
          }
        }
      },
      orderBy: [
        { countryCode: 'asc' },
        { name: 'asc' }
      ]
    })

    return NextResponse.json(templates)
  } catch (error) {
    console.error('Driver license templates fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch driver license templates' },
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

    // Only allow system admins to create driver license templates
    // TODO: Add proper permission check when admin roles are implemented
    
    const data = await req.json()
    const { name, description, pattern, example, countryCode } = data

    // Validation
    if (!name || !pattern || !example) {
      return NextResponse.json(
        { error: 'Name, pattern, and example are required' },
        { status: 400 }
      )
    }

    // Validate regex pattern
    try {
      new RegExp(pattern)
    } catch (regexError) {
      return NextResponse.json(
        { error: 'Invalid regex pattern' },
        { status: 400 }
      )
    }

    // Test the pattern against the example
    const regex = new RegExp(pattern)
    if (!regex.test(example)) {
      return NextResponse.json(
        { error: 'Example does not match the provided pattern' },
        { status: 400 }
      )
    }

    // Check for duplicate names
    const existingTemplate = await prisma.driverLicenseTemplates.findFirst({
      where: { name }
    })

    if (existingTemplate) {
      return NextResponse.json(
        { error: 'A template with this name already exists' },
        { status: 400 }
      )
    }

    const newTemplate = await prisma.driverLicenseTemplates.create({
      data: {
        name,
        description: description || null,
        pattern,
        example,
        countryCode: countryCode || null,
      }
    })

    return NextResponse.json(newTemplate)
  } catch (error) {
    console.error('Driver license template creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create driver license template' },
      { status: 500 }
    )
  }
}