import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir, unlink } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { getServerUser } from '@/lib/get-server-user'

export const dynamic = 'force-dynamic'

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg']
const MAX_SIZE = 10 * 1024 * 1024 // 10MB

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ vehicleId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { vehicleId } = await params

    const vehicle = await prisma.vehicles.findUnique({ where: { id: vehicleId } })
    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })
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

    const uploadDir = join(process.cwd(), 'public/uploads/vehicle-documents')
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // Delete old title book file if it exists
    if (vehicle.titleBookUrl) {
      const oldPath = join(process.cwd(), 'public', vehicle.titleBookUrl)
      if (existsSync(oldPath)) {
        await unlink(oldPath).catch(() => {})
      }
    }

    const ext = file.name.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '') || 'pdf'
    const filename = `titlebook_${vehicleId}_${Date.now()}.${ext}`
    const bytes = await file.arrayBuffer()
    await writeFile(join(uploadDir, filename), Buffer.from(bytes))

    const titleBookUrl = `/uploads/vehicle-documents/${filename}`

    const updated = await prisma.vehicles.update({
      where: { id: vehicleId },
      data: { titleBookUrl, titleBookName: file.name }
    })

    return NextResponse.json({ success: true, titleBookUrl: updated.titleBookUrl, titleBookName: updated.titleBookName })
  } catch (error) {
    console.error('[Vehicle Documents API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ vehicleId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { vehicleId } = await params

    const vehicle = await prisma.vehicles.findUnique({ where: { id: vehicleId } })
    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })
    }

    if (vehicle.titleBookUrl) {
      const filePath = join(process.cwd(), 'public', vehicle.titleBookUrl)
      if (existsSync(filePath)) {
        await unlink(filePath).catch(() => {})
      }
    }

    await prisma.vehicles.update({
      where: { id: vehicleId },
      data: { titleBookUrl: null, titleBookName: null }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Vehicle Documents API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
