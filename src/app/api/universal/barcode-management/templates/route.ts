import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { isSystemAdmin, SessionUser } from '@/lib/permission-utils';

// Validation schema for creating templates
const createTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required').max(255),
  barcodeValue: z.string().min(1, 'Barcode value is required').max(255),
  type: z.string().min(1, 'Type is required'), // grocery, hardware, clothing, etc.
  description: z.string().min(1, 'Description is required'),
  extraInfo: z.any().optional(),
  symbology: z.enum(['code128', 'ean13', 'ean8', 'code39', 'upca', 'itf14', 'msi', 'pharmacode', 'codabar']).default('code128'),
  width: z.number().min(1).max(500).optional(),
  height: z.number().min(1).max(500).optional(),
  margin: z.number().min(0).max(50).optional(),
  displayValue: z.boolean().optional().default(true),
  fontSize: z.number().min(8).max(72).optional(),
  backgroundColor: z.string().optional(),
  lineColor: z.string().optional(),
  dpi: z.number().min(72).max(600).optional().default(300),
  quietZone: z.number().min(0).max(50).optional().default(10),
  paperSize: z.enum(['A4', 'A6', 'CR80', 'receipt', 'label_2x1', 'label_4x2']).optional().default('A6'),
  orientation: z.enum(['portrait', 'landscape']).optional().default('portrait'),
  layoutTemplate: z.any().optional().default({}),
  businessId: z.string().min(1, 'Business ID is required'),
}).passthrough(); // Allow additional fields to pass through without validation errors

/**
 * GET /api/universal/barcode-management/templates
 * List barcode templates with pagination and filtering
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    const type = searchParams.get('type');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);

    const user = session.user as SessionUser;

    // System admins bypass permission checks
    if (!isSystemAdmin(user)) {
      // Check permissions - user needs VIEW or MANAGE templates
      const userPermissions = await prisma.userPermissions.findMany({
        where: {
          userId: session.user.id,
          granted: true,
          permission: {
            name: {
              in: ['BARCODE_VIEW_TEMPLATES', 'BARCODE_MANAGE_TEMPLATES'],
            },
          },
        },
        include: { permission: true },
      });

      if (userPermissions.length === 0) {
        return NextResponse.json(
          { error: 'Insufficient permissions. You need BARCODE_VIEW_TEMPLATES or BARCODE_MANAGE_TEMPLATES permission.' },
          { status: 403 }
        );
      }
    }

    // Get user's accessible businesses
    let accessibleBusinessIds: string[] = [];

    if (isSystemAdmin(user)) {
      // System admins have access to all businesses
      const allBusinesses = await prisma.businesses.findMany({
        where: { isActive: true },
        select: { id: true },
      });
      accessibleBusinessIds = allBusinesses.map(b => b.id);
    } else {
      const userBusinesses = await prisma.userBusinessRole.findMany({
        where: { userId: session.user.id },
        select: { businessId: true },
      });
      accessibleBusinessIds = userBusinesses.map((ubr) => ubr.businessId);
    }

    // Build where clause
    const where: any = {};

    // Filter by accessible businesses
    if (accessibleBusinessIds.length > 0) {
      where.businessId = { in: accessibleBusinessIds };
    } else {
      // User has no business access - return empty
      return NextResponse.json({
        templates: [],
        pagination: { page, limit, total: 0, pages: 0 },
      });
    }

    // Apply additional filters
    if (businessId && accessibleBusinessIds.includes(businessId)) {
      where.businessId = businessId;
    }

    if (type) {
      where.type = type;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { barcodeValue: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Fetch templates with related data
    const [templates, total] = await Promise.all([
      prisma.barcodeTemplates.findMany({
        where,
        include: {
          business: {
            select: {
              id: true,
              name: true,
              shortName: true,
              type: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              printJobs: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.barcodeTemplates.count({ where }),
    ]);

    return NextResponse.json({
      templates,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching barcode templates:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/universal/barcode-management/templates
 * Create a new barcode template
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Normalize symbology to lowercase and handle legacy uppercase values
    if (body.symbology) {
      const lowerSymbology = body.symbology.toLowerCase();
      const symbologyMap: Record<string, string> = {
        'code128': 'code128',
        'ean13': 'ean13',
        'ean8': 'ean8',
        'code39': 'code39',
        'upc': 'upca',
        'upca': 'upca',
        'itf': 'itf14',
        'itf14': 'itf14',
        'msi': 'msi',
        'pharmacode': 'pharmacode',
        'codabar': 'codabar',
      };
      body.symbology = symbologyMap[lowerSymbology] || lowerSymbology;
    }

    const validatedData = createTemplateSchema.parse(body);

    const user = session.user as SessionUser;

    // System admins bypass permission checks
    if (!isSystemAdmin(user)) {
      // Check permissions - user needs MANAGE templates
      const hasPermission = await prisma.userPermissions.findFirst({
        where: {
          userId: session.user.id,
          granted: true,
          permission: {
            name: 'BARCODE_MANAGE_TEMPLATES',
          },
        },
      });

      if (!hasPermission) {
        return NextResponse.json(
          { error: 'Insufficient permissions. You need BARCODE_MANAGE_TEMPLATES permission.' },
          { status: 403 }
        );
      }

      // Verify user has access to the specified business
      const userBusinessRole = await prisma.userBusinessRole.findFirst({
        where: {
          userId: session.user.id,
          businessId: validatedData.businessId,
        },
      });

      if (!userBusinessRole) {
        return NextResponse.json(
          { error: 'Access denied. You do not have access to this business.' },
          { status: 403 }
        );
      }
    }

    // Check if barcode value already exists for this business
    const existingTemplate = await prisma.barcodeTemplates.findFirst({
      where: {
        businessId: validatedData.businessId,
        barcodeValue: validatedData.barcodeValue,
      },
    });

    if (existingTemplate) {
      // Return the existing template instead of an error
      return NextResponse.json(
        {
          template: existingTemplate,
          message: 'A template with this barcode value already exists. Redirecting to existing template.',
          isExisting: true
        },
        { status: 200 }
      );
    }

    // Create the template
    const template = await prisma.barcodeTemplates.create({
      data: {
        ...validatedData,
        createdById: session.user.id,
      },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            shortName: true,
            type: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: error.issues.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }

    console.error('Error creating barcode template:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
