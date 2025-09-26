// Polyfill minimal Request global so next/server imports don't crash under Jest
if (typeof global.Request === 'undefined') {
  global.Request = class Request {
    constructor(input, init) {
      this.url = typeof input === 'string' ? input : input?.url
      this.init = init
    }
    async json() { return {} }
  }
}
if (typeof global.Response === 'undefined') {
  global.Response = class Response {
    constructor(body, init) {
      this._body = body
      this.status = init?.status || 200
      this.headers = init?.headers || {}
    }
    async json() {
      if (typeof this._body === 'string') return JSON.parse(this._body)
      return this._body
    }
    text() { return Promise.resolve(typeof this._body === 'string' ? this._body : JSON.stringify(this._body)) }
  }
}

const { GET: getItems } = require('../../src/app/api/inventory/[businessId]/items/route')
const { GET: getAlerts } = require('../../src/app/api/inventory/[businessId]/alerts/route')
const { GET: getReports } = require('../../src/app/api/inventory/[businessId]/reports/route')
const { prisma } = require('../../src/lib/prisma')

jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn()
}))
const { getServerSession } = require('next-auth/next')

const BUSINESS_ID = process.env.NEXT_PUBLIC_DEMO_BUSINESS_ID || 'grocery-demo-business'

function buildReq(url) {
  return { url }
}

describe('Inventory API smoke tests', () => {
  beforeAll(async () => {
    getServerSession.mockResolvedValue({ user: { id: 'test-user', name: 'Test User' } })
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  test('GET /api/inventory/:businessId/items returns items shape', async () => {
    const req = buildReq(`http://localhost/api/inventory/${BUSINESS_ID}/items`)
    const res = await getItems(req, { params: Promise.resolve({ businessId: BUSINESS_ID }) })
    const json = await res.json()

    expect(json).toHaveProperty('items')
    expect(Array.isArray(json.items)).toBe(true)
    expect(json).toHaveProperty('pagination')

    if (json.items.length > 0) {
      const item = json.items[0]
      expect(item).toHaveProperty('id')
      expect(item).toHaveProperty('name')
      expect(item).toHaveProperty('currentStock')
    }
  })

  test('GET /api/inventory/:businessId/alerts returns alerts shape', async () => {
    const req = buildReq(`http://localhost/api/inventory/${BUSINESS_ID}/alerts`)
    const res = await getAlerts(req, { params: Promise.resolve({ businessId: BUSINESS_ID }) })
    const json = await res.json()

    expect(json).toHaveProperty('alerts')
    expect(Array.isArray(json.alerts)).toBe(true)
    expect(json).toHaveProperty('summary')
  })

  test('GET /api/inventory/:businessId/reports returns report for inventory_value', async () => {
    const req = buildReq(`http://localhost/api/inventory/${BUSINESS_ID}/reports?reportType=inventory_value`)
    const res = await getReports(req, { params: { businessId: BUSINESS_ID } })
    const json = await res.json()

    expect(json).toHaveProperty('report')
    expect(json.report).toHaveProperty('data')
    expect(json.report.data).toHaveProperty('totalInventoryValue')
  })
})
