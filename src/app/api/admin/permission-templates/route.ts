import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { BusinessPermissions, BusinessType } from '@/types/permissions'
import { isSystemAdmin, SessionUser } from '@/lib/permission-utils'
import { randomUUID } from 'crypto'

interface TemplateCreateRequest {
  name: string
  businessType: BusinessType
  permissions: Partial<BusinessPermissions>
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as SessionUser
    const { searchParams } = new URL(req.url)
    const businessType = searchParams.get('businessType') as BusinessType

    // Only system admins can manage permission templates
    if (!isSystemAdmin(user)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const where = businessType ? { businessType, isActive: true } : { isActive: true }

    const templates = await prisma.permissionTemplates.findMany({
      where,
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(templates)
  } catch (error) {
    console.error('Error fetching permission templates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch permission templates' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as SessionUser

    // Only system admins can create permission templates
    if (!isSystemAdmin(user)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { name, businessType, permissions }: TemplateCreateRequest = await req.json()

    // Validate required fields
    if (!name || !businessType || !permissions) {
      return NextResponse.json(
        { error: 'Name, business type, and permissions are required' },
        { status: 400 }
      )
    }

    // Check if template name already exists for this business type
    const existingTemplate = await prisma.permissionTemplates.findFirst({
      where: {
        name,
        businessType,
        isActive: true
      }
    })

    if (existingTemplate) {
      return NextResponse.json(
        { error: 'A template with this name already exists for this business type' },
        { status: 409 }
      )
    }

    const template = await prisma.permissionTemplates.create({
      data: {
        id: randomUUID(),
        name,
        businessType,
        permissions: permissions as any,
        createdBy: session.user.id,
        isActive: true
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
      message: 'Permission template created successfully',
      template
    })

  } catch (error) {
    console.error('Error creating permission template:', error)
    return NextResponse.json(
      { error: 'Failed to create permission template' },
      { status: 500 }
    )
  }
}