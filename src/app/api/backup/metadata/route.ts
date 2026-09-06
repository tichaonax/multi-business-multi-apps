import { NextRequest, NextResponse } from 'next/server';
import { decompressBackup, isGzipped } from '@/lib/backup-compression';
import { getServerUser } from '@/lib/get-server-user'

/**
 * POST /api/backup/metadata
 *
 * Reads and returns just a backup file's `metadata` block — used by the
 * "Create Incremental Backup" flow (Phase 5, MBM-294 §3.5) to read the base
 * full backup's own `timestamp`/`sourceNodeId` without running it through
 * the much heavier full-DB comparison `/api/backup/validate` does.
 *
 * Body: { backupData } for uncompressed JSON, or { compressedData } (base64) for .json.gz
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    let backupData = body.backupData;

    if (body.compressedData) {
      const compressedBuffer = Buffer.from(body.compressedData, 'base64');
      if (!isGzipped(compressedBuffer)) {
        return NextResponse.json({ error: 'Invalid compressed data - not a gzip file' }, { status: 400 });
      }
      backupData = await decompressBackup(compressedBuffer);
    }

    if (!backupData?.metadata) {
      return NextResponse.json({ error: 'No backup metadata found' }, { status: 400 });
    }

    return NextResponse.json({ metadata: backupData.metadata });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to read backup metadata', details: error.message },
      { status: 500 }
    );
  }
}
