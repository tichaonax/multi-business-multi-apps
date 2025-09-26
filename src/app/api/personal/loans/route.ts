import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatPhoneNumberForDisplay } from '@/lib/country-codes'
import { hasUserPermission } from '@/lib/permission-utils'
import { SessionUser } from '@/lib/permission-utils'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as SessionUser

    // Check if user has permission to access personal finance
    if (!hasUserPermission(user, 'canAccessPersonalFinance')) {
      return NextResponse.json({ error: 'Insufficient permissions to access personal finance' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') // 'recipients' for new loans, 'existing' for existing loans

    if (type === 'recipients') {
      // Return available businesses to create loans to (exclude user's own businesses)
      const userBusinesses = await prisma.businessMembership.findMany({
        where: {
          userId: session.user.id,
          isActive: true
        },
        select: { businessId: true }
      })

      const userBusinessIds = userBusinesses.map(membership => membership.businessId)

      const availableBusinesses = await prisma.business.findMany({
        where: {
          isActive: true,
          id: { notIn: userBusinessIds } // Exclude user's own businesses
        },
        select: {
          id: true,
          name: true,
          type: true,
          description: true
        },
        orderBy: { name: 'asc' }
      })

      // Get all active individuals/persons
      const availablePersons = await prisma.person.findMany({
        where: {
          isActive: true
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          nationalId: true
        },
        orderBy: { fullName: 'asc' }
      })

      // Combine and format the results
      const recipients = [
        ...availableBusinesses.map(business => ({
          id: business.id,
          name: business.name,
          type: 'business' as const,
          subtype: business.type,
          description: business.description,
          identifier: business.name
        })),
        ...availablePersons.map(person => ({
          id: person.id,
          name: person.fullName,
          type: 'person' as const,
          subtype: 'individual',
          description: `${person.email || ''} ${person.phone ? formatPhoneNumberForDisplay(person.phone) : ''}`.trim(),
          identifier: person.nationalId
        }))
      ].sort((a, b) => a.name.localeCompare(b.name))

      return NextResponse.json(recipients)
    } else {
      // Return existing loans where user is involved for making payments
      const personalLoansGiven = await prisma.interBusinessLoan.findMany({
        where: {
          lenderUserId: session.user.id,
          status: 'active'
        },
        include: {
          borrowerBusiness: {
            select: { name: true }
          },
          borrowerPerson: {
            select: { fullName: true }
          }
        }
      })

      // Get business loans where user has access through business membership
      const userBusinesses = await prisma.businessMembership.findMany({
        where: {
          userId: session.user.id,
          isActive: true
        },
        select: { businessId: true }
      })

      const businessIds = userBusinesses.map(membership => membership.businessId)

      const businessLoansReceived = await prisma.interBusinessLoan.findMany({
        where: {
          borrowerBusinessId: { in: businessIds },
          status: 'active'
        },
        include: {
          borrowerBusiness: {
            select: { name: true }
          },
          borrowerPerson: {
            select: { fullName: true }
          },
          lenderBusiness: {
            select: { name: true }
          }
        }
      })

      const businessLoansGiven = await prisma.interBusinessLoan.findMany({
        where: {
          lenderBusinessId: { in: businessIds },
          status: 'active'
        },
        include: {
          borrowerBusiness: {
            select: { name: true }
          },
          borrowerPerson: {
            select: { fullName: true }
          },
          lenderBusiness: {
            select: { name: true }
          }
        }
      })

      // Combine all loans and convert Decimal amounts to numbers
      const allLoans = [
        ...personalLoansGiven.map(loan => ({
          ...loan,
          principalAmount: Number(loan.principalAmount),
          remainingBalance: Number(loan.remainingBalance),
          totalAmount: Number(loan.totalAmount),
          interestRate: Number(loan.interestRate)
        })),
        ...businessLoansReceived.map(loan => ({
          ...loan,
          principalAmount: Number(loan.principalAmount),
          remainingBalance: Number(loan.remainingBalance),
          totalAmount: Number(loan.totalAmount),
          interestRate: Number(loan.interestRate)
        })),
        ...businessLoansGiven.map(loan => ({
          ...loan,
          principalAmount: Number(loan.principalAmount),
          remainingBalance: Number(loan.remainingBalance),
          totalAmount: Number(loan.totalAmount),
          interestRate: Number(loan.interestRate)
        }))
      ]

      // Remove duplicates by ID
      const uniqueLoans = allLoans.filter((loan, index, array) => 
        array.findIndex(l => l.id === loan.id) === index
      )

      return NextResponse.json(uniqueLoans)
    }
  } catch (error) {
    console.error('Personal loans fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch loans' },
      { status: 500 }
    )
  }
}