/**
 * Sync Service Authentication
 * Validates registration key for cross-node printer access
 */

import { NextRequest } from 'next/server';

/**
 * Validate sync registration key for cross-node requests
 * Ensures only authorized nodes can access printer sync endpoints
 */
export function validateSyncRegistrationKey(request: NextRequest): boolean {
  // Check for sync key in headers
  const syncKey = 
    request.headers.get('x-sync-key') || 
    request.headers.get('authorization')?.replace('Bearer ', '');

  // Get expected key from environment
  const expectedKey = process.env.SYNC_REGISTRATION_KEY;

  // Security warning if key not configured
  if (!expectedKey) {
    console.warn('[SECURITY WARNING] SYNC_REGISTRATION_KEY not configured in .env - sync endpoints are insecure!');
    return false;
  }

  // Validate key matches
  const isValid = syncKey === expectedKey;

  if (!isValid) {
    console.warn('[SECURITY] Invalid sync registration key attempt from:', {
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      userAgent: request.headers.get('user-agent')
    });
  }

  return isValid;
}

/**
 * Check if request is a cross-node sync request
 */
export function isSyncRequest(request: NextRequest): boolean {
  return request.headers.get('x-sync-request') === 'true';
}

/**
 * Middleware helper to validate sync requests
 * Returns error response if validation fails, null if valid
 */
export function validateSyncRequestOrError(request: NextRequest): Response | null {
  if (!isSyncRequest(request)) {
    return null; // Not a sync request, continue with normal auth
  }

  if (!validateSyncRegistrationKey(request)) {
    return new Response(
      JSON.stringify({ 
        error: 'Invalid or missing sync registration key',
        message: 'Cross-node requests must include a valid x-sync-key header'
      }),
      { 
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  return null; // Valid sync request
}
