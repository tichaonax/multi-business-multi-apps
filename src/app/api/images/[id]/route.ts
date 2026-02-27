import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

type ImageRow = {
  data: Buffer
  mimeType: string
  expiresAt: Date | null
}

// GET /api/images/[id]
// Serves image binary from the database.
// Returns 410 Gone if the image has passed its expiresAt date.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const rows = await prisma.$queryRaw<ImageRow[]>`
    SELECT "data", "mimeType", "expiresAt"
    FROM "images"
    WHERE "id" = ${id}
  `

  if (!rows.length) {
    return new NextResponse(null, { status: 404 })
  }

  const image = rows[0]

  // Expired — return 410 so clients know it's gone rather than missing
  if (image.expiresAt && image.expiresAt < new Date()) {
    return new NextResponse(null, { status: 410 })
  }

  return new NextResponse(image.data, {
    headers: {
      'Content-Type': image.mimeType,
      // Cache for 24 hours; revalidate after expiry
      'Cache-Control': image.expiresAt
        ? `public, max-age=86400, must-revalidate`
        : 'public, max-age=2592000',
    },
  })
}
