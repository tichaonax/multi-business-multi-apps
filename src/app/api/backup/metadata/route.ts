import { NextRequest, NextResponse } from 'next/server';
import { Readable } from 'stream';
import { createGunzip } from 'zlib';
import { decompressBackup, isGzipped } from '@/lib/backup-compression';
import { parseBackupMetadataOnly } from '@/lib/backup-stream-parse';
import { getServerUser } from '@/lib/get-server-user'

export const runtime = 'nodejs';
export const maxDuration = 300;

/**
 * POST /api/backup/metadata
 *
 * Reads and returns just a backup file's `metadata` block — used by the
 * "Create Incremental Backup" flow (Phase 5, MBM-294 §3.5) to read the base
 * full backup's own `timestamp`/`sourceNodeId` without running it through
 * the much heavier full-DB comparison `/api/backup/validate` does.
 *
 * Streaming upload (preferred, see
 * ai-contexts/project-plans/review/projectplan-NOTKT-streaming-backup-restore-2026-09-13.md):
 * header `x-restore-stream: true`, raw file body, `x-restore-compressed: true` if gzipped.
 * Legacy body (still supported): { backupData } or { compressedData } (base64).
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let metadata: any;

    if (request.headers.get('x-restore-stream') === 'true') {
      const nodeStream = Readable.fromWeb(request.body as any);
      const isCompressed = request.headers.get('x-restore-compressed') === 'true';
      const source = isCompressed ? nodeStream.pipe(createGunzip()) : nodeStream;
      // Fast path: reads only the metadata block (typically a few KB),
      // never the potentially hundreds-of-MB businessData/deviceData payload
      // that follows it — see parseBackupMetadataOnly's own doc comment.
      metadata = await parseBackupMetadataOnly(source);
    } else {
      const body = await request.json();
      let backupData = body.backupData;

      if (body.compressedData) {
        const compressedBuffer = Buffer.from(body.compressedData, 'base64');
        if (!isGzipped(compressedBuffer)) {
          return NextResponse.json({ error: 'Invalid compressed data - not a gzip file' }, { status: 400 });
        }
        backupData = await decompressBackup(compressedBuffer);
      }
      metadata = backupData?.metadata;
    }

    if (!metadata) {
      return NextResponse.json({ error: 'No backup metadata found' }, { status: 400 });
    }

    return NextResponse.json({ metadata });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to read backup metadata', details: error.message },
      { status: 500 }
    );
  }
}
