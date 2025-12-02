import { createProgressId, updateProgress, getProgress } from '../backup-progress'
import { findPrismaModelName } from '../restore-utils'

describe('backup route progress initiation', () => {
  test('initializes counts using resolved Prisma model names', () => {
    const prisma: any = { productVariants: {}, jobTitles: {}, users: {} }
    const backupData: any = {
      product_variants: [{ id: 1 }, { id: 2 }],
      jobTitles: [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
    }

    const progressId = createProgressId()

    const counts: Record<string, { processed?: number; total?: number }> = {}
    for (const [k, v] of Object.entries(backupData)) {
      if (Array.isArray(v)) {
        const resolved = findPrismaModelName(prisma, k)
        counts[resolved] = { processed: 0, total: v.length }
      }
    }

    updateProgress(progressId, { counts })
    const p = getProgress(progressId)
    expect(p).not.toBeNull()
    expect(p?.counts?.productVariants?.total).toBe(2)
    expect(p?.counts?.jobTitles?.total).toBe(3)
  })
})
