import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { constructionProjects } from '@/lib/schema'
import { createAuditLog } from '@/lib/audit'
import { hasPermission } from '@/lib/rbac'

export async function GET() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userPermissions = session.user.permissions || {}
  if (!hasPermission(userPermissions, 'construction', 'read')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  try {
    const projects = await db.select().from(constructionProjects)
    return NextResponse.json(projects)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userPermissions = session.user.permissions || {}
  if (!hasPermission(userPermissions, 'construction', 'write')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  try {
    const { name, description, budget, startDate, endDate } = await req.json()
    
    const newProject = await db
      .insert(constructionProjects)
      .values({
        name,
        description,
        budget,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        createdBy: session.user.id,
      })
      .returning()

    await createAuditLog({
      userId: session.user.id,
      action: 'CREATE',
      tableName: 'construction_projects',
      recordId: newProject[0].id,
      changes: { name, description, budget },
    })

    return NextResponse.json(newProject[0])
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    )
  }
}