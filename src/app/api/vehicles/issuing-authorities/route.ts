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

    const authorities = await prisma.$queryRaw<Array<{ id: string; name: string; country: string | null; type: string | null }>>`
      SELECT id, name, country, type FROM issuing_authorities ORDER BY name ASC
    `

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

    // Upsert: insert if name doesn't exist, otherwise return existing
    const trimmedName = name.trim()
    const trimmedCountry = country?.trim() || null
    const trimmedType = type?.trim() || null
    const rows = await prisma.$queryRaw<Array<{ id: string; name: string; country: string | null; type: string | null }>>`
      INSERT INTO issuing_authorities (id, name, country, type, "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), ${trimmedName}, ${trimmedCountry}, ${trimmedType}, NOW(), NOW())
      ON CONFLICT (name) DO UPDATE SET "updatedAt" = NOW()
      RETURNING id, name, country, type
    `
    const authority = rows[0]

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
