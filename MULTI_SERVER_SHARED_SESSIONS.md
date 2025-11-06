# Multi-Server Setup with Shared User Sessions

## Overview

When running multiple servers that users can access interchangeably (e.g., Server A at `http://192.168.1.100:8080` and Server B at `http://192.168.1.101:8080`), you need to configure them to share user sessions.

## Configuration Requirements

### ✅ MUST BE THE SAME on All Servers

These settings **MUST match exactly** on all servers for proper operation:

```bash
# Authentication - Required for session sharing
NEXTAUTH_SECRET="V4h2s9mZqL1t8R0pXy3N6bQwFh7uJrT5aKzPdUcYv2M="

# Sync Authentication - Required for peer discovery
SYNC_REGISTRATION_KEY="b3f1c9d7a5e4f2c3819d6b7a2e4f0c1d2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7"

# Service Port - Required for peer communication
SYNC_SERVICE_PORT=8765
```

### ⚠️ MUST BE UNIQUE on Each Server

These settings **MUST be different** on each server:

```bash
# Server 1
SYNC_NODE_ID="2595930f841f02e1"
SYNC_NODE_NAME="sync-node-server-1"

# Server 2
SYNC_NODE_ID="a1b2c3d4e5f6g7h8"
SYNC_NODE_NAME="sync-node-server-2"
```

### 🔧 Server-Specific Settings

These settings will vary per server:

```bash
# Server 1
NEXTAUTH_URL="http://192.168.1.100:8080"
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/multi_business_db"

# Server 2  
NEXTAUTH_URL="http://192.168.1.101:8080"
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/multi_business_db"
```

## Why NEXTAUTH_SECRET Must Be The Same

When `NEXTAUTH_SECRET` differs between servers:

1. ❌ User logs in on Server 1
2. ❌ Session cookie is encrypted with Server 1's secret
3. ❌ User accesses Server 2
4. ❌ Server 2 tries to decrypt cookie with **different** secret
5. ❌ **Error**: "JWT_SESSION_ERROR: decryption operation failed"
6. ❌ User is logged out / must log in again

When `NEXTAUTH_SECRET` is the same on both servers:

1. ✅ User logs in on Server 1
2. ✅ Session cookie is encrypted with shared secret
3. ✅ User accesses Server 2
4. ✅ Server 2 successfully decrypts cookie with **same** secret
5. ✅ User remains logged in
6. ✅ Seamless experience across servers

## Security Considerations

### Is It Safe to Use the Same NEXTAUTH_SECRET?

**YES** - When both servers:
- Are in the same trusted network
- Are managed by the same organization
- Share the same database (or synced databases)
- Serve the same application to the same users

This is the **standard configuration** for:
- Load-balanced web applications
- High-availability setups
- Multi-server deployments with session sharing

### What About the Documentation Warning?

The documentation warns against using the same `NEXTAUTH_SECRET` when:
- Servers are **completely separate applications**
- Servers serve **different user bases**
- Servers should **not share sessions**

In your case, you're running **the same application** across multiple servers for high availability and data sync, so sharing secrets is **required and safe**.

## Complete Server 2 Configuration

Based on Server 1's `.env.local`, here's what Server 2 should have:

```bash
# ================================
# SAME ON BOTH SERVERS
# ================================
NEXTAUTH_SECRET="V4h2s9mZqL1t8R0pXy3N6bQwFh7uJrT5aKzPdUcYv2M="
SYNC_REGISTRATION_KEY="b3f1c9d7a5e4f2c3819d6b7a2e4f0c1d2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7"
SYNC_SERVICE_PORT=8765
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/multi_business_db"

# ================================
# UNIQUE TO SERVER 2
# ================================
SYNC_NODE_ID="a1b2c3d4e5f6g7h8"  # Generate new: openssl rand -hex 8
SYNC_NODE_NAME="sync-node-server-2"  # Descriptive name for Server 2
NEXTAUTH_URL="http://[server-2-ip]:8080"  # Server 2's IP address

# ================================
# SAME APPLICATION SETTINGS
# ================================
NODE_ENV="development"
APP_NAME="Multi-Business Management Platform"
PORT=8080
SYNC_HTTP_PORT=8080
SYNC_INTERVAL=30000
SYNC_AUTO_START=true
SYNC_LOG_LEVEL="info"

# All other settings same as Server 1...
```

## Setup Steps

### 1. On Server 2, Update `.env.local`:

```bash
# Copy these EXACT values from Server 1
NEXTAUTH_SECRET="V4h2s9mZqL1t8R0pXy3N6bQwFh7uJrT5aKzPdUcYv2M="
SYNC_REGISTRATION_KEY="b3f1c9d7a5e4f2c3819d6b7a2e4f0c1d2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7"

# Generate NEW unique values for Server 2
SYNC_NODE_ID="a1b2c3d4e5f6g7h8"
SYNC_NODE_NAME="sync-node-server-2"
NEXTAUTH_URL="http://[server-2-ip]:8080"
```

### 2. Restart Both Servers:

```bash
# On both Server 1 and Server 2
npm run service:stop
npm run service:start

# Wait 30-60 seconds for peer discovery
npm run service:status
```

### 3. Verify:

- Check `npm run service:status` shows "Peers Connected: 1" on both servers
- Log in on Server 1, access Server 2 - should stay logged in
- No JWT decryption errors in logs

## Troubleshooting

### Still Getting JWT Errors After Matching NEXTAUTH_SECRET?

1. **Clear browser cookies** - Old cookies encrypted with different secret
2. **Restart Next.js** - `npm run dev` or restart production server
3. **Check .env.local** - Ensure no extra spaces or quotes in secret
4. **Verify same secret** - Compare character-by-character

### Peers Still Not Discovering Each Other?

Check:
- ✅ `SYNC_REGISTRATION_KEY` matches on both servers
- ✅ Firewall allows UDP 5353 and TCP 8765
- ✅ Both servers on same network
- ✅ Can ping between servers
- ✅ Sync service running on both: `npm run service:status`

## Summary

**For multi-server setups with shared user sessions:**

| Setting | Requirement | Reason |
|---------|-------------|--------|
| `NEXTAUTH_SECRET` | **SAME** | Session cookie decryption |
| `SYNC_REGISTRATION_KEY` | **SAME** | Peer authentication |
| `SYNC_NODE_ID` | **UNIQUE** | Server identification |
| `SYNC_NODE_NAME` | **UNIQUE** | Human-readable server name |
| `NEXTAUTH_URL` | **DIFFERENT** | Server-specific URL |
| `DATABASE_URL` | **SAME/SYNCED** | Shared data access |

This configuration enables:
- ✅ Users can access any server
- ✅ Sessions work across all servers
- ✅ Automatic peer discovery and sync
- ✅ High availability
- ✅ Load distribution
