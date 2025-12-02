import { findPrismaModelName } from '../restore-utils'

describe('findPrismaModelName', () => {
  test('maps snake_case to camelCase Prisma model', () => {
    const prisma: any = { productVariants: {}, jobTitles: {}, users: {} }
    expect(findPrismaModelName(prisma, 'product_variants')).toBe('productVariants')
    expect(findPrismaModelName(prisma, 'productVariants')).toBe('productVariants')
    expect(findPrismaModelName(prisma, 'job_titles')).toBe('jobTitles')
    expect(findPrismaModelName(prisma, 'users')).toBe('users')
  })
})
