import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * Get all available lenders for dropdown selection
 * Returns simplified list of active lenders (persons)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all active lenders
    const lenders = await prisma.persons.findMany({
      where: {
        isActive: true
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        notes: true
      },
      orderBy: {
        fullName: 'asc'
      }
    })

    // Format for dropdown with lender type
    const formattedLenders = lenders.map(lender => ({
      id: lender.id,
      name: lender.fullName,
      email: lender.email,
      phone: lender.phone,
      lenderType: lender.notes?.toLowerCase().includes('[bank]') ? 'bank' : 'individual',
      displayName: `${lender.fullName} (${lender.notes?.toLowerCase().includes('[bank]') ? 'Bank' : 'Individual'})`
    }))

    return NextResponse.json(formattedLenders)
  } catch (error) {
    console.error('Available lenders fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch available lenders' },
      { status: 500 }
    )
  }
}
