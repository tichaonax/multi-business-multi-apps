import { normalizeWhere } from '../prisma-extension'

describe('normalizeWhere', () => {
  test('returns inner object for composite alias where', () => {
    const where = { businessId_name: { businessId: 'b123', name: 'foo' } }
    expect(normalizeWhere(where)).toEqual({ businessId: 'b123', name: 'foo' })
  })

  test('returns unchanged for simple where with id', () => {
    const where = { id: 'abc123' }
    expect(normalizeWhere(where)).toEqual({ id: 'abc123' })
  })

  test('returns unchanged when there are multiple keys', () => {
    const where = { businessId: 'b123', name: 'foo' }
    expect(normalizeWhere(where)).toEqual({ businessId: 'b123', name: 'foo' })
  })
})
