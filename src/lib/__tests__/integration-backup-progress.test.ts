import fs from 'fs'
import path from 'path'
import { restoreBackupData } from '../restore-utils'
import { createProgressId, updateProgress, getProgress } from '../backup-progress'

jest.setTimeout(120000)

describe('integration: restore progress updates with real backup file', () => {
  test('progress should update counts while restoring large backup', async () => {
    const filePath = path.resolve('C:\\Users\\ticha\\apps\\multi-business-multi-apps\\Fix-Backup-File.json')
    if (!fs.existsSync(filePath)) {
      console.warn('Test backup file not present; skipping integration test')
      return
    }

    const raw = fs.readFileSync(filePath, { encoding: 'utf-8' })
    const backupData = JSON.parse(raw)

    const progressId = createProgressId()

    // Initialize counts
    const counts: Record<string, { processed?: number; total?: number }> = {}
    for (const [k, v] of Object.entries(backupData)) {
      if (Array.isArray(v)) counts[k] = { processed: 0, total: v.length }
    }
    updateProgress(progressId, { counts })

    // Mock prisma: provide an upsert method that delays so we can observe progress
    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
    // Proxy that returns handlers for any key
    const prisma: any = new Proxy({}, {
      get: function(obj, prop: string) {
        if (prop === '$transaction') {
          return async (fn: any) => {
            // Provide a tx object with same methods
            const txProxy: any = new Proxy({}, {
                get: function(o, p: string) {
                  return {
                    upsert: async function({ where, create, update }: any) { await sleep(3); return create },
                    create: async function({ data }: any) { await sleep(3); return data }
                  }
                }
              })
            return await fn(txProxy)
          }
        }
        return {
          // upsert method
          upsert: async function({ where, create, update }: any) {
            // simulate delay and success
            await sleep(3)
            return create
          },
          create: async function({ data }: any) { await sleep(3); return data }
        }
      }
    })

    const processedEvents: string[] = []

    const onProgress = (payload: { model: string; index: number; total: number; id?: string | number | null }) => {
      processedEvents.push(`${payload.model}:${payload.index}`)
      try {
        updateProgress(progressId, { model: payload.model, processed: payload.index, total: payload.total, recordId: payload.id })
      } catch (e) { }
    }

    // Run restore in background
    const promise = restoreBackupData(prisma, backupData, { batchSize: 50, timeoutMs: 60_000, onProgress })
    let done = false
    promise.then(() => { done = true }).catch(() => { done = true })

    // Poll progress while restore runs, collect snapshots
    const snapshots: any[] = []
    const start = Date.now()
    while (Date.now() - start < 10000 && !done) {
      const p = getProgress(progressId)
      snapshots.push(p)
      if (processedEvents.length > 10) break
      await new Promise(resolve => setTimeout(resolve, 50))
    }

    await promise

    const final = getProgress(progressId)
    // Ensure there were some in-flight snapshots that show increasing processed counts
    const nonZeroSnapshots = snapshots.filter(s => s?.counts && Object.values(s.counts).some(c => (c.processed ?? 0) > 0))
    expect(nonZeroSnapshots.length).toBeGreaterThanOrEqual(1)
    expect(final).not.toBeNull()
    expect(Object.values(final.counts ?? {}).some((c: any) => (c.processed ?? 0) > 0)).toBeTruthy()
  })
})
