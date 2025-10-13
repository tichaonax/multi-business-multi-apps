import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.users.role !== 'admin') {
      return NextResponse.json(
        { message: 'Admin access required' },
        { status: 401 }
      );
    }

    console.log(`🌱 Reference data seeding initiated by ${session.users.name} (${session.users.email})`);

    // Run the reference data seeding script
    const { stdout, stderr } = await execAsync('node scripts/seed-all-employee-data.js', {
      cwd: process.cwd(),
      timeout: 30000 // 30 second timeout
    });

    console.log('🌱 Seed output:', stdout);
    if (stderr) console.warn('🌱 Seed warnings:', stderr);

    // Create audit log entry
    await createAuditLog({
      userId: session.users.id!,
      action: 'DATA_IMPORT' as any,
      entityType: 'ReferenceData',
      entityId: 'reference-data-seed-' + Date.now(),
      oldValues: null,
      newValues: {
        seededAt: new Date().toISOString(),
        seededBy: {
          userId: session.users.id,
          userName: session.users.name,
          userEmail: session.users.email,
        },
        seededData: {
          idTemplates: 5,
          driverLicenseTemplates: 9,
          jobTitles: 29,
          compensationTypes: 15,
          benefitTypes: 28,
          totalRecords: 86
        },
        output: stdout,
        warnings: stderr || null
      },
    });

    console.log('✅ Reference data seeded successfully');

    return NextResponse.json({
      success: true,
      message: 'Reference data seeded successfully',
      details: {
        seededData: {
          idTemplates: 5,
          driverLicenseTemplates: 9,
          jobTitles: 29,
          compensationTypes: 15,
          benefitTypes: 28,
          totalRecords: 86
        },
        output: stdout,
        warnings: stderr || null
      }
    });

  } catch (error) {
    console.error('❌ Reference data seeding failed:', error);

    // Log the failed attempt
    try {
      const session = await getServerSession(authOptions);
      if (session?.user) {
        await createAuditLog({
          userId: session.users.id!,
          action: 'DATA_IMPORT' as any,
          entityType: 'ReferenceData',
          entityId: 'reference-data-seed-failed-' + Date.now(),
          oldValues: null,
          newValues: {
            error: error instanceof Error ? error.message : 'Unknown error',
            failedAt: new Date().toISOString(),
            attemptedBy: {
              userId: session.users.id,
              userName: session.users.name,
              userEmail: session.users.email,
            }
          },
        });
      }
    } catch (auditError) {
      console.error('Failed to log reference data seeding failure:', auditError);
    }

    return NextResponse.json(
      {
        success: false,
        message: 'Reference data seeding failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        details: 'The reference data seeding operation could not be completed.'
      },
      { status: 500 }
    );
  }
}