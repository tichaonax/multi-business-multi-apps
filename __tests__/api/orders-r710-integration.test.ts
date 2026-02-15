// @ts-nocheck

/**
 * @jest-environment node
 *
 * Tests for R710 token generation integration in orders POST handler
 * src/app/api/universal/orders/route.ts
 *
 * Validates that R710 token items call generateAndSellR710Token correctly
 * and handle success/failure scenarios.
 */

if (typeof globalThis.Request !== 'undefined') {
  global.Request = globalThis.Request
  global.Response = globalThis.Response
  global.Headers = globalThis.Headers
}

jest.mock('@/lib/auth', () => ({
  authOptions: {},
}))

jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}))

jest.mock('next/server', () => ({
  NextRequest: class {
    constructor(url, options = {}) {
      this.url = url
      this.method = options.method || 'POST'
      this._body = options.body
      this._searchParams = new URLSearchParams(url.split('?')[1] || '')
    }
    get nextUrl() {
      return { searchParams: this._searchParams }
    }
    async json() {
      return typeof this._body === 'string' ? JSON.parse(this._body) : this._body
    }
  },
  NextResponse: {
    json: (body, options) => ({
      status: options?.status || 200,
      json: async () => body,
    }),
  },
}))

jest.mock('@/lib/permission-utils', () => ({
  hasPermission: jest.fn().mockReturnValue(true),
  isSystemAdmin: jest.fn().mockReturnValue(false),
  getUserRoleInBusiness: jest.fn().mockReturnValue('business-manager'),
  SessionUser: {},
}))

jest.mock('@/lib/business-balance-utils', () => ({
  processBusinessTransaction: jest.fn().mockResolvedValue({}),
  initializeBusinessAccount: jest.fn().mockResolvedValue({}),
}))

const mockGenerateAndSellR710Token = jest.fn()
jest.mock('@/lib/r710/generate-and-sell-token', () => ({
  generateAndSellR710Token: mockGenerateAndSellR710Token,
}))

jest.mock('crypto', () => ({
  randomBytes: jest.fn().mockReturnValue({
    toString: jest.fn().mockReturnValue('abcdef1234')
  }),
}))

// Mock prisma with $transaction that executes the callback
const mockPrisma = {
  businesses: {
    findUnique: jest.fn(),
  },
  businessCustomers: {
    findFirst: jest.fn(),
  },
  customerDivisionAccount: {
    findFirst: jest.fn(),
  },
  employees: {
    findUnique: jest.fn(),
  },
  productVariants: {
    findMany: jest.fn(),
  },
  businessProducts: {
    findMany: jest.fn(),
  },
  businessOrders: {
    count: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    aggregate: jest.fn(),
  },
  businessOrderItems: {
    create: jest.fn(),
  },
  product_variants: {
    update: jest.fn(),
  },
  businessStockMovements: {
    create: jest.fn(),
  },
  wifiTokens: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  $transaction: jest.fn(),
}

jest.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

const { getServerSession } = require('next-auth/next')
const { POST } = require('@/app/api/universal/orders/route')

// -- Helpers --

function mockSession() {
  return {
    user: {
      id: 'user-1',
      email: 'test@test.com',
      name: 'Test User',
      role: 'USER',
      businesses: [{ businessId: 'biz-1', role: 'business-manager' }],
    },
  }
}

function createPostRequest(body) {
  const { NextRequest } = require('next/server')
  return new NextRequest('http://localhost/api/universal/orders', {
    method: 'POST',
    body,
  })
}

function mockR710TokenSaleResult(overrides = {}) {
  return {
    success: true,
    token: {
      id: 'token-1',
      username: 'DS-260214-120000-ABC',
      password: 'guest-pass-123',
      tokenConfigId: 'config-1',
      status: 'SOLD',
      expiresAt: new Date('2026-02-15T12:00:00Z'),
      createdAt: new Date(),
      tokenConfig: {
        name: '1 Hour WiFi',
        durationValue: 1,
        durationUnit: 'hour_Hours',
        deviceLimit: 2,
      },
    },
    sale: {
      id: 'sale-1',
      saleAmount: 5,
      paymentMethod: 'CASH',
      soldAt: new Date(),
    },
    wlanSsid: 'MyWiFi',
    ...overrides,
  }
}

