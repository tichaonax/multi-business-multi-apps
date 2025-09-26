/**
 * Security Manager
 * Comprehensive security authentication and authorization for sync network
 */

import { EventEmitter } from 'events'
import { PrismaClient } from '@prisma/client'
import { PeerInfo } from './peer-discovery'

export interface SecurityConfig {
  registrationKey: string
  enableEncryption: boolean
  enableSignatures: boolean
  keyRotationEnabled: boolean
  keyRotationInterval: number // milliseconds
  sessionTimeout: number // milliseconds
  maxFailedAttempts: number
  rateLimitWindow: number // milliseconds
  rateLimitMaxRequests: number
}

export interface AuthToken {
  tokenId: string
  nodeId: string
  issuedAt: Date
  expiresAt: Date
  permissions: string[]
  signature: string
}

export interface SecuritySession {
  sessionId: string
  sourceNodeId: string
  targetNodeId: string
  authToken: string
  establishedAt: Date
  expiresAt: Date
  lastActivity: Date
  isValid: boolean
  encryptionKey?: string
  signingKey?: string
}

export interface SecurityAuditEntry {
  auditId: string
  nodeId: string
  eventType: 'AUTH_SUCCESS' | 'AUTH_FAILURE' | 'SESSION_CREATED' | 'SESSION_EXPIRED' | 'RATE_LIMIT_EXCEEDED' | 'INVALID_TOKEN' | 'KEY_ROTATION'
  timestamp: Date
  sourceIp: string
  targetNodeId?: string
  errorMessage?: string
  metadata: any
}

/**
 * Security Manager
 * Handles authentication, authorization, and security for sync operations
 */
export class SecurityManager extends EventEmitter {
  private prisma: PrismaClient
  private nodeId: string
  private config: SecurityConfig
  private activeSessions: Map<string, SecuritySession> = new Map()
  private rateLimitMap: Map<string, { count: number; resetTime: number }> = new Map()
  private keyRotationTimer: NodeJS.Timeout | null = null
  private sessionCleanupTimer: NodeJS.Timeout | null = null
  private currentRegistrationKey: string
  private previousRegistrationKey?: string

  // Security constants
  private readonly TOKEN_VALIDITY_PERIOD = 3600000 // 1 hour
  private readonly SESSION_CLEANUP_INTERVAL = 300000 // 5 minutes
  private readonly MAX_TOKEN_SIZE = 4096 // bytes
  private readonly ENCRYPTION_ALGORITHM = 'aes-256-gcm'
  private readonly SIGNATURE_ALGORITHM = 'sha256'

  constructor(prisma: PrismaClient, nodeId: string, config: SecurityConfig) {
    super()
    this.prisma = prisma
    this.nodeId = nodeId
    this.config = {
      enableEncryption: true,
      enableSignatures: true,
      keyRotationEnabled: true,
      keyRotationInterval: 24 * 60 * 60 * 1000, // 24 hours
      sessionTimeout: 30 * 60 * 1000, // 30 minutes
      maxFailedAttempts: 5,
      rateLimitWindow: 60000, // 1 minute
      rateLimitMaxRequests: 10,
      ...config
    }
    this.currentRegistrationKey = config.registrationKey
  }

  /**
   * Start security manager
   */
  async start(): Promise<void> {
    if (this.config.keyRotationEnabled) {
      this.startKeyRotation()
    }
    this.startSessionCleanup()
    await this.loadExistingSessions()
    this.emit('started')
  }

  /**
   * Stop security manager
   */
  stop(): void {
    if (this.keyRotationTimer) {
      clearInterval(this.keyRotationTimer)
      this.keyRotationTimer = null
    }
    if (this.sessionCleanupTimer) {
      clearInterval(this.sessionCleanupTimer)
      this.sessionCleanupTimer = null
    }
    this.emit('stopped')
  }

