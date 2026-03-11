import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

// GET /api/chicken-run/categories?group=feed_type|medication|vaccination
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const group = searchParams.get('group')

    // Fetch system-wide chicken_run categories (businessId=null) — shared across all businesses
    let rows: any[]
    if (group) {
      rows = (await prisma.$queryRawUnsafe(
        `SELECT id, name, emoji, attributes FROM business_categories
         WHERE "businessType" = 'chicken_run'
           AND "isActive" = true
           AND (attributes->>'chickenRunGroup') = $1
         ORDER BY "displayOrder" ASC NULLS LAST, name ASC`,
        group
      )) as any[]
    } else {
      rows = (await prisma.$queryRawUnsafe(
        `SELECT id, name, emoji, attributes FROM business_categories
         WHERE "businessType" = 'chicken_run'
           AND "isActive" = true
         ORDER BY "displayOrder" ASC NULLS LAST, name ASC`
      )) as any[]
    }

    return NextResponse.json({ data: rows })
  } catch (error) {
    console.error('Error fetching chicken-run categories:', error)
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
  }
}

// POST /api/chicken-run/categories  { name, group }
// Creates a system-wide category (businessId=null) for chicken_run
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { name, group } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 })
    }
    if (!group || !['feed_type', 'medication', 'vaccination'].includes(group)) {
      return NextResponse.json({ error: 'Valid group is required (feed_type, medication, vaccination)' }, { status: 400 })
    }

    // Check if already exists (case-insensitive)
    const existing = (await prisma.$queryRawUnsafe(
      `SELECT id, name, emoji FROM business_categories
       WHERE "businessType" = 'chicken_run'
         AND "isActive" = true
         AND (attributes->>'chickenRunGroup') = $1
         AND lower(name) = lower($2)
       LIMIT 1`,
      group,
      name.trim()
    )) as any[]

    if (existing.length > 0) {
      return NextResponse.json({ data: existing[0] })
    }

    const id = crypto.randomUUID()
    const now = new Date()
    const attributes = JSON.stringify({ chickenRunGroup: group })

    await prisma.$executeRawUnsafe(
      `INSERT INTO business_categories
         (id, "businessType", "businessId", name, emoji, "isActive", "isUserCreated", "displayOrder", "createdAt", "updatedAt", attributes)
       VALUES ($1, 'chicken_run', NULL, $2, '📦', true, true, NULL, $3, $3, $4::jsonb)`,
      id,
      name.trim(),
      now,
      attributes
    )

    const created = (await prisma.$queryRawUnsafe(
      `SELECT id, name, emoji, attributes FROM business_categories WHERE id = $1`,
      id
    )) as any[]

    return NextResponse.json({ data: created[0] }, { status: 201 })
  } catch (error) {
    console.error('Error creating chicken-run category:', error)
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 })
  }
}
