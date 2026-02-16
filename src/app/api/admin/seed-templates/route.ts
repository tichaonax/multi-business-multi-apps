import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hasUserPermission } from '@/lib/permission-utils'
import type { TemplateListItem } from '@/types/seed-templates'
import { getServerUser } from '@/lib/get-server-user'

/**
 * GET /api/admin/seed-templates
 * 
 * Lists all seed templates, optionally filtered by business type
 * 
 * Query params:
 * - businessType?: string (filter by type)
 * - activeOnly?: boolean (only active templates)
 * 
 * Returns: Array of TemplateListItem
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getServerUser()
    const currentUser = user as any
    
    console.log('🔍 Seed Templates GET - Session check:', {
      hasSession: !!user,
      hasUser: !!user,
      userId: currentUser?.id,
      userRole: currentUser?.role,
      isAdmin: currentUser?.isAdmin
    })
    
    if (!user) {
      console.log('❌ Unauthorized - no user ID in session')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check permission (admins have full access)
    const isAdmin = currentUser?.role === 'admin' || currentUser?.isAdmin
    if (!isAdmin && !hasUserPermission(user, 'canManageSeedTemplates')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(req.url)
    const businessType = searchParams.get('businessType')
    const activeOnly = searchParams.get('activeOnly') === 'true'

    const whereClause: any = {}
    
    if (businessType) {
      whereClause.businessType = businessType
    }
    
    if (activeOnly) {
      whereClause.isActive = true
    }

    const templates = await prisma.seedDataTemplates.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        sourceBusiness: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: [
        { isSystemDefault: 'desc' },
        { createdAt: 'desc' }
      ]
    })

    const listItems: TemplateListItem[] = templates.map(template => ({
      id: template.id,
      name: template.name,
      businessType: template.businessType,
      version: template.version,
      description: template.description || undefined,
      isActive: template.isActive,
      isSystemDefault: template.isSystemDefault,
      productCount: template.productCount,
      categoryCount: template.categoryCount,
      createdAt: template.createdAt.toISOString(),
      createdByName: template.user.name || template.user.email,
      sourceBusinessName: template.sourceBusiness?.name
    }))

    return NextResponse.json(listItems)

  } catch (error: any) {
    console.error('List templates error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to list templates' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/seed-templates?id=xxx
 * 
 * Deletes a seed template
 */
export async function DELETE(req: NextRequest) {
  try {
    const user = await getServerUser()
    const currentUser = user as any
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check permission (admins have full access)
    const isAdmin = currentUser?.role === 'admin' || currentUser?.isAdmin
    if (!isAdmin && !hasUserPermission(user, 'canManageSeedTemplates')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(req.url)
    const templateId = searchParams.get('id')

    if (!templateId) {
      return NextResponse.json(
        { error: 'Template ID required' },
        { status: 400 }
      )
    }

    await prisma.seedDataTemplates.delete({
      where: { id: templateId }
    })

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Delete template error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete template' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/seed-templates
 * 
 * Updates template properties (activate/deactivate, set as default)
 * 
 * Body: { id: string, isActive?: boolean, isSystemDefault?: boolean }
 */
export async function PATCH(req: NextRequest) {
  try {
    const user = await getServerUser()
    const currentUser = user as any
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check permission (admins have full access)
    const isAdmin = currentUser?.role === 'admin' || currentUser?.isAdmin
    if (!isAdmin && !hasUserPermission(user, 'canManageSeedTemplates')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { id, isActive, isSystemDefault } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Template ID required' },
        { status: 400 }
      )
    }

    // If setting as system default, first unset all other defaults for this business type
    if (isSystemDefault === true) {
      const template = await prisma.seedDataTemplates.findUnique({
        where: { id },
        select: { businessType: true }
      })

      if (template) {
        await prisma.seedDataTemplates.updateMany({
          where: {
            businessType: template.businessType,
            isSystemDefault: true
          },
          data: {
            isSystemDefault: false
          }
        })
      }
    }

    const updated = await prisma.seedDataTemplates.update({
      where: { id },
      data: {
        ...(typeof isActive === 'boolean' && { isActive }),
        ...(typeof isSystemDefault === 'boolean' && { isSystemDefault })
      }
    })

    return NextResponse.json({ success: true, template: updated })

  } catch (error: any) {
    console.error('Update template error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update template' },
      { status: 500 }
    )
  }
}
