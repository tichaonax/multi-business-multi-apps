// @ts-nocheck

/**
 * @jest-environment node
 *
 * Tests for stock-take draft submit logic
 * src/app/api/stock-take/drafts/[id]/submit/route.ts
 *
 * Critical scenarios:
 * 1. Existing item (isExistingItem=true, barcode match) → stock updated, not duplicated
 * 2. Existing item with physicalCount → stockQuantity = physicalCount + newQty
 * 3. Existing item without physicalCount → stockQuantity += newQty (increment)
 * 4. New item with real barcode, not in DB → created as new
 * 5. New item (isExistingItem=false) but barcode already in DB → deduplication: update, not create
 * 6. New item with no barcode → deduplication by name; if name exists, update
 * 7. New item with no barcode and no name match → created with random barcodeData
 */

jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('next-auth/next', () => ({ getServerSession: jest.fn() }))

jest.mock('next/server', () => ({
  NextRequest: class {
    constructor(url, options = {}) {
      this.url = url
      this.method = options.method || 'POST'
      this._body = options.body
    }
    async json() {
      return typeof this._body === 'string' ? JSON.parse(this._body) : this._body
    }
  },
  NextResponse: {
    json: (body, options) => ({ status: options?.status || 200, json: async () => body }),
  },
}))

jest.mock('@/lib/get-server-user', () => ({
  getServerUser: jest.fn(),
}))

jest.mock('@/lib/permission-utils', () => ({
  hasPermission: jest.fn().mockReturnValue(false),
  isSystemAdmin: jest.fn().mockReturnValue(false),
}))

jest.mock('crypto', () => ({
  randomBytes: jest.fn().mockReturnValue({ toString: jest.fn().mockReturnValue('mock-random') }),
}))

// ── Mock Prisma ────────────────────────────────────────────────────────────────

const mockBarcodeInventoryItems = {
  findFirst: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
}
const mockBusinessCategories = {
  findUnique: jest.fn(),
  updateMany: jest.fn(),
}
const mockBusinesses = {
  findFirst: jest.fn(),
}
const mockEmployees = {
  findMany: jest.fn(),
}
const mockStockTakeDrafts = {
  findUnique: jest.fn(),
  update: jest.fn(),
}
const mockStockTakeReports = { create: jest.fn() }
const mockStockTakeReportEmployees = { createMany: jest.fn() }
const mockCustomBulkProducts = { findFirst: jest.fn(), update: jest.fn() }
const mockClothingBales = { findFirst: jest.fn(), update: jest.fn() }

const mockTx = {
  stockTakeReports: { create: jest.fn() },
  stockTakeReportEmployees: { createMany: jest.fn() },
  stockTakeDrafts: { update: jest.fn() },
}

const mockPrisma = {
  barcodeInventoryItems: mockBarcodeInventoryItems,
  businessCategories: mockBusinessCategories,
  businesses: mockBusinesses,
  employees: mockEmployees,
  stockTakeDrafts: mockStockTakeDrafts,
  stockTakeReports: mockStockTakeReports,
  stockTakeReportEmployees: mockStockTakeReportEmployees,
  customBulkProducts: mockCustomBulkProducts,
  clothingBales: mockClothingBales,
  $queryRaw: jest.fn().mockResolvedValue([{ max_seq: 0 }]),
  $transaction: jest.fn().mockImplementation(async (fn) => {
    const report = { id: 'report-1' }
    await fn(mockTx)
    return report
  }),
}

jest.mock('@/lib/prisma', () => ({ prisma: mockPrisma }))

