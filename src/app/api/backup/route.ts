import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createCleanBackup } from '@/lib/backup-clean';
import { restoreCleanBackup, validateBackupData } from '@/lib/restore-clean';
import { createProgressId, updateProgress } from '@/lib/backup-progress';

/**
 * GET /api/backup - Create and download backup
 * 
 * Query parameters:
 * - includeDemoData: Include demo businesses (default: false)
 * - businessId: Backup specific business only (optional)
 * - includeAuditLogs: Include audit logs (default: false)
 * - auditLogLimit: Max audit logs to include (default: 1000)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const backupType = searchParams.get('type') || 'full';
    const includeDemoData = searchParams.get('includeDemoData') === 'true';
    const businessId = searchParams.get('businessId') || undefined;
    const includeAuditLogs = searchParams.get('includeAuditLogs') === 'true';
    const auditLogLimit = parseInt(searchParams.get('auditLogLimit') || '1000', 10);

    console.log('[backup] Creating backup with options:', {
      backupType,
      includeDemoData,
      businessId,
      includeAuditLogs,
      auditLogLimit
    });

    // Create clean backup using new implementation
    const backupData = await createCleanBackup(prisma, {
      includeDemoData,
      businessId,
      includeAuditLogs,
      auditLogLimit
    });

    // Generate filename in format: MultiBusinessSyncService-backup_full_2025-12-02T03-22-14.json
    const now = new Date();
    const timestamp = now.toISOString().replace(/:/g, '-').replace(/\.\d{3}Z$/, '');
    const type = businessId
      ? `business-${businessId}`
      : includeDemoData
        ? 'with-demos'
        : backupType;
    const filename = `MultiBusinessSyncService-backup_${type}_${timestamp}.json`;

    console.log('[backup] Backup created successfully:', {
      version: backupData.metadata.version,
      timestamp: backupData.metadata.timestamp,
      filename
    });

    // Return backup as JSON download
    return new NextResponse(JSON.stringify(backupData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error('[backup] Backup creation failed:', error);
    return NextResponse.json(
      { error: 'Failed to create backup', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/backup - Restore backup from uploaded data
 * 
 * Body: { backupData: <backup object> }
 * Query params: ?wait=true (optional, for synchronous restore)
 * 
 * Returns: 
 * - If wait=true: Full restore results
 * - If wait=false (default): { progressId } for polling
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { backupData } = body;

    if (!backupData) {
      return NextResponse.json(
        { error: 'No backup data provided' },
        { status: 400 }
      );
    }

    // Validate backup data structure
    const validation = validateBackupData(backupData);
    if (!validation.valid) {
      console.error('[restore] Backup validation failed:', validation.errors);
      return NextResponse.json(
        { error: 'Invalid backup data', details: validation.errors },
        { status: 400 }
      );
    }

    // Check if synchronous or background restore
    const url = new URL(request.url);
    const waitFor = url.searchParams.get('wait') === 'true';

    console.log('[restore] Starting restore process...');
    console.log('[restore] Backup version:', backupData.metadata?.version);
    console.log('[restore] Backup timestamp:', backupData.metadata?.timestamp);
    console.log('[restore] Wait mode:', waitFor);

    // Create progress ID for tracking
    const progressId = createProgressId();
    console.log('[restore] Progress ID:', progressId);

    // Initialize progress with model counts from backup
    const counts: Record<string, { processed: number; total: number }> = {};
    let totalRecords = 0;
    for (const [key, value] of Object.entries(backupData)) {
      if (key !== 'metadata' && Array.isArray(value)) {
        counts[key] = { processed: 0, total: value.length };
        totalRecords += value.length;
      }
    }
    updateProgress(progressId, {
      counts,
      model: 'starting',
      processed: 0,
      total: totalRecords
    });

    // Define restore function
    const runRestore = async () => {
      try {
        console.log(`[restore] Starting restore job: progressId=${progressId}`);
        updateProgress(progressId, { model: 'restoring' });

        const result = await restoreCleanBackup(prisma, backupData, {
          onProgress: (model, processed, total) => {
            console.log(`[restore] ${model}: ${processed}/${total}`);
            // Only update the counts for this specific model
            // Don't overwrite top-level processed/total
            updateProgress(progressId, {
              model,
              counts: { [model]: { processed, total } }
            });
          },
          onError: (model, recordId, error) => {
            const errorMsg = `${model}:${recordId} - ${error}`;
            console.error(`[restore] ERROR: ${errorMsg}`);
            updateProgress(progressId, {
              errors: [errorMsg]
            });
          }
        });

        // Update progress with final status
        updateProgress(progressId, {
          model: result.success ? 'completed' : 'error',
          processed: result.processed,  // Actual records processed
          total: totalRecords            // Total records from initial calculation
        });

        console.log('[restore] Restore completed:', {
          progressId,
          success: result.success,
          processed: result.processed,
          total: totalRecords,
          errors: result.errors
        });

        return result;
      } catch (error: any) {
        console.error('[restore] Restore job failed:', error);
        updateProgress(progressId, {
          model: 'error',
          errors: [error.message || 'Unknown error']
        });
        throw error;
      }
    };

    if (waitFor) {
      // Synchronous restore - wait for completion
      const result = await runRestore();

      return NextResponse.json({
        success: result.success,
        message: result.success
          ? `Backup restored successfully: ${result.processed} records`
          : `Backup restored with ${result.errors} errors (${result.processed} records processed)`,
        processed: result.processed,
        errors: result.errors,
        errorLog: result.errorLog.slice(0, 100),
        results: {
          restored: {
            users: 0, // Can be calculated from result if needed
            businesses: 0,
            employees: 0,
            businessMemberships: 0,
            auditLogs: 0,
            referenceData: 0
          },
          errors: result.errorLog.map(e => `${e.model}:${e.recordId} - ${e.error}`)
        }
      });
    } else {
      // Background restore - return progressId immediately
      console.log('[restore] Starting background restore:', progressId);
      
      // Run restore in background (don't await)
      void runRestore();

      return NextResponse.json({
        message: 'Restore started in background',
        progressId
      });
    }
  } catch (error: any) {
    console.error('[restore] Restore failed:', error);
    return NextResponse.json(
      { error: 'Failed to restore backup', details: error.message },
      { status: 500 }
    );
  }
}
