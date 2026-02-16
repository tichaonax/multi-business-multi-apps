/**
 * Test New R710 Device Connectivity
 *
 * Test connectivity to a new R710 device before registration
 */

import { NextRequest, NextResponse } from 'next/server';


import { isSystemAdmin } from '@/lib/permission-utils';
import { RuckusR710ApiService } from '@/services/ruckus-r710-api';
import { getServerUser } from '@/lib/get-server-user'

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }


    // Only system admins can test new devices
    if (!isSystemAdmin(user)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { ipAddress, adminUsername, adminPassword } = body;

    // Validate required fields
    if (!ipAddress || !adminUsername || !adminPassword) {
      return NextResponse.json(
        { error: 'Missing required fields: ipAddress, adminUsername, adminPassword' },
        { status: 400 }
      );
    }

    // Create R710 service instance
    const r710Service = new RuckusR710ApiService({
      ipAddress,
      adminUsername,
      adminPassword,
      timeout: 30000 // 30 second timeout for initial connection test
    });

    // Test connectivity
    console.log(`[R710 Test New] Testing connectivity to ${ipAddress}...`);

    const connectivityTest = await r710Service.testConnection();

    if (!connectivityTest.online) {
      return NextResponse.json({
        online: false,
        authenticated: false,
        error: 'Device unreachable. Please verify the IP address and network connectivity.'
      }, { status: 503 });
    }

    // Test authentication
    console.log(`[R710 Test New] Device is online, testing authentication...`);
    const loginResult = await r710Service.login();

    if (!loginResult.success) {
      return NextResponse.json({
        online: true,
        authenticated: false,
        error: 'Authentication failed. Please verify the admin username and password.',
        details: loginResult.error
      }, { status: 401 });
    }

    console.log(`[R710 Test New] Authentication successful`);

    // Initialize session
    try {
      await r710Service.initializeSession();
    } catch (error) {
      console.warn('[R710 Test New] Session initialization warning:', error);
    }

    // Fetch system info if authenticated
    let systemInfo = null;
    try {
      systemInfo = await r710Service.getSystemInfo();
    } catch (error) {
      console.warn('[R710 Test New] Failed to fetch system info:', error);
    }

    console.log(`[R710 Test New] Successfully connected to ${ipAddress}`);

    return NextResponse.json({
      online: true,
      authenticated: true,
      firmwareVersion: systemInfo?.firmwareVersion || null,
      model: systemInfo?.model || 'R710',
      message: 'Connection successful'
    });

  } catch (error) {
    console.error('[R710 Test New] Error:', error);
    return NextResponse.json(
      {
        online: false,
        authenticated: false,
        error: 'Connection test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
