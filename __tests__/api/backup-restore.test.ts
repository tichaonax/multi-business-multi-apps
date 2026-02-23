// @ts-nocheck

/**
 * Tests for POST /api/backup restore endpoint
 * - Verifies authorized admin can trigger a restore
 * - Verifies unauthorized requests are rejected
 * - The restore logic itself is in restore-clean.ts (tested separately)
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

jest.mock('@/lib/get-server-user', () => ({
  getServerUser: jest.fn(),
}))

jest.mock('@/lib/backup-clean', () => ({
  createCleanBackup: jest.fn(),
}))

jest.mock('@/lib/backup-compression', () => ({
  compressBackup: jest.fn(),
  decompressBackup: jest.fn(),
  isGzipped: jest.fn(),
}))

jest.mock('@/lib/backup-progress', () => ({
  createProgressId: jest.fn().mockReturnValue('prog-1'),
  updateProgress: jest.fn(),
}))

jest.mock('@/lib/restore-clean', () => ({
  restoreCleanBackup: jest.fn(),
  validateBackupData: jest.fn().mockReturnValue({ valid: true }),
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

const { POST } = require('@/app/api/backup/route')
const { getServerUser } = require('@/lib/get-server-user')
const { restoreCleanBackup } = require('@/lib/restore-clean')

describe('POST /api/backup (restore)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return 401 when unauthenticated', async () => {
    getServerUser.mockResolvedValue(null)

    const request = { method: 'POST', url: 'http://localhost/api/backup', json: async () => ({}) } as any
    const response = await POST(request)
    const body = await response.json()
    expect(response.status).toBe(401)
    expect(body.error).toBe('Unauthorized')
  })

  it('should return 401 when user is not admin', async () => {
    getServerUser.mockResolvedValue({ id: 'mgr1', role: 'manager' })

    const request = { method: 'POST', url: 'http://localhost/api/backup', json: async () => ({}) } as any
    const response = await POST(request)
    const body = await response.json()
    expect(response.status).toBe(401)
    expect(body.error).toBe('Unauthorized')
  })

  it('should return 400 when no backup data provided', async () => {
    getServerUser.mockResolvedValue({ id: 'admin1', role: 'admin' })

    // Sends empty body — no backupData or compressedData
    const request = {
      method: 'POST',
      url: 'http://localhost/api/backup',
      json: async () => ({})
    } as any
    const response = await POST(request)
    const body = await response.json()
    expect(response.status).toBe(400)
    expect(body.error).toContain('No backup data provided')
  })

  it('should call restoreCleanBackup and return 200 for admin with valid backup', async () => {
    getServerUser.mockResolvedValue({ id: 'admin1', role: 'admin' })

    const backupPayload = {
      metadata: { backupType: 'full', timestamp: new Date().toISOString(), version: '2' },
      businesses: [{ id: 'biz-1', name: 'Test' }]
    }

    restoreCleanBackup.mockResolvedValue({
      success: true,
      processed: 1,
      errors: 0,
      errorLog: [],
      skippedRecords: 0,
      skippedReasons: { foreignKeyErrors: 0, validationErrors: 0, otherErrors: 0 },
      modelCounts: {}
    })

    const request = {
      method: 'POST',
      url: 'http://localhost/api/backup?wait=true',
      json: async () => ({ backupData: backupPayload })
    } as any

    const response = await POST(request)
    expect(response.status).toBe(200)
    expect(restoreCleanBackup).toHaveBeenCalled()
  })
})
