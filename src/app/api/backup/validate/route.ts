import { NextRequest, NextResponse } from 'next/server';
import { Readable } from 'stream';
import { createGunzip } from 'zlib';

import { prisma } from '@/lib/prisma';
import { validateBackupRestore, formatValidationSummary } from '@/lib/backup-validation';
import { parseJSONStream } from '@/lib/backup-stream-parse';
import { getServerUser } from '@/lib/get-server-user'

export const runtime = 'nodejs';
export const maxDuration = 300;

/**
 * POST /api/backup/validate - Validate backup against current database
 *
 * Streaming upload (preferred, same as POST /api/backup - see
 * ai-contexts/project-plans/review/projectplan-NOTKT-streaming-backup-restore-2026-09-13.md):
 * header `x-restore-stream: true`, raw file body, `x-restore-compressed: true` if gzipped.
 *
 * Legacy body (still supported): { backupData } or { compressedData } (base64).
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser();

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let backupData: any;
    let restoreResult: any;

    if (request.headers.get('x-restore-stream') === 'true') {
      try {
        const nodeStream = Readable.fromWeb(request.body as any);
        const isCompressed = request.headers.get('x-restore-compressed') === 'true';
        const source = isCompressed ? nodeStream.pipe(createGunzip()) : nodeStream;
        backupData = await parseJSONStream(source);
      } catch (error: any) {
        console.error('[validate] Streaming parse failed:', error);
        return NextResponse.json(
          { error: 'Failed to parse uploaded backup', details: error.message },
          { status: 400 }
        );
      }
    } else {
      const body = await request.json();
      backupData = body.backupData;
      restoreResult = body.restoreResult;

      // Check if compressed data was provided
      if (body.compressedData) {
        console.log('[validate] Decompressing backup data...');
        try {
          const { decompressBackup, isGzipped } = await import('@/lib/backup-compression');

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
          console.log('[validate] Backup decompressed successfully');
        } catch (error: any) {
          console.error('[validate] Decompression failed:', error);
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

    console.log('[validate] Starting validation...');
    console.log('[validate] Backup version:', backupData.metadata?.version);
    console.log('[validate] Backup timestamp:', backupData.metadata?.timestamp);

    // Run validation
    const validationSummary = await validateBackupRestore(
      prisma,
      backupData,
      restoreResult
    );

    // Format as text report
    const report = formatValidationSummary(validationSummary);

    console.log('[validate] Validation complete:', validationSummary.overallStatus);

    return NextResponse.json({
      success: true,
      summary: validationSummary,
      report,
      message: `Validation complete: ${validationSummary.exactMatches} exact matches, ${validationSummary.expectedDifferences} expected differences, ${validationSummary.unexpectedMismatches} unexpected mismatches`
    });
  } catch (error: any) {
    console.error('[validate] Validation failed:', error);
    return NextResponse.json(
      { error: 'Failed to validate backup', details: error.message },
      { status: 500 }
    );
  }
}
