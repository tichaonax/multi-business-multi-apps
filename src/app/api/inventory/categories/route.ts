import { NextRequest, NextResponse } from 'next/server';


import { prisma } from '@/lib/prisma';
import { randomUUID } from 'crypto';
import { hasUserPermission } from '@/lib/permission-utils';
import { getServerUser } from '@/lib/get-server-user'

/**
 * GET /api/inventory/categories
 * Fetch inventory categories with optional filters
 *
 * Query params:
 * - businessId: Filter by business (optional)
 * - domainId: Filter by domain template (optional)
 * - parentId: Filter by parent category (optional)
 * - businessType: Filter by business type (optional)
 * - includeSubcategories: Include subcategories (default: false)
 * - includeProducts: Include product counts (default: true)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const businessId = searchParams.get('businessId');
    const domainId = searchParams.get('domainId');
    const parentId = searchParams.get('parentId');
    const businessType = searchParams.get('businessType');
    const includeSubcategories = searchParams.get('includeSubcategories') === 'true';
    const includeProducts = searchParams.get('includeProducts') !== 'false';

    // Get requesting business demo status for ONE-WAY isolation
    let requestingBusiness: { isDemo: boolean } | null = null;
    if (businessId) {
      requestingBusiness = await prisma.businesses.findUnique({
        where: { id: businessId },
        select: { isDemo: true }
      });
    }

    // Build where clause with ONE-WAY CATEGORY ISOLATION
    const where: any = {
      isActive: true,
    };

    if (domainId) where.domainId = domainId;
    if (parentId) where.parentId = parentId;
    if (businessType) where.businessType = businessType;

    // Apply ONE-WAY isolation filter if businessId provided
    if (businessId && requestingBusiness) {
      where.OR = [
        { businessId: null }, // Type-based categories always visible
        { businessId: businessId }, // Own categories
        ...(requestingBusiness.isDemo
          ? [{ businessId: { not: null } }] // Demo sees all categories
          : [
              { businesses: { isDemo: false } }, // Real only sees real business categories
              { businesses: null } // Include categories with no business link
            ]
        )
      ];
    } else if (businessId) {
      where.businessId = businessId;
    }

    // Fetch categories
    const categories = await prisma.businessCategories.findMany({
      where,
      include: {
        domain: true,
        businesses: {
          select: {
            isDemo: true,
          },
        },
        users: {
          select: {
            id: true,
            name: true,
          },
        },
        inventory_subcategories: includeSubcategories ? {
          where: {
            isDefault: false, // Only active subcategories
          },
          orderBy: {
            displayOrder: 'asc',
          },
        } : false,
        _count: includeProducts ? {
          select: {
            business_products: true,
            inventory_subcategories: true,
          },
        } : false,
      },
      orderBy: [
        { displayOrder: 'asc' },
        { name: 'asc' },
      ],
    });

    return NextResponse.json({
      categories,
      total: categories.length,
    });
  } catch (error) {
    console.error('Error fetching inventory categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inventory categories' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/inventory/categories
 * Create a new inventory category
 *
 * Request body:
 * {
 *   businessId: string;
 *   name: string;
 *   emoji: string;
 *   color: string;
 *   description?: string;
 *   domainId?: string;
 *   parentId?: string;
 *   displayOrder?: number;
 *   businessType: string;
 * }
 *
 * Requires permission: canCreateInventoryCategories
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }


    // Check permission
    if (!hasUserPermission(user, 'canCreateInventoryCategories')) {
      return NextResponse.json(
        { error: 'You do not have permission to create inventory categories' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      businessId,
      name,
      emoji,
      color,
      description,
      domainId,
      parentId,
      displayOrder,
      businessType
    } = body;

    // Validate required fields
    if (!businessId || !name || !emoji || !businessType) {
      return NextResponse.json(
        { error: 'businessId, name, emoji, and businessType are required' },
        { status: 400 }
      );
    }

    // Verify business exists
    const business = await prisma.businesses.findUnique({
      where: { id: businessId },
    });

    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    // Verify user has access to this business
    const membership = await prisma.businessMemberships.findFirst({
      where: {
        userId: user.id,
        businessId,
        isActive: true,
      },
    });

    if (!membership && user.role !== 'admin') {
      return NextResponse.json(
        { error: 'You do not have access to this business' },
        { status: 403 }
      );
    }

    // If domainId provided, verify it exists
    if (domainId) {
      const domain = await prisma.inventoryDomains.findUnique({
        where: { id: domainId },
      });

      if (!domain) {
        return NextResponse.json({ error: 'Domain not found' }, { status: 404 });
      }
    }

    // Check for duplicate category name within this business (case-insensitive)
    const existingCategory = await prisma.businessCategories.findFirst({
      where: {
        businessId,
        name: {
          equals: name,
          mode: 'insensitive',
        },
      },
    });

    if (existingCategory) {
      return NextResponse.json(
        { error: 'A category with this name already exists in this business' },
        { status: 409 }
      );
    }

    // Create the category
    const category = await prisma.businessCategories.create({
      data: {
        id: randomUUID(),
        businessId,
        name: name.trim(),
        emoji,
        color: color || '#3B82F6',
        description: description || null,
        domainId: domainId || null,
        parentId: parentId || null,
        displayOrder: displayOrder ?? 0,
        businessType,
        isActive: true,
        isUserCreated: true,
        createdBy: user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      include: {
        domain: true,
        users: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            business_products: true,
            inventory_subcategories: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        message: 'Category created successfully',
        category,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    );
  }
}
