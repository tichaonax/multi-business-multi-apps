import { restoreBackupData } from '../restore-utils'
import { createProgressId, getProgress } from '../backup-progress'

describe('retry failed rows for FK errors', () => {
  test('should retry failed productVariants once product is upserted', async () => {
    const calls: any[] = []
    let productUpserted = false
    let firstVariantAttempt = true

    // Mock tx and prisma
    const tx = {
      businessProducts: {
        upsert: jest.fn(async (args) => { calls.push({ model: 'businessProducts', type: 'tx.upsert', args }); productUpserted = true; return args.create })
      },
      productVariants: {
        upsert: jest.fn(async (args) => {
          calls.push({ model: 'productVariants', type: 'tx.upsert', args });
          if (firstVariantAttempt) { firstVariantAttempt = false; throw new Error('Foreign key constraint violated: productId') }
          return args.create
        })
      }
    }

    const prisma: any = {
      businessProducts: {
        upsert: jest.fn(async (args) => { calls.push({ model: 'businessProducts', type: 'prisma.upsert', args }); productUpserted = true; return args.create })
      },
      productVariants: {
        upsert: jest.fn(async (args) => { calls.push({ model: 'productVariants', type: 'prisma.upsert', args }); return args.create })
      },
      $transaction: jest.fn(async (fn) => {
        return await fn(tx)
      })
    }

    const backupData: any = {
      businessProducts: [{ id: 'p1', name: 'Prod 1' }],
      productVariants: [{ id: 'v1', productId: 'p1' }]
    }

    const progressId = createProgressId()
    const onProgress = (payload: { model: string; index: number; total: number; id?: string | number | null }) => {
      // call update via file store directly for assertion
    }

    await restoreBackupData(prisma, backupData, { batchSize: 2, timeoutMs: 20000, onProgress })

    // After the restore, we should have tried to upsert productVariants; first try fails, but retry should succeed
    const prodUpserts = calls.filter(c => c.model === 'businessProducts')
    const varUpserts = calls.filter(c => c.model === 'productVariants' && (c.type === 'prisma.upsert' || c.type === 'tx.upsert'))

    expect(prodUpserts.length).toBeGreaterThan(0)
    expect(varUpserts.length).toBeGreaterThanOrEqual(2) // one failure attempt and one retry
  })
})
