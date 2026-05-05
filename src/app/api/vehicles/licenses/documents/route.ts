import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { getServerUser } from '@/lib/get-server-user'

export const dynamic = 'force-dynamic'

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg']
const MAX_SIZE = 10 * 1024 * 1024 // 10MB

/**
 * POST /api/vehicles/licenses/documents
 * Pre-upload a license document file and get back a URL.
 * The URL is then submitted along with the license form payload.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Only PDF, JPG, and JPEG files are allowed' }, { status: 400 })
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File size must be less than 10MB' }, { status: 400 })
    }

    const uploadDir = join(process.cwd(), 'public/uploads/vehicle-license-documents')
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    const ext = file.name.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '') || 'pdf'
    const filename = `license_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`
    const bytes = await file.arrayBuffer()
    await writeFile(join(uploadDir, filename), Buffer.from(bytes))

    return NextResponse.json({
      success: true,
      documentUrl: `/uploads/vehicle-license-documents/${filename}`,
      documentName: file.name
    })
  } catch (error) {
    console.error('[License Documents API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
