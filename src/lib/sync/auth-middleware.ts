/**
 * Authentication Middleware
 * Provides HTTP middleware for secure sync API endpoints
 */

import { NextRequest, NextResponse } from 'next/server'
import { SecurityManager } from './security-manager'
import { PrismaClient } from '@prisma/client'

export interface AuthenticatedRequest extends NextRequest {
  auth?: {
    nodeId: string
    sessionId: string
    permissions: string[]
    isAuthenticated: boolean
  }
}

export interface AuthMiddlewareConfig {
  registrationKey: string
  requireEncryption: boolean
  requireSignatures: boolean
  sessionTimeout: number
  rateLimitEnabled: boolean
  auditEnabled: boolean
}

/**
 * Authentication Middleware Factory
 * Creates middleware for protecting sync API endpoints
 */
export class AuthMiddleware {
  private securityManager: SecurityManager
  private config: AuthMiddlewareConfig

  constructor(securityManager: SecurityManager, config: AuthMiddlewareConfig) {
    this.securityManager = securityManager
    this.config = config
  }

  /**
   * Create authentication middleware
   */
  authenticate() {
    return async (request: NextRequest): Promise<{ success: boolean; response?: NextResponse; auth?: any }> => {
      try {
        // Extract authentication headers
        const authHeader = request.headers.get('Authorization')
        const sessionHeader = request.headers.get('X-Session-ID')
        const nodeIdHeader = request.headers.get('X-Node-ID')

        if (!authHeader) {
          return {
            success: false,
            response: NextResponse.json({ error: 'Missing authorization header' }, { status: 401 })
          }
        }

        // Parse Bearer token
        const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/)
        if (!tokenMatch) {
          return {
            success: false,
            response: NextResponse.json({ error: 'Invalid authorization format' }, { status: 401 })
          }
        }

        const authToken = tokenMatch[1]

        // Validate auth token
        const tokenValidation = await this.validateAuthToken(authToken)
        if (!tokenValidation.valid) {
          return {
            success: false,
            response: NextResponse.json({ error: tokenValidation.errorMessage || 'Invalid token' }, { status: 401 })
          }
        }

        // Validate session if provided
        let sessionValidation: any = { valid: true }
        if (sessionHeader) {
          sessionValidation = await this.securityManager.validateSession(sessionHeader)
          if (!sessionValidation.valid) {
            return {
              success: false,
              response: NextResponse.json({ error: sessionValidation.errorMessage || 'Invalid session' }, { status: 401 })
            }
          }
        }

        // Create auth context
        const auth = {
          nodeId: tokenValidation.tokenData.nodeId,
          sessionId: sessionHeader || null,
          permissions: tokenValidation.tokenData.permissions || [],
          isAuthenticated: true,
          tokenData: tokenValidation.tokenData,
          session: sessionValidation.session
        }

        return { success: true, auth }

      } catch (error) {
        console.error('Authentication failed:', error)
        return {
          success: false,
          response: NextResponse.json({ error: 'Authentication error' }, { status: 500 })
        }
      }
    }
  }

  /**
   * Create permission checking middleware
   */
  requirePermission(requiredPermissions: string | string[]) {
    return (auth: any): { success: boolean; response?: NextResponse } => {
      if (!auth || !auth.isAuthenticated) {
        return {
          success: false,
          response: NextResponse.json({ error: 'Authentication required' }, { status: 401 })
        }
      }

      const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions]
      const userPermissions = auth.permissions || []

      const hasPermission = permissions.every(permission =>
        userPermissions.includes(permission) || userPermissions.includes('admin')
      )

      if (!hasPermission) {
        return {
          success: false,
          response: NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
        }
      }

      return { success: true }
    }
  }

  /**
   * Create encryption validation middleware
   */
  requireEncryption() {
    return (request: NextRequest, auth: any): { success: boolean; response?: NextResponse; decryptedData?: any } => {
      if (!this.config.requireEncryption) {
        return { success: true }
      }

      if (!auth.sessionId) {
        return {
          success: false,
          response: NextResponse.json({ error: 'Encrypted session required' }, { status: 400 })
        }
      }

      // Extract encrypted data from request body
      // This would be implemented based on the specific encryption format
      return { success: true }
    }
  }

  /**
   * Create rate limiting middleware
   */
  rateLimit() {
    return async (request: NextRequest): Promise<{ success: boolean; response?: NextResponse }> => {
      if (!this.config.rateLimitEnabled) {
        return { success: true }
      }

      const clientIp = this.getClientIP(request)

      // Rate limiting would be handled by the security manager
      // This is a placeholder for the integration
      return { success: true }
    }
  }

  /**
   * Validate auth token
   */
  private async validateAuthToken(authToken: string): Promise<{ valid: boolean; tokenData?: any; errorMessage?: string }> {
    try {
      // Decode and validate the token
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

      // Verify signature using registration key
      const { signature, ...dataToVerify } = tokenData
      const crypto = require('crypto')
      const expectedSignature = crypto
        .createHmac('sha256', this.config.registrationKey)
        .update(JSON.stringify(dataToVerify))
        .digest('hex')

      if (signature !== expectedSignature) {
        return { valid: false, errorMessage: 'Invalid token signature' }
      }

      return { valid: true, tokenData }

    } catch (error) {
      return { valid: false, errorMessage: 'Token validation failed' }
    }
  }

  /**
   * Get client IP address
   */
  private getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for')
    const realIP = request.headers.get('x-real-ip')

    if (forwarded) {
      return forwarded.split(',')[0].trim()
    }

    if (realIP) {
      return realIP
    }

    return 'unknown'
  }
}

