/**
 * Streaming JSON parse for restore uploads (Increment 2 of the streaming
 * backup/restore fix - see
 * ai-contexts/project-plans/review/projectplan-NOTKT-streaming-backup-restore-2026-09-13.md).
 *
 * Builds the exact same JS object `JSON.parse` would, but fed from a
 * Readable stream instead of one fully-buffered string - avoids ever
 * holding the raw JSON text AND the parsed object in memory at the same
 * time, and (paired with the client sending the raw file directly instead
 * of re-encoding it as a JSON request body) avoids the double
 * parse/stringify round trip that previously happened in the browser tab
 * itself before the file even reached the server.
 *
 * Deliberately does NOT change how restoreCleanBackup() processes the
 * resulting object - that 1400+ line, well-tested per-table restore logic
 * is untouched. This only replaces how the object gets built.
 */
import type { Readable } from 'stream'

// stream-json is published as pure ESM ("type": "module", no CJS build) -
// this project's server code compiles to CommonJS (tsconfig.server.json),
// which cannot `require()` it directly. A plain `await import(...)` isn't
// enough on its own: with "module": "commonjs", TypeScript downlevels
// dynamic import() back into a require() call, defeating the point.
// Routing it through the Function constructor hides it from that
// downleveling, forcing a real ESM-interop dynamic import at runtime.
const dynamicImport: (specifier: string) => Promise<any> =
  new Function('specifier', 'return import(specifier)') as any

/**
 * MBM-296 follow-up: reads ONLY the backup's top-level `metadata` object,
 * without building the (potentially hundreds-of-MB) `businessData`/
 * `deviceData` payload that follows it in the file.
 *
 * Why this exists: `/api/backup/metadata` previously called the same
 * `parseJSONStream` the full restore uses — which fully materializes the
 * entire backup into memory before returning just the `metadata` slice, so
 * "quickly peek at the header" was exactly as slow as a full restore parse.
 * A user restoring a real production backup (318MB uncompressed, 81k
 * records) saw a bare spinner for a long stretch with zero feedback before
 * any progress UI could even exist, because nothing about the file was known
 * server-side until the entire thing had already been parsed.
 *
 * Uses stream-json's `pick` filter to select just the `metadata` key and
 * destroys the source stream the instant it's fully assembled — since
 * `metadata` is always written first in the file (see backup-clean.ts), this
 * only ever reads the first few KB regardless of how large the rest of the
 * backup is. Verified against a real 104MB-compressed/318MB-uncompressed
 * production backup: ~9ms vs. however long a full parse takes.
 */
export async function parseBackupMetadataOnly(readable: Readable): Promise<any> {
  const { parserStream: parser } = await dynamicImport('stream-json')
  const { pick } = await dynamicImport('stream-json/filters/pick.js')
  const { streamValues } = await dynamicImport('stream-json/streamers/stream-values.js')

  return new Promise((resolve, reject) => {
    let settled = false
    const finish = (fn: () => void) => {
      if (settled) return
      settled = true
      fn()
      // Stop reading/decompressing the rest of the (possibly huge) file —
      // this is what actually makes the read fast, not just the filtering.
      pipeline.destroy()
      readable.destroy()
    }

    const pipeline = readable
      .pipe(parser())
      .pipe(pick.asStream({ filter: 'metadata' }))
      .pipe(streamValues.asStream())

    pipeline.on('data', ({ value }: { value: unknown }) => {
      finish(() => resolve(value))
    })
    pipeline.on('error', (err: unknown) => {
      finish(() => reject(err instanceof Error ? err : new Error(String(err))))
    })
    readable.on('error', (err: unknown) => {
      finish(() => reject(err instanceof Error ? err : new Error(String(err))))
    })
    pipeline.on('end', () => {
      finish(() => reject(new Error('No "metadata" key found in backup file')))
    })
  })
}

export async function parseJSONStream(readable: Readable): Promise<any> {
  // stream-json's named `parser` export is the raw tokenizer object;
  // `parserStream` (= parser.asStream, also the module's default export) is
  // the actual factory that returns a usable Transform stream.
  const { parserStream: parser } = await dynamicImport('stream-json')
  const { default: Assembler } = await dynamicImport('stream-json/Assembler.js')

  return new Promise((resolve, reject) => {
    let settled = false
    const fail = (err: unknown) => {
      if (settled) return
      settled = true
      reject(err instanceof Error ? err : new Error(String(err)))
    }

    try {
      const pipeline = readable.pipe(parser())
      pipeline.on('error', fail)
      readable.on('error', fail)

      // This Assembler version signals completion via an onDone callback,
      // not an EventEmitter interface.
      ;(Assembler as any).connectTo(pipeline, {
        onDone: (finished: any) => {
          if (settled) return
          settled = true
          resolve(finished.current)
        }
      })
    } catch (err) {
      fail(err)
    }
  })
}
