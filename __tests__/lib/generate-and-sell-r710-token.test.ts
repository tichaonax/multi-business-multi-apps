// @ts-nocheck

/**
 * @jest-environment node
 *
 * Tests for the shared R710 token generation utility
 * src/lib/r710/generate-and-sell-token.ts
 */

// Mock all external dependencies before imports
jest.mock('@/lib/prisma', () => ({
  prisma: {
    r710TokenConfigs: { findUnique: jest.fn() },
    r710BusinessIntegrations: { findFirst: jest.fn() },
    r710Tokens: { create: jest.fn() },
    r710TokenSales: { create: jest.fn() },
    expenseAccountDeposits: {
      create: jest.fn(),
      aggregate: jest.fn(),
    },
    expenseAccountPayments: { aggregate: jest.fn() },
    expenseAccounts: { update: jest.fn() },
  },
}))

jest.mock('@/lib/r710-session-manager', () => ({
  R710SessionManager: jest.fn().mockImplementation(() => ({
    withSession: jest.fn(),
  })),
}))

jest.mock('@/lib/r710/username-generator', () => ({
  generateDirectSaleUsername: jest.fn().mockReturnValue('DS-260214-120000-ABC'),
}))

jest.mock('@/lib/r710-expense-account-utils', () => ({
  getOrCreateR710ExpenseAccount: jest.fn().mockResolvedValue({
    id: 'expense-acct-1',
    accountName: 'R710 WiFi Sales',
  }),
}))

jest.mock('@/lib/encryption', () => ({
  decrypt: jest.fn().mockReturnValue('decrypted-password'),
}))

const { prisma } = require('@/lib/prisma')
const { R710SessionManager } = require('@/lib/r710-session-manager')
const { generateDirectSaleUsername } = require('@/lib/r710/username-generator')
const { getOrCreateR710ExpenseAccount } = require('@/lib/r710-expense-account-utils')
const { decrypt } = require('@/lib/encryption')

// Must require after mocks are set up
const { generateAndSellR710Token } = require('@/lib/r710/generate-and-sell-token')

// -- Helpers --

const MOCK_BUSINESS_ID = 'biz-123'
const MOCK_TOKEN_CONFIG_ID = 'config-456'
const MOCK_SOLD_BY = 'user-789'

function mockTokenConfig(overrides = {}) {
  return {
    id: MOCK_TOKEN_CONFIG_ID,
    businessId: MOCK_BUSINESS_ID,
    name: '1 Hour WiFi',
    durationValue: 1,
    durationUnit: 'hour_Hours',
    deviceLimit: 2,
    r710_wlans: { id: 'wlan-1', ssid: 'MyWiFi', wlanId: 'wlan-ext-1' },
    ...overrides,
  }
}

function mockR710Integration() {
  return {
    id: 'integ-1',
    businessId: MOCK_BUSINESS_ID,
    isActive: true,
    device_registry: {
      id: 'dev-1',
      ipAddress: '192.168.1.1',
      adminUsername: 'admin',
      encryptedAdminPassword: 'encrypted-pw',
    },
  }
}

function mockTokenResult() {
  return {
    success: true,
    token: {
      username: 'DS-260214-120000-ABC',
      password: 'guest-pass-123',
      expiresAt: new Date('2026-02-15T12:00:00Z'),
    },
  }
}

function mockCreatedToken() {
  return {
    id: 'token-new-1',
    businessId: MOCK_BUSINESS_ID,
    username: 'DS-260214-120000-ABC',
    password: 'guest-pass-123',
    tokenConfigId: MOCK_TOKEN_CONFIG_ID,
    status: 'SOLD',
    expiresAtR710: new Date('2026-02-15T12:00:00Z'),
    createdAt: new Date('2026-02-14T12:00:00Z'),
  }
}

function mockCreatedSale() {
  return {
    id: 'sale-new-1',
    saleAmount: 5,
    paymentMethod: 'CASH',
    soldAt: new Date('2026-02-14T12:00:00Z'),
  }
}

// Get the mocked session manager withSession fn
function getWithSessionMock() {
  const instance = R710SessionManager.mock.results[0]?.value
  return instance?.withSession
}

