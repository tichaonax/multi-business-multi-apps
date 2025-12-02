import { restoreBackupData } from '../restore-utils'

describe('restoreBackupData duplicates skip', () => {
  test('skips duplicate model keys (snake vs camel vs catch-all) and only upserts once per resolved Prisma model', async () => {
    const calls: any[] = []
    const tx = {
      productVariants: {
        upsert: jest.fn(async (args) => { calls.push({ model: 'productVariants', type: 'tx.upsert', args }); return args.create })
      }
    }
    const prisma: any = {
      productVariants: {
        upsert: jest.fn(async (args) => { calls.push({ model: 'productVariants', type: 'prisma.upsert', args }); return args.create })
      },
      $transaction: jest.fn(async (fn) => { return await fn(tx) })
    }

    const backupData: any = {
      productVariants: [{ id: 'v1' }],
      product_variants: [{ id: 'v1' }],
      // another key that resolves to same model (e.g., via heuristics)
      'productvariants': [{ id: 'v1' }]
    }

    await restoreBackupData(prisma, backupData, { batchSize: 2, timeoutMs: 20000 })

    // We expect upsert for productVariants to have been called once (or per-batch at least once but not multiple times for duplicates)
    const upserts = calls.filter(c => c.model === 'productVariants' && (c.type === 'tx.upsert' || c.type === 'prisma.upsert'))
    expect(upserts.length).toBeGreaterThanOrEqual(1)
    // But any duplicates should not cause multiple separate batches for the same resolved model
    expect(upserts.length).toBe(1)
  })
})
