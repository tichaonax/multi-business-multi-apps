import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/inventory/domains
 * Fetch all inventory domains (category templates)
 *
 * Query params:
 * - businessType: Filter by business type (optional)
 * - includeCategories: Include associated categories (default: false)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const businessType = searchParams.get('businessType');
    const includeCategories = searchParams.get('includeCategories') === 'true';

    // Fetch all domains
    const domains = await prisma.inventoryDomains.findMany({
      where: {
        isActive: true,
        ...(businessType ? { businessType } : {}),
      },
      include: includeCategories ? {
        business_categories: {
          where: {
            isActive: true,
          },
          select: {
            id: true,
            name: true,
            emoji: true,
            color: true,
            description: true,
            displayOrder: true,
            _count: {
              select: {
                business_products: true,
                inventory_subcategories: true,
              },
            },
          },
          orderBy: {
            displayOrder: 'asc',
          },
        },
      } : undefined,
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json({
      domains,
      total: domains.length,
    });
  } catch (error) {
    console.error('Error fetching inventory domains:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inventory domains' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/inventory/domains
 * Create a new inventory domain template (System Admin only)
 *
 * Request body:
 * - name: Domain name (required)
 * - emoji: Domain emoji (required)
 * - description: Domain description (optional)
 * - businessType: Target business type (required)
 * - isSystemTemplate: Mark as system template (default: false)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is system admin
    const isSystemAdmin = session.user.role === 'admin';
    if (!isSystemAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Only system administrators can create domain templates' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, emoji, description, businessType, isSystemTemplate } = body;

    // Validate required fields
    if (!name || !emoji || !businessType) {
      return NextResponse.json(
        { error: 'Missing required fields: name, emoji, businessType' },
        { status: 400 }
      );
    }

    // Check if domain with same name already exists
    const existingDomain = await prisma.inventoryDomains.findUnique({
      where: { name },
    });

    if (existingDomain) {
      return NextResponse.json(
        { error: 'A domain with this name already exists' },
        { status: 409 }
      );
    }

    // Create the domain
    const domain = await prisma.inventoryDomains.create({
      data: {
        id: `domain_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        name,
        emoji,
        description,
        businessType,
        isSystemTemplate: isSystemTemplate ?? false,
        isActive: true,
      },
    });

    return NextResponse.json(
      {
        message: 'Domain created successfully',
        domain,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating inventory domain:', error);
    return NextResponse.json(
      { error: 'Failed to create inventory domain' },
      { status: 500 }
    );
  }
}
