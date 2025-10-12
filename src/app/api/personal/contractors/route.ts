import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasUserPermission } from '@/lib/permission-utils'
import { SessionUser } from '@/lib/permission-utils'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as SessionUser

    // Check if user has permission to access personal finance
    if (!hasUserPermission(user, 'canAccessPersonalFinance')) {
      return NextResponse.json({ error: 'Insufficient permissions to access personal finance' }, { status: 403 })
    }

    const contractors = await prisma.projectContractors.findMany({
      include: {
        constructionProject: {
          select: {
            id: true,
            name: true,
            createdBy: true
          }
        },
        person: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            email: true,
            nationalId: true,
            idFormatTemplateId: true,
            isActive: true,
            createdAt: true
          }
        }
      },
      where: {
        status: 'active'
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(contractors)
  } catch (error) {
    console.error('Contractors fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch contractors' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as SessionUser

    // Check if user has permission to manage personal contractors
    if (!hasUserPermission(user, 'canManagePersonalContractors')) {
      return NextResponse.json({ error: 'Insufficient permissions to manage contractors' }, { status: 403 })
    }

    const { name, projectId, email, phone, description, role, nationalId, idTemplateId } = await request.json()

    if (!name) {
      return NextResponse.json({ error: 'Contractor name is required' }, { status: 400 })
    }

    if (!nationalId) {
      return NextResponse.json({ error: 'National ID is required for contractor payment tracking' }, { status: 400 })
    }

    // For personal contractors, project is optional
    let project = null
    if (projectId) {
      // Verify the project exists (removed user ownership restriction for global contractor access)
      project = await prisma.constructionProjects.findFirst({
        where: {
          id: projectId
        }
      })

      if (!project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 })
      }
    }

    // First create or find the person
    let person = await prisma.persons.findFirst({
      where: {
        nationalId: nationalId
      }
    })

    if (!person) {
      // Create new person with automatic timestamp tracking
      person = await prisma.persons.create({
        data: {
          fullName: name,
          email: email || null,
          phone: phone || null,
          nationalId: nationalId,
          idFormatTemplateId: idTemplateId || null,
          notes: description || null,
          createdBy: session.user.id,
          isActive: true
        }
      })
    } else {
      // Update existing person with new information if found by national ID
      person = await prisma.persons.update({
        where: { id: person.id },
        data: {
          fullName: name,
          email: email || null,
          phone: phone || null,
          notes: description || null
        }
      })
    }

    // For personal finance, we can create a general contractor entry or just return the person
    if (projectId && project) {
      // Create project contractor if project is specified
      const contractor = await prisma.projectContractors.create({
        data: {
          projectId,
          personId: person.id,
          role: role || null,
          isPrimary: false,
          status: 'active',
          notes: description || null
        },
        include: {
          person: true,
          constructionProject: true
        }
      })

      return NextResponse.json(contractor)
    } else {
      // Return person data formatted as contractor for personal payments
      const contractor = {
        id: person.id,
        name: person.fullName,
        projectId: null,
        email: person.email,
        phone: person.phone,
        nationalId: person.nationalId,
        idTemplateId: person.idFormatTemplateId,
        createdAt: person.createdAt,
        person: person,
        constructionProject: null
      }

      return NextResponse.json(contractor)
    }
  } catch (error) {
    console.error('Contractor creation error:', error)
    return NextResponse.json({ error: 'Failed to create contractor' }, { status: 500 })
  }
}