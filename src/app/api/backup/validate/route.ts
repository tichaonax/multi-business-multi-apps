import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { validateBackupRestore, formatValidationSummary } from '@/lib/backup-validation';

/**
 * POST /api/backup/validate - Validate backup against current database
 *
 * Body:
 * - { backupData: <backup object> } - For uncompressed JSON backups
 * - { compressedData: <base64 string> } - For compressed .json.gz backups
 * - { restoreResult: <restore result object> } - Optional restore result for better validation
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    let backupData = body.backupData;

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
      body.restoreResult
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
