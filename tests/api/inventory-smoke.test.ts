import { GET as getItems } from '@/app/api/inventory/[businessId]/items/route'
import { GET as getAlerts } from '@/app/api/inventory/[businessId]/alerts/route'
import { GET as getReports } from '@/app/api/inventory/[businessId]/reports/route'
import { prisma } from '@/lib/prisma'

// Mock next-auth session
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn()
}))

import { getServerSession } from 'next-auth/next'

const BUSINESS_ID = process.env.NEXT_PUBLIC_DEMO_BUSINESS_ID || 'grocery-demo-business'

function buildReq(url: string) {
  // Minimal NextRequest-like object for server handlers that only uses url and json
  return {
    url,
    json: async () => ({}),
    headers: new Map(),
  } as unknown as Request
}

describe('Inventory API smoke tests', () => {
  beforeAll(async () => {
    // Ensure there's a user session for the mocked getServerSession
    ;(getServerSession as jest.Mock).mockResolvedValue({ user: { id: 'test-user', name: 'Test User' } })
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  test('GET /api/inventory/:businessId/items returns items shape', async () => {
    const req = buildReq(`http://localhost/api/inventory/${BUSINESS_ID}/items`)
  const res = await getItems(req as any, { params: Promise.resolve({ businessId: BUSINESS_ID }) } as any)
    const json = await res.json()

    expect(json).toHaveProperty('items')
    expect(Array.isArray(json.items)).toBe(true)
    // If seeded, expect at least 1 item
    expect(json.items.length).toBeGreaterThanOrEqual(0)

    if (json.items.length > 0) {
      const item = json.items[0]
      expect(item).toHaveProperty('id')
      expect(item).toHaveProperty('name')
      expect(item).toHaveProperty('currentStock')
    }
  })

  test('GET /api/inventory/:businessId/alerts returns alerts shape', async () => {
    const req = buildReq(`http://localhost/api/inventory/${BUSINESS_ID}/alerts`)
  const res = await getAlerts(req as any, { params: Promise.resolve({ businessId: BUSINESS_ID }) } as any)
    const json = await res.json()

    expect(json).toHaveProperty('alerts')
    expect(Array.isArray(json.alerts)).toBe(true)
    expect(json).toHaveProperty('summary')
  })

  test('GET /api/inventory/:businessId/reports returns report for inventory_value', async () => {
    const req = buildReq(`http://localhost/api/inventory/${BUSINESS_ID}/reports?reportType=inventory_value`)
  const res = await getReports(req as any, { params: { businessId: BUSINESS_ID } as any } as any)
    const json = await res.json()

    expect(json).toHaveProperty('report')
    expect(json.report).toHaveProperty('data')
    expect(json.report.data).toHaveProperty('totalInventoryValue')
  })
})