describe('POST /api/universal/orders - R710 Token Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    getServerSession.mockResolvedValue(mockSession())

    mockPrisma.businesses.findUnique.mockResolvedValue({
      id: 'biz-1',
      name: 'Test Clothing',
      type: 'clothing',
    })

    mockPrisma.businessProducts.findMany.mockResolvedValue([])
    mockPrisma.productVariants.findMany.mockResolvedValue([])
    mockPrisma.businessOrders.count.mockResolvedValue(0)

    // Mock $transaction to execute the callback and return its result
    mockPrisma.$transaction.mockImplementation(async (callback, options) => {
      const tx = {
        businessOrders: {
          create: jest.fn().mockResolvedValue({
            id: 'order-new-1',
            orderNumber: 'CLO-20260214-0001',
            businessId: 'biz-1',
            businessType: 'clothing',
            status: 'COMPLETED',
            paymentStatus: 'PAID',
            totalAmount: 5,
            subtotal: 5,
            taxAmount: 0,
            discountAmount: 0,
            attributes: {},
          }),
          count: jest.fn().mockResolvedValue(0),
        },
        businessOrderItems: {
          create: jest.fn().mockResolvedValue({
            id: 'item-new-1',
            quantity: 1,
            unitPrice: 5,
          }),
        },
        product_variants: {
          update: jest.fn().mockResolvedValue({}),
        },
        businessStockMovements: {
          create: jest.fn().mockResolvedValue({}),
        },
        wifiTokens: {
          findFirst: jest.fn().mockResolvedValue(null),
          update: jest.fn(),
        },
      }
      return await callback(tx)
    })
  })

  it('calls generateAndSellR710Token for R710 token items with tx', async () => {
    mockGenerateAndSellR710Token.mockResolvedValue(mockR710TokenSaleResult())

    const req = createPostRequest({
      businessId: 'biz-1',
      businessType: 'clothing',
      paymentMethod: 'CASH',
      status: 'COMPLETED',
      paymentStatus: 'PAID',
      items: [
        {
          productVariantId: null,
          quantity: 1,
          unitPrice: 5,
          attributes: {
            r710Token: true,
            tokenConfigId: 'config-1',
            productName: '1 Hour WiFi',
          },
        },
      ],
    })

    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body.success).toBe(true)

    // Should have called generateAndSellR710Token with correct params
    expect(mockGenerateAndSellR710Token).toHaveBeenCalledTimes(1)
    expect(mockGenerateAndSellR710Token).toHaveBeenCalledWith(
      expect.objectContaining({
        businessId: 'biz-1',
        tokenConfigId: 'config-1',
        saleAmount: 5,
        paymentMethod: 'CASH',
        soldBy: 'user-1',
        saleChannel: 'POS',
      }),
      expect.anything() // tx object
    )

    // Should include R710 tokens in the response
    expect(body.data.r710Tokens).toBeDefined()
    expect(body.data.r710Tokens).toHaveLength(1)
    expect(body.data.r710Tokens[0].success).toBe(true)
    expect(body.data.r710Tokens[0].username).toBe('DS-260214-120000-ABC')
    expect(body.data.r710Tokens[0].password).toBe('guest-pass-123')
  })

  it('generates multiple tokens for quantity > 1', async () => {
    mockGenerateAndSellR710Token
      .mockResolvedValueOnce(mockR710TokenSaleResult())
      .mockResolvedValueOnce(mockR710TokenSaleResult({
        token: {
          ...mockR710TokenSaleResult().token,
          id: 'token-2',
          username: 'DS-260214-120001-DEF',
          password: 'guest-pass-456',
        },
      }))

    const req = createPostRequest({
      businessId: 'biz-1',
      businessType: 'clothing',
      paymentMethod: 'CASH',
      status: 'COMPLETED',
      paymentStatus: 'PAID',
      items: [
        {
          productVariantId: null,
          quantity: 2,
          unitPrice: 5,
          attributes: {
            r710Token: true,
            tokenConfigId: 'config-1',
            productName: '1 Hour WiFi',
          },
        },
      ],
    })

    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(mockGenerateAndSellR710Token).toHaveBeenCalledTimes(2)
    expect(body.data.r710Tokens).toHaveLength(2)
  })

  it('handles missing tokenConfigId gracefully', async () => {
    const req = createPostRequest({
      businessId: 'biz-1',
      businessType: 'clothing',
      paymentMethod: 'CASH',
      status: 'COMPLETED',
      paymentStatus: 'PAID',
      items: [
        {
          productVariantId: null,
          quantity: 1,
          unitPrice: 5,
          attributes: {
            r710Token: true,
            // No tokenConfigId!
            productName: '1 Hour WiFi',
          },
        },
      ],
    })

    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(201)

    // Should NOT call generateAndSellR710Token
    expect(mockGenerateAndSellR710Token).not.toHaveBeenCalled()

    // Should include error token in response
    expect(body.data.r710Tokens).toHaveLength(1)
    expect(body.data.r710Tokens[0].success).toBe(false)
    expect(body.data.r710Tokens[0].error).toContain('Missing token configuration ID')
  })

  it('handles device generation failure gracefully', async () => {
    mockGenerateAndSellR710Token.mockRejectedValue(
      new Error('No active R710 integration or device found for this business')
    )

    const req = createPostRequest({
      businessId: 'biz-1',
      businessType: 'clothing',
      paymentMethod: 'CASH',
      status: 'COMPLETED',
      paymentStatus: 'PAID',
      items: [
        {
          productVariantId: null,
          quantity: 1,
          unitPrice: 5,
          attributes: {
            r710Token: true,
            tokenConfigId: 'config-1',
            productName: '1 Hour WiFi',
          },
        },
      ],
    })

    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body.data.r710Tokens).toHaveLength(1)
    expect(body.data.r710Tokens[0].success).toBe(false)
    expect(body.data.r710Tokens[0].error).toContain('No active R710 integration')
  })

  it('passes tx to generateAndSellR710Token for transaction participation', async () => {
    mockGenerateAndSellR710Token.mockResolvedValue(mockR710TokenSaleResult())

    const req = createPostRequest({
      businessId: 'biz-1',
      businessType: 'clothing',
      paymentMethod: 'CASH',
      status: 'COMPLETED',
      paymentStatus: 'PAID',
      items: [
        {
          productVariantId: null,
          quantity: 1,
          unitPrice: 5,
          attributes: {
            r710Token: true,
            tokenConfigId: 'config-1',
            productName: '1 Hour WiFi',
          },
        },
      ],
    })

    await POST(req)

    // Verify the second argument (tx) is an object (the transaction handle)
    expect(mockGenerateAndSellR710Token).toHaveBeenCalledTimes(1)
    const [params, tx] = mockGenerateAndSellR710Token.mock.calls[0]
    expect(tx).toBeDefined()
    expect(typeof tx).toBe('object')
    // The tx should have Prisma-like methods
    expect(tx.businessOrders).toBeDefined()
  })

  it('uses extended timeout (30s) for transaction with R710 items', async () => {
    mockGenerateAndSellR710Token.mockResolvedValue(mockR710TokenSaleResult())

    const req = createPostRequest({
      businessId: 'biz-1',
      businessType: 'clothing',
      paymentMethod: 'CASH',
      status: 'COMPLETED',
      paymentStatus: 'PAID',
      items: [
        {
          productVariantId: null,
          quantity: 1,
          unitPrice: 5,
          attributes: {
            r710Token: true,
            tokenConfigId: 'config-1',
            productName: '1 Hour WiFi',
          },
        },
      ],
    })

    await POST(req)

    // Verify transaction was called with timeout option
    expect(mockPrisma.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ timeout: 30000 })
    )
  })

  it('separates R710 items from regular items correctly', async () => {
    mockGenerateAndSellR710Token.mockResolvedValue(mockR710TokenSaleResult())

    // Include a mix of regular products and R710 tokens
    mockPrisma.businessProducts.findMany.mockResolvedValue([
      { id: 'product-1' }
    ])
    mockPrisma.productVariants.findMany.mockResolvedValue([
      {
        id: 'variant-1',
        productId: 'product-1',
        name: 'Default',
        stockQuantity: 10,
        business_products: { name: 'Shirt', productType: 'PHYSICAL', businessType: 'clothing' }
      }
    ])

    const req = createPostRequest({
      businessId: 'biz-1',
      businessType: 'clothing',
      paymentMethod: 'CASH',
      status: 'COMPLETED',
      paymentStatus: 'PAID',
      items: [
        {
          productVariantId: 'variant-1',
          quantity: 1,
          unitPrice: 30,
          attributes: { productName: 'Shirt' },
        },
        {
          productVariantId: null,
          quantity: 1,
          unitPrice: 5,
          attributes: {
            r710Token: true,
            tokenConfigId: 'config-1',
            productName: '1 Hour WiFi',
          },
        },
      ],
    })

    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(201)
    // R710 token was generated
    expect(mockGenerateAndSellR710Token).toHaveBeenCalledTimes(1)
    expect(body.data.r710Tokens).toHaveLength(1)
    expect(body.data.r710Tokens[0].success).toBe(true)
  })
})
