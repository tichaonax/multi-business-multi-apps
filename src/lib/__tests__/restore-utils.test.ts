import { upsertModelInBatches } from '../restore-utils'

describe('upsertModelInBatches', () => {
  test('falls back to per-row upsert when transaction fails and continues processing', async () => {
    const calls: any[] = []

    // Mock prisma and tx implementations
    const tx = {
      testModel: {
        create: jest.fn(async (args) => { calls.push({ type: 'tx.create', args }); return { id: args.data.id } }),
        upsert: jest.fn(async (args) => {
          calls.push({ type: 'tx.upsert', args })
          if (args.where.id === 'bad') {
            throw new Error('tx abort: bad row')
          }
          return args.create
        }),
      }
    }

    const prisma = {
      testModel: {
        create: jest.fn(async (args) => { calls.push({ type: 'prisma.create', args }); return { id: args.data.id } }),
        upsert: jest.fn(async (args) => { calls.push({ type: 'prisma.upsert', args }); return args.create }),
      },
      $transaction: jest.fn(async (fn) => {
        // Execute the provided function with the tx object
        return await fn(tx)
      })
    }

    const items = [ { id: '1', name: 'one' }, { id: 'bad', name: 'bad' }, { id: '2', name: 'two' } ]
    const progress: any[] = []
    const errors: any[] = []

    await upsertModelInBatches(prisma as any, 'testModel', items as any[], 2, 20000,
      (payload) => { progress.push(payload) },
      (err) => { errors.push(err) }
    )

    // After upsert, we expect:
    // - tx.upsert called for id '1' and 'bad' within tx
    // - tx.upsert threw on 'bad', causing fallback
    // - fallback prisma.upsert called for each row in the batch
    // - progress should contain three entries for three rows total
    expect(progress.length).toBe(items.length)
    expect(errors.length).toBeGreaterThanOrEqual(1)
    expect(calls.find(c=> c.type === 'tx.upsert' && c.args.where.id === 'bad')).toBeTruthy()
    expect(calls.find(c=> c.type === 'prisma.upsert' && c.args.where.id === '1')).toBeTruthy()
  })

  test('processes without fallback when transaction succeeds and reports progress once', async () => {
    const calls: any[] = []
    const tx = {
      testModel: {
        create: jest.fn(async (args) => { calls.push({ type: 'tx.create', args }); return { id: args.data.id } }),
        upsert: jest.fn(async (args) => { calls.push({ type: 'tx.upsert', args }); return args.create }),
      }
    }
    const prisma = {
      testModel: {
        create: jest.fn(async (args) => { calls.push({ type: 'prisma.create', args }); return { id: args.data.id } }),
        upsert: jest.fn(async (args) => { calls.push({ type: 'prisma.upsert', args }); return args.create }),
      },
      $transaction: jest.fn(async (fn) => {
        return await fn(tx)
      })
    }

    const items = [ { id: '1', name: 'one' }, { id: '2', name: 'two' }, { id: '3', name: 'three' } ]
    const progress: any[] = []
    const errors: any[] = []

    await upsertModelInBatches(prisma as any, 'testModel', items as any[], 2, 20000,
      (payload) => { progress.push(payload) },
      (err) => { errors.push(err) }
    )

    expect(progress.length).toBe(items.length)
    expect(errors.length).toBe(0)
    expect(calls.find(c=> c.type === 'tx.upsert' && c.args.where.id === '1')).toBeTruthy()
    expect(calls.find(c=> c.type === 'prisma.upsert')).toBeFalsy()
  })
})
