import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'
import { getServerUser } from '@/lib/get-server-user'

// GET /api/payroll/exports/download?file=<filename>
export async function GET(req: NextRequest) {
  const user = await getServerUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const fileName = searchParams.get('file')

  if (!fileName) {
    return NextResponse.json({ error: 'Missing file parameter' }, { status: 400 })
  }

  // Prevent path traversal
  if (fileName.includes('/') || fileName.includes('\\') || fileName.includes('..')) {
    return NextResponse.json({ error: 'Invalid file name' }, { status: 400 })
  }

  const filePath = path.join(process.cwd(), 'public', 'exports', 'payroll', fileName)

  try {
    const fileBuffer = await readFile(filePath)
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': String(fileBuffer.length),
      },
    })
  } catch {
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }
}
