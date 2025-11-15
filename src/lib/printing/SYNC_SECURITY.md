# Cross-Node Printer Access Security

## Overview

Cross-node printer access is secured using the `SYNC_REGISTRATION_KEY` environment variable. This key must be shared across all nodes in the network to allow them to synchronize printer information.

## Configuration

### 1. Set the Registration Key

Add to your `.env` file on **all nodes**:

```env
SYNC_REGISTRATION_KEY=your-secure-random-key-here
```

**Generate a secure key:**
```bash
# Generate a random 32-character key
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

### 2. Share the Key Securely

- The same `SYNC_REGISTRATION_KEY` must be configured on all nodes
- Store the key securely (e.g., in a password manager, encrypted secrets)
- Never commit the key to version control
- Rotate the key periodically for security

## How It Works

### Cross-Node Sync Requests

When the sync service on Node A wants to fetch printer information from Node B:

1. Node A includes the sync key in the request header:
   ```http
   GET /api/sync/printers
   Host: node-b.local:8080
   x-sync-request: true
   x-sync-key: your-secure-random-key-here
   ```

2. Node B validates the key before returning printer data

3. If the key is invalid or missing, the request is rejected with 403 Forbidden

### Request Flow

```
┌─────────┐                              ┌─────────┐
│ Node A  │                              │ Node B  │
│         │                              │         │
│ Sync    │  GET /api/sync/printers     │  API    │
│ Service ├─────────────────────────────>│ Route   │
│         │  x-sync-key: abc123...       │         │
│         │                              │         │
│         │ <────────────────────────────┤         │
│         │  { printers: [...] }         │         │
└─────────┘                              └─────────┘
                  ↓
          Validates sync key
          matches SYNC_REGISTRATION_KEY
```

## Implementation

### API Route Integration

```typescript
// src/app/api/sync/printers/route.ts
import { validateSyncRequestOrError, isSyncRequest } from '@/lib/printing/sync-auth';

export async function GET(request: NextRequest) {
  // Check if this is a sync request
  if (isSyncRequest(request)) {
    // Validate sync key
    const error = validateSyncRequestOrError(request);
    if (error) return error;

    // Proceed with sync request (no session required)
  } else {
    // Regular user request - validate session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  // ... rest of the handler
}
```

### Sync Service Client

```typescript
// src/lib/sync/printer-discovery.ts
async function fetchRemotePrinters(nodeUrl: string): Promise<NetworkPrinter[]> {
  const response = await fetch(`${nodeUrl}/api/sync/printers`, {
    headers: {
      'x-sync-request': 'true',
      'x-sync-key': process.env.SYNC_REGISTRATION_KEY || ''
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch printers from ${nodeUrl}`);
  }

  const data = await response.json();
  return data.printers;
}
```

## Security Features

### 1. Key Validation
- ✅ Validates `SYNC_REGISTRATION_KEY` matches across nodes
- ✅ Rejects requests with invalid or missing keys
- ✅ Logs security warnings for invalid attempts

### 2. Request Identification
- ✅ Uses `x-sync-request: true` header to identify sync requests
- ✅ Separates sync authentication from user authentication
- ✅ Allows dual-mode endpoints (sync + user access)

### 3. Security Logging
- ✅ Logs invalid key attempts with IP address
- ✅ Warns if `SYNC_REGISTRATION_KEY` not configured
- ✅ Tracks cross-node printer access

### 4. Fallback Security
- ✅ If sync key missing, falls back to session auth
- ✅ Admin-only POST endpoints even with valid sync key
- ✅ Permission checks still enforced

## Security Best Practices

### ✅ DO:
- Generate a strong, random registration key
- Use HTTPS for all cross-node communication
- Rotate the key periodically (e.g., quarterly)
- Store the key in secure environment variables
- Monitor logs for invalid key attempts
- Use VPN or firewall rules to restrict network access

### ❌ DON'T:
- Hardcode the key in source code
- Share the key over insecure channels (email, chat)
- Use weak or predictable keys
- Expose the key in client-side code
- Reuse keys across different environments (dev/staging/prod)

## Troubleshooting

### Error: "Invalid or missing sync registration key"

**Cause:** The `x-sync-key` header doesn't match `SYNC_REGISTRATION_KEY`

**Solution:**
1. Verify `SYNC_REGISTRATION_KEY` is set in `.env` on both nodes
2. Ensure the key is **exactly** the same on all nodes
3. Check for whitespace or encoding issues
4. Restart the application after changing `.env`

### Warning: "SYNC_REGISTRATION_KEY not configured"

**Cause:** The environment variable is not set

**Solution:**
1. Add `SYNC_REGISTRATION_KEY=...` to your `.env` file
2. Restart the application
3. Verify with: `echo $SYNC_REGISTRATION_KEY` (Linux) or `echo %SYNC_REGISTRATION_KEY%` (Windows)

### Sync requests fail with 403 Forbidden

**Possible causes:**
1. Key mismatch between nodes
2. Header not included in request (`x-sync-request`, `x-sync-key`)
3. Key contains special characters that need URL encoding
4. Environment variable not loaded properly

**Debug steps:**
```javascript
// Log the key (safely, without exposing it)
console.log('Sync key configured:', !!process.env.SYNC_REGISTRATION_KEY);
console.log('Sync key length:', process.env.SYNC_REGISTRATION_KEY?.length);
```

## Testing Cross-Node Security

### Test 1: Valid Sync Key
```bash
curl -H "x-sync-request: true" \
     -H "x-sync-key: your-key-here" \
     http://localhost:8080/api/sync/printers
```

**Expected:** 200 OK with printer list

### Test 2: Invalid Sync Key
```bash
curl -H "x-sync-request: true" \
     -H "x-sync-key: wrong-key" \
     http://localhost:8080/api/sync/printers
```

**Expected:** 403 Forbidden

### Test 3: Missing Sync Key
```bash
curl -H "x-sync-request: true" \
     http://localhost:8080/api/sync/printers
```

**Expected:** 403 Forbidden

### Test 4: Regular User Request (No Sync Header)
```bash
curl -H "Cookie: next-auth.session-token=..." \
     http://localhost:8080/api/sync/printers
```

**Expected:** 200 OK (if authenticated) or 401 Unauthorized

## Migration Guide

### From Insecure to Secure

If you have existing nodes without `SYNC_REGISTRATION_KEY`:

1. **Generate a key** on the main node
2. **Add to .env** on all nodes
3. **Restart all nodes** to load the new variable
4. **Test sync** between nodes
5. **Monitor logs** for any auth failures

### Zero-Downtime Migration

1. Deploy code with sync auth but **don't require it** yet (backward compatible mode)
2. Add `SYNC_REGISTRATION_KEY` to all nodes
3. Enable strict mode by removing fallback auth
4. Monitor and verify all nodes syncing correctly

## Future Enhancements

- [ ] Implement key rotation mechanism
- [ ] Add support for multiple valid keys (during rotation)
- [ ] Implement rate limiting for sync endpoints
- [ ] Add mutual TLS (mTLS) for additional security
- [ ] Create admin UI for key management
- [ ] Implement automatic key expiration
- [ ] Add IP whitelist for allowed sync sources
- [ ] Integrate with secret management services (AWS Secrets Manager, HashiCorp Vault)
