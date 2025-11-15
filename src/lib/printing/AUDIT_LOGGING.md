# Printer Audit Logging

## Overview

The audit logger tracks all printer-related operations for security, compliance, and troubleshooting purposes.

## Usage

### Import the audit functions

```typescript
import {
  auditPrinterRegistered,
  auditPrinterUpdated,
  auditPrinterDeleted,
  auditPrintJobQueued,
  auditPrintJobCompleted,
  auditPrintJobFailed,
  auditPermissionDenied
} from '@/lib/printing/audit-logger'
```

### Example: Log printer registration (API route)

```typescript
// src/app/api/printers/route.ts
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  const data = await request.json()

  // Register printer
  const printer = await registerPrinter(data, nodeId)

  // Audit log
  auditPrinterRegistered(
    printer.id,
    printer.printerName,
    session.user.id,
    session.user.email,
    nodeId
  )

  return NextResponse.json({ printer })
}
```

### Example: Log print job queued

```typescript
// src/app/api/print/receipt/route.ts
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  const data = await request.json()

  // Queue print job
  const printJob = await queuePrintJob(...)

  // Audit log
  auditPrintJobQueued(
    printJob.id,
    printJob.printerId,
    printerName,
    session.user.id,
    data.businessId,
    'receipt',
    session.user.email
  )

  return NextResponse.json({ printJob })
}
```

### Example: Log permission denied

```typescript
// src/app/api/printers/route.ts
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!canManageNetworkPrinters(session.user)) {
    // Audit log permission denial
    auditPermissionDenied(
      session.user.id,
      'REGISTER_PRINTER',
      'network_printers',
      session.user.email,
      request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
    )

    return NextResponse.json(
      { error: 'Insufficient permissions' },
      { status: 403 }
    )
  }

  // ... proceed with operation
}
```

## Available Audit Functions

### Printer Management
- `auditPrinterRegistered(printerId, printerName, userId, userEmail, nodeId)`
- `auditPrinterUpdated(printerId, printerName, userId, userEmail, changes)`
- `auditPrinterDeleted(printerId, printerName, userId, userEmail)`
- `auditPrinterShared(printerId, printerName, userId, isShared, userEmail)`
- `auditPrinterStatusChanged(printerId, printerName, oldStatus, newStatus, nodeId)`

### Print Jobs
- `auditPrintJobQueued(jobId, printerId, printerName, userId, businessId, jobType, userEmail)`
- `auditPrintJobCompleted(jobId, printerId, printerName)`
- `auditPrintJobFailed(jobId, printerId, printerName, errorMessage)`
- `auditPrintJobRetried(jobId, printerId, printerName, userId, userEmail, retryAttempt)`

### Security
- `auditPermissionDenied(userId, action, resource, userEmail, ipAddress)`
- `auditCrossNodePrint(jobId, printerId, printerName, sourceNodeId, targetNodeId, userId, userEmail)`

## Log Format

All audit logs are written to console in JSON format:

```json
{
  "timestamp": "2025-11-13T10:30:00.000Z",
  "action": "PRINTER_REGISTERED",
  "userId": "user-123",
  "userEmail": "admin@example.com",
  "printerId": "printer-node1-123456",
  "printerName": "Office Printer",
  "nodeId": "node-001",
  "details": {
    "message": "Printer \"Office Printer\" registered by user admin@example.com"
  }
}
```

## Future Enhancements

- **Database Storage**: Write audit logs to `audit_logs` table for persistent storage
- **External Logging**: Send logs to CloudWatch, Datadog, or other logging services
- **Alerting**: Trigger alerts for security-sensitive events (e.g., multiple PERMISSION_DENIED from same user)
- **Log Retention**: Implement log rotation and retention policies
- **Search & Analytics**: Build UI for searching and analyzing audit logs

## Integration Points

Add audit logging to these API routes:

✅ **Implemented:**
- Created audit logger infrastructure
- Documented usage patterns

🔲 **TODO: Add audit calls to:**
- `/api/printers/route.ts` (POST - register, GET - list)
- `/api/printers/[id]/route.ts` (PUT - update, DELETE - delete)
- `/api/print/receipt/route.ts` (POST - queue receipt)
- `/api/print/label/route.ts` (POST - queue label)
- `/api/print/jobs/[id]/retry/route.ts` (POST - retry job)
- `/api/sync/printers/route.ts` (POST - cross-node sync)

## Best Practices

1. **Always log permission denials** - Critical for security monitoring
2. **Include user context** - userId and userEmail when available
3. **Sanitize sensitive data** - The logger automatically redacts passwords, tokens, etc.
4. **Log both success and failure** - Track completed and failed operations
5. **Include timestamps** - Automatically added by the logger
6. **Add contextual details** - Use the `details` parameter for additional information

## Example: Complete API Route with Audit Logging

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canManageNetworkPrinters } from '@/lib/permission-utils'
import { registerPrinter } from '@/lib/printing/printer-service'
import {
  auditPrinterRegistered,
  auditPermissionDenied
} from '@/lib/printing/audit-logger'

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Permission check
  if (!canManageNetworkPrinters(session.user)) {
    auditPermissionDenied(
      session.user.id,
      'REGISTER_PRINTER',
      'network_printers',
      session.user.email,
      request.headers.get('x-forwarded-for')
    )
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  try {
    const data = await request.json()
    const printer = await registerPrinter(data, nodeId)

    // Audit success
    auditPrinterRegistered(
      printer.id,
      printer.printerName,
      session.user.id,
      session.user.email,
      nodeId
    )

    return NextResponse.json({ success: true, printer })
  } catch (error) {
    console.error('Error registering printer:', error)
    return NextResponse.json(
      { error: 'Failed to register printer' },
      { status: 500 }
    )
  }
}
```

## Security Considerations

- Audit logs should be **write-only** for regular users
- Only system administrators should have access to view audit logs
- Logs should be stored in a tamper-proof manner (append-only)
- Implement log retention policies to comply with data protection regulations
- Monitor for suspicious patterns (e.g., repeated permission denials)
