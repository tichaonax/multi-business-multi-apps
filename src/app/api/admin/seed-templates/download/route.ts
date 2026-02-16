import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hasUserPermission } from '@/lib/permission-utils'
import { getServerUser } from '@/lib/get-server-user'

/**
 * GET /api/admin/seed-templates/download?id=xxx
 * 
 * Downloads a seed template as a JSON file
 * 
 * Query params:
 * - id: string (template ID)
 * 
 * Returns: JSON file download
 */
export async function GET(req: NextRequest) {
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
    if (!isAdmin && !hasUserPermission(user, 'canExportSeedTemplates')) {
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

    const template = await prisma.seedDataTemplates.findUnique({
      where: { id: templateId },
      select: {
        name: true,
        version: true,
        businessType: true,
        templateData: true
      }
    })

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    // Create filename
    const filename = `seed-template-${template.businessType}-${template.version.replace(/\./g, '-')}.json`

    // Return JSON file
    const jsonString = JSON.stringify(template.templateData, null, 2)
    
    return new NextResponse(jsonString, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(Buffer.byteLength(jsonString))
      }
    })

  } catch (error: any) {
    console.error('Download template error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to download template' },
      { status: 500 }
    )
  }
}
