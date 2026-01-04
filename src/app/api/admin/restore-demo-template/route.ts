import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Helper function to check admin access
function isAdmin(session: any): boolean {
  return session?.user?.role === 'admin';
}

/**
 * POST /api/admin/restore-demo-template
 *
 * Restores demo data from golden backup template
 * This endpoint executes the restore-demo-template.js script
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 401 });
    }

    const startTime = Date.now();

    try {
      // Execute the restore script
      const { stdout, stderr } = await execAsync('node scripts/restore-demo-template.js', {
        cwd: process.cwd(),
        env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
        timeout: 600000 // 10 minute timeout
      });

      const duration = ((Date.now() - startTime) / 1000).toFixed(1);

      return NextResponse.json({
        success: true,
        message: 'Demo data restored from template successfully',
        duration: `${duration}s`,
        output: stdout.substring(0, 1000), // Truncate output
        completedAt: new Date().toISOString()
      });

    } catch (error: any) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);

      return NextResponse.json({
        success: false,
        error: 'Failed to restore demo template',
        details: error.message,
        duration: `${duration}s`,
        stderr: error.stderr?.substring(0, 500)
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Error in restore-demo-template:', error);
    return NextResponse.json(
      { error: 'Failed to execute template restoration', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/restore-demo-template
 *
 * Returns information about the template restoration endpoint
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 401 });
    }

    return NextResponse.json({
      endpoint: 'POST /api/admin/restore-demo-template',
      description: 'Restores demo data from golden backup template',
      warning: 'This will delete all existing demo data',
      process: [
        '1. Loads template (compressed or uncompressed)',
        '2. Cleans existing demo data',
        '3. Runs master seeding script',
        '4. Verifies restoration'
      ],
      estimatedDuration: '1-2 minutes',
      template: {
        location: 'seed-data/templates/',
        version: '1.0',
        files: [
          'demo-data-template-v1.0.json',
          'demo-data-template-v1.0.json.gz',
          'demo-data-template-v1.0.meta.json'
        ]
      }
    });

  } catch (error: any) {
    console.error('Error in restore-demo-template GET:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve template info', details: error.message },
      { status: 500 }
    );
  }
}
