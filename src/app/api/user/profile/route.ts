import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

export async function GET() {
  try {
    // Get current user session
    const user = await getServerUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const dbUser = await prisma.users.findUnique({
      where: { id: user.id
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        business_memberships: {
          select: {
            businessId: true,
            role: true,
            isActive: true,
            templateId: true,
            permission_templates: {
              select: {
                id: true,
                name: true
              }
            },
            businesses: {
              select: {
                id: true,
                name: true,
                type: true
              }
            }
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Transform snake_case to camelCase for frontend
    const responseData = {
      ...user,
      businessMemberships: user.businessMemberships
    }
    
    // Remove the snake_case version
    delete (responseData as any).business_memberships

    return NextResponse.json(responseData)
  } catch (error) {
    console.error('Error fetching user profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getServerUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, email } = await req.json()

    // Basic validation
    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    // For now, only allow name updates. Email changes require admin approval
    const updatedUser = await prisma.users.update({
      where: {
        id: user.id
      },
      data: {
        name: name.trim()
      },
      select: {
        id: true,
        name: true,
        email: true
      }
    })

    return NextResponse.json({ 
      message: 'Profile updated successfully',
      user: updatedUser
    })
  } catch (error) {
    console.error('Error updating user profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}