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
        firstName: true,
        lastName: true,
        profilePhotoUrl: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        employees: { select: { id: true } },
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
      firstName: dbUser?.firstName ?? null,
      lastName: dbUser?.lastName ?? null,
      profilePhotoUrl: dbUser?.profilePhotoUrl ?? null,
      // Whether this account is linked to an Employee record — the client
      // uses this to explain why name/photo changes here also show up on
      // the Employee record (and vice versa) once linked.
      isLinkedToEmployee: !!dbUser?.employees,
      businessMemberships: (dbUser?.business_memberships ?? []).map((m) => ({
        businessId: m.businessId,
        role: m.role,
        isActive: m.isActive,
        templateId: m.templateId,
        template: m.permission_templates ?? null,
        business: m.businesses
          ? { id: m.businesses.id, name: m.businesses.name, type: m.businesses.type }
          : null,
      })),
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

    const { firstName, lastName, profilePhotoUrl } = await req.json()

    // Basic validation
    if (!firstName || firstName.trim().length === 0) {
      return NextResponse.json({ error: 'First name is required' }, { status: 400 })
    }

    const trimmedFirst = firstName.trim()
    const trimmedLast = (lastName ?? '').trim()
    const fullName = trimmedLast ? `${trimmedFirst} ${trimmedLast}` : trimmedFirst

    // SYNC: this account's name/photo → linked Employee record, if any —
    // Employee workflows keep working, but if this user also has an
    // Employee record, both must show identical data once either is edited.
    const result = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.users.update({
        where: { id: user.id },
        data: {
          firstName: trimmedFirst,
          lastName: trimmedLast || null,
          name: fullName,
          profilePhotoUrl: profilePhotoUrl !== undefined ? (profilePhotoUrl || null) : undefined,
        },
        select: {
          id: true, name: true, email: true, firstName: true, lastName: true, profilePhotoUrl: true,
          employees: { select: { id: true } },
        }
      })

      if (updatedUser.employees) {
        await tx.employees.update({
          where: { id: updatedUser.employees.id },
          data: {
            firstName: trimmedFirst,
            lastName: trimmedLast || '',
            fullName,
            ...(profilePhotoUrl !== undefined ? { profilePhotoUrl: profilePhotoUrl || null } : {}),
          }
        })
      }

      return updatedUser
    })

    return NextResponse.json({
      message: 'Profile updated successfully',
      user: result
    })
  } catch (error) {
    console.error('Error updating user profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}