const { getServerUser } = require('@/lib/get-server-user')
const { POST } = require('@/app/api/stock-take/drafts/[id]/submit/route')

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeRequest(body: object) {
  const { NextRequest } = require('next/server')
  return new NextRequest('http://localhost/api/stock-take/drafts/draft-1/submit', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

const routeContext = { params: Promise.resolve({ id: 'draft-1' }) }

function makeDraft(itemOverrides: object[] = []) {
  return {
    id: 'draft-1',
    businessId: 'biz-1',
    createdById: 'user-1',
    status: 'DRAFT',
    isStockTakeMode: false,
    salesOccurredAt: null,
    lastSyncedAt: null,
    items: itemOverrides,
  }
}

function makeInventoryItem(overrides = {}) {
  return {
    id: 'inv-item-1',
    businessId: 'biz-1',
    name: 'Triple Glycerine',
    barcodeData: '6001374081514',
    stockQuantity: 10,
    quantity: 10,
    sku: 'GRO-INV-00001',
    sellingPrice: 2.5,
    ...overrides,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  getServerUser.mockResolvedValue({ id: 'user-1' })
  mockBusinesses.findFirst.mockResolvedValue({ type: 'grocery' })
  mockEmployees.findMany.mockResolvedValue([{ id: 'emp-1' }])
  mockBusinessCategories.findUnique.mockResolvedValue(null)
  mockBusinessCategories.updateMany.mockResolvedValue({})
  mockCustomBulkProducts.findFirst.mockResolvedValue(null)
  mockClothingBales.findFirst.mockResolvedValue(null)
  mockTx.stockTakeReports.create.mockResolvedValue({ id: 'report-1' })
  mockTx.stockTakeReportEmployees.createMany.mockResolvedValue({})
  mockTx.stockTakeDrafts.update.mockResolvedValue({})
})

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('POST /api/stock-take/drafts/[id]/submit', () => {

  // ── Auth / validation ────────────────────────────────────────────────────────

  it('returns 401 when not authenticated', async () => {
    getServerUser.mockResolvedValue(null)
    mockStockTakeDrafts.findUnique.mockResolvedValue(null)
    const res = await POST(makeRequest({ employeeIds: ['emp-1'] }), routeContext)
    expect(res.status).toBe(401)
  })

  it('returns 400 when no employeeIds provided', async () => {
    const res = await POST(makeRequest({ employeeIds: [] }), routeContext)
    expect(res.status).toBe(400)
  })

  it('returns 404 when draft not found', async () => {
    mockStockTakeDrafts.findUnique.mockResolvedValue(null)
    const res = await POST(makeRequest({ employeeIds: ['emp-1'] }), routeContext)
    expect(res.status).toBe(404)
  })

  it('returns 409 when draft already submitted', async () => {
    mockStockTakeDrafts.findUnique.mockResolvedValue({ ...makeDraft(), status: 'SUBMITTED' })
    const res = await POST(makeRequest({ employeeIds: ['emp-1'] }), routeContext)
    expect(res.status).toBe(409)
  })

  // ── Existing item: isExistingItem=true, barcode matches ──────────────────────

  it('updates stock for existing item without physicalCount (pure restock)', async () => {
    const existingItem = makeInventoryItem({ stockQuantity: 10 })
    mockStockTakeDrafts.findUnique.mockResolvedValue(makeDraft([{
      barcode: '6001374081514',
      name: 'Triple Glycerine',
      isExistingItem: true,
      systemQuantity: 10,
      physicalCount: null,   // no physical count = straight increment
      newQuantity: 5,
      sellingPrice: 2.5,
      costPrice: null,
      categoryId: null,
      domainId: null,
      supplierId: null,
      sku: null,
      displayOrder: 0,
    }]))
    mockBarcodeInventoryItems.findFirst.mockResolvedValue(existingItem)
    mockBarcodeInventoryItems.update.mockResolvedValue({ ...existingItem, stockQuantity: 15 })

    const res = await POST(makeRequest({ employeeIds: ['emp-1'] }), routeContext)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    // Should update: 10 (system) + 5 (new) = 15
    expect(mockBarcodeInventoryItems.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'inv-item-1' },
        data: expect.objectContaining({ stockQuantity: 15, quantity: 15 }),
      })
    )
    expect(mockBarcodeInventoryItems.create).not.toHaveBeenCalled()
  })

  it('updates stock for existing item with physicalCount (stock take mode)', async () => {
    const existingItem = makeInventoryItem({ stockQuantity: 10 })
    mockStockTakeDrafts.findUnique.mockResolvedValue(makeDraft([{
      barcode: '6001374081514',
      name: 'Triple Glycerine',
      isExistingItem: true,
      systemQuantity: 10,
      physicalCount: 8,   // physical count differs from system (2 missing)
      newQuantity: 12,    // receiving 12 new units
      sellingPrice: 2.5,
      costPrice: null,
      categoryId: null,
      domainId: null,
      supplierId: null,
      sku: null,
      displayOrder: 0,
    }]))
    mockBarcodeInventoryItems.findFirst.mockResolvedValue(existingItem)
    mockBarcodeInventoryItems.update.mockResolvedValue({ ...existingItem, stockQuantity: 20 })

    const res = await POST(makeRequest({ employeeIds: ['emp-1'] }), routeContext)

    expect(res.status).toBe(200)
    // physicalCount(8) + newQty(12) = 20
    expect(mockBarcodeInventoryItems.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ stockQuantity: 20, quantity: 20 }),
      })
    )
  })

  it('uses systemQuantity from draft (not live DB) for variance calculation', async () => {
    // The system qty recorded at scan time may differ from live DB if sales occurred
    const existingItem = makeInventoryItem({ stockQuantity: 7 }) // DB qty changed since scan
    mockStockTakeDrafts.findUnique.mockResolvedValue(makeDraft([{
      barcode: '6001374081514',
      name: 'Triple Glycerine',
      isExistingItem: true,
      systemQuantity: 10,  // qty at time of scan
      physicalCount: 9,
      newQuantity: 3,
      sellingPrice: 2.5,
      costPrice: null,
      categoryId: null,
      domainId: null,
      supplierId: null,
      sku: null,
      displayOrder: 0,
    }]))
    mockBarcodeInventoryItems.findFirst.mockResolvedValue(existingItem)
    mockBarcodeInventoryItems.update.mockResolvedValue(existingItem)

    await POST(makeRequest({ employeeIds: ['emp-1'] }), routeContext)

    // physicalCount(9) + newQty(3) = 12 — uses physicalCount, not sysQty for final stock
    expect(mockBarcodeInventoryItems.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ stockQuantity: 12 }),
      })
    )
  })

  // ── New item: isExistingItem=false, barcode NOT in DB → create ───────────────

  it('creates a new item when isExistingItem=false and barcode not found in DB', async () => {
    mockStockTakeDrafts.findUnique.mockResolvedValue(makeDraft([{
      barcode: '6009802262191',
      name: 'Mega 100g',
      isExistingItem: false,
      systemQuantity: null,
      physicalCount: null,
      newQuantity: 10,
      sellingPrice: 0.5,
      costPrice: null,
      categoryId: null,
      domainId: null,
      supplierId: null,
      sku: null,
      displayOrder: 0,
    }]))
    // No match by barcode
    mockBarcodeInventoryItems.findFirst.mockResolvedValue(null)
    mockBarcodeInventoryItems.create.mockResolvedValue({ id: 'new-inv-1' })

    const res = await POST(makeRequest({ employeeIds: ['emp-1'] }), routeContext)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(mockBarcodeInventoryItems.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Mega 100g',
          barcodeData: '6009802262191',
          stockQuantity: 10,
          quantity: 10,
          sellingPrice: 0.5,
        }),
      })
    )
    expect(mockBarcodeInventoryItems.update).not.toHaveBeenCalled()
  })

  // ── Deduplication: isExistingItem=false but barcode already in DB ────────────

  it('updates (not creates) when isExistingItem=false but barcode already exists in DB', async () => {
    // This prevents duplicates when the same draft is submitted twice or after a partial run
    const existingItem = makeInventoryItem({ stockQuantity: 5 })
    mockStockTakeDrafts.findUnique.mockResolvedValue(makeDraft([{
      barcode: '6001374081514',
      name: 'Triple Glycerine',
      isExistingItem: false,  // panel didn't flag as existing
      systemQuantity: null,
      physicalCount: null,
      newQuantity: 3,
      sellingPrice: 2.5,
      costPrice: null,
      categoryId: null,
      domainId: null,
      supplierId: null,
      sku: null,
      displayOrder: 0,
    }]))
    // Barcode IS found in DB (e.g. previously submitted)
    mockBarcodeInventoryItems.findFirst.mockResolvedValue(existingItem)
    mockBarcodeInventoryItems.update.mockResolvedValue({ ...existingItem, stockQuantity: 8 })

    const res = await POST(makeRequest({ employeeIds: ['emp-1'] }), routeContext)

    expect(res.status).toBe(200)
    // Should update existing (5 + 3 = 8), NOT create duplicate
    expect(mockBarcodeInventoryItems.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'inv-item-1' },
        data: expect.objectContaining({ stockQuantity: 8, quantity: 8 }),
      })
    )
    expect(mockBarcodeInventoryItems.create).not.toHaveBeenCalled()
  })

  // ── Deduplication by name (no barcode) ──────────────────────────────────────

  it('deduplicates by name when no barcode provided', async () => {
    const existingItem = makeInventoryItem({ stockQuantity: 20, barcodeData: 'a1b2c3d4' })
    mockStockTakeDrafts.findUnique.mockResolvedValue(makeDraft([{
      barcode: '',
      name: 'Triple Glycerine',
      isExistingItem: false,
      systemQuantity: null,
      physicalCount: null,
      newQuantity: 6,
      sellingPrice: 2.5,
      costPrice: null,
      categoryId: null,
      domainId: null,
      supplierId: null,
      sku: null,
      displayOrder: 0,
    }]))
    // No barcode → lookup by name
    mockBarcodeInventoryItems.findFirst.mockResolvedValue(existingItem)
    mockBarcodeInventoryItems.update.mockResolvedValue({ ...existingItem, stockQuantity: 26 })

    await POST(makeRequest({ employeeIds: ['emp-1'] }), routeContext)

    // Should look up by name (null barcode)
    expect(mockBarcodeInventoryItems.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { businessId: 'biz-1', name: 'Triple Glycerine' },
      })
    )
    expect(mockBarcodeInventoryItems.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ stockQuantity: 26 }),
      })
    )
    expect(mockBarcodeInventoryItems.create).not.toHaveBeenCalled()
  })

  it('creates new item with random barcodeData when no barcode and no name match', async () => {
    mockStockTakeDrafts.findUnique.mockResolvedValue(makeDraft([{
      barcode: '',
      name: 'Brand New Product',
      isExistingItem: false,
      systemQuantity: null,
      physicalCount: null,
      newQuantity: 5,
      sellingPrice: 1.0,
      costPrice: null,
      categoryId: null,
      domainId: null,
      supplierId: null,
      sku: null,
      displayOrder: 0,
    }]))
    mockBarcodeInventoryItems.findFirst.mockResolvedValue(null)
    mockBarcodeInventoryItems.create.mockResolvedValue({ id: 'new-inv-2' })

    await POST(makeRequest({ employeeIds: ['emp-1'] }), routeContext)

    expect(mockBarcodeInventoryItems.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Brand New Product',
          barcodeData: 'mock-random', // random fallback
          stockQuantity: 5,
        }),
      })
    )
  })

  // ── Multiple items mixed ─────────────────────────────────────────────────────

  it('handles batch of mixed new and existing items correctly', async () => {
    mockStockTakeDrafts.findUnique.mockResolvedValue(makeDraft([
      // Item A: existing in DB by barcode (isExistingItem=true)
      {
        barcode: '1111111111111',
        name: 'Product A',
        isExistingItem: true,
        systemQuantity: 5,
        physicalCount: null,
        newQuantity: 10,
        sellingPrice: 1.0,
        costPrice: null,
        categoryId: null,
        domainId: null,
        supplierId: null,
        sku: null,
        displayOrder: 0,
      },
      // Item B: genuinely new item (not in DB)
      {
        barcode: '2222222222222',
        name: 'Product B',
        isExistingItem: false,
        systemQuantity: null,
        physicalCount: null,
        newQuantity: 7,
        sellingPrice: 2.0,
        costPrice: null,
        categoryId: null,
        domainId: null,
        supplierId: null,
        sku: null,
        displayOrder: 1,
      },
    ]))

    // First call (Product A, isExistingItem=true): returns existing
    // Second call (Product B, isExistingItem=false): returns null (new)
    mockBarcodeInventoryItems.findFirst
      .mockResolvedValueOnce(makeInventoryItem({ id: 'inv-a', barcodeData: '1111111111111', stockQuantity: 5 }))
      .mockResolvedValueOnce(null)

    mockBarcodeInventoryItems.update.mockResolvedValue({})
    mockBarcodeInventoryItems.create.mockResolvedValue({ id: 'inv-b' })

    const res = await POST(makeRequest({ employeeIds: ['emp-1'] }), routeContext)
    expect(res.status).toBe(200)

    // Product A updated: 5 + 10 = 15
    expect(mockBarcodeInventoryItems.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'inv-a' },
        data: expect.objectContaining({ stockQuantity: 15 }),
      })
    )
    // Product B created
    expect(mockBarcodeInventoryItems.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: 'Product B', stockQuantity: 7 }),
      })
    )
  })

  // ── Report creation ──────────────────────────────────────────────────────────

  it('creates a StockTakeReport after processing items', async () => {
    mockStockTakeDrafts.findUnique.mockResolvedValue(makeDraft([{
      barcode: '6001374081514',
      name: 'Triple Glycerine',
      isExistingItem: false,
      systemQuantity: null,
      physicalCount: null,
      newQuantity: 1,
      sellingPrice: 2.5,
      costPrice: null,
      categoryId: null,
      domainId: null,
      supplierId: null,
      sku: null,
      displayOrder: 0,
    }]))
    mockBarcodeInventoryItems.findFirst.mockResolvedValue(null)
    mockBarcodeInventoryItems.create.mockResolvedValue({ id: 'new-inv-1' })

    await POST(makeRequest({ employeeIds: ['emp-1'] }), routeContext)

    expect(mockTx.stockTakeReports.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          businessId: 'biz-1',
          draftId: 'draft-1',
          status: 'PENDING_SIGNOFF',
        }),
      })
    )
    expect(mockTx.stockTakeDrafts.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'SUBMITTED' }),
      })
    )
  })
})
