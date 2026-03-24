import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getSeedCategories } from '@/lib/category-seed-data'
import { randomUUID } from 'crypto'

// GET /api/admin/seed-categories?businessType=X
// Returns whether seed categories exist for a business type.
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const businessType = request.nextUrl.searchParams.get('businessType')
    if (!businessType) {
      return NextResponse.json({ error: 'businessType is required' }, { status: 400 })
    }

    const count = await prisma.businessCategories.count({
      where: { businessType, businessId: null, isActive: true },
    })

    return NextResponse.json({ seeded: count > 0, count })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/admin/seed-categories
// Seeds global categories for a business type. Re-runnable: skips existing categories.
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { businessType } = await request.json()
    if (!businessType) {
      return NextResponse.json({ error: 'businessType is required' }, { status: 400 })
    }

    const seedCategories = getSeedCategories(businessType)
    if (seedCategories.length === 0) {
      return NextResponse.json({ error: `No seed data for businessType: ${businessType}` }, { status: 400 })
    }

    let created = 0
    let skipped = 0

    for (const cat of seedCategories) {
      // Skip if a category with the same name+businessType+domainId already exists (global or any)
      const existing = await prisma.businessCategories.findFirst({
        where: {
          name: { equals: cat.name, mode: 'insensitive' },
          businessType,
          domainId: cat.domainId,
        },
      })

      if (existing) {
        skipped++
        continue
      }

      await prisma.businessCategories.create({
        data: {
          id: randomUUID(),
          name: cat.name,
          emoji: cat.emoji,
          color: cat.color || '#6B7280',
          businessType,
          domainId: cat.domainId,
          businessId: null,
          isActive: true,
          isUserCreated: false,
          displayOrder: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })
      created++
    }

    return NextResponse.json({ success: true, created, skipped, total: seedCategories.length })
  } catch (error: any) {
    console.error('Error seeding categories:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
