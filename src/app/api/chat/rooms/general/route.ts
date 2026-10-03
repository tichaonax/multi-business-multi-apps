import { NextResponse } from 'next/server'
import { getServerUser } from '@/lib/get-server-user'
import { getGeneralRoom } from '@/lib/chat/rooms'

/** GET /api/chat/rooms/general — resolves the General/Team room's id, so the client can tell it apart from DM/group rooms in socket events. */
export async function GET() {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const room = await getGeneralRoom()
    return NextResponse.json({ id: room.id })
  } catch (err) {
    console.error('[GET /api/chat/rooms/general]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
