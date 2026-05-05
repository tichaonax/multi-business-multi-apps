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
  { params }: { params: Promise<{ employeeId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { employeeId } = await params

    const employee = await prisma.employees.findUnique({ where: { id: employeeId } })
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
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

    const uploadDir = join(process.cwd(), 'public/uploads/employee-documents')
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    if (employee.nationalIdDocUrl) {
      const oldPath = join(process.cwd(), 'public', employee.nationalIdDocUrl)
      if (existsSync(oldPath)) {
        await unlink(oldPath).catch(() => {})
      }
    }

    const ext = file.name.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '') || 'pdf'
    const filename = `nationalid_${employeeId}_${Date.now()}.${ext}`
    const bytes = await file.arrayBuffer()
    await writeFile(join(uploadDir, filename), Buffer.from(bytes))

    const nationalIdDocUrl = `/uploads/employee-documents/${filename}`

    const updated = await prisma.employees.update({
      where: { id: employeeId },
      data: { nationalIdDocUrl, nationalIdDocName: file.name }
    })

    return NextResponse.json({ success: true, nationalIdDocUrl: updated.nationalIdDocUrl, nationalIdDocName: updated.nationalIdDocName })
  } catch (error) {
    console.error('[Employee Documents API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { employeeId } = await params

    const employee = await prisma.employees.findUnique({ where: { id: employeeId } })
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    if (employee.nationalIdDocUrl) {
      const filePath = join(process.cwd(), 'public', employee.nationalIdDocUrl)
      if (existsSync(filePath)) {
        await unlink(filePath).catch(() => {})
      }
    }

    await prisma.employees.update({
      where: { id: employeeId },
      data: { nationalIdDocUrl: null, nationalIdDocName: null }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Employee Documents API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
