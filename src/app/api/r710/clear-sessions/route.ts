/**
 * R710 Session Cache Cleanup API
 *
 * Clears all cached R710 sessions to force re-initialization
 * Use this after updating session initialization code
 */

import { NextRequest, NextResponse } from 'next/server';


import { isSystemAdmin } from '@/lib/permission-utils';
import { getR710SessionManager } from '@/lib/r710-session-manager';
import { getServerUser } from '@/lib/get-server-user'

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only system admins can clear sessions
    if (!isSystemAdmin(user)) {
      return NextResponse.json(
        { error: 'Only system administrators can clear R710 sessions' },
        { status: 403 }
      );
    }

    const sessionManager = getR710SessionManager();

    // Get current stats
    const statsBefore = sessionManager.getStats();

    console.log('[R710 Sessions] Clearing all sessions...');
    console.log(`[R710 Sessions] Current sessions: ${statsBefore.totalSessions}`);

    // Clear all sessions
    await sessionManager.clearAllSessions();

    // Verify cleanup
    const statsAfter = sessionManager.getStats();

    console.log(`[R710 Sessions] Sessions cleared: ${statsBefore.totalSessions}`);
    console.log(`[R710 Sessions] Remaining sessions: ${statsAfter.totalSessions}`);

    return NextResponse.json({
      success: true,
      message: 'R710 sessions cleared successfully',
      cleared: statsBefore.totalSessions,
      remaining: statsAfter.totalSessions
    });

  } catch (error) {
    console.error('[R710 Sessions] Clear error:', error);
    return NextResponse.json(
      { error: 'Failed to clear sessions', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only system admins can view session stats
    if (!isSystemAdmin(user)) {
      return NextResponse.json(
        { error: 'Only system administrators can view R710 session stats' },
        { status: 403 }
      );
    }

    const sessionManager = getR710SessionManager();
    const stats = sessionManager.getStats();

    return NextResponse.json({
      stats: {
        totalSessions: stats.totalSessions,
        activeSessions: stats.activeSessions,
        idleSessions: stats.idleSessions
      }
    });

  } catch (error) {
    console.error('[R710 Sessions] Stats error:', error);
    return NextResponse.json(
      { error: 'Failed to get session stats', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
