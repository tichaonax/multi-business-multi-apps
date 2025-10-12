import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Get current user session
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.users.findUnique({
      where: {
        id: session.user.id
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        businessMemberships: {
          select: {
            businessId: true,
            role: true,
            isActive: true,
            templateId: true,
            permissionTemplate: {
              select: {
                id: true,
                name: true
              }
            },
            business: {
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

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error fetching user profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
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
        id: session.user.id
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