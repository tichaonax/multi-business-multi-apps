import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { createBackup, listBackups } from '@/lib/backup'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const options = await req.json()
    const backupFile = await createBackup(session.user.id, options)
    
    return NextResponse.json({
      success: true,
      backupFile,
      message: 'Backup created successfully',
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Backup failed' },
      { status: 500 }
    )
  }
}

export async function GET() {
  const session = await getServerSession(authOptions)
  
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const backups = await listBackups()
    return NextResponse.json(backups)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to list backups' },
      { status: 500 }
    )
  }
}