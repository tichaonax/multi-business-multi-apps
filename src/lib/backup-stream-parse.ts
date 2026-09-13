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
