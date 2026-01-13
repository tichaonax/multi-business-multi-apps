import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateUniqueShortName } from '@/lib/business-shortname'
import { isSystemAdmin, SessionUser } from '@/lib/permission-utils'
import { generateAccountNumber } from '@/lib/expense-account-utils'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as SessionUser

    // System admins can see all active businesses
    if (isSystemAdmin(user)) {
      const businesses = await prisma.businesses.findMany({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' }
      })
      return NextResponse.json(businesses)
    }

    // Regular users see only their businesses
    const userMemberships = await prisma.businessMemberships.findMany({
      where: {
        userId: session.user.id,
        isActive: true
      },
      include: {
        businesses: true
      }
    })

    const businesses = userMemberships.map(membership => membership.business)
    return NextResponse.json(businesses)
  } catch (error) {
    console.error('Error fetching businesses:', error)
    return NextResponse.json({ error: 'Failed to fetch businesses' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as SessionUser

    // Only system admins can create businesses
    if (!isSystemAdmin(user)) {
      return NextResponse.json({ error: 'Only system administrators can create businesses' }, { status: 403 })
    }

    const {
      name,
      type,
      description,
      address,
      phone,
      ecocashEnabled = false,
      wifiIntegrationEnabled = false,
      receiptReturnPolicy,
      taxIncludedInPrice,
      taxRate,
      taxLabel,
      defaultPage,
      slogan,
      showSlogan
    } = await req.json()

    if (!name || !type) {
      return NextResponse.json({ error: 'Business name and type are required' }, { status: 400 })
    }

    const shortName = await generateUniqueShortName(prisma as any, name.trim())

    // Ensure session user exists in DB before creating FK references
    const dbUser = await prisma.users.findUnique({ where: { id: session.user.id } })
    if (!dbUser) {
      console.warn('⚠️  Session user not found in users table - aborting business create:', session.user.id)
      return NextResponse.json({ error: 'Unauthorized - user not found' }, { status: 401 })
    }

    // Create business, business account, and default expense account in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const creatorId = dbUser.id
      // Re-check presence of user inside transaction to avoid a TOCTOU race
      const creatorExists = await tx.users.findUnique({ where: { id: creatorId } })
      if (!creatorExists) {
        throw new Error('Session user not found during business creation (deleted)')
      }
      const createData = ({
        name: name.trim(),
        type: type.trim(),
        description: description?.trim() || null,
        address: address?.trim() || null,
        phone: phone?.trim() || null,
        shortName,
        isActive: true,
        ecocashEnabled: ecocashEnabled,
        wifiIntegrationEnabled: wifiIntegrationEnabled,
        receiptReturnPolicy: receiptReturnPolicy?.trim() || 'All sales are final, returns not accepted',
        taxIncludedInPrice: taxIncludedInPrice !== undefined ? taxIncludedInPrice : true,
        taxRate: taxRate ? parseFloat(taxRate) : null,
        taxLabel: taxLabel?.trim() || null,
        defaultPage: defaultPage?.trim() || null,
        slogan: slogan?.trim() || 'Where Customer Is King',
        showSlogan: showSlogan !== undefined ? showSlogan : true,
        settings: {},
        createdBy: creatorId
      } as any)

      const business = await tx.businesses.create({ data: createData })

      // Create business account
      await tx.businessAccounts.create({
        data: {
          businessId: business.id,
          balance: 0,
          updatedAt: new Date(),
          createdBy: creatorId,
        },
      })

      // Create default expense account
      const accountNumber = await generateAccountNumber()
      await tx.expenseAccounts.create({
        data: {
          accountNumber,
          accountName: `${name.trim()} Expense Account`,
          description: `Default expense account for ${name.trim()}`,
          balance: 0,
          lowBalanceThreshold: 500,
          isActive: true,
          createdBy: creatorId,
        },
      })

      // Create audit log
      await tx.auditLogs.create({
        data: ({
          action: 'BUSINESS_CREATED',
          entityType: 'Business',
          entityId: business.id,
          userId: creatorId,
          details: {
            businessName: business.name,
            businessType: business.type
          }
        } as any)
      }).catch(error => {
        console.error('Failed to create audit log:', error)
      })

      return business
    })

    return NextResponse.json({
      message: 'Business created successfully',
      business: result
    })
  } catch (error) {
    console.error('Error creating business:', error)
    return NextResponse.json({ error: 'Failed to create business' }, { status: 500 })
  }
}