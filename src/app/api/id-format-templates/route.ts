import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

export async function GET(req: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const isActive = searchParams.get('isActive')

    const templates = await prisma.idFormatTemplates.findMany({
      where: isActive ? { isActive: true } : undefined,
      orderBy: [
        { countryCode: 'asc' },
        { name: 'asc' }
      ]
    })

    return NextResponse.json(templates)
  } catch (error) {
    console.error('ID templates fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch ID format templates' },
      { status: 500 }
    )
  }
}