  /**
   * Authenticate peer using registration key
   */
  async authenticatePeer(peer: PeerInfo, providedKeyHash: string): Promise<{ success: boolean; authToken?: string; errorMessage?: string }> {
    try {
      // Rate limiting check
      if (!this.checkRateLimit(peer.ipAddress)) {
        await this.auditSecurityEvent('RATE_LIMIT_EXCEEDED', peer.ipAddress, peer.nodeId, 'Rate limit exceeded')
        return { success: false, errorMessage: 'Rate limit exceeded' }
      }

      // Validate registration key
      const isValidKey = await this.validateRegistrationKey(providedKeyHash)
      if (!isValidKey) {
        await this.auditSecurityEvent('AUTH_FAILURE', peer.ipAddress, peer.nodeId, 'Invalid registration key')
        return { success: false, errorMessage: 'Invalid registration key' }
      }

      // Generate auth token
      const authToken = await this.generateAuthToken(peer.nodeId)

      await this.auditSecurityEvent('AUTH_SUCCESS', peer.ipAddress, peer.nodeId, 'Authentication successful')
      return { success: true, authToken }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed'
      await this.auditSecurityEvent('AUTH_FAILURE', peer.ipAddress, peer.nodeId, errorMessage)
      return { success: false, errorMessage }
    }
  }

