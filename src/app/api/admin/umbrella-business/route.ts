import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hasPermission, isSystemAdmin } from '@/lib/permission-utils'

import { randomBytes } from 'crypto';
import { getServerUser } from '@/lib/get-server-user'
export async function GET(req: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to manage business settings
    if (!isSystemAdmin(user) && !hasPermission(user, 'canManageBusinessSettings')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Find an existing umbrella business or any business to store umbrella settings
    let umbrellaBusinessData = await prisma.businesses.findFirst({
      where: {
        isUmbrellaBusiness: true
      },
      select: {
        id: true,
        umbrellaBusinessName: true,
        umbrellaBusinessAddress: true,
        umbrellaBusinessPhone: true,
        umbrellaBusinessEmail: true,
        umbrellaBusinessRegistration: true,
      }
    })

    // If no umbrella business exists, create one or use the first business
    if (!umbrellaBusinessData) {
      const firstBusiness = await prisma.businesses.findFirst({
        select: {
          id: true,
          umbrellaBusinessName: true,
          umbrellaBusinessAddress: true,
          umbrellaBusinessPhone: true,
          umbrellaBusinessEmail: true,
          umbrellaBusinessRegistration: true,
        }
      })

      if (firstBusiness) {
        // Update the first business to be the umbrella business
        umbrellaBusinessData = await prisma.businesses.update({
          where: { id: firstBusiness.id },
          data: {
            isUmbrellaBusiness: true,
            umbrellaBusinessName: firstBusiness.umbrellaBusinessName || 'Demo Umbrella Company'
          },
          select: {
            id: true,
            umbrellaBusinessName: true,
            umbrellaBusinessAddress: true,
            umbrellaBusinessPhone: true,
            umbrellaBusinessEmail: true,
            umbrellaBusinessRegistration: true,
          }
        })
      } else {
        // Create a new umbrella business
        const { nanoid } = await import('nanoid')
        const shortName = await (await import('@/lib/business-shortname')).generateUniqueShortName(prisma as any, 'Umbrella Business Settings')
        umbrellaBusinessData = await prisma.businesses.create({
          // Cast data to any to avoid Prisma client schema mismatch issues for shortName
          data: ({
            id: nanoid(),
            name: 'Umbrella Business Settings',
            type: 'umbrella',
            isUmbrellaBusiness: true,
            umbrellaBusinessName: 'Demo Umbrella Company',
            isActive: true,
            shortName
          } as any),
          select: {
            id: true,
            umbrellaBusinessName: true,
            umbrellaBusinessAddress: true,
            umbrellaBusinessPhone: true,
            umbrellaBusinessEmail: true,
            umbrellaBusinessRegistration: true,
          }
        })
      }
    }

    return NextResponse.json(umbrellaBusinessData)
  } catch (error) {
    console.error('Error fetching umbrella business data:', error)
    return NextResponse.json({ error: 'Failed to fetch umbrella business data' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to manage business settings
    if (!isSystemAdmin(user) && !hasPermission(user, 'canManageBusinessSettings')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const data = await req.json()
    const {
      umbrellaBusinessName,
      umbrellaBusinessAddress,
      umbrellaBusinessPhone,
      umbrellaBusinessEmail,
      umbrellaBusinessRegistration
    } = data

    if (!umbrellaBusinessName) {
      return NextResponse.json({ error: 'Umbrella business name is required' }, { status: 400 })
    }

    // Find the umbrella business
    let umbrellaBusinessRecord = await prisma.businesses.findFirst({
      where: { isUmbrellaBusiness: true }
    })

    if (!umbrellaBusinessRecord) {
      // Create umbrella business if it doesn't exist
      const { nanoid } = await import('nanoid')
      const shortName = await (await import('@/lib/business-shortname')).generateUniqueShortName(prisma as any, 'Umbrella Business Settings')
      umbrellaBusinessRecord = await prisma.businesses.create({
        data: ({
          id: nanoid(),
          name: 'Umbrella Business Settings',
          type: 'umbrella',
          isUmbrellaBusiness: true,
          umbrellaBusinessName,
          umbrellaBusinessAddress,
          umbrellaBusinessPhone,
          umbrellaBusinessEmail,
          umbrellaBusinessRegistration,
          isActive: true,
          shortName
        } as any)
      })
    } else {
      // Update existing umbrella business
      umbrellaBusinessRecord = await prisma.businesses.update({
        where: { id: umbrellaBusinessRecord.id },
        data: {
          umbrellaBusinessName,
          umbrellaBusinessAddress,
          umbrellaBusinessPhone,
          umbrellaBusinessEmail,
          umbrellaBusinessRegistration,
          updatedAt: new Date()
        }
      })
    }

    // Also update all existing contracts with the new umbrella business name
    await prisma.employeeContracts.updateMany({
      data: {
        umbrellaBusinessName,
      }
    })

    return NextResponse.json({
      id: umbrellaBusinessRecord.id,
      umbrellaBusinessName: umbrellaBusinessRecord.umbrellaBusinessName,
      umbrellaBusinessAddress: umbrellaBusinessRecord.umbrellaBusinessAddress,
      umbrellaBusinessPhone: umbrellaBusinessRecord.umbrellaBusinessPhone,
      umbrellaBusinessEmail: umbrellaBusinessRecord.umbrellaBusinessEmail,
      umbrellaBusinessRegistration: umbrellaBusinessRecord.umbrellaBusinessRegistration,
    })
  } catch (error) {
    console.error('Error updating umbrella business data:', error)
    return NextResponse.json({ error: 'Failed to update umbrella business data' }, { status: 500 })
  }
}