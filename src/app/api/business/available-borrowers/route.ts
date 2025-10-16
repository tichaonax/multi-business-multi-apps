import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the user's businesses (to exclude them from borrower options since you can't loan to yourself)
    const userBusinesses = await prisma.business_memberships.findMany({
      where: {
        userId: session.user.id,
        isActive: true
      },
      select: { businessId: true }
    })

    const userBusinessIds = userBusinesses.map(membership => membership.businessId)

    // Fetch all active businesses
    const availableBusinesses = await prisma.businesses.findMany({
      where: {
        isActive: true
      },
      select: {
        id: true,
        name: true,
        type: true,
        description: true,
        isUmbrellaBusiness: true
      },
      orderBy: { name: 'asc' }
    })

    // Fetch all active persons
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

    // Format businesses for recipient dropdown
    const businessRecipients = availableBusinesses.map(business => ({
      id: business.id,
      name: business.name,
      type: 'business',
      subtype: business.type,
      description: business.description,
      identifier: business.name,
      isUserBusiness: userBusinessIds.includes(business.id)
    }))

    // Format persons for recipient dropdown
    const personRecipients = availablePersons.map(person => ({
      id: person.id,
      name: person.fullName,
      type: 'person',
      subtype: 'Individual',
      description: person.email || person.phone || '',
      identifier: person.nationalId || person.fullName
    }))

    const allRecipients = [...businessRecipients, ...personRecipients]

    return NextResponse.json(allRecipients)
  } catch (error) {
    console.error('Available borrowers fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch available borrowers' },
      { status: 500 }
    )
  }
}