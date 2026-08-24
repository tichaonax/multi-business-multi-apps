/**
 * R710 Token Invalidate API
 *
 * Invalidate a token (mark as unusable)
 */

import { NextRequest, NextResponse } from 'next/server';


import { prisma } from '@/lib/prisma';
import { getServerUser } from '@/lib/get-server-user'
import { getR710SessionManager } from '@/lib/r710-session-manager'
import { decrypt } from '@/lib/encryption'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tokenId = params.id;

    // Fetch token
    const token = await prisma.r710Tokens.findUnique({
      where: { id: tokenId },
      select: { id: true, businessId: true, status: true, connectedMac: true }
    });

    if (!token) {
      return NextResponse.json({ error: 'Token not found' }, { status: 404 });
    }

    // Check user has access to this business
    const membership = await prisma.userBusinessMemberships.findFirst({
      where: {
        businessId: token.businessId,
        userId: user.id
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

    // MBM-274: if the token is currently connected (has a known MAC), also
    // block that MAC on the R710 device's guest WLAN so revocation actually
    // disconnects the workstation immediately — DB-only invalidation alone
    // does not affect an already-connected device. Best-effort: a failure
    // here doesn't roll back the invalidation, since the token is unusable
    // in our own system either way; it's surfaced so the admin knows the
    // device-side block may need doing manually.
    let deviceBlockResult: { attempted: boolean; success: boolean; error?: string } = {
      attempted: false,
      success: false
    }

    if (token.connectedMac) {
      deviceBlockResult.attempted = true
      try {
        const integration = await prisma.r710BusinessIntegrations.findFirst({
          where: { businessId: token.businessId, isActive: true },
          include: { device_registry: true }
        })

        if (integration?.device_registry) {
          const device = integration.device_registry
          const adminPassword = decrypt(device.encryptedAdminPassword)
          const sessionManager = getR710SessionManager()
          const normalizedMac = token.connectedMac.toUpperCase().replace(/[:-]/g, ':')

          await sessionManager.withSession(
            { ipAddress: device.ipAddress, adminUsername: device.adminUsername, adminPassword },
            async (service) => {
              const aclLists = await service.listAclLists()
              const blockedAcl = aclLists.find(
                (acl) => acl.name === 'Blocked Devices' && acl.defaultMode === 'allow'
              )

              if (!blockedAcl) {
                await service.createAclList({
                  name: 'Blocked Devices',
                  description: 'Devices blocked by administrators',
                  mode: 'allow',
                  macs: [{ mac: normalizedMac, macComment: `Revoked token ${tokenId}` }]
                })
              } else {
                const updatedMacs = [
                  ...blockedAcl.denyMacs,
                  { mac: normalizedMac, macComment: `Revoked token ${tokenId}` }
                ]
                await service.updateAclList(blockedAcl.id, {
                  name: 'Blocked Devices',
                  description: 'Devices blocked by administrators',
                  mode: 'allow',
                  macs: updatedMacs
                })
              }
            }
          )

          deviceBlockResult.success = true
        } else {
          deviceBlockResult.error = 'No active R710 integration found for this business'
        }
      } catch (error) {
        console.error('[R710 Token Invalidate] Failed to block MAC on device:', error)
        deviceBlockResult.error = error instanceof Error ? error.message : 'Unknown error'
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Token invalidated successfully',
      token: {
        id: updatedToken.id,
        status: updatedToken.status
      },
      deviceBlock: deviceBlockResult
    });

  } catch (error) {
    console.error('[R710 Token Invalidate] POST error:', error);
    return NextResponse.json(
      { error: 'Failed to invalidate token' },
      { status: 500 }
    );
  }
}
