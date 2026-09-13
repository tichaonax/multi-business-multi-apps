import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { createGunzip } from 'zlib';

import { prisma } from '@/lib/prisma';
import { createCleanBackup, writeCleanBackupStream } from '@/lib/backup-clean';
import { restoreCleanBackup, validateBackupData, RESTORE_ORDER } from '@/lib/restore-clean';
import { createProgressId, updateProgress, getProgress } from '@/lib/backup-progress';
import { compressBackup, decompressBackup, isGzipped } from '@/lib/backup-compression';
import { parseJSONStream } from '@/lib/backup-stream-parse';
import { getServerUser } from '@/lib/get-server-user'
import { isBusinessOwner } from '@/lib/permission-utils'

export const runtime = 'nodejs';
export const maxDuration = 300;

const BACKUPS_DIR = path.join(process.cwd(), 'backups');

/**
 * GET /api/backup - Start a backup (streamed, memory-safe even with
 * MBM-294's shared image pool), or download one already completed.
 *
 * Query parameters:
 * - download: a progressId from a previous call - if present, every other
 *   param is ignored and the completed file (if ready) is streamed back.
 * - backupType: 'full' | 'business-specific' | 'full-device' (default: 'full')
 * - includeDemoData: Include demo businesses (default: false)
 * - includeDeviceData: Include device-specific sync data (default: false)
 * - businessId: Backup specific business only (optional)
 * - includeAuditLogs: Include audit logs (default: false)
 * - auditLogLimit: Max audit logs to include (default: 1000)
 *
 * Returns `{ progressId }` immediately; poll GET /api/backup/progress?id=...
 * (same mechanism restore already uses) for per-table status, then
 * GET /api/backup?download=<progressId> once model === 'completed'.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser();

    const canBackup = user && (user.role === 'admin' || user.role === 'manager' || isBusinessOwner(user))
    if (!canBackup) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    const downloadId = searchParams.get('download');
    if (downloadId) {
      const progress = getProgress(downloadId);
      if (!progress || progress.model !== 'completed' || !progress.filePath) {
        return NextResponse.json({ error: 'Backup not found or not ready yet' }, { status: 404 });
      }
      const fileBuffer = await fs.promises.readFile(progress.filePath);
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': 'application/gzip',
          'Content-Disposition': `attachment; filename="${progress.filename}"`,
        },
      });
    }

    const backupType = (searchParams.get('backupType') || 'full') as 'full' | 'business-specific' | 'full-device';
    const includeDemoData = searchParams.get('includeDemoData') === 'true';
    const includeDeviceData = searchParams.get('includeDeviceData') === 'true';
    const businessId = searchParams.get('businessId') || undefined;
    const includeAuditLogs = searchParams.get('includeAuditLogs') === 'true';
    const auditLogLimit = parseInt(searchParams.get('auditLogLimit') || '1000', 10);
    const createdBy = user.name || user.email || 'Unknown';
    // Incremental backup (Phase 5, MBM-294 §3.5): `since` is the watermark
    // (the base full backup's own metadata.timestamp, typically), and the
    // base* fields are recorded so restore can confirm the right full
    // backup was applied first.
    const since = searchParams.get('since') || undefined;
    const baseBackupTimestamp = searchParams.get('baseBackupTimestamp') || undefined;
    const baseSourceNodeId = searchParams.get('baseSourceNodeId') || undefined;

    const now = new Date();
    const timestamp = now.toISOString().replace(/:/g, '-').replace(/\.\d{3}Z$/, '');
    const type = businessId
      ? `business-${businessId.substring(0, 8)}`
      : since
        ? `${backupType}-incremental`
        : backupType;
    const filename = `MultiBusinessSyncService-backup_${type}_${timestamp}.json.gz`;

    await fs.promises.mkdir(BACKUPS_DIR, { recursive: true });
    const outputPath = path.join(BACKUPS_DIR, filename);

    const progressId = createProgressId();
    // Total record count isn't known until the backup actually finishes
    // querying every table, so the progress bar tracks tables completed
    // instead - RESTORE_ORDER's length is fixed and known upfront.
    updateProgress(progressId, { model: 'starting', processed: 0, total: 0, totalTables: RESTORE_ORDER.length });

    console.log('[backup] Starting streamed backup:', {
      progressId, backupType, includeDemoData, includeDeviceData, businessId,
      includeAuditLogs, auditLogLimit, createdBy, since, filename
    });

    const runBackup = async () => {
      try {
        updateProgress(progressId, { model: 'creating' });
        const result = await writeCleanBackupStream(
          prisma,
          {
            backupType, includeDemoData, includeDeviceData, businessId,
            includeAuditLogs, auditLogLimit, createdBy, since,
            baseBackupTimestamp, baseSourceNodeId
          },
          outputPath,
          (p) => {
            updateProgress(progressId, {
              model: p.table,
              counts: { [p.table]: { processed: p.processed, total: p.total } }
            });
          }
        );

        updateProgress(progressId, {
          model: 'completed',
          processed: result.totalRecords,
          total: result.totalRecords,
          filePath: result.filePath,
          filename,
          sizeBytes: result.sizeBytes
        });

        console.log('[backup] Streamed backup completed:', {
          progressId, filename, sizeBytes: result.sizeBytes, totalRecords: result.totalRecords
        });
      } catch (error: any) {
        console.error('[backup] Streamed backup failed:', error);
        updateProgress(progressId, { model: 'error', errors: [error.message || 'Unknown error'] });
        // Clean up a partial file rather than leaving a corrupt .json.gz behind.
        try { await fs.promises.unlink(outputPath); } catch { /* ignore */ }
      }
    };

    void runBackup();

    return NextResponse.json({ message: 'Backup started in background', progressId });
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
 * Body:
 * - { backupData: <backup object> } - For uncompressed JSON backups
 * - { compressedData: <base64 string> } - For compressed .json.gz backups
 *
 * Query params: ?wait=true (optional, for synchronous restore)
 *
 * Returns:
 * - If wait=true: Full restore results
 * - If wait=false (default): { progressId } for polling
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser();

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let backupData: any;
    let confirmBaseRestored = false;

    // Streaming upload path (Increment 2 of the streaming backup/restore
    // fix): the client sends the raw file body directly instead of
    // file.text() -> JSON.parse() -> JSON.stringify()-ing it again into a
    // JSON request body (that double round trip, one of them in the
    // browser tab itself, was the other half of what made large backups
    // OOM-risky). A streaming JSON parser builds the identical object
    // JSON.parse would, just without ever holding the raw text and the
    // parsed object in memory at the same time. restoreCleanBackup() below
    // is completely unchanged either way - only how backupData gets built differs.
    if (request.headers.get('x-restore-stream') === 'true') {
      confirmBaseRestored = request.headers.get('x-restore-confirm-base') === 'true';
      try {
        const nodeStream = Readable.fromWeb(request.body as any);
        const isCompressed = request.headers.get('x-restore-compressed') === 'true';
        const source = isCompressed ? nodeStream.pipe(createGunzip()) : nodeStream;
        backupData = await parseJSONStream(source);
        console.log('[restore] Parsed backup via streaming upload', { isCompressed });
      } catch (error: any) {
        console.error('[restore] Streaming parse failed:', error);
        return NextResponse.json(
          { error: 'Failed to parse uploaded backup', details: error.message },
          { status: 400 }
        );
      }
    } else {
      const body = await request.json();
      backupData = body.backupData;
      confirmBaseRestored = !!body.confirmBaseRestored;

      // Check if compressed data was uploaded
      if (body.compressedData) {
        console.log('[restore] Decompressing backup data...');
        try {
          // Decode base64 and decompress
          const compressedBuffer = Buffer.from(body.compressedData, 'base64');

          // Check if actually gzipped
          if (!isGzipped(compressedBuffer)) {
            return NextResponse.json(
              { error: 'Invalid compressed data - not a gzip file' },
              { status: 400 }
            );
          }

          // Decompress
          backupData = await decompressBackup(compressedBuffer);
          console.log('[restore] Backup decompressed successfully');
        } catch (error: any) {
          console.error('[restore] Decompression failed:', error);
          return NextResponse.json(
            { error: 'Failed to decompress backup', details: error.message },
            { status: 400 }
          );
        }
      }
    }

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

    // Incremental backup (Phase 5, MBM-294 §3.5): restoring it standalone
    // would leave images older than its watermark missing (their blobs were
    // deliberately excluded — see backup-clean.ts) while the fully-included
    // metadata rows referencing them do come through, so it must be applied
    // on top of its base full backup — never as a first/only restore. Since
    // restore itself is upsert-only (never deletes), applying it out of
    // order can't corrupt anything, only leave older images unrestored —
    // so this is a confirmation gate, not a hard technical block, and the
    // client passes `confirmBaseRestored: true` once the admin has done so.
    const incremental = backupData.metadata?.incremental;
    if (incremental && !confirmBaseRestored) {
      return NextResponse.json({
        error: 'This is an incremental backup and needs confirmation',
        requiresBaseConfirmation: true,
        incremental
      }, { status: 409 });
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
    // Handle both v2.0 (flat) and v3.0 (businessData/deviceData) formats
    const counts: Record<string, { processed: number; total: number }> = {};
    let totalRecords = 0;

    // v3.0 format check
    if (backupData.businessData || backupData.deviceData) {
      // Count records in businessData
      if (backupData.businessData) {
        for (const [key, value] of Object.entries(backupData.businessData)) {
          if (Array.isArray(value)) {
            counts[key] = { processed: 0, total: value.length };
            totalRecords += value.length;
          }
        }
      }
      // Count records in deviceData
      if (backupData.deviceData) {
        for (const [key, value] of Object.entries(backupData.deviceData)) {
          if (Array.isArray(value)) {
            counts[key] = { processed: 0, total: value.length };
            totalRecords += value.length;
          }
        }
      }
    } else {
      // v2.0 flat format
      for (const [key, value] of Object.entries(backupData)) {
        if (key !== 'metadata' && Array.isArray(value)) {
          counts[key] = { processed: 0, total: value.length };
          totalRecords += value.length;
        }
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
          total: totalRecords,           // Total records from initial calculation
          skipped: result.skippedRecords,
          skippedReasons: result.skippedReasons,
          modelCounts: result.modelCounts
        });

        console.log('[restore] Restore completed:', {
          progressId,
          success: result.success,
          processed: result.processed,
          skipped: result.skippedRecords,
          total: totalRecords,
          errors: result.errors,
          skippedReasons: result.skippedReasons
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