/**
 * Higher-order function to create protected API handlers
 */
export function withAuth(
  handler: (request: AuthenticatedRequest, auth: any) => Promise<NextResponse>,
  options: {
    permissions?: string | string[]
    requireEncryption?: boolean
    rateLimitEnabled?: boolean
  } = {}
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      // This would be initialized with the actual security manager
      // For now, we'll use a simplified version
      const authResult = await validateRequest(request)

      if (!authResult.success) {
        return authResult.response!
      }

      // Check permissions if specified
      if (options.permissions) {
        const permissionCheck = checkPermissions(authResult.auth, options.permissions)
        if (!permissionCheck.success) {
          return permissionCheck.response!
        }
      }

      // Call the protected handler
      const authenticatedRequest = request as AuthenticatedRequest
      authenticatedRequest.auth = authResult.auth

      return await handler(authenticatedRequest, authResult.auth)

    } catch (error) {
      console.error('Protected handler error:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }
}

/**
 * Simplified request validation for demonstration
 */
async function validateRequest(request: NextRequest): Promise<{ success: boolean; response?: NextResponse; auth?: any }> {
  const authHeader = request.headers.get('Authorization')

  if (!authHeader) {
    return {
      success: false,
      response: NextResponse.json({ error: 'Authorization header required' }, { status: 401 })
    }
  }

  // Extract Bearer token
  const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/)
  if (!tokenMatch) {
    return {
      success: false,
      response: NextResponse.json({ error: 'Invalid authorization format' }, { status: 401 })
    }
  }

  // For now, accept any valid-looking token
  // In production, this would validate against the security manager
  const auth = {
    nodeId: 'authenticated-node',
    sessionId: request.headers.get('X-Session-ID'),
    permissions: ['sync_read', 'sync_write', 'peer_discovery'],
    isAuthenticated: true
  }

  return { success: true, auth }
}

/**
 * Check user permissions
 */
function checkPermissions(auth: any, requiredPermissions: string | string[]): { success: boolean; response?: NextResponse } {
  if (!auth || !auth.isAuthenticated) {
    return {
      success: false,
      response: NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
  }

  const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions]
  const userPermissions = auth.permissions || []

  const hasPermission = permissions.every(permission =>
    userPermissions.includes(permission) || userPermissions.includes('admin')
  )

  if (!hasPermission) {
    return {
      success: false,
      response: NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }
  }

  return { success: true }
}

/**
 * Create security headers for responses
 */
export function createSecurityHeaders(): Headers {
  const headers = new Headers()

  headers.set('X-Content-Type-Options', 'nosniff')
  headers.set('X-Frame-Options', 'DENY')
  headers.set('X-XSS-Protection', '1; mode=block')
  headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  headers.set('Content-Security-Policy', "default-src 'self'")

  return headers
}

/**
 * Add security headers to response
 */
export function addSecurityHeaders(response: NextResponse): NextResponse {
  const securityHeaders = createSecurityHeaders()

  securityHeaders.forEach((value, key) => {
    response.headers.set(key, value)
  })

  return response
}