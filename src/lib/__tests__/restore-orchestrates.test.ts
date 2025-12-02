import { restoreBackupData } from '../restore-utils'
import { createProgressId, getProgress, updateProgress } from '../backup-progress'

describe('restoreBackupData orchestration', () => {
  test('orchestrates and calls onProgress per model, updating progress store', async () => {
    // Mock prisma with two models
    const calls: any[] = []
    const tx = {
      jobTitles: {
        upsert: jest.fn(async (args) => { calls.push({ model: 'jobTitles', type: 'tx.upsert', args }); return args.create })
      },
      productVariants: {
        upsert: jest.fn(async (args) => { calls.push({ model: 'productVariants', type: 'tx.upsert', args }); return args.create })
      }
    }
    const prisma: any = {
      jobTitles: {
        upsert: jest.fn(async (args) => { calls.push({ model: 'jobTitles', type: 'prisma.upsert', args }); return args.create })
      },
      productVariants: {
        upsert: jest.fn(async (args) => { calls.push({ model: 'productVariants', type: 'prisma.upsert', args }); return args.create })
      },
      $transaction: jest.fn(async (fn) => {
        return await fn(tx)
      })
    }

    const backupData: any = {
      jobTitles: [{ id: 'a' }, { id: 'b' }],
      product_variants: [{ id: 'v1' }]
    }

    const progressId = createProgressId()
    // Initialize counts like route.ts does
    const counts: Record<string, any> = {}
    for (const [k, v] of Object.entries(backupData)) {
      if (Array.isArray(v)) {
        // map jobTitles -> jobTitles, product_variants -> productVariants
        counts[k === 'product_variants' ? 'productVariants' : k] = { processed: 0, total: v.length }
      }
    }
    updateProgress(progressId, { counts })

    const onProgress = (payload: { model: string; index: number; total: number; id?: string | number | null }) => {
      updateProgress(progressId, { model: payload.model, processed: payload.index, total: payload.total, recordId: payload.id })
    }

    await restoreBackupData(prisma, backupData, { batchSize: 2, timeoutMs: 20000, onProgress })

    const p = getProgress(progressId)
    expect(p).not.toBeNull()
    // jobTitles has two entries
    expect(p?.counts?.jobTitles?.processed).toBeGreaterThanOrEqual(2)
    expect(p?.counts?.productVariants?.processed).toBeGreaterThanOrEqual(1)
  })
})