  /**
   * Establish secure session between nodes
   */
  async establishSecureSession(sourceNodeId: string, targetNodeId: string, authToken: string): Promise<{ success: boolean; sessionId?: string; encryptionKey?: string; errorMessage?: string }> {
    try {
      // Validate auth token
      const tokenValidation = await this.validateAuthToken(authToken)
      if (!tokenValidation.valid) {
        return { success: false, errorMessage: 'Invalid auth token' }
      }

      const sessionId = crypto.randomUUID()
      const now = new Date()
      const expiresAt = new Date(now.getTime() + this.config.sessionTimeout)

      // Generate session-specific encryption key if encryption is enabled
      let encryptionKey: string | undefined
      let signingKey: string | undefined

      if (this.config.enableEncryption) {
        encryptionKey = this.generateSecureKey(32) // 256-bit key
      }

      if (this.config.enableSignatures) {
        signingKey = this.generateSecureKey(32) // 256-bit key
      }

      const session: SecuritySession = {
        sessionId,
        sourceNodeId,
        targetNodeId,
        authToken,
        establishedAt: now,
        expiresAt,
        lastActivity: now,
        isValid: true,
        encryptionKey,
        signingKey
      }

      await this.storeSecuritySession(session)
      this.activeSessions.set(sessionId, session)

      await this.auditSecurityEvent('SESSION_CREATED', 'internal', sourceNodeId, 'Secure session established', {
        targetNodeId,
        sessionId,
        encryptionEnabled: this.config.enableEncryption,
        signaturesEnabled: this.config.enableSignatures
      })

      this.emit('session_established', session)

      return {
        success: true,
        sessionId,
        encryptionKey: this.config.enableEncryption ? encryptionKey : undefined
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Session establishment failed'
      return { success: false, errorMessage }
    }
  }

  /**
   * Validate security session
   */
  async validateSession(sessionId: string): Promise<{ valid: boolean; session?: SecuritySession; errorMessage?: string }> {
    try {
      const session = this.activeSessions.get(sessionId)
      if (!session) {
        return { valid: false, errorMessage: 'Session not found' }
      }

      const now = new Date()

      // Check if session has expired
      if (now > session.expiresAt) {
        session.isValid = false
        await this.auditSecurityEvent('SESSION_EXPIRED', 'internal', session.sourceNodeId, 'Session expired', { sessionId })
        return { valid: false, errorMessage: 'Session expired' }
      }

      // Update last activity
      session.lastActivity = now
      await this.updateSecuritySession(session)

      return { valid: true, session }

    } catch (error) {
      return { valid: false, errorMessage: error instanceof Error ? error.message : 'Session validation failed' }
    }
  }

  /**
   * Encrypt data for secure transmission
   */
  async encryptData(data: any, sessionId: string): Promise<{ encrypted: string; signature?: string } | null> {
    if (!this.config.enableEncryption) {
      return null
    }

    try {
      const session = this.activeSessions.get(sessionId)
      if (!session || !session.encryptionKey) {
        throw new Error('No encryption key available for session')
      }

      const crypto = require('crypto')
      const dataString = JSON.stringify(data)

      // Generate IV for this encryption
      const iv = crypto.randomBytes(16)
      const cipher = crypto.createCipher(this.ENCRYPTION_ALGORITHM, session.encryptionKey)

      let encrypted = cipher.update(dataString, 'utf8', 'hex')
      encrypted += cipher.final('hex')

      // Combine IV and encrypted data
      const encryptedWithIv = iv.toString('hex') + ':' + encrypted

      // Generate signature if enabled
      let signature: string | undefined
      if (this.config.enableSignatures && session.signingKey) {
        const hmac = crypto.createHmac(this.SIGNATURE_ALGORITHM, session.signingKey)
        hmac.update(encryptedWithIv)
        signature = hmac.digest('hex')
      }

      return { encrypted: encryptedWithIv, signature }

    } catch (error) {
      console.error('Encryption failed:', error)
      return null
    }
  }

  /**
   * Decrypt data from secure transmission
   */
  async decryptData(encryptedData: string, sessionId: string, signature?: string): Promise<any | null> {
    if (!this.config.enableEncryption) {
      return null
    }

    try {
      const session = this.activeSessions.get(sessionId)
      if (!session || !session.encryptionKey) {
        throw new Error('No encryption key available for session')
      }

      // Verify signature if provided
      if (this.config.enableSignatures && signature && session.signingKey) {
        const crypto = require('crypto')
        const hmac = crypto.createHmac(this.SIGNATURE_ALGORITHM, session.signingKey)
        hmac.update(encryptedData)
        const expectedSignature = hmac.digest('hex')

        if (signature !== expectedSignature) {
          throw new Error('Signature verification failed')
        }
      }

      // Split IV and encrypted data
      const [ivHex, encrypted] = encryptedData.split(':')
      if (!ivHex || !encrypted) {
        throw new Error('Invalid encrypted data format')
      }

      const crypto = require('crypto')
      const iv = Buffer.from(ivHex, 'hex')
      const decipher = crypto.createDecipher(this.ENCRYPTION_ALGORITHM, session.encryptionKey)

      let decrypted = decipher.update(encrypted, 'hex', 'utf8')
      decrypted += decipher.final('utf8')

      return JSON.parse(decrypted)

    } catch (error) {
      console.error('Decryption failed:', error)
      return null
    }
  }

  /**
   * Invalidate security session
   */
  async invalidateSession(sessionId: string): Promise<boolean> {
    try {
      const session = this.activeSessions.get(sessionId)
      if (session) {
        session.isValid = false
        await this.updateSecuritySession(session)
        this.activeSessions.delete(sessionId)

        await this.auditSecurityEvent('SESSION_EXPIRED', 'internal', session.sourceNodeId, 'Session invalidated', { sessionId })
        this.emit('session_invalidated', session)
      }
      return true
    } catch (error) {
      console.error('Failed to invalidate session:', error)
      return false
    }
  }

  /**
   * Rotate registration key
   */
  async rotateRegistrationKey(): Promise<string> {
    try {
      this.previousRegistrationKey = this.currentRegistrationKey
      this.currentRegistrationKey = this.generateSecureKey(64) // 512-bit key

      // Store new key securely
      await this.storeRegistrationKey(this.currentRegistrationKey)

      await this.auditSecurityEvent('KEY_ROTATION', 'internal', this.nodeId, 'Registration key rotated')
      this.emit('key_rotated', { previousKey: this.previousRegistrationKey, newKey: this.currentRegistrationKey })

      // Previous key remains valid for a grace period
      setTimeout(() => {
        this.previousRegistrationKey = undefined
      }, 300000) // 5 minutes grace period

      return this.currentRegistrationKey

    } catch (error) {
      console.error('Key rotation failed:', error)
      throw error
    }
  }

  /**
   * Get security statistics
   */
  async getSecurityStats(): Promise<any> {
    try {
      const now = new Date()
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000)

      // Get audit events from last 24 hours
      const auditEvents = await this.prisma.securityAudit.findMany({
        where: {
          nodeId: this.nodeId,
          timestamp: { gte: last24Hours }
        },
        orderBy: { timestamp: 'desc' }
      })

      const stats = {
        activeSessions: this.activeSessions.size,
        last24Hours: {
          authSuccesses: auditEvents.filter(e => e.eventType === 'AUTH_SUCCESS').length,
          authFailures: auditEvents.filter(e => e.eventType === 'AUTH_FAILURE').length,
          sessionsCreated: auditEvents.filter(e => e.eventType === 'SESSION_CREATED').length,
          rateLimitExceeded: auditEvents.filter(e => e.eventType === 'RATE_LIMIT_EXCEEDED').length
        },
        configuration: {
          encryptionEnabled: this.config.enableEncryption,
          signaturesEnabled: this.config.enableSignatures,
          keyRotationEnabled: this.config.keyRotationEnabled,
          sessionTimeout: this.config.sessionTimeout / 1000 / 60 // minutes
        },
        recentEvents: auditEvents.slice(0, 20).map(event => ({
          eventType: event.eventType,
          timestamp: event.timestamp,
          sourceIp: event.sourceIp,
          errorMessage: event.errorMessage
        }))
      }

      return stats

    } catch (error) {
      console.error('Failed to get security stats:', error)
      return {
        activeSessions: 0,
        last24Hours: { authSuccesses: 0, authFailures: 0, sessionsCreated: 0, rateLimitExceeded: 0 },
        configuration: {},
        recentEvents: []
      }
    }
  }

