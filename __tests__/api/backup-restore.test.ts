// @ts-nocheck

/**
 * Tests for POST /api/backup restore endpoint
 * - Verifies authorized admin can post a backup and that Prisma upserts are invoked
 * - Verifies unauthorized requests are rejected
 */

// Node environment may include web platform Request/Response - set to global if available
if (typeof globalThis.Request !== 'undefined') {
  global.Request = globalThis.Request
  global.Response = globalThis.Response
  global.Headers = globalThis.Headers
}

jest.mock('@/lib/auth', () => ({
  authOptions: {},
}))

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

jest.mock('next/server', () => ({
  NextRequest: class {},
  NextResponse: { json: (body: any, options?: any) => ({ status: options?.status || 200, json: async () => body }) },
}))

jest.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: jest.fn(),
    jobTitles: { upsert: jest.fn() },
    businesses: { upsert: jest.fn() },
    users: { upsert: jest.fn() },
    auditLogs: { create: jest.fn() }
  }
}))

const { prisma } = require('@/lib/prisma')
const { POST } = require('@/app/api/backup/route')
const { getServerSession } = require('next-auth')

describe('POST /api/backup (restore)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return 401 when not an admin', async () => {
    getServerSession.mockResolvedValue(null)

    const request = { method: 'POST', url: 'http://localhost/api/backup', json: async () => ({}) } as any
    const response = await POST(request)
    const body = await response.json()
    expect(response.status).toBe(401)
    expect(body.error).toBe('Unauthorized')
  })

  it('should run upserts for reference data and businesses, returning success', async () => {
    // Mock admin session
    getServerSession.mockResolvedValue({ user: { role: 'admin' } })

    // Prepare a backupData payload with a few items
    const jobTitles = [
      { id: 'jt_1', title: 'Manager', description: 'Manages stuff', responsibilities: [], department: 'Ops', level: 'L2', isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'jt_2', title: 'Clerk', description: 'Clerks', responsibilities: [], department: 'Ops', level: 'L1', isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    ]

    const businesses = [
      { id: 'biz_1', name: 'BizCo', type: 'retail', description: 'A business', isActive: true, settings: {}, createdBy: 'user_1', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), umbrellaBusinessId: null, isUmbrellaBusiness: false }
    ]

    const auditLogs = [
      { id: 'al_1', userId: 'u_1', action: 'CREATE', entityType: 'businesses', entityId: 'biz_1', timestamp: new Date().toISOString(), oldValues: null, newValues: null, metadata: null, tableName: 'businesses', recordId: 'biz_1', changes: null, details: null }
    ]

    const backupData = {
      metadata: { backupType: 'full', timestamp: new Date().toISOString() },
      jobTitles,
      businesses,
      auditLogs
    }

    // Mock transaction: call the callback with a tx object that echoes the prisma methods
    const tx = {
      jobTitles: { upsert: jest.fn().mockResolvedValue(true) },
      businesses: { upsert: jest.fn().mockResolvedValue(true) },
      auditLogs: { create: jest.fn().mockResolvedValue(true) },
      fullSyncSessions: { upsert: jest.fn().mockResolvedValue(true) }
    }
    prisma.$transaction.mockImplementation(async (cb) => {
      return await cb(tx)
    })

    const request = { method: 'POST', url: 'http://localhost/api/backup', json: async () => backupData } as any
    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.message).toContain('Restore completed')

    // Confirm upserts were called
    expect(tx.jobTitles.upsert).toHaveBeenCalledTimes(jobTitles.length)
    expect(tx.businesses.upsert).toHaveBeenCalledTimes(businesses.length)
    expect(tx.auditLogs.create).toHaveBeenCalledTimes(auditLogs.length)
  })
})
    // no fullSyncSessions present by default, but we can add a BigInt conversion test next


  it('converts BigInt fields from string to BigInt on restore', async () => {
    getServerSession.mockResolvedValue({ user: { role: 'admin' } })

    const fullSyncSessions = [
      { id: 's1', sessionId: 'sess-1', sourceNodeId: 'n1', targetNodeId: 'n2', transferredBytes: '102400' }
    ]

    const backupData = { metadata: { backupType: 'full' }, fullSyncSessions }

    const tx = { fullSyncSessions: { upsert: jest.fn().mockResolvedValue(true) } }
    prisma.$transaction.mockImplementation(async (cb) => await cb(tx))

    const request = { method: 'POST', url: 'http://localhost/api/backup', json: async () => backupData } as any
    const response = await POST(request)

    expect(response.status).toBe(200)
    // Check that tx.fullSyncSessions.upsert was called with BigInt for transferredBytes
    expect(tx.fullSyncSessions.upsert).toHaveBeenCalled()
    const callArgs = tx.fullSyncSessions.upsert.mock.calls[0][0]
    expect(callArgs.create.transferredBytes).toBe(BigInt('102400'))
  })

  it('handles snake_case table keys like benefit_types', async () => {
    getServerSession.mockResolvedValue({ user: { role: 'admin' } })

    const benefit_types = [
      { id: 'bt_1', name: 'Health', description: 'Health benefit', type: 'benefit', defaultAmount: 100, isPercentage: false, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    ]

    const backupData = { metadata: { backupType: 'full' }, benefit_types }

    const tx = { benefitTypes: { upsert: jest.fn().mockResolvedValue(true) } }
    prisma.$transaction.mockImplementation(async (cb) => await cb(tx))

    const request = { method: 'POST', url: 'http://localhost/api/backup', json: async () => backupData } as any
    const response = await POST(request)

    expect(response.status).toBe(200)
    expect(tx.benefitTypes.upsert).toHaveBeenCalled()
  })