describe('generateAndSellR710Token', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Re-create the session manager mock for each test
    R710SessionManager.mockImplementation(() => ({
      withSession: jest.fn(),
    }))
    // Re-require to get fresh module with new mock
  })

  it('successfully generates a token and records sale (paid)', async () => {
    const db = {
      r710TokenConfigs: { findUnique: jest.fn().mockResolvedValue(mockTokenConfig()) },
      r710BusinessIntegrations: { findFirst: jest.fn().mockResolvedValue(mockR710Integration()) },
      r710Tokens: { create: jest.fn().mockResolvedValue(mockCreatedToken()) },
      r710TokenSales: { create: jest.fn().mockResolvedValue(mockCreatedSale()) },
      expenseAccountDeposits: {
        create: jest.fn().mockResolvedValue({}),
        aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 50 } }),
      },
      expenseAccountPayments: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 10 } }),
      },
      expenseAccounts: { update: jest.fn().mockResolvedValue({}) },
    }

    // Mock the sessionManager.withSession to return a successful token result
    // Since the module uses a module-level sessionManager, we need to mock the module import
    // The easiest way: pass `db` as `tx` so it uses our mock DB
    // But we also need to mock the R710SessionManager's withSession call
    // Let's approach this by mocking at the prisma level for when tx is not provided
    prisma.r710TokenConfigs.findUnique.mockResolvedValue(mockTokenConfig())
    prisma.r710BusinessIntegrations.findFirst.mockResolvedValue(mockR710Integration())
    prisma.r710Tokens.create.mockResolvedValue(mockCreatedToken())
    prisma.r710TokenSales.create.mockResolvedValue(mockCreatedSale())
    prisma.expenseAccountDeposits.create.mockResolvedValue({})
    prisma.expenseAccountDeposits.aggregate.mockResolvedValue({ _sum: { amount: 50 } })
    prisma.expenseAccountPayments.aggregate.mockResolvedValue({ _sum: { amount: 10 } })
    prisma.expenseAccounts.update.mockResolvedValue({})

    // Mock R710SessionManager.withSession - need to access the instance
    const mockWithSession = jest.fn().mockImplementation(async (config, callback) => {
      const mockR710Service = {
        generateSingleGuestPass: jest.fn().mockResolvedValue(mockTokenResult()),
      }
      return await callback(mockR710Service)
    })

    // Re-mock the constructor to use our withSession mock
    R710SessionManager.mockImplementation(() => ({
      withSession: mockWithSession,
    }))

    // Re-require the module so it picks up the new mock
    jest.resetModules()
    jest.mock('@/lib/prisma', () => ({
      prisma: {
        r710TokenConfigs: { findUnique: jest.fn().mockResolvedValue(mockTokenConfig()) },
        r710BusinessIntegrations: { findFirst: jest.fn().mockResolvedValue(mockR710Integration()) },
        r710Tokens: { create: jest.fn().mockResolvedValue(mockCreatedToken()) },
        r710TokenSales: { create: jest.fn().mockResolvedValue(mockCreatedSale()) },
        expenseAccountDeposits: {
          create: jest.fn().mockResolvedValue({}),
          aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 50 } }),
        },
        expenseAccountPayments: { aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 10 } }) },
        expenseAccounts: { update: jest.fn().mockResolvedValue({}) },
      },
    }))
    jest.mock('@/lib/r710-session-manager', () => ({
      R710SessionManager: jest.fn().mockImplementation(() => ({
        withSession: mockWithSession,
      })),
    }))
    jest.mock('@/lib/r710/username-generator', () => ({
      generateDirectSaleUsername: jest.fn().mockReturnValue('DS-260214-120000-ABC'),
    }))
    jest.mock('@/lib/r710-expense-account-utils', () => ({
      getOrCreateR710ExpenseAccount: jest.fn().mockResolvedValue({
        id: 'expense-acct-1',
        accountName: 'R710 WiFi Sales',
      }),
    }))
    jest.mock('@/lib/encryption', () => ({
      decrypt: jest.fn().mockReturnValue('decrypted-password'),
    }))

    const freshModule = require('@/lib/r710/generate-and-sell-token')

    const result = await freshModule.generateAndSellR710Token({
      businessId: MOCK_BUSINESS_ID,
      tokenConfigId: MOCK_TOKEN_CONFIG_ID,
      saleAmount: 5,
      paymentMethod: 'CASH',
      soldBy: MOCK_SOLD_BY,
      saleChannel: 'DIRECT',
    })

    expect(result.success).toBe(true)
    expect(result.token.username).toBe('DS-260214-120000-ABC')
    expect(result.token.password).toBe('guest-pass-123')
    expect(result.token.tokenConfig.name).toBe('1 Hour WiFi')
    expect(result.sale.saleAmount).toBe(5)
    expect(result.wlanSsid).toBe('MyWiFi')

    // Verify token was created with SOLD status
    const { prisma: freshPrisma } = require('@/lib/prisma')
    expect(freshPrisma.r710Tokens.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'SOLD',
          businessId: MOCK_BUSINESS_ID,
          tokenConfigId: MOCK_TOKEN_CONFIG_ID,
        }),
      })
    )

    // Verify expense account deposit was created for paid token
    expect(freshPrisma.expenseAccountDeposits.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          amount: 5,
          sourceType: 'R710_TOKEN_SALE',
        }),
      })
    )

    // Verify balance was updated
    expect(freshPrisma.expenseAccounts.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          balance: 40, // 50 deposits - 10 payments
        }),
      })
    )
  })

  it('uses tx when provided instead of prisma', async () => {
    const mockTx = {
      r710TokenConfigs: { findUnique: jest.fn().mockResolvedValue(mockTokenConfig()) },
      r710BusinessIntegrations: { findFirst: jest.fn().mockResolvedValue(mockR710Integration()) },
      r710Tokens: { create: jest.fn().mockResolvedValue(mockCreatedToken()) },
      r710TokenSales: { create: jest.fn().mockResolvedValue(mockCreatedSale()) },
      expenseAccountDeposits: {
        create: jest.fn().mockResolvedValue({}),
        aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 0 } }),
      },
      expenseAccountPayments: { aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 0 } }) },
      expenseAccounts: { update: jest.fn().mockResolvedValue({}) },
    }

    const mockWithSession = jest.fn().mockImplementation(async (config, callback) => {
      const mockR710Service = {
        generateSingleGuestPass: jest.fn().mockResolvedValue(mockTokenResult()),
      }
      return await callback(mockR710Service)
    })

    jest.resetModules()
    jest.mock('@/lib/r710-session-manager', () => ({
      R710SessionManager: jest.fn().mockImplementation(() => ({
        withSession: mockWithSession,
      })),
    }))
    jest.mock('@/lib/prisma', () => ({ prisma: { /* should not be used */ } }))
    jest.mock('@/lib/r710/username-generator', () => ({
      generateDirectSaleUsername: jest.fn().mockReturnValue('DS-260214-120000-ABC'),
    }))
    jest.mock('@/lib/r710-expense-account-utils', () => ({
      getOrCreateR710ExpenseAccount: jest.fn().mockResolvedValue({
        id: 'expense-acct-1',
      }),
    }))
    jest.mock('@/lib/encryption', () => ({
      decrypt: jest.fn().mockReturnValue('decrypted-password'),
    }))

    const { generateAndSellR710Token: fn } = require('@/lib/r710/generate-and-sell-token')

    const result = await fn({
      businessId: MOCK_BUSINESS_ID,
      tokenConfigId: MOCK_TOKEN_CONFIG_ID,
      saleAmount: 0,
      paymentMethod: 'CASH',
      soldBy: MOCK_SOLD_BY,
    }, mockTx)

    expect(result.success).toBe(true)
    // Should have used tx methods, not prisma
    expect(mockTx.r710TokenConfigs.findUnique).toHaveBeenCalled()
    expect(mockTx.r710BusinessIntegrations.findFirst).toHaveBeenCalled()
    expect(mockTx.r710Tokens.create).toHaveBeenCalled()
    expect(mockTx.r710TokenSales.create).toHaveBeenCalled()
  })

  it('throws when token config not found', async () => {
    const mockWithSession = jest.fn()

    jest.resetModules()
    jest.mock('@/lib/prisma', () => ({
      prisma: {
        r710TokenConfigs: { findUnique: jest.fn().mockResolvedValue(null) },
        r710BusinessIntegrations: { findFirst: jest.fn() },
      },
    }))
    jest.mock('@/lib/r710-session-manager', () => ({
      R710SessionManager: jest.fn().mockImplementation(() => ({
        withSession: mockWithSession,
      })),
    }))
    jest.mock('@/lib/r710/username-generator', () => ({
      generateDirectSaleUsername: jest.fn(),
    }))
    jest.mock('@/lib/r710-expense-account-utils', () => ({
      getOrCreateR710ExpenseAccount: jest.fn(),
    }))
    jest.mock('@/lib/encryption', () => ({
      decrypt: jest.fn(),
    }))

    const { generateAndSellR710Token: fn } = require('@/lib/r710/generate-and-sell-token')

    await expect(fn({
      businessId: MOCK_BUSINESS_ID,
      tokenConfigId: 'nonexistent',
      saleAmount: 0,
      paymentMethod: 'CASH',
      soldBy: MOCK_SOLD_BY,
    })).rejects.toThrow('Token configuration not found')

    // Should NOT have tried to generate a token on the device
    expect(mockWithSession).not.toHaveBeenCalled()
  })

  it('throws when token config belongs to different business', async () => {
    jest.resetModules()
    jest.mock('@/lib/prisma', () => ({
      prisma: {
        r710TokenConfigs: {
          findUnique: jest.fn().mockResolvedValue({
            ...mockTokenConfig(),
            businessId: 'different-biz', // Not matching
          }),
        },
        r710BusinessIntegrations: { findFirst: jest.fn() },
      },
    }))
    jest.mock('@/lib/r710-session-manager', () => ({
      R710SessionManager: jest.fn().mockImplementation(() => ({
        withSession: jest.fn(),
      })),
    }))
    jest.mock('@/lib/r710/username-generator', () => ({
      generateDirectSaleUsername: jest.fn(),
    }))
    jest.mock('@/lib/r710-expense-account-utils', () => ({
      getOrCreateR710ExpenseAccount: jest.fn(),
    }))
    jest.mock('@/lib/encryption', () => ({
      decrypt: jest.fn(),
    }))

    const { generateAndSellR710Token: fn } = require('@/lib/r710/generate-and-sell-token')

    await expect(fn({
      businessId: MOCK_BUSINESS_ID,
      tokenConfigId: MOCK_TOKEN_CONFIG_ID,
      saleAmount: 0,
      paymentMethod: 'CASH',
      soldBy: MOCK_SOLD_BY,
    })).rejects.toThrow('Token configuration not found')
  })

  it('throws when no active R710 integration exists', async () => {
    jest.resetModules()
    jest.mock('@/lib/prisma', () => ({
      prisma: {
        r710TokenConfigs: { findUnique: jest.fn().mockResolvedValue(mockTokenConfig()) },
        r710BusinessIntegrations: { findFirst: jest.fn().mockResolvedValue(null) },
      },
    }))
    jest.mock('@/lib/r710-session-manager', () => ({
      R710SessionManager: jest.fn().mockImplementation(() => ({
        withSession: jest.fn(),
      })),
    }))
    jest.mock('@/lib/r710/username-generator', () => ({
      generateDirectSaleUsername: jest.fn(),
    }))
    jest.mock('@/lib/r710-expense-account-utils', () => ({
      getOrCreateR710ExpenseAccount: jest.fn().mockResolvedValue({ id: 'exp-1' }),
    }))
    jest.mock('@/lib/encryption', () => ({
      decrypt: jest.fn(),
    }))

    const { generateAndSellR710Token: fn } = require('@/lib/r710/generate-and-sell-token')

    await expect(fn({
      businessId: MOCK_BUSINESS_ID,
      tokenConfigId: MOCK_TOKEN_CONFIG_ID,
      saleAmount: 0,
      paymentMethod: 'CASH',
      soldBy: MOCK_SOLD_BY,
    })).rejects.toThrow('No active R710 integration or device found')
  })

  it('throws when device API fails to generate token', async () => {
    const mockWithSession = jest.fn().mockImplementation(async (config, callback) => {
      const mockR710Service = {
        generateSingleGuestPass: jest.fn().mockResolvedValue({
          success: false,
          error: 'Device unreachable',
        }),
      }
      return await callback(mockR710Service)
    })

    jest.resetModules()
    jest.mock('@/lib/prisma', () => ({
      prisma: {
        r710TokenConfigs: { findUnique: jest.fn().mockResolvedValue(mockTokenConfig()) },
        r710BusinessIntegrations: { findFirst: jest.fn().mockResolvedValue(mockR710Integration()) },
      },
    }))
    jest.mock('@/lib/r710-session-manager', () => ({
      R710SessionManager: jest.fn().mockImplementation(() => ({
        withSession: mockWithSession,
      })),
    }))
    jest.mock('@/lib/r710/username-generator', () => ({
      generateDirectSaleUsername: jest.fn().mockReturnValue('DS-260214-120000-XYZ'),
    }))
    jest.mock('@/lib/r710-expense-account-utils', () => ({
      getOrCreateR710ExpenseAccount: jest.fn().mockResolvedValue({ id: 'exp-1' }),
    }))
    jest.mock('@/lib/encryption', () => ({
      decrypt: jest.fn().mockReturnValue('pw'),
    }))

    const { generateAndSellR710Token: fn } = require('@/lib/r710/generate-and-sell-token')

    await expect(fn({
      businessId: MOCK_BUSINESS_ID,
      tokenConfigId: MOCK_TOKEN_CONFIG_ID,
      saleAmount: 0,
      paymentMethod: 'CASH',
      soldBy: MOCK_SOLD_BY,
    })).rejects.toThrow('Device unreachable')
  })

  it('does NOT create expense deposit for free tokens (saleAmount = 0)', async () => {
    const mockWithSession = jest.fn().mockImplementation(async (config, callback) => {
      const mockR710Service = {
        generateSingleGuestPass: jest.fn().mockResolvedValue(mockTokenResult()),
      }
      return await callback(mockR710Service)
    })

    jest.resetModules()
    const mockPrisma = {
      r710TokenConfigs: { findUnique: jest.fn().mockResolvedValue(mockTokenConfig()) },
      r710BusinessIntegrations: { findFirst: jest.fn().mockResolvedValue(mockR710Integration()) },
      r710Tokens: { create: jest.fn().mockResolvedValue(mockCreatedToken()) },
      r710TokenSales: { create: jest.fn().mockResolvedValue(mockCreatedSale()) },
      expenseAccountDeposits: { create: jest.fn(), aggregate: jest.fn() },
      expenseAccountPayments: { aggregate: jest.fn() },
      expenseAccounts: { update: jest.fn() },
    }
    jest.mock('@/lib/prisma', () => ({ prisma: mockPrisma }))
    jest.mock('@/lib/r710-session-manager', () => ({
      R710SessionManager: jest.fn().mockImplementation(() => ({
        withSession: mockWithSession,
      })),
    }))
    jest.mock('@/lib/r710/username-generator', () => ({
      generateDirectSaleUsername: jest.fn().mockReturnValue('DS-260214-120000-ABC'),
    }))
    jest.mock('@/lib/r710-expense-account-utils', () => ({
      getOrCreateR710ExpenseAccount: jest.fn().mockResolvedValue({ id: 'exp-1' }),
    }))
    jest.mock('@/lib/encryption', () => ({
      decrypt: jest.fn().mockReturnValue('pw'),
    }))

    const { generateAndSellR710Token: fn } = require('@/lib/r710/generate-and-sell-token')

    const result = await fn({
      businessId: MOCK_BUSINESS_ID,
      tokenConfigId: MOCK_TOKEN_CONFIG_ID,
      saleAmount: 0, // Free token
      paymentMethod: 'CASH',
      soldBy: MOCK_SOLD_BY,
    })

    expect(result.success).toBe(true)
    // Should NOT have created a deposit
    expect(mockPrisma.expenseAccountDeposits.create).not.toHaveBeenCalled()
    // Should NOT have updated balance
    expect(mockPrisma.expenseAccounts.update).not.toHaveBeenCalled()
  })

  it('maps duration units correctly', async () => {
    const mockWithSession = jest.fn().mockImplementation(async (config, callback) => {
      const mockR710Service = {
        generateSingleGuestPass: jest.fn().mockResolvedValue(mockTokenResult()),
      }
      return await callback(mockR710Service)
    })

    jest.resetModules()
    jest.mock('@/lib/prisma', () => ({
      prisma: {
        r710TokenConfigs: {
          findUnique: jest.fn().mockResolvedValue(mockTokenConfig({ durationUnit: 'day_Days', durationValue: 7 })),
        },
        r710BusinessIntegrations: { findFirst: jest.fn().mockResolvedValue(mockR710Integration()) },
        r710Tokens: { create: jest.fn().mockResolvedValue(mockCreatedToken()) },
        r710TokenSales: { create: jest.fn().mockResolvedValue(mockCreatedSale()) },
        expenseAccountDeposits: { create: jest.fn(), aggregate: jest.fn() },
        expenseAccountPayments: { aggregate: jest.fn() },
        expenseAccounts: { update: jest.fn() },
      },
    }))
    jest.mock('@/lib/r710-session-manager', () => ({
      R710SessionManager: jest.fn().mockImplementation(() => ({
        withSession: mockWithSession,
      })),
    }))
    jest.mock('@/lib/r710/username-generator', () => ({
      generateDirectSaleUsername: jest.fn().mockReturnValue('DS-260214-120000-ABC'),
    }))
    jest.mock('@/lib/r710-expense-account-utils', () => ({
      getOrCreateR710ExpenseAccount: jest.fn().mockResolvedValue({ id: 'exp-1' }),
    }))
    jest.mock('@/lib/encryption', () => ({
      decrypt: jest.fn().mockReturnValue('pw'),
    }))

    const { generateAndSellR710Token: fn } = require('@/lib/r710/generate-and-sell-token')

    await fn({
      businessId: MOCK_BUSINESS_ID,
      tokenConfigId: MOCK_TOKEN_CONFIG_ID,
      saleAmount: 0,
      paymentMethod: 'CASH',
      soldBy: MOCK_SOLD_BY,
    })

    // Check the withSession call had the correct arguments passed to generateSingleGuestPass
    expect(mockWithSession).toHaveBeenCalledTimes(1)
    const callbackArg = mockWithSession.mock.calls[0][1]
    const mockService = { generateSingleGuestPass: jest.fn().mockResolvedValue(mockTokenResult()) }
    await callbackArg(mockService)

    expect(mockService.generateSingleGuestPass).toHaveBeenCalledWith(
      expect.objectContaining({
        duration: 7,
        durationUnit: 'day', // mapped from day_Days
      })
    )
  })

  it('defaults saleChannel to POS when not specified', async () => {
    const mockWithSession = jest.fn().mockImplementation(async (config, callback) => {
      const mockR710Service = {
        generateSingleGuestPass: jest.fn().mockResolvedValue(mockTokenResult()),
      }
      return await callback(mockR710Service)
    })

    jest.resetModules()
    const mockPrisma = {
      r710TokenConfigs: { findUnique: jest.fn().mockResolvedValue(mockTokenConfig()) },
      r710BusinessIntegrations: { findFirst: jest.fn().mockResolvedValue(mockR710Integration()) },
      r710Tokens: { create: jest.fn().mockResolvedValue(mockCreatedToken()) },
      r710TokenSales: { create: jest.fn().mockResolvedValue(mockCreatedSale()) },
      expenseAccountDeposits: { create: jest.fn(), aggregate: jest.fn() },
      expenseAccountPayments: { aggregate: jest.fn() },
      expenseAccounts: { update: jest.fn() },
    }
    jest.mock('@/lib/prisma', () => ({ prisma: mockPrisma }))
    jest.mock('@/lib/r710-session-manager', () => ({
      R710SessionManager: jest.fn().mockImplementation(() => ({
        withSession: mockWithSession,
      })),
    }))
    jest.mock('@/lib/r710/username-generator', () => ({
      generateDirectSaleUsername: jest.fn().mockReturnValue('DS-260214-120000-ABC'),
    }))
    jest.mock('@/lib/r710-expense-account-utils', () => ({
      getOrCreateR710ExpenseAccount: jest.fn().mockResolvedValue({ id: 'exp-1' }),
    }))
    jest.mock('@/lib/encryption', () => ({
      decrypt: jest.fn().mockReturnValue('pw'),
    }))

    const { generateAndSellR710Token: fn } = require('@/lib/r710/generate-and-sell-token')

    await fn({
      businessId: MOCK_BUSINESS_ID,
      tokenConfigId: MOCK_TOKEN_CONFIG_ID,
      saleAmount: 0,
      paymentMethod: 'CASH',
      soldBy: MOCK_SOLD_BY,
      // No saleChannel - should default to 'POS'
    })

    expect(mockPrisma.r710TokenSales.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          saleChannel: 'POS',
        }),
      })
    )
  })
})
