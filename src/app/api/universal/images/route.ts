import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST /api/universal/images
// Form fields:
//   files         — one or more image File objects
//   expiresInDays — optional number; when set, images expire after N days
//                   (use 60 for clock-in verification photos)
export async function POST(request: NextRequest) {
  try {
    const data = await request.formData()
    const files: File[] = data.getAll('files') as File[]

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files uploaded' }, { status: 400 })
    }

    // Optional expiry
    const expiresInDaysRaw = data.get('expiresInDays')
    const expiresInDays = expiresInDaysRaw ? Number(expiresInDaysRaw) : null
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null

    const uploadedFiles = []

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        return NextResponse.json({ error: `File ${file.name} is not an image` }, { status: 400 })
      }
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json({ error: `File ${file.name} is too large (max 10MB)` }, { status: 400 })
      }

      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)

      // Store image binary in PostgreSQL so it is accessible from any
      // machine that connects to the shared database.
      const rows = await prisma.$queryRaw<{ id: string }[]>`
        INSERT INTO "images" ("id", "data", "mimeType", "size", "expiresAt", "createdAt")
        VALUES (
          gen_random_uuid()::text,
          ${buffer},
          ${file.type},
          ${file.size},
          ${expiresAt},
          NOW()
        )
        RETURNING "id"
      `

      const id = rows[0].id
      uploadedFiles.push({
        filename: id,
        originalName: file.name,
        size: file.size,
        type: file.type,
        url: `/api/images/${id}`,
      })
    }

    return NextResponse.json({ success: true, data: uploadedFiles })
  } catch (error) {
    console.error('Image upload error:', error)
    return NextResponse.json({ success: false, error: 'Failed to upload images' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('filename') // 'filename' kept for backwards compat

    if (!id) {
      return NextResponse.json({ error: 'Image ID required' }, { status: 400 })
    }

    await prisma.$executeRaw`DELETE FROM "images" WHERE "id" = ${id}`

    return NextResponse.json({ success: true, message: 'Image deleted successfully' })
  } catch (error) {
    console.error('Image delete error:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete image' }, { status: 500 })
  }
}
