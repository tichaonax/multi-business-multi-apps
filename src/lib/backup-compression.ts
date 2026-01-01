/**
 * Backup Compression Utilities
 * Handles compression and decompression of backup files using gzip
 */

import { promisify } from 'util'
import { gzip, gunzip } from 'zlib'
import { BackupData } from './backup-clean'

const gzipAsync = promisify(gzip)
const gunzipAsync = promisify(gunzip)

/**
 * Compress backup data to gzip format
 * Returns Buffer that can be saved as .json.gz file
 */
export async function compressBackup(backupData: BackupData): Promise<Buffer> {
  // Convert backup data to JSON string (no indentation for compression)
  const jsonString = JSON.stringify(backupData, null, 0)

  // Get uncompressed size from metadata (already calculated)
  const uncompressedSize = backupData.metadata.stats.uncompressedSize

  // Compress using gzip
  const compressed = await gzipAsync(jsonString)

  // Log compression stats
  const compressionRatio = calculateCompressionRatio(uncompressedSize, compressed.length)
  console.log(`Backup compressed: ${formatBytes(uncompressedSize)} → ${formatBytes(compressed.length)} (${compressionRatio}% reduction)`)

  return compressed
}

/**
 * Decompress gzipped backup file
 * Returns parsed BackupData object
 */
export async function decompressBackup(compressedBuffer: Buffer): Promise<BackupData> {
  try {
    // Decompress
    const decompressed = await gunzipAsync(compressedBuffer)

    // Parse JSON
    const jsonString = decompressed.toString('utf8')
    const backupData: BackupData = JSON.parse(jsonString)

    return backupData
  } catch (error) {
    throw new Error(`Failed to decompress backup: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Check if a file is gzipped by examining magic bytes
 */
export function isGzipped(buffer: Buffer): boolean {
  // Gzip files start with magic bytes: 0x1f 0x8b
  return buffer.length >= 2 && buffer[0] === 0x1f && buffer[1] === 0x8b
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

/**
 * Calculate compression ratio
 */
export function calculateCompressionRatio(
  uncompressedSize: number,
  compressedSize: number
): number {
  if (uncompressedSize === 0) return 0
  return parseFloat(((1 - (compressedSize / uncompressedSize)) * 100).toFixed(2))
}

/**
 * Estimate compressed size (rough estimate based on typical JSON compression)
 * Useful for UI progress indicators before compression starts
 */
export function estimateCompressedSize(uncompressedSize: number): number {
  // Typical JSON gzip compression achieves 80-90% reduction
  // Use 85% as conservative estimate
  return Math.floor(uncompressedSize * 0.15)
}
