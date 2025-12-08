import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getEffectivePermissions } from '@/lib/permission-utils'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * PUT /api/payees/individuals/[id]
 * Update an individual payee (person)
 *
 * Requires: canEditPayees permission
 */
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permission
    const permissions = getEffectivePermissions(session.user)
    if (!permissions.canEditPayees) {
      return NextResponse.json(
        { error: 'You do not have permission to edit payees' },
        { status: 403 }
      )
    }

    const { id } = await params
    const data = await req.json()
    const {
      fullName,
      email,
      phone,
      nationalId,
      idFormatTemplateId,
      address,
      notes,
      isActive
    } = data

    // Validation
    if (!fullName) {
      return NextResponse.json(
        { error: 'Full name is required' },
        { status: 400 }
      )
    }

    // Check if person exists
    const existingPerson = await prisma.persons.findUnique({
      where: { id }
    })

    if (!existingPerson) {
      return NextResponse.json(
        { error: 'Individual payee not found' },
        { status: 404 }
      )
    }

    // Validate national ID format if template is provided
    if (idFormatTemplateId && nationalId) {
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

    // Check for duplicate national ID (excluding current person)
    if (nationalId && nationalId !== existingPerson.nationalId) {
      const duplicateNationalId = await prisma.persons.findFirst({
        where: {
          nationalId,
          id: { not: id }
        }
      })

      if (duplicateNationalId) {
        return NextResponse.json(
          { error: 'A person with this national ID already exists' },
          { status: 400 }
        )
      }
    }

    // Check for duplicate email (excluding current person)
    if (email && email !== existingPerson.email) {
      const duplicateEmail = await prisma.persons.findFirst({
        where: {
          email,
          id: { not: id }
        }
      })

      if (duplicateEmail) {
        return NextResponse.json(
          { error: 'A person with this email already exists' },
          { status: 400 }
        )
      }
    }

    // Build update data object
    const updateData: any = {
      fullName,
      updatedAt: new Date()
    }

    if (email !== undefined) updateData.email = email || null
    if (phone !== undefined) updateData.phone = phone || null
    if (nationalId !== undefined) updateData.nationalId = nationalId || null
    if (idFormatTemplateId !== undefined) updateData.idFormatTemplateId = idFormatTemplateId || null
    if (address !== undefined) updateData.address = address || null
    if (notes !== undefined) updateData.notes = notes || null
    if (isActive !== undefined) updateData.isActive = isActive

    const updatedPerson = await prisma.persons.update({
      where: { id },
      data: updateData,
      include: {
        id_format_templates: true
      }
    })

    return NextResponse.json({
      success: true,
      data: updatedPerson
    })
  } catch (error: any) {
    console.error('Individual payee update error:', error)

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
      { error: 'Failed to update individual payee' },
      { status: 500 }
    )
  }
}
