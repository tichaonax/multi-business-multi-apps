/**
 * R710 Token Invalidate API
 *
 * Invalidate a token (mark as unusable)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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

    // Fetch token
    const token = await prisma.r710Tokens.findUnique({
      where: { id: tokenId },
      select: { id: true, businessId: true, status: true }
    });

    if (!token) {
      return NextResponse.json({ error: 'Token not found' }, { status: 404 });
    }

    // Check user has access to this business
    const membership = await prisma.userBusinessMemberships.findFirst({
      where: {
        businessId: token.businessId,
        userId: session.user.id
      }
    });

    if (!membership) {
      return NextResponse.json(
        { error: 'Access denied to this token' },
        { status: 403 }
      );
    }

    // Cannot invalidate already expired or invalidated tokens
    if (token.status === 'EXPIRED' || token.status === 'INVALIDATED') {
      return NextResponse.json(
        { error: `Token is already ${token.status}` },
        { status: 400 }
      );
    }

    // Update token
    const updatedToken = await prisma.r710Tokens.update({
      where: { id: tokenId },
      data: {
        status: 'INVALIDATED'
      }
    });

    console.log(`[R710 Token] Invalidated token ${tokenId}`);

    return NextResponse.json({
      success: true,
      message: 'Token invalidated successfully',
      token: {
        id: updatedToken.id,
        status: updatedToken.status
      }
    });

  } catch (error) {
    console.error('[R710 Token Invalidate] POST error:', error);
    return NextResponse.json(
      { error: 'Failed to invalidate token' },
      { status: 500 }
    );
  }
}
