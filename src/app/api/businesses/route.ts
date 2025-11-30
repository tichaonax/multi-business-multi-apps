import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateUniqueShortName } from '@/lib/business-shortname';
import { BUSINESS_PERMISSION_PRESETS } from '@/types/permissions';
import { isSystemAdmin, SessionUser } from '@/lib/permission-utils';
import { generateAccountNumber } from '@/lib/expense-account-utils';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user as SessionUser;

    // System admins get ALL businesses (except umbrella), regular users get only their memberships
    let businesses;
    // Get businesses depending on user role; return a consistent wrapper for clients
    const isAdmin = isSystemAdmin(user)

    if (isAdmin) {
      businesses = await prisma.businesses.findMany({
        where: {
          isActive: true,
          type: {
            not: 'umbrella'
          },
        },
        select: {
          id: true,
          name: true,
          type: true,
          description: true,
          isActive: true,
          isDemo: true,
          createdAt: true,
          updatedAt: true,
          business_accounts: {
            select: {
              id: true,
              balance: true,
            },
          },
        },
        orderBy: [
          { type: 'asc' },
          { name: 'asc' },
        ],
      });
    } else {
      // Regular users: Get businesses where user is a member (excluding umbrella businesses)
      businesses = await prisma.businesses.findMany({
        where: {
          business_memberships: {
            some: {
              userId: session.user.id,
              isActive: true,
            },
          },
          type: {
            not: 'umbrella'
          },
        },
        include: {
          business_memberships: {
            where: {
              userId: session.user.id,
            },
            select: {
              role: true,
              permissions: true,
              isActive: true,
            },
          },
          business_accounts: {
            select: {
              id: true,
              balance: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    }

    return NextResponse.json({ businesses, isAdmin })
  } catch (error) {
    console.error('Error fetching businesses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch businesses' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, type, description } = await req.json();

    if (!name || !type) {
      return NextResponse.json(
        { error: 'Business name and type are required' },
        { status: 400 }
      );
    }

    // Generate a unique shortName and create business and make the creator the owner
    const shortName = await generateUniqueShortName(prisma as any, name)

    // Ensure session user exists in DB before creating FK references
    const dbUser = await prisma.users.findUnique({ where: { id: session.user.id } })
    if (!dbUser) {
      console.warn('⚠️  Session user not found in users table - aborting business create:', session.user.id)
      return NextResponse.json({ error: 'Unauthorized - user not found' }, { status: 401 })
    }

    // Create business, business account, and default expense account in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const creatorId = dbUser.id

      // Re-check user exists in transaction
      const creatorExists = await tx.users.findUnique({ where: { id: creatorId } })
      if (!creatorExists) {
        throw new Error('Session user not found during business creation (deleted)')
      }

      // Create business
      const business = await tx.businesses.create({
        data: ({
          name,
          type,
          description: description || null,
          shortName,
          createdBy: creatorId,
          business_memberships: {
            create: ({
              userId: creatorId,
              role: 'business-owner',
              permissions: BUSINESS_PERMISSION_PRESETS['business-owner'],
              isActive: true,
            } as any),
          },
        } as any),
        include: {
          business_memberships: {
            where: {
              userId: session.user.id,
            },
          },
        },
      });

      // Create business account
      await tx.businessAccounts.create({
        data: {
          businessId: business.id,
          balance: 0,
          updatedAt: new Date(),
          createdBy: creatorId,
        },
      });

      // Create default expense account
      const accountNumber = await generateAccountNumber();
      await tx.expenseAccounts.create({
        data: {
          accountNumber,
          accountName: `${name} Expense Account`,
          description: `Default expense account for ${name}`,
          balance: 0,
          lowBalanceThreshold: 500,
          isActive: true,
          createdBy: creatorId,
        },
      });

      return business;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error creating business:', error);
    return NextResponse.json(
      { error: 'Failed to create business' },
      { status: 500 }
    );
  }
}