import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { formatPhoneNumberForDisplay } from '@/lib/country-codes'
import { hasUserPermission } from '@/lib/permission-utils'
import { getServerUser } from '@/lib/get-server-user'

export async function GET(req: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    // Check if user has permission to access personal finance
    if (!hasUserPermission(user, 'canAccessPersonalFinance')) {
      return NextResponse.json({ error: 'Insufficient permissions to access personal finance' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') // 'recipients' for new loans, 'existing' for existing loans

    if (type === 'recipients') {
      // Return available businesses to create loans to (exclude user's own businesses)
      const userBusinesses = await prisma.businessMemberships.findMany({
        where: {
          userId: user.id,
          isActive: true
        },
        select: { businessId: true }
      })

      const userBusinessIds = userBusinesses.map(membership => membership.businessId)

      const availableBusinesses = await prisma.businesses.findMany({
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
      const availablePersons = await prisma.persons.findMany({
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
      const personalLoansGiven = await prisma.interBusinessLoans.findMany({
        where: {
          lenderUserId: user.id,
          status: 'active'
        },
        include: {
          businesses_inter_business_loans_borrowerBusinessIdTobusinesses: {
            select: { name: true }
          },
          persons: {
            select: { fullName: true }
          }
        }
      })

      // Get business loans where user has access through business membership
      const userBusinesses = await prisma.businessMemberships.findMany({
        where: {
          userId: user.id,
          isActive: true
        },
        select: { businessId: true }
      })

      const businessIds = userBusinesses.map(membership => membership.businessId)

      const businessLoansReceived = await prisma.interBusinessLoans.findMany({
        where: {
          borrowerBusinessId: { in: businessIds },
          status: 'active'
        },
        include: {
          businesses_inter_business_loans_borrowerBusinessIdTobusinesses: {
            select: { name: true }
          },
          persons: {
            select: { fullName: true }
          },
          businesses_inter_business_loans_lenderBusinessIdTobusinesses: {
            select: { name: true }
          }
        }
      })

      const businessLoansGiven = await prisma.interBusinessLoans.findMany({
        where: {
          lenderBusinessId: { in: businessIds },
          status: 'active'
        },
        include: {
          businesses_inter_business_loans_borrowerBusinessIdTobusinesses: {
            select: { name: true }
          },
          persons: {
            select: { fullName: true }
          },
          businesses_inter_business_loans_lenderBusinessIdTobusinesses: {
            select: { name: true }
          }
        }
      })

      // Combine all loans and convert Decimal amounts to numbers
      // Also map relation names to expected format
      const allLoans = [
        ...personalLoansGiven.map(loan => ({
          ...loan,
          borrowerBusiness: loan.businesses_inter_business_loans_borrowerBusinessIdTobusinesses,
          borrowerPerson: loan.persons,
          lenderBusiness: null,
          principalAmount: Number(loan.principalAmount),
          remainingBalance: Number(loan.remainingBalance),
          totalAmount: Number(loan.totalAmount),
          interestRate: Number(loan.interestRate)
        })),
        ...businessLoansReceived.map(loan => ({
          ...loan,
          borrowerBusiness: loan.businesses_inter_business_loans_borrowerBusinessIdTobusinesses,
          borrowerPerson: loan.persons,
          lenderBusiness: loan.businesses_inter_business_loans_lenderBusinessIdTobusinesses,
          principalAmount: Number(loan.principalAmount),
          remainingBalance: Number(loan.remainingBalance),
          totalAmount: Number(loan.totalAmount),
          interestRate: Number(loan.interestRate)
        })),
        ...businessLoansGiven.map(loan => ({
          ...loan,
          borrowerBusiness: loan.businesses_inter_business_loans_borrowerBusinessIdTobusinesses,
          borrowerPerson: loan.persons,
          lenderBusiness: loan.businesses_inter_business_loans_lenderBusinessIdTobusinesses,
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
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })
    return NextResponse.json(
      {
        error: 'Failed to fetch loans',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}