import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { BusinessPermissions } from '@/types/permissions'
import { isSystemAdmin} from '@/lib/permission-utils'
import { getServerUser } from '@/lib/get-server-user'

interface TemplateUpdateRequest {
  name: string
  permissions: Partial<BusinessPermissions>
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { templateId } = await params

    if (!templateId) {
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 })
    }

    // Only system admins can update permission templates
    if (!isSystemAdmin(user)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Check if template exists
    const existingTemplate = await prisma.permissionTemplates.findUnique({
      where: { id: templateId }
    })

    if (!existingTemplate) {
      return NextResponse.json(
        { error: 'Permission template not found' },
        { status: 404 }
      )
    }

    const { name, permissions }: TemplateUpdateRequest = await req.json()

    // Validate required fields
    if (!name || !permissions) {
      return NextResponse.json(
        { error: 'Name and permissions are required' },
        { status: 400 }
      )
    }

    // Check if template name conflicts with another template of same business type
    if (name !== existingTemplate.name) {
      const nameConflict = await prisma.permissionTemplates.findFirst({
        where: {
          name,
          businessType: existingTemplate.businessType,
          isActive: true,
          id: { not: templateId }
        }
      })

      if (nameConflict) {
        return NextResponse.json(
          { error: 'A template with this name already exists for this business type' },
          { status: 409 }
        )
      }
    }

    const updatedTemplate = await prisma.permissionTemplates.update({
      where: { id: templateId },
      data: {
        name,
        permissions: permissions as any,
        updatedAt: new Date()
      },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Permission template updated successfully',
      template: updatedTemplate
    })

  } catch (error) {
    console.error('Error updating permission template:', error)
    return NextResponse.json(
      { error: 'Failed to update permission template' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { templateId } = await params

    if (!templateId) {
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 })
    }

    // Only system admins can delete permission templates
    if (!isSystemAdmin(user)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Check if template exists
    const existingTemplate = await prisma.permissionTemplates.findUnique({
      where: { id: templateId }
    })

    if (!existingTemplate) {
      return NextResponse.json(
        { error: 'Permission template not found' },
        { status: 404 }
      )
    }

    // Soft delete - set inactive instead of actual deletion
    await prisma.permissionTemplates.update({
      where: { id: templateId },
      data: { 
        isActive: false,
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Permission template deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting permission template:', error)
    return NextResponse.json(
      { error: 'Failed to delete permission template' },
      { status: 500 }
    )
  }
}