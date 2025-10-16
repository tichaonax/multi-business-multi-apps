import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{ personId: string }>
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { personId } = await params

    const person = await prisma.persons.findUnique({
      where: { id: personId },
      include: {
        idFormatTemplate: true,
        _count: {
          select: {
            project_contractors: true,
            project_transactions: true
          }
        }
      }
    })

    if (!person) {
      return NextResponse.json(
        { error: 'Person not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(person)
  } catch (error) {
    console.error('Person fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch person' },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { personId } = await params
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
    if (!fullName || !phone || !nationalId) {
      return NextResponse.json(
        { error: 'Full name, phone, and national ID are required' },
        { status: 400 }
      )
    }

    // Check if person exists
    const existingPerson = await prisma.persons.findUnique({
      where: { id: personId }
    })

    if (!existingPerson) {
      return NextResponse.json(
        { error: 'Person not found' },
        { status: 404 }
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

    // Check for duplicate national ID (excluding current person)
    if (nationalId !== existingPerson.nationalId) {
      const duplicateNationalId = await prisma.persons.findUnique({
        where: { nationalId }
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
      const duplicateEmail = await prisma.persons.findUnique({
        where: { email }
      })

      if (duplicateEmail) {
        return NextResponse.json(
          { error: 'A person with this email already exists' },
          { status: 400 }
        )
      }
    }

    const updatedPerson = await prisma.persons.update({
      where: { id: personId },
      data: {
        fullName,
        email: email || null,
        phone,
        nationalId,
        idFormatTemplateId: idFormatTemplateId || null,
        address: address || null,
        notes: notes || null,
        isActive: isActive !== undefined ? isActive : existingPerson.isActive
      },
      include: {
        idFormatTemplate: true
      }
    })

    return NextResponse.json(updatedPerson)
  } catch (error: any) {
    console.error('Person update error:', error)
    
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
      { error: 'Failed to update person' },
      { status: 500 }
    )
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { personId } = await params
    const data = await req.json()

    // Check if person exists
    const existingPerson = await prisma.persons.findUnique({
      where: { id: personId }
    })

    if (!existingPerson) {
      return NextResponse.json(
        { error: 'Person not found' },
        { status: 404 }
      )
    }

    // Only update the fields that are provided
    const updatedPerson = await prisma.persons.update({
      where: { id: personId },
      data: data,
      include: {
        idFormatTemplate: true
      }
    })

    return NextResponse.json(updatedPerson)
  } catch (error: any) {
    console.error('Person patch error:', error)
    return NextResponse.json(
      { error: 'Failed to update person' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { personId } = await params

    // Check if person exists
    const existingPerson = await prisma.persons.findUnique({
      where: { id: personId },
      include: {
        project_contractors: true,
        project_transactions: true
      }
    })

    if (!existingPerson) {
      return NextResponse.json(
        { error: 'Person not found' },
        { status: 404 }
      )
    }

    // Check if person has active project assignments
    const activeProjectContractors = existingPerson.project_contractors.filter(
      pc => pc.status === 'active'
    )

    if (activeProjectContractors.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete person with active project assignments. Please mark them as inactive instead.' },
        { status: 400 }
      )
    }

    // Check if person has transaction history
    if (existingPerson.project_transactions.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete person with transaction history. Please mark them as inactive instead.' },
        { status: 400 }
      )
    }

    // Safe to delete - no active assignments or transaction history
    await prisma.persons.delete({
      where: { id: personId }
    })

    return NextResponse.json({ message: 'Person deleted successfully' })
  } catch (error) {
    console.error('Person deletion error:', error)
    return NextResponse.json(
      { error: 'Failed to delete person' },
      { status: 500 }
    )
  }
}