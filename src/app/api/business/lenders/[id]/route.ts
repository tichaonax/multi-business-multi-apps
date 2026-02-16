import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isSystemAdmin } from '@/lib/permission-utils'
import { SessionUser } from '@/lib/permission-utils'
import { getServerUser } from '@/lib/get-server-user'

// Helper function to check if user has admin/manager/owner role
async function hasRequiredRole(userId: string): Promise<boolean> {
  const user = await getServerUser()
  if (user && isSystemAdmin(user as SessionUser)) {
    return true
  }

  const memberships = await prisma.businessMemberships.findMany({
    where: {
      userId: userId,
      isActive: true,
      role: { in: ['admin', 'manager', 'owner'] }
    }
  })

  return memberships.length > 0
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permissions
    const hasPermission = await hasRequiredRole(user.id)
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only admins, managers, and owners can update lenders.' },
        { status: 403 }
      )
    }

    const { id } = params
    const {
      fullName,
      email,
      phone,
      nationalId,
      address,
      lenderType,
      notes,
      // Bank-specific fields
      bankRegistrationNo,
      swiftCode,
      swiftCodeShort,
      branchCode,
      city,
      country,
      alternatePhones
    } = await request.json()

    // Check if lender exists
    const existingLender = await prisma.persons.findUnique({
      where: { id }
    })

    if (!existingLender) {
      return NextResponse.json(
        { error: 'Lender not found' },
        { status: 404 }
      )
    }

    // Different validation based on lender type
    if (lenderType === 'bank') {
      // Banks require: name, phone, registration number, address, city, country
      if (!fullName || !phone || !bankRegistrationNo || !address || !city || !country) {
        return NextResponse.json(
          { error: 'Bank name, phone, registration number, address, city, and country are required for banks' },
          { status: 400 }
        )
      }

      // Check for duplicate bank registration number (excluding current)
      if (bankRegistrationNo !== existingLender.bankRegistrationNo) {
        const duplicateRegNo = await prisma.persons.findFirst({
          where: { bankRegistrationNo, id: { not: id } }
        })
        if (duplicateRegNo) {
          return NextResponse.json(
            { error: 'A bank with this registration number already exists' },
            { status: 400 }
          )
        }
      }
    } else {
      // Individuals require: name, phone, nationalId
      if (!fullName || !phone || !nationalId) {
        return NextResponse.json(
          { error: 'Full name, phone, and national ID are required for individuals' },
          { status: 400 }
        )
      }

      // Check for duplicate nationalId (excluding current lender)
      if (nationalId !== existingLender.nationalId) {
        const duplicateNationalId = await prisma.persons.findFirst({
          where: { nationalId, id: { not: id } }
        })
        if (duplicateNationalId) {
          return NextResponse.json(
            { error: 'A lender with this national ID already exists' },
            { status: 400 }
          )
        }
      }
    }

    // Check for duplicate email (excluding current lender)
    if (email && email !== existingLender.email) {
      const duplicateEmail = await prisma.persons.findUnique({
        where: { email }
      })

      if (duplicateEmail) {
        return NextResponse.json(
          { error: 'A lender with this email already exists' },
          { status: 400 }
        )
      }
    }

    // Update lender type in notes if specified
    const finalNotes = lenderType === 'bank'
      ? `[BANK] ${notes || ''}`.trim()
      : notes || null

    // Update the lender with appropriate fields
    const updatedLender = await prisma.persons.update({
      where: { id },
      data: {
        fullName,
        email: email || null,
        phone,
        nationalId: lenderType === 'bank' ? null : nationalId,
        address: address || null,
        notes: finalNotes,
        updatedAt: new Date(),
        // Bank-specific fields
        bankRegistrationNo: lenderType === 'bank' ? bankRegistrationNo : null,
        swiftCode: lenderType === 'bank' ? (swiftCode || null) : null,
        swiftCodeShort: lenderType === 'bank' ? (swiftCodeShort || null) : null,
        branchCode: lenderType === 'bank' ? (branchCode || null) : null,
        city: lenderType === 'bank' ? city : null,
        country: lenderType === 'bank' ? country : null,
        alternatePhones: lenderType === 'bank' && alternatePhones ? alternatePhones : []
      }
    })

    return NextResponse.json({
      ...updatedLender,
      lenderType: updatedLender.bankRegistrationNo ? 'bank' : 'individual'
    })
  } catch (error) {
    console.error('Lender update error:', error)
    return NextResponse.json(
      { error: 'Failed to update lender' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permissions
    const hasPermission = await hasRequiredRole(user.id)
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only admins, managers, and owners can delete lenders.' },
        { status: 403 }
      )
    }

    const { id } = params

    // Check if lender exists
    const lender = await prisma.persons.findUnique({
      where: { id },
      include: {
        loans_as_lender: {
          where: {
            status: 'active'
          }
        }
      }
    })

    if (!lender) {
      return NextResponse.json(
        { error: 'Lender not found' },
        { status: 404 }
      )
    }

    // Check if lender has active loans
    if (lender.loans_as_lender.length > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete lender with active loans',
          activeLoansCount: lender.loans_as_lender.length
        },
        { status: 400 }
      )
    }

    // Soft delete: set isActive to false
    const deletedLender = await prisma.persons.update({
      where: { id },
      data: {
        isActive: false,
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      message: 'Lender deleted successfully',
      lender: deletedLender
    })
  } catch (error) {
    console.error('Lender deletion error:', error)
    return NextResponse.json(
      { error: 'Failed to delete lender' },
      { status: 500 }
    )
  }
}
