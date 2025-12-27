/**
 * R710 Token Mark as Sold API
 *
 * Mark a token as sold with sale price
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { SessionUser, isSystemAdmin } from '@/lib/permission-utils';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tokenId = params.id;
    const body = await request.json();
    const { salePrice } = body;

    if (typeof salePrice !== 'number' || salePrice < 0) {
      return NextResponse.json(
        { error: 'Invalid sale price' },
        { status: 400 }
      );
    }

    // Fetch token
    const token = await prisma.r710Tokens.findUnique({
      where: { id: tokenId },
      select: { id: true, businessId: true, status: true }
    });

    if (!token) {
      return NextResponse.json({ error: 'Token not found' }, { status: 404 });
    }

    const user = session.user as SessionUser;

    // Check if user has access to this business (admins have access to all businesses)
    if (!isSystemAdmin(user)) {
      const membership = await prisma.businessMemberships.findFirst({
        where: {
          businessId: token.businessId,
          userId: session.user.id,
          isActive: true
        }
      });

      if (!membership) {
        return NextResponse.json(
          { error: 'Access denied to this token' },
          { status: 403 }
        );
      }
    }

    // Only AVAILABLE tokens can be marked as sold
    if (token.status !== 'AVAILABLE') {
      return NextResponse.json(
        { error: `Token must be AVAILABLE to mark as sold (current status: ${token.status})` },
        { status: 400 }
      );
    }

    // Update token
    const updatedToken = await prisma.r710Tokens.update({
      where: { id: tokenId },
      data: {
        status: 'SOLD',
        salePrice: salePrice,
        soldAt: new Date()
      }
    });

    console.log(`[R710 Token] Marked token ${tokenId} as sold for $${salePrice}`);

    return NextResponse.json({
      success: true,
      message: 'Token marked as sold successfully',
      token: {
        id: updatedToken.id,
        status: updatedToken.status,
        salePrice: updatedToken.salePrice,
        soldAt: updatedToken.soldAt
      }
    });

  } catch (error) {
    console.error('[R710 Token Mark Sold] POST error:', error);
    return NextResponse.json(
      { error: 'Failed to mark token as sold' },
      { status: 500 }
    );
  }
}
