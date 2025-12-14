import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createPortalClient } from '@/lib/wifi-portal/api-client';

/**
 * POST /api/wifi-portal/integration
 * Setup WiFi portal integration for a business
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      businessId,
      apiKey,
      portalIpAddress,
      portalPort,
      showTokensInPOS = false,
    } = body;

    // Validate required fields
    if (!businessId || !apiKey || !portalIpAddress || !portalPort) {
      return NextResponse.json(
        { error: 'Missing required fields: businessId, apiKey, portalIpAddress, portalPort' },
        { status: 400 }
      );
    }

    // System admins have access to all businesses
    const user = await prisma.users.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    const isAdmin = user?.role === 'admin';

    // Check if user has access to this business (admins skip this check)
    if (!isAdmin) {
      const membership = await prisma.businessMemberships.findFirst({
        where: {
          userId: session.user.id,
          businessId: businessId,
          isActive: true,
        },
      });

      if (!membership) {
        return NextResponse.json(
          { error: 'You do not have access to this business' },
          { status: 403 }
        );
      }
    }

    // Get business info to validate type
    const business = await prisma.businesses.findUnique({
      where: { id: businessId },
      select: {
        id: true,
        name: true,
        type: true,
      },
    });

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    // Validate business type (only restaurant and grocery allowed)
    const businessType = business.type;
    if (businessType !== 'restaurant' && businessType !== 'grocery') {
      return NextResponse.json(
        { error: 'WiFi portal integration is only available for restaurant and grocery businesses' },
        { status: 403 }
      );
    }

    // Check if integration already exists for this business
    const existingIntegration = await prisma.portalIntegrations.findUnique({
      where: { businessId: businessId },
    });

    if (existingIntegration) {
      return NextResponse.json(
        { error: 'Portal integration already exists for this business. Use PUT to update.' },
        { status: 409 }
      );
    }

    // Test connection to ESP32 portal
    const portalClient = createPortalClient({
      baseUrl: `http://${portalIpAddress}:${portalPort}`,
      apiKey: apiKey,
      timeout: 10000,
      retries: 2,
    });

    const healthCheck = await portalClient.checkHealth();
    if (!healthCheck.online) {
      return NextResponse.json(
        {
          error: 'Unable to connect to WiFi portal',
          details: healthCheck.error || 'Portal server is not reachable',
        },
        { status: 400 }
      );
    }

    // Create WiFi revenue expense account
    let expenseAccount;
    try {
      // Check if WiFi revenue account already exists
      expenseAccount = await prisma.expenseAccounts.findFirst({
        where: {
          accountName: 'WiFi Token Revenue',
          creator: {
            business_memberships: {
              some: {
                businessId: businessId,
              },
            },
          },
        },
      });

      if (!expenseAccount) {
        // Generate unique account number
        const timestamp = Date.now();
        const accountNumber = `WIFI-REV-${businessId.slice(0, 8)}-${timestamp}`;

        expenseAccount = await prisma.expenseAccounts.create({
          data: {
            accountNumber: accountNumber,
            accountName: 'WiFi Token Revenue',
            balance: 0,
            description: 'Automated revenue account for WiFi token sales',
            createdBy: session.user.id,
            lowBalanceThreshold: 0,
            isActive: true,
          },
        });
      }
    } catch (error: any) {
      console.error('Error creating expense account:', error);
      return NextResponse.json(
        { error: 'Failed to create WiFi revenue expense account', details: error.message },
        { status: 500 }
      );
    }

    // Create portal integration
    const integration = await prisma.portalIntegrations.create({
      data: {
        businessId: businessId,
        apiKey: apiKey,
        portalIpAddress: portalIpAddress,
        portalPort: parseInt(portalPort.toString(), 10),
        isActive: true,
        showTokensInPOS: showTokensInPOS,
        createdBy: session.user.id,
      },
      include: {
        businesses: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        integration: {
          id: integration.id,
          businessId: integration.businessId,
          businessName: integration.businesses.name,
          businessType: integration.businesses.type,
          portalIpAddress: integration.portalIpAddress,
          portalPort: integration.portalPort,
          isActive: integration.isActive,
          showTokensInPOS: integration.showTokensInPOS,
          createdAt: integration.createdAt,
        },
        expenseAccount: {
          id: expenseAccount.id,
          accountNumber: expenseAccount.accountNumber,
          accountName: expenseAccount.accountName,
        },
        portalHealth: {
          online: healthCheck.online,
          version: healthCheck.version,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('WiFi portal integration setup error:', error);
    return NextResponse.json(
      { error: 'Failed to setup WiFi portal integration', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/wifi-portal/integration?businessId=xxx
 * Get portal integration for a business
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');

    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 });
    }

    // System admins have access to all businesses
    const user = await prisma.users.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    const isAdmin = user?.role === 'admin';

    // Check if user has access to this business (admins skip this check)
    if (!isAdmin) {
      const membership = await prisma.businessMemberships.findFirst({
        where: {
          userId: session.user.id,
          businessId: businessId,
          isActive: true,
        },
      });

      if (!membership) {
        return NextResponse.json(
          { error: 'You do not have access to this business' },
          { status: 403 }
        );
      }
    }

    const integration = await prisma.portalIntegrations.findUnique({
      where: { businessId: businessId },
      include: {
        businesses: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        users: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    if (!integration) {
      return NextResponse.json(
        { error: 'No portal integration found for this business' },
        { status: 404 }
      );
    }

    // Find or create an expense account for WiFi token sales
    let expenseAccount = await prisma.expenseAccounts.findFirst({
      where: {
        accountName: 'WiFi Token Sales',
        isActive: true,
      },
    });

    // If not found, try the automated revenue account
    if (!expenseAccount) {
      expenseAccount = await prisma.expenseAccounts.findFirst({
        where: {
          accountName: {
            contains: 'WiFi Token Revenue',
          },
          isActive: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    }

    // If still no WiFi-specific account exists, use a general sales/revenue account
    if (!expenseAccount) {
      expenseAccount = await prisma.expenseAccounts.findFirst({
        where: {
          accountName: {
            contains: 'Sales',
          },
          isActive: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    }

    // If still no account, use the first active expense account as fallback
    if (!expenseAccount) {
      expenseAccount = await prisma.expenseAccounts.findFirst({
        where: {
          isActive: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });
    }

    // Don't expose the full API key in response
    return NextResponse.json({
      success: true,
      integration: {
        id: integration.id,
        businessId: integration.businessId,
        businessName: integration.businesses.name,
        businessType: integration.businesses.type,
        portalIpAddress: integration.portalIpAddress,
        portalPort: integration.portalPort,
        isActive: integration.isActive,
        showTokensInPOS: integration.showTokensInPOS,
        createdAt: integration.createdAt,
        updatedAt: integration.updatedAt,
        createdBy: {
          id: integration.users.id,
          email: integration.users.email,
          name: integration.users.name,
        },
        apiKeyPreview: integration.apiKey.slice(0, 8) + '...',
        expenseAccount: expenseAccount ? {
          id: expenseAccount.id,
          accountNumber: expenseAccount.accountNumber,
          accountName: expenseAccount.accountName,
          balance: expenseAccount.balance,
        } : null,
      },
    });
  } catch (error: any) {
    console.error('WiFi portal integration fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch portal integration', details: error.message },
      { status: 500 }
    );
  }
}
