"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthMiddleware = void 0;
exports.withAuth = withAuth;
exports.createSecurityHeaders = createSecurityHeaders;
exports.addSecurityHeaders = addSecurityHeaders;
const server_1 = require("next/server");
class AuthMiddleware {
    constructor(securityManager, config) {
        this.securityManager = securityManager;
        this.config = config;
    }
    authenticate() {
        return async (request) => {
            try {
                const authHeader = request.headers.get('Authorization');
                const sessionHeader = request.headers.get('X-Session-ID');
                const nodeIdHeader = request.headers.get('X-Node-ID');
                if (!authHeader) {
                    return {
                        success: false,
                        response: server_1.NextResponse.json({ error: 'Missing authorization header' }, { status: 401 })
                    };
                }
                const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/);
                if (!tokenMatch) {
                    return {
                        success: false,
                        response: server_1.NextResponse.json({ error: 'Invalid authorization format' }, { status: 401 })
                    };
                }
                const authToken = tokenMatch[1];
                const tokenValidation = await this.validateAuthToken(authToken);
                if (!tokenValidation.valid) {
                    return {
                        success: false,
                        response: server_1.NextResponse.json({ error: tokenValidation.errorMessage || 'Invalid token' }, { status: 401 })
                    };
                }
                let sessionValidation = { valid: true };
                if (sessionHeader) {
                    sessionValidation = await this.securityManager.validateSession(sessionHeader);
                    if (!sessionValidation.valid) {
                        return {
                            success: false,
                            response: server_1.NextResponse.json({ error: sessionValidation.errorMessage || 'Invalid session' }, { status: 401 })
                        };
                    }
                }
                const auth = {
                    nodeId: tokenValidation.tokenData.nodeId,
                    sessionId: sessionHeader || null,
                    permissions: tokenValidation.tokenData.permissions || [],
                    isAuthenticated: true,
                    tokenData: tokenValidation.tokenData,
                    session: sessionValidation.session
                };
                return { success: true, auth };
            }
            catch (error) {
                console.error('Authentication failed:', error);
                return {
                    success: false,
                    response: server_1.NextResponse.json({ error: 'Authentication error' }, { status: 500 })
                };
            }
        };
    }
    requirePermission(requiredPermissions) {
        return (auth) => {
            if (!auth || !auth.isAuthenticated) {
                return {
                    success: false,
                    response: server_1.NextResponse.json({ error: 'Authentication required' }, { status: 401 })
                };
            }
            const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
            const userPermissions = auth.permissions || [];
            const hasPermission = permissions.every(permission => userPermissions.includes(permission) || userPermissions.includes('admin'));
            if (!hasPermission) {
                return {
                    success: false,
                    response: server_1.NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
                };
            }
            return { success: true };
        };
    }
    requireEncryption() {
        return (request, auth) => {
            if (!this.config.requireEncryption) {
                return { success: true };
            }
            if (!auth.sessionId) {
                return {
                    success: false,
                    response: server_1.NextResponse.json({ error: 'Encrypted session required' }, { status: 400 })
                };
            }
            return { success: true };
        };
    }
    rateLimit() {
        return async (request) => {
            if (!this.config.rateLimitEnabled) {
                return { success: true };
            }
            const clientIp = this.getClientIP(request);
            return { success: true };
        };
    }
    async validateAuthToken(authToken) {
        try {
            const tokenString = Buffer.from(authToken, 'base64').toString('utf8');
            const tokenData = JSON.parse(tokenString);
            if (!tokenData.signature || !tokenData.tokenId || !tokenData.nodeId) {
                return { valid: false, errorMessage: 'Invalid token format' };
            }
            const expiresAt = new Date(tokenData.expiresAt);
            if (new Date() > expiresAt) {
                return { valid: false, errorMessage: 'Token expired' };
            }
            const { signature, ...dataToVerify } = tokenData;
            const crypto = require('crypto');
            const expectedSignature = crypto
                .createHmac('sha256', this.config.registrationKey)
                .update(JSON.stringify(dataToVerify))
                .digest('hex');
            if (signature !== expectedSignature) {
                return { valid: false, errorMessage: 'Invalid token signature' };
            }
            return { valid: true, tokenData };
        }
        catch (error) {
            return { valid: false, errorMessage: 'Token validation failed' };
        }
    }
    getClientIP(request) {
        const forwarded = request.headers.get('x-forwarded-for');
        const realIP = request.headers.get('x-real-ip');
        if (forwarded) {
            return forwarded.split(',')[0].trim();
        }
        if (realIP) {
            return realIP;
        }
        return 'unknown';
    }
}
exports.AuthMiddleware = AuthMiddleware;
function withAuth(handler, options = {}) {
    return async (request) => {
        try {
            const authResult = await validateRequest(request);
            if (!authResult.success) {
                return authResult.response;
            }
            if (options.permissions) {
                const permissionCheck = checkPermissions(authResult.auth, options.permissions);
                if (!permissionCheck.success) {
                    return permissionCheck.response;
                }
            }
            const authenticatedRequest = request;
            authenticatedRequest.auth = authResult.auth;
            return await handler(authenticatedRequest, authResult.auth);
        }
        catch (error) {
            console.error('Protected handler error:', error);
            return server_1.NextResponse.json({ error: 'Internal server error' }, { status: 500 });
        }
    };
}
async function validateRequest(request) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
        return {
            success: false,
            response: server_1.NextResponse.json({ error: 'Authorization header required' }, { status: 401 })
        };
    }
    const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/);
    if (!tokenMatch) {
        return {
            success: false,
            response: server_1.NextResponse.json({ error: 'Invalid authorization format' }, { status: 401 })
        };
    }
    const auth = {
        nodeId: 'authenticated-node',
        sessionId: request.headers.get('X-Session-ID'),
        permissions: ['sync_read', 'sync_write', 'peer_discovery'],
        isAuthenticated: true
    };
    return { success: true, auth };
}
function checkPermissions(auth, requiredPermissions) {
    if (!auth || !auth.isAuthenticated) {
        return {
            success: false,
            response: server_1.NextResponse.json({ error: 'Authentication required' }, { status: 401 })
        };
    }
    const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
    const userPermissions = auth.permissions || [];
    const hasPermission = permissions.every(permission => userPermissions.includes(permission) || userPermissions.includes('admin'));
    if (!hasPermission) {
        return {
            success: false,
            response: server_1.NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
        };
    }
    return { success: true };
}
function createSecurityHeaders() {
    const headers = new Headers();
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('X-Frame-Options', 'DENY');
    headers.set('X-XSS-Protection', '1; mode=block');
    headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    headers.set('Content-Security-Policy', "default-src 'self'");
    return headers;
}
function addSecurityHeaders(response) {
    const securityHeaders = createSecurityHeaders();
    securityHeaders.forEach((value, key) => {
        response.headers.set(key, value);
    });
    return response;
}
