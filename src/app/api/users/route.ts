import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getServerUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const search = req.nextUrl.searchParams.get('search')?.trim() ?? ''

    const users = await prisma.users.findMany({
      where: {
        id: { not: currentUser.id },
        isActive: true,
        ...(search
          ? { name: { contains: search, mode: 'insensitive' } }
          : {}),
      },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
      take: 30,
    })

    // online status is resolved client-side via socket (chat:get-online-users)
    return NextResponse.json(users.map(u => ({ id: u.id, name: u.name })))
  } catch (err) {
    console.error('[/api/users]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
