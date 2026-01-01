/**
 * R710 WiFi Token Direct Sales API
 *
 * Handles direct token sales with payment collection.
 * Prevents bookkeeping issues by requiring payment method tracking.
 *
 * POST /api/r710/tokens/sell
 * - Validates token is AVAILABLE
 * - Marks token as SOLD
 * - Records payment method
 * - Creates sales record
 * - Returns credentials for customer
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isSystemAdmin, getUserRoleInBusiness } from '@/lib/permission-utils';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = session.user as any;

    // Parse request body
    const body = await request.json();
    const { tokenId, salePrice, paymentMethod, businessId } = body;

    // Validate required fields
    if (!tokenId || salePrice === undefined || !paymentMethod || !businessId) {
      return NextResponse.json(
        { error: 'Missing required fields: tokenId, salePrice, paymentMethod, businessId' },
        { status: 400 }
      );
    }

    // Validate payment method
    if (!['cash', 'card', 'mobile'].includes(paymentMethod)) {
      return NextResponse.json(
        { error: 'Invalid payment method. Must be: cash, card, or mobile' },
        { status: 400 }
      );
    }

    // Validate sale price
    const price = parseFloat(salePrice);
    if (isNaN(price) || price < 0) {
      return NextResponse.json(
        { error: 'Invalid sale price' },
        { status: 400 }
      );
    }

    // Check business permissions
    const isAdmin = isSystemAdmin(user);
    if (!isAdmin) {
      const userRole = getUserRoleInBusiness(user, businessId);
      if (!userRole || !['business-owner', 'business-manager', 'employee'].includes(userRole)) {
        return NextResponse.json(
          { error: 'Forbidden: Insufficient permissions for this business' },
          { status: 403 }
        );
      }
    }

    // Fetch token and verify it belongs to this business and is AVAILABLE
    const token = await prisma.r710WifiToken.findUnique({
      where: { id: tokenId },
      include: {
        tokenConfig: {
          select: {
            id: true,
            name: true,
            basePrice: true,
            durationMinutes: true
          }
        },
        wlan: {
          select: {
            id: true,
            ssid: true
          }
        },
        business: {
          select: {
            id: true,
            businessName: true
          }
        }
      }
    });

    if (!token) {
      return NextResponse.json(
        { error: 'Token not found' },
        { status: 404 }
      );
    }

    // Verify token belongs to this business
    if (token.businessId !== businessId) {
      return NextResponse.json(
        { error: 'Token does not belong to this business' },
        { status: 403 }
      );
    }

    // Verify token is AVAILABLE
    if (token.status !== 'AVAILABLE') {
      return NextResponse.json(
        {
          error: 'Token is not available for sale',
          message: `Token status is ${token.status}. Only AVAILABLE tokens can be sold.`,
          currentStatus: token.status
        },
        { status: 400 }
      );
    }

    // Use a transaction to ensure atomic operation
    const result = await prisma.$transaction(async (tx) => {
      // Update token status to SOLD
      const updatedToken = await tx.r710WifiToken.update({
        where: { id: tokenId },
        data: {
          status: 'SOLD',
          soldAt: new Date(),
          salePrice: price
        }
      });

      // Create sales record
      const sale = await tx.r710TokenSale.create({
        data: {
          tokenId: tokenId,
          businessId: businessId,
          soldBy: user.id,
          salePrice: price,
          paymentMethod: paymentMethod,
          soldAt: new Date()
        },
        include: {
          token: {
            select: {
              username: true,
              password: true,
              status: true,
              expiresAt: true
            }
          },
          soldByUser: {
            select: {
              id: true,
              name: true,
              username: true
            }
          }
        }
      });

      return { updatedToken, sale };
    });

    console.log(`[R710 Token Sale] Token ${tokenId} sold for ${price} via ${paymentMethod} by user ${user.id}`);

    // Return success with token credentials
    return NextResponse.json({
      success: true,
      message: 'Token sold successfully',
      sale: {
        id: result.sale.id,
        username: result.sale.token.username,
        password: result.sale.token.password,
        expiresAt: result.sale.token.expiresAt,
        salePrice: result.sale.salePrice,
        paymentMethod: result.sale.paymentMethod,
        soldAt: result.sale.soldAt,
        tokenConfig: token.tokenConfig,
        wlan: token.wlan,
        soldBy: {
          id: result.sale.soldByUser.id,
          name: result.sale.soldByUser.name,
          username: result.sale.soldByUser.username
        }
      }
    }, { status: 200 });

  } catch (error) {
    console.error('[R710 Token Sale] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to process token sale',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