  /**
   * Check rate limiting
   */
  private checkRateLimit(sourceIp: string): boolean {
    const now = Date.now()
    const limit = this.rateLimitMap.get(sourceIp)

    if (!limit || now > limit.resetTime) {
      // Reset or create new limit
      this.rateLimitMap.set(sourceIp, {
        count: 1,
        resetTime: now + this.config.rateLimitWindow
      })
      return true
    }

    if (limit.count >= this.config.rateLimitMaxRequests) {
      return false
    }

    limit.count++
    return true
  }

  /**
   * Validate registration key
   */
  private async validateRegistrationKey(providedKeyHash: string): Promise<boolean> {
    try {
      const currentKeyHash = this.hashRegistrationKey(this.currentRegistrationKey)
      if (providedKeyHash === currentKeyHash) {
        return true
      }

      // Check previous key during grace period
      if (this.previousRegistrationKey) {
        const previousKeyHash = this.hashRegistrationKey(this.previousRegistrationKey)
        if (providedKeyHash === previousKeyHash) {
          return true
        }
      }

      return false
    } catch (error) {
      console.error('Key validation failed:', error)
      return false
    }
  }

  /**
   * Hash registration key
   */
  private hashRegistrationKey(key: string): string {
    const crypto = require('crypto')
    return crypto.createHash('sha256').update(key).digest('hex')
  }

  /**
   * Generate auth token
   */
  private async generateAuthToken(nodeId: string): Promise<string> {
    const tokenId = crypto.randomUUID()
    const now = new Date()
    const expiresAt = new Date(now.getTime() + this.TOKEN_VALIDITY_PERIOD)

    const tokenData = {
      tokenId,
      nodeId,
      issuedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      permissions: ['sync_read', 'sync_write', 'peer_discovery'],
      issuer: this.nodeId
    }

    // Sign the token
    const crypto = require('crypto')
    const tokenString = JSON.stringify(tokenData)
    const signature = crypto.createHmac('sha256', this.currentRegistrationKey)
      .update(tokenString)
      .digest('hex')

    const authToken = Buffer.from(JSON.stringify({ ...tokenData, signature })).toString('base64')

    // Store token
    await this.storeAuthToken(tokenId, nodeId, expiresAt, authToken)

    return authToken
  }

