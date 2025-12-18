import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createPortalClient } from '@/lib/wifi-portal/api-client';

/**
 * PUT /api/wifi-portal/integration/[id]
 * Update portal integration settings
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: integrationId } = await params;
    const body = await request.json();
    const { apiKey, portalIpAddress, portalPort, isActive, showTokensInPOS } = body;

    // Get existing integration
    const existingIntegration = await prisma.portalIntegrations.findUnique({
      where: { id: integrationId },
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

    if (!existingIntegration) {
      return NextResponse.json(
        { error: 'Portal integration not found' },
        { status: 404 }
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
          businessId: existingIntegration.businessId,
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

    // If API key or portal address changed, test the new connection
    const shouldTestConnection =
      (apiKey && apiKey !== existingIntegration.apiKey) ||
      (portalIpAddress && portalIpAddress !== existingIntegration.portalIpAddress) ||
      (portalPort && portalPort !== existingIntegration.portalPort);

    if (shouldTestConnection) {
      const testApiKey = apiKey || existingIntegration.apiKey;
      const testIpAddress = portalIpAddress || existingIntegration.portalIpAddress;
      const testPort = portalPort || existingIntegration.portalPort;

      const portalClient = createPortalClient({
        baseUrl: `http://${testIpAddress}:${testPort}`,
        apiKey: testApiKey,
        timeout: 10000,
        retries: 2,
      });

      const healthCheck = await portalClient.checkHealth();
      if (!healthCheck.online) {
        return NextResponse.json(
          {
            error: 'Unable to connect to WiFi portal with provided settings',
            details: healthCheck.error || 'Portal server is not reachable',
          },
          { status: 400 }
        );
      }
    }

    // Update integration
    const updatedIntegration = await prisma.portalIntegrations.update({
      where: { id: integrationId },
      data: {
        ...(apiKey !== undefined && { apiKey }),
        ...(portalIpAddress !== undefined && { portalIpAddress }),
        ...(portalPort !== undefined && { portalPort: parseInt(portalPort.toString(), 10) }),
        ...(isActive !== undefined && { isActive }),
        ...(showTokensInPOS !== undefined && { showTokensInPOS }),
        updatedAt: new Date(),
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

    return NextResponse.json({
      success: true,
      integration: {
        id: updatedIntegration.id,
        businessId: updatedIntegration.businessId,
        businessName: updatedIntegration.businesses.name,
        businessType: updatedIntegration.businesses.type,
        portalIpAddress: updatedIntegration.portalIpAddress,
        portalPort: updatedIntegration.portalPort,
        isActive: updatedIntegration.isActive,
        showTokensInPOS: updatedIntegration.showTokensInPOS,
        updatedAt: updatedIntegration.updatedAt,
        apiKeyPreview: updatedIntegration.apiKey.slice(0, 8) + '...',
      },
    });
  } catch (error: any) {
    console.error('WiFi portal integration update error:', error);
    return NextResponse.json(
      { error: 'Failed to update portal integration', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/wifi-portal/integration/[id]
 * Delete portal integration
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: integrationId } = await params;

    // Get existing integration
    const existingIntegration = await prisma.portalIntegrations.findUnique({
      where: { id: integrationId },
      include: {
        businesses: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!existingIntegration) {
      return NextResponse.json(
        { error: 'Portal integration not found' },
        { status: 404 }
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
          businessId: existingIntegration.businessId,
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

    // Check if there are active tokens linked to this integration
    const activeTokensCount = await prisma.wifiTokens.count({
      where: {
        businessId: existingIntegration.businessId,
        status: 'ACTIVE',
      },
    });

    if (activeTokensCount > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete integration with active tokens',
          details: `There are ${activeTokensCount} active WiFi tokens. Disable them first.`,
        },
        { status: 409 }
      );
    }

    // Delete the integration (cascade will handle related records)
    await prisma.portalIntegrations.delete({
      where: { id: integrationId },
    });

    return NextResponse.json({
      success: true,
      message: 'Portal integration deleted successfully',
      deletedIntegrationId: integrationId,
      businessName: existingIntegration.businesses.name,
    });
  } catch (error: any) {
    console.error('WiFi portal integration delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete portal integration', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/wifi-portal/integration/[id]
 * Get specific portal integration by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: integrationId } = await params;

    const integration = await prisma.portalIntegrations.findUnique({
      where: { id: integrationId },
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
        { error: 'Portal integration not found' },
        { status: 404 }
      );
    }

    // Check if user has access to this business
    const membership = await prisma.businessMemberships.findFirst({
      where: {
        userId: session.user.id,
        businessId: integration.businessId,
        isActive: true,
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: 'You do not have access to this business' },
        { status: 403 }
      );
    }

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
