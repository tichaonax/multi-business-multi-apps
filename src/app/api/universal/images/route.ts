import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const VALID_SOURCE_TYPES = new Set(['DESKTOP_UPLOAD', 'MOBILE_UPLOAD', 'MOBILE_CAMERA'])
const VALID_BG_STATUS = new Set(['NONE', 'PROCESSED', 'FAILED', 'KEPT_ORIGINAL'])

// POST /api/universal/images
// Form fields:
//   files                      — one or more image File objects
//   expiresInDays              — optional number; when set, images expire after N days
//                                 (use 60 for clock-in verification photos)
//   sourceType                 — optional (MBM-297 Phase C): 'DESKTOP_UPLOAD' | 'MOBILE_UPLOAD' | 'MOBILE_CAMERA'
//   backgroundProcessingStatus — optional (MBM-297 Phase C): 'PROCESSED' | 'FAILED' | 'KEPT_ORIGINAL'
//   contentHash                — optional (MBM-297 Phase C): SHA-256 hex of the file's bytes, for
//                                 exact-duplicate detection (a warning in the response, never a hard block)
//   thumbnail                  — optional (MBM-297 Phase C): a smaller companion image for the FIRST
//                                 uploaded file only, stored as its own row and linked via thumbnailImageId
//
// Raw SQL (not `prisma.images.create`) is deliberate here, not a shortcut:
// this route predates the Prisma-client-locked-DLL workaround pattern
// documented elsewhere in this app, and staying on raw SQL means the new
// Phase C columns below work immediately without depending on a
// `prisma generate` that a running server instance may be blocking.
export async function POST(request: NextRequest) {
  try {
    const data = await request.formData()
    const files: File[] = data.getAll('files') as File[]

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files uploaded' }, { status: 400 })
    }

    const expiresInDaysRaw = data.get('expiresInDays')
    const expiresInDays = expiresInDaysRaw ? Number(expiresInDaysRaw) : null
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null

    const sourceTypeRaw = data.get('sourceType')
    const sourceType = typeof sourceTypeRaw === 'string' && VALID_SOURCE_TYPES.has(sourceTypeRaw) ? sourceTypeRaw : null

    const bgStatusRaw = data.get('backgroundProcessingStatus')
    const backgroundProcessingStatus = typeof bgStatusRaw === 'string' && VALID_BG_STATUS.has(bgStatusRaw) ? bgStatusRaw : null

    const contentHashRaw = data.get('contentHash')
    const contentHash = typeof contentHashRaw === 'string' && contentHashRaw.trim() ? contentHashRaw.trim() : null

    const thumbnailFile = data.get('thumbnail') as File | null

    let duplicateOfId: string | null = null
    if (contentHash) {
      const existing = await prisma.$queryRaw<{ id: string }[]>`
        SELECT "id" FROM "images" WHERE "contentHash" = ${contentHash} LIMIT 1
      `
      if (existing.length > 0) duplicateOfId = existing[0].id
    }

    const uploadedFiles = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (!file.type.startsWith('image/')) {
        return NextResponse.json({ error: `File ${file.name} is not an image` }, { status: 400 })
      }
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json({ error: `File ${file.name} is too large (max 10MB)` }, { status: 400 })
      }

      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)

      // Only the first file in the batch gets the paired thumbnail — this
      // route is called either with one product photo (Phase C pipeline,
      // which is what ever supplies a `thumbnail`) or a legacy multi-file
      // upload (which never does), so there's never ambiguity in practice.
      let thumbnailImageId: string | null = null
      if (i === 0 && thumbnailFile) {
        const thumbBytes = await thumbnailFile.arrayBuffer()
        const thumbBuffer = Buffer.from(thumbBytes)
        const thumbRows = await prisma.$queryRaw<{ id: string }[]>`
          INSERT INTO "images" ("id", "data", "mimeType", "size", "expiresAt", "createdAt", "sourceType")
          VALUES (gen_random_uuid()::text, ${thumbBuffer}, ${thumbnailFile.type}, ${thumbnailFile.size}, ${expiresAt}, NOW(), ${sourceType}::"ImageSourceType")
          RETURNING "id"
        `
        thumbnailImageId = thumbRows[0].id
      }

      const rows = await prisma.$queryRaw<{ id: string }[]>`
        INSERT INTO "images" ("id", "data", "mimeType", "size", "expiresAt", "createdAt", "sourceType", "backgroundProcessingStatus", "contentHash", "thumbnailImageId")
        VALUES (
          gen_random_uuid()::text,
          ${buffer},
          ${file.type},
          ${file.size},
          ${expiresAt},
          NOW(),
          ${sourceType}::"ImageSourceType",
          ${i === 0 ? backgroundProcessingStatus : null}::"BackgroundProcessingStatus",
          ${i === 0 ? contentHash : null},
          ${thumbnailImageId}
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
        ...(thumbnailImageId ? { thumbnailUrl: `/api/images/${thumbnailImageId}` } : {}),
        ...(i === 0 && duplicateOfId ? { duplicateOf: duplicateOfId, duplicateOfUrl: `/api/images/${duplicateOfId}` } : {}),
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