  /**
   * Validate auth token
   */
  private async validateAuthToken(authToken: string): Promise<{ valid: boolean; tokenData?: any; errorMessage?: string }> {
    try {
      // Decode token
      const tokenString = Buffer.from(authToken, 'base64').toString('utf8')
      const tokenData = JSON.parse(tokenString)

      if (!tokenData.signature || !tokenData.tokenId || !tokenData.nodeId) {
        return { valid: false, errorMessage: 'Invalid token format' }
      }

      // Check expiration
      const expiresAt = new Date(tokenData.expiresAt)
      if (new Date() > expiresAt) {
        return { valid: false, errorMessage: 'Token expired' }
      }

      // Verify signature
      const { signature, ...dataToVerify } = tokenData
      const expectedSignature = require('crypto')
        .createHmac('sha256', this.currentRegistrationKey)
        .update(JSON.stringify(dataToVerify))
        .digest('hex')

      if (signature !== expectedSignature) {
        // Try with previous key if available
        if (this.previousRegistrationKey) {
          const previousSignature = require('crypto')
            .createHmac('sha256', this.previousRegistrationKey)
            .update(JSON.stringify(dataToVerify))
            .digest('hex')

          if (signature !== previousSignature) {
            return { valid: false, errorMessage: 'Invalid token signature' }
          }
        } else {
          return { valid: false, errorMessage: 'Invalid token signature' }
        }
      }

      return { valid: true, tokenData }

    } catch (error) {
      return { valid: false, errorMessage: 'Token validation failed' }
    }
  }

  /**
   * Generate secure key
   */
  private generateSecureKey(length: number): string {
    const crypto = require('crypto')
    return crypto.randomBytes(length).toString('hex')
  }

  /**
   * Start key rotation
   */
  private startKeyRotation(): void {
    this.keyRotationTimer = setInterval(async () => {
      try {
        await this.rotateRegistrationKey()
      } catch (error) {
        console.error('Automatic key rotation failed:', error)
      }
    }, this.config.keyRotationInterval)
  }

  /**
   * Start session cleanup
   */
  private startSessionCleanup(): void {
    this.sessionCleanupTimer = setInterval(async () => {
      await this.cleanupExpiredSessions()
    }, this.SESSION_CLEANUP_INTERVAL)
  }

  /**
   * Cleanup expired sessions
   */
  private async cleanupExpiredSessions(): Promise<void> {
    const now = new Date()
    const expiredSessions: string[] = []

    for (const [sessionId, session] of this.activeSessions) {
      if (now > session.expiresAt || !session.isValid) {
        expiredSessions.push(sessionId)
      }
    }

    for (const sessionId of expiredSessions) {
      await this.invalidateSession(sessionId)
    }

    if (expiredSessions.length > 0) {
      console.log(`Cleaned up ${expiredSessions.length} expired sessions`)
    }
  }

  /**
   * Audit security event
   */
  private async auditSecurityEvent(
    eventType: SecurityAuditEntry['eventType'],
    sourceIp: string,
    targetNodeId?: string,
    errorMessage?: string,
    metadata: any = {}
  ): Promise<void> {
    try {
      await this.prisma.securityAudit.create({
        data: {
          auditId: crypto.randomUUID(),
          nodeId: this.nodeId,
          eventType,
          timestamp: new Date(),
          sourceIp,
          targetNodeId,
          errorMessage,
          metadata
        }
      })
    } catch (error) {
      console.error('Failed to audit security event:', error)
    }
  }

  /**
   * Load existing sessions
   */
  private async loadExistingSessions(): Promise<void> {
    // Implementation would load from database if sessions were persisted
    // For now, start with empty state
  }

  /**
   * Store security session
   */
  private async storeSecuritySession(session: SecuritySession): Promise<void> {
    // Would implement persistent storage if needed
  }

  /**
   * Update security session
   */
  private async updateSecuritySession(session: SecuritySession): Promise<void> {
    // Would implement persistent storage if needed
  }

  /**
   * Store auth token
   */
  private async storeAuthToken(tokenId: string, nodeId: string, expiresAt: Date, authToken: string): Promise<void> {
    // Would implement persistent storage if needed
  }

  /**
   * Store registration key
   */
  private async storeRegistrationKey(key: string): Promise<void> {
    // Would implement secure key storage if needed
  }
}

/**
 * Create security manager
 */
export function createSecurityManager(
  prisma: PrismaClient,
  nodeId: string,
  config: SecurityConfig
): SecurityManager {
  return new SecurityManager(prisma, nodeId, config)
}