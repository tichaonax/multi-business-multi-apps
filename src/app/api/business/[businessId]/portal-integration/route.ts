import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/business/[businessId]/portal-integration
 * Get portal integration for a specific business
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { businessId } = await params;

    // Check if user has access to this business (admins have access to all businesses)
    const user = await prisma.users.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    const isAdmin = user?.role === 'admin';

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

    // Get portal integration
    const integration = await prisma.portalIntegrations.findUnique({
      where: { businessId: businessId },
    });

    if (!integration) {
      return NextResponse.json(
        { error: 'No portal integration found for this business' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      integration: {
        id: integration.id,
        businessId: integration.businessId,
        apiKey: integration.apiKey,
        portalIpAddress: integration.portalIpAddress,
        portalPort: integration.portalPort,
        isActive: integration.isActive,
        showTokensInPOS: integration.showTokensInPOS,
        createdAt: integration.createdAt,
        updatedAt: integration.updatedAt,
      },
    });
  } catch (error: any) {
    console.error('Portal integration fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch portal integration', details: error.message },
      { status: 500 }
    );
  }
}
