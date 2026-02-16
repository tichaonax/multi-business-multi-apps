import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

// GET: Fetch all issuing authorities
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const authorities = await prisma.issuingAuthorities.findMany({
      orderBy: { name: 'asc' }
    })

    return NextResponse.json({
      success: true,
      data: authorities.map(a => ({
        id: a.id,
        name: a.name,
        country: a.country,
        type: a.type
      }))
    })
  } catch (error) {
    console.error('Error fetching issuing authorities:', error)
    return NextResponse.json(
      { error: 'Failed to fetch issuing authorities' },
      { status: 500 }
    )
  }
}

// POST: Create a new issuing authority (or return existing if name matches)
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, country, type } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Authority name is required' },
        { status: 400 }
      )
    }

    // Use upsert to create if doesn't exist, or return existing
    const authority = await prisma.issuingAuthorities.upsert({
      where: { name: name.trim() },
      update: {},
      create: {
        name: name.trim(),
        country: country?.trim() || null,
        type: type?.trim() || null,
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        id: authority.id,
        name: authority.name,
        country: authority.country,
        type: authority.type
      }
    })
  } catch (error) {
    console.error('Error creating issuing authority:', error)
    return NextResponse.json(
      { error: 'Failed to create issuing authority' },
      { status: 500 }
    )
  }
}
