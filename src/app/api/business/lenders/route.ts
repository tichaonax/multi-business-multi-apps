import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isSystemAdmin } from '@/lib/permission-utils'
import { SessionUser } from '@/lib/permission-utils'

// Helper function to check if user has admin/manager/owner role
async function hasRequiredRole(userId: string, businessId?: string): Promise<boolean> {
  // System admins can perform all operations
  const session = await getServerSession(authOptions)
  if (session?.user && isSystemAdmin(session.user as SessionUser)) {
    return true
  }

  // For creating lenders, we check if user has required role in ANY of their businesses
  // Since lenders are shared across businesses the user manages
  const memberships = await prisma.businessMemberships.findMany({
    where: {
      userId: userId,
      isActive: true,
      role: { in: ['admin', 'manager', 'owner'] }
    }
  })

  return memberships.length > 0
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all active lenders (persons)
    // Anyone with business access can view lenders
    const lenders = await prisma.persons.findMany({
      where: {
        isActive: true
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        nationalId: true,
        address: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        // Bank-specific fields
        bankRegistrationNo: true,
        swiftCode: true,
        swiftCodeShort: true,
        branchCode: true,
        city: true,
        country: true,
        alternatePhones: true,
        loans_as_lender: {
          select: {
            id: true,
            loanNumber: true,
            status: true,
            remainingBalance: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Add computed fields
    const lendersWithMetadata = lenders.map(lender => ({
      ...lender,
      lenderType: lender.bankRegistrationNo ? 'bank' : 'individual',
      activeLoansCount: lender.loans_as_lender.filter(loan => loan.status === 'active').length,
      totalOutstanding: lender.loans_as_lender
        .filter(loan => loan.status === 'active')
        .reduce((sum, loan) => sum + Number(loan.remainingBalance), 0)
    }))

    return NextResponse.json(lendersWithMetadata)
  } catch (error) {
    console.error('Lenders fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch lenders' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has required role (admin/manager/owner)
    const hasPermission = await hasRequiredRole(session.user.id)
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only admins, managers, and owners can create lenders.' },
        { status: 403 }
      )
    }

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

    // Different validation based on lender type
    if (lenderType === 'bank') {
      // Banks require: name, phone, registration number, address, city, country
      if (!fullName || !phone || !bankRegistrationNo || !address || !city || !country) {
        return NextResponse.json(
          { error: 'Bank name, phone, registration number, address, city, and country are required for banks' },
          { status: 400 }
        )
      }

      // Check for duplicate bank registration number
      const existingByRegNo = await prisma.persons.findFirst({
        where: { bankRegistrationNo }
      })

      if (existingByRegNo) {
        return NextResponse.json(
          { error: 'A bank with this registration number already exists' },
          { status: 400 }
        )
      }
    } else {
      // Individuals require: name, phone, nationalId
      if (!fullName || !phone || !nationalId) {
        return NextResponse.json(
          { error: 'Full name, phone, and national ID are required for individuals' },
          { status: 400 }
        )
      }

      // Check for duplicate nationalId
      const existingByNationalId = await prisma.persons.findFirst({
        where: { nationalId }
      })

      if (existingByNationalId) {
        return NextResponse.json(
          { error: 'A lender with this national ID already exists' },
          { status: 400 }
        )
      }
    }

    // Check for duplicate email if provided
    if (email) {
      const existingByEmail = await prisma.persons.findUnique({
        where: { email }
      })

      if (existingByEmail) {
        return NextResponse.json(
          { error: 'A lender with this email already exists' },
          { status: 400 }
        )
      }
    }

    // Add lender type to notes if specified
    const finalNotes = lenderType === 'bank'
      ? `[BANK] ${notes || ''}`.trim()
      : notes || null

    // Create the lender with appropriate fields
    const lender = await prisma.persons.create({
      data: {
        fullName,
        email: email || null,
        phone,
        nationalId: lenderType === 'bank' ? null : nationalId,
        address: address || null,
        notes: finalNotes,
        createdBy: session.user.id,
        isActive: true,
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
      ...lender,
      lenderType: lenderType || 'individual'
    })
  } catch (error) {
    console.error('Lender creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create lender' },
      { status: 500 }
    )
  }
}
