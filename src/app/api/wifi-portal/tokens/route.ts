import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createPortalClient } from '@/lib/wifi-portal/api-client';

/**
 * POST /api/wifi-portal/tokens
 * Create a new WiFi token (calls ESP32 API and saves to database)
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
      tokenConfigId,
      businessTokenMenuItemId, // Optional: if selling via business menu
      recordSale = false,
      saleAmount,
      paymentMethod,
      expenseAccountId,
    } = body;

    // Validate required fields
    if (!businessId || !tokenConfigId) {
      return NextResponse.json(
        { error: 'Missing required fields: businessId, tokenConfigId' },
        { status: 400 }
      );
    }

    // Check permission - admins have access to all businesses
    const user = await prisma.users.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    const isAdmin = user?.role === 'admin';

    // Check if user has access to this business (admins skip this check)
    let membership = null;
    if (!isAdmin) {
      membership = await prisma.businessMemberships.findFirst({
        where: {
          userId: session.user.id,
          businessId: businessId,
          isActive: true,
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

      if (!membership) {
        return NextResponse.json(
          { error: 'You do not have access to this business' },
          { status: 403 }
        );
      }
    }

    // Get business info (for admins who don't have membership)
    const business = membership?.businesses || await prisma.businesses.findUnique({
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
        { error: 'WiFi token generation is only available for restaurant and grocery businesses' },
        { status: 403 }
      );
    }

    // Get portal integration for this business
    const integration = await prisma.portalIntegrations.findUnique({
      where: { businessId: businessId },
    });

    if (!integration) {
      return NextResponse.json(
        { error: 'No portal integration found for this business. Please setup WiFi portal first.' },
        { status: 404 }
      );
    }

    if (!integration.isActive) {
      return NextResponse.json(
        { error: 'Portal integration is disabled for this business' },
        { status: 403 }
      );
    }

    // Get token configuration
    const tokenConfig = await prisma.tokenConfigurations.findUnique({
      where: { id: tokenConfigId },
    });

    if (!tokenConfig) {
      return NextResponse.json(
        { error: 'Token configuration not found' },
        { status: 404 }
      );
    }

    if (!tokenConfig.isActive) {
      return NextResponse.json(
        { error: 'This token configuration is inactive' },
        { status: 400 }
      );
    }

    // Check for business-specific overrides
    const businessMenuItem = await prisma.businessTokenMenuItems.findUnique({
      where: {
        businessId_tokenConfigId: {
          businessId: businessId,
          tokenConfigId: tokenConfigId,
        },
      },
    });

    // Use override values if they exist, otherwise use defaults from config
    const durationMinutes = businessMenuItem?.durationMinutesOverride ?? tokenConfig.durationMinutes;
    const bandwidthDownMb = businessMenuItem?.bandwidthDownMbOverride ?? tokenConfig.bandwidthDownMb;
    const bandwidthUpMb = businessMenuItem?.bandwidthUpMbOverride ?? tokenConfig.bandwidthUpMb;

    console.log('Single token creation values:', {
      tokenConfigId,
      businessId,
      durationMinutes,
      bandwidthDownMb,
      bandwidthUpMb,
      hasOverrides: !!(businessMenuItem?.durationMinutesOverride || businessMenuItem?.bandwidthDownMbOverride || businessMenuItem?.bandwidthUpMbOverride),
    });

    // Validate sale fields if recording sale
    if (recordSale) {
      if (saleAmount === undefined || saleAmount === null || !expenseAccountId) {
        return NextResponse.json(
          { error: 'Missing sale fields: saleAmount, expenseAccountId required when recordSale=true' },
          { status: 400 }
        );
      }

      // For paid sales, payment method is required
      if (saleAmount > 0 && !paymentMethod) {
        return NextResponse.json(
          { error: 'Payment method is required for paid sales' },
          { status: 400 }
        );
      }

      // Verify expense account exists and is accessible
      const expenseAccount = await prisma.expenseAccounts.findFirst({
        where: {
          id: expenseAccountId,
          OR: [
            // Allow if creator has business membership
            {
              creator: {
                business_memberships: {
                  some: {
                    businessId: businessId,
                  },
                },
              },
            },
            // Allow admin-created accounts
            {
              creator: {
                role: 'admin',
              },
            },
            // Allow WiFi-related accounts (created by system for WiFi functionality)
            {
              accountName: {
                contains: 'WiFi',
              },
            },
          ],
        },
      });

      if (!expenseAccount) {
        return NextResponse.json(
          { error: 'Expense account not found or not accessible' },
          { status: 404 }
        );
      }
    }

    // Create WiFi token via ESP32 API
    const portalClient = createPortalClient({
      baseUrl: `http://${integration.portalIpAddress}:${integration.portalPort}`,
      apiKey: integration.apiKey,
      timeout: 10000,
      retries: 3,
    });

    console.log('Portal client created:', {
      baseUrl: `http://${integration.portalIpAddress}:${integration.portalPort}`,
      apiKey: integration.apiKey.substring(0, 10) + '...',
      timeout: 10000,
      retries: 3,
    });

    let tokenResponse;
    try {
      console.log('Calling portalClient.createToken with params:', {
        businessId: businessId,
        durationMinutes,
        bandwidthDownMb,
        bandwidthUpMb,
        maxDevices: 2,
      });

      tokenResponse = await portalClient.createToken({
        businessId: businessId, // REQUIRED: Multi-business ESP32 sharing
        durationMinutes,
        bandwidthDownMb,
        bandwidthUpMb,
        maxDevices: 2,
      });

      console.log('Portal API response:', tokenResponse);

      if (!tokenResponse.success || !tokenResponse.token) {
        throw new Error(tokenResponse.error || 'Failed to create token on portal');
      }
    } catch (error: any) {
      console.error('ESP32 token creation error:', error);
      console.error('Error details:', {
        message: error.message,
        statusCode: error.statusCode,
        response: error.response,
        stack: error.stack,
      });
      return NextResponse.json(
        {
          error: 'Failed to create WiFi token on portal server',
          details: error.message,
          portalUrl: `http://${integration.portalIpAddress}:${integration.portalPort}`,
        },
        { status: 500 }
      );
    }

    // Calculate expiration date - only set after first use
    // const expiresAt = new Date(Date.now() + tokenConfig.durationMinutes * 60 * 1000);

    // Use database transaction to save token and record sale atomically
    const result = await prisma.$transaction(async (tx) => {
      // Save WiFi token to database
      const wifiToken = await tx.wifiTokens.create({
        data: {
          businessId: businessId,
          tokenConfigId: tokenConfigId,
          businessTokenMenuItemId: businessTokenMenuItemId || null,
          token: tokenResponse.token!,
          status: 'ACTIVE',
          // expiresAt: expiresAt, // Set after first use during sync
          bandwidthUsedDown: 0,
          bandwidthUsedUp: 0,
          usageCount: 0,
        },
      });

      let sale = null;

      // Record sale if requested
      if (recordSale && saleAmount !== undefined && expenseAccountId) {
        sale = await tx.wifiTokenSales.create({
          data: {
            businessId: businessId,
            wifiTokenId: wifiToken.id,
            expenseAccountId: expenseAccountId,
            saleAmount: saleAmount,
            paymentMethod: paymentMethod || 'FREE',
            saleChannel: 'DIRECT', // Token Management UI sales
            soldBy: session.user.id,
            receiptPrinted: false,
          },
        });

        // Create expense account deposit for revenue tracking
        await tx.expenseAccountDeposits.create({
          data: {
            expenseAccountId: expenseAccountId,
            sourceType: 'WIFI_TOKEN_SALE',
            sourceBusinessId: businessId,
            amount: saleAmount,
            depositDate: new Date(),
            autoGeneratedNote: `WiFi Token Sale - ${tokenConfig.name} [${tokenResponse.token}]`,
            transactionType: 'WIFI_TOKEN',
            createdBy: session.user.id,
          },
        });

        // Update expense account balance
        const depositsSum = await tx.expenseAccountDeposits.aggregate({
          where: { expenseAccountId: expenseAccountId },
          _sum: { amount: true },
        })

        const paymentsSum = await tx.expenseAccountPayments.aggregate({
          where: {
            expenseAccountId: expenseAccountId,
            status: 'SUBMITTED',
          },
          _sum: { amount: true },
        })

        const totalDeposits = Number(depositsSum._sum.amount || 0)
        const totalPayments = Number(paymentsSum._sum.amount || 0)
        const newBalance = totalDeposits - totalPayments

        await tx.expenseAccounts.update({
          where: { id: expenseAccountId },
          data: { balance: newBalance, updatedAt: new Date() },
        })
      }

      return { wifiToken, sale };
    });

    return NextResponse.json(
      {
        success: true,
        token: {
          id: result.wifiToken.id,
          token: result.wifiToken.token,
          status: result.wifiToken.status,
          expiresAt: result.wifiToken.expiresAt,
          businessId: result.wifiToken.businessId,
          businessName: business.name,
          tokenConfig: {
            name: tokenConfig.name,
            durationMinutes: tokenConfig.durationMinutes,
            bandwidthDownMb: tokenConfig.bandwidthDownMb,
            bandwidthUpMb: tokenConfig.bandwidthUpMb,
          },
          createdAt: result.wifiToken.createdAt,
        },
        sale: result.sale
          ? {
              id: result.sale.id,
              saleAmount: result.sale.saleAmount,
              paymentMethod: result.sale.paymentMethod,
              soldAt: result.sale.soldAt,
            }
          : null,
        portalResponse: {
          expiresAt: tokenResponse.expiresAt,
          bandwidthDownMb: tokenResponse.bandwidthDownMb,
          bandwidthUpMb: tokenResponse.bandwidthUpMb,
          ap_ssid: tokenResponse.ap_ssid,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('WiFi token creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create WiFi token', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/wifi-portal/tokens?businessId=xxx&status=ACTIVE&limit=50
 * List WiFi tokens for a business
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    const status = searchParams.get('status');
    const excludeSold = searchParams.get('excludeSold') === 'true'; // New parameter to exclude sold tokens
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 });
    }

    // Check permission - admins have access to all businesses
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

    const whereClause: any = { businessId: businessId };
    if (status) {
      whereClause.status = status;
    }

    // Filter out sold tokens if requested
    if (excludeSold) {
      whereClause.wifi_token_sales = {
        none: {} // No sales records = not sold
      };
    }

    const [tokens, total] = await Promise.all([
      prisma.wifiTokens.findMany({
        where: whereClause,
        include: {
          token_configurations: {
            select: {
              name: true,
              durationMinutes: true,
              bandwidthDownMb: true,
              bandwidthUpMb: true,
            },
          },
          business_token_menu_items: {
            select: {
              businessPrice: true,
            },
          },
          wifi_token_sales: {
            select: {
              id: true,
              saleAmount: true,
              paymentMethod: true,
              soldAt: true,
            },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.wifiTokens.count({ where: whereClause }),
    ]);

    return NextResponse.json({
      success: true,
      tokens: tokens.map((t) => ({
        id: t.id,
        token: t.token,
        tokenConfigId: t.tokenConfigId,
        status: t.status,
        createdAt: t.createdAt,
        expiresAt: t.expiresAt,
        firstUsedAt: t.firstUsedAt,
        bandwidthUsedDown: t.bandwidthUsedDown,
        bandwidthUsedUp: t.bandwidthUsedUp,
        usageCount: t.usageCount,
        lastSyncedAt: t.lastSyncedAt,
        tokenConfig: t.token_configurations,
        businessMenuItem: t.business_token_menu_items,
        sale: t.wifi_token_sales[0] || null,
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + tokens.length < total,
      },
    });
  } catch (error: any) {
    console.error('WiFi tokens fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch WiFi tokens', details: error.message },
      { status: 500 }
    );
  }
}
