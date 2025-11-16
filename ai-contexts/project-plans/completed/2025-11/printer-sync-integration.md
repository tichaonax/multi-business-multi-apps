# Printer Sync Integration Plan

**Date**: 2025-11-14
**Status**: 🚧 Planning

## Overview

Integrate printer synchronization with the main sync service to enable:
- **Local USB printing** ✅ Working (tested successfully)
- **Background print queue processing** ✅ Implemented (needs server restart)
- **Remote printer sharing** ❌ Not integrated yet

## Current State

### ✅ Already Working:
1. **Direct USB printing** - Test script successfully sends to EPSON TM-T20III
2. **Print job queue** - Jobs are created and stored in database
3. **Background worker** - Implemented in `src/lib/printing/print-queue-worker.ts`
4. **Printer discovery** - Complete infrastructure exists:
   - `src/lib/sync/printer-discovery.ts` - mDNS-based discovery
   - `src/lib/sync/printer-sync.ts` - Sync orchestration
   - `src/lib/sync/printer-sync-integration.ts` - Integration helpers

### ❌ Missing:
1. **Sync service integration** - Printer sync not connected to main sync service
2. **Server restart** - Background worker needs restart to activate
3. **Remote print job routing** - Print jobs can't be sent to remote nodes yet

## Integration Tasks

### Task 1: Integrate Printer Sync into Main Sync Service

**File**: `src/lib/sync/sync-service.ts`

**Changes needed** (per `printer-sync-integration.ts` instructions):

1. **Add import** (top of file):
   ```typescript
   import { PrinterSyncService, createPrinterSyncService } from './printer-sync'
   ```

2. **Add property** (around line 85):
   ```typescript
   private printerSync: PrinterSyncService | null = null
   ```

3. **Add config option** (in SyncServiceConfig interface, around line 35):
   ```typescript
   enablePrinterSync?: boolean // Default: true
   ```

4. **Add initialization method** (after initializeCompatibilityGuard):
   ```typescript
   private async initializePrinterSync(): Promise<void> {
     try {
       if (this.config.enablePrinterSync === false) {
         this.log('info', 'Printer sync disabled by configuration')
         return
       }

       if (!this.peerDiscovery) {
         this.log('warn', 'Cannot initialize printer sync without peer discovery')
         return
       }

       this.log('info', 'Initializing printer sync service...')

       this.printerSync = createPrinterSyncService(
         this.nodeId,
         this.peerDiscovery,
         this.prisma,
         true
       )

       // Start printer sync
       await this.printerSync.start()

       this.log('info', '✅ Printer sync service initialized')
     } catch (error) {
       this.log('error', 'Failed to initialize printer sync:', error)
     }
   }
   ```

5. **Call in start() method** (after line 186):
   ```typescript
   // Initialize printer sync
   await this.initializePrinterSync()
   ```

6. **Add cleanup in stop()** (around line 270):
   ```typescript
   if (this.printerSync) {
     await this.printerSync.stop()
   }
   ```

7. **Add getter method** (around line 800):
   ```typescript
   public getPrinterSync(): PrinterSyncService | null {
     return this.printerSync
   }
   ```

### Task 2: Create Remote Print Job API

**File**: `src/app/api/print/remote/route.ts` (new file)

**Purpose**: API endpoint to submit print jobs to remote nodes

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

/**
 * Submit print job to remote node
 * POST /api/print/remote
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const prisma = new PrismaClient()

  try {
    const data = await request.json()
    const { printerId, nodeId, content, jobType } = data

    // Validate printer exists and is remote
    const printer = await prisma.networkPrinters.findUnique({
      where: { printerId }
    })

    if (!printer) {
      return NextResponse.json(
        { error: 'Printer not found' },
        { status: 404 }
      )
    }

    if (printer.nodeId === process.env.SYNC_NODE_ID) {
      return NextResponse.json(
        { error: 'Use /api/print/receipt for local printers' },
        { status: 400 }
      )
    }

    // Get peer info from sync service
    const peerUrl = await getPeerUrl(nodeId)
    if (!peerUrl) {
      return NextResponse.json(
        { error: 'Remote node not available' },
        { status: 503 }
      )
    }

    // Forward print job to remote node
    const response = await fetch(`${peerUrl}/api/print/receipt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sync-Registration-Key': process.env.SYNC_REGISTRATION_KEY || ''
      },
      body: JSON.stringify({
        printerId,
        content,
        jobType,
        copies: data.copies || 1
      })
    })

    if (!response.ok) {
      const error = await response.json()
      return NextResponse.json(
        { error: error.message || 'Remote print failed' },
        { status: response.status }
      )
    }

    const result = await response.json()
    return NextResponse.json(result)

  } catch (error) {
    console.error('Remote print error:', error)
    return NextResponse.json(
      { error: 'Failed to submit remote print job' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

async function getPeerUrl(nodeId: string): Promise<string | null> {
  // TODO: Implement peer URL lookup from sync service
  // This would query the peer discovery service for the node's URL
  return null
}
```

### Task 3: Update Print UI for Remote Printers

**File**: `src/components/printing/receipt-preview-modal.tsx`

**Changes**:
1. Show remote printer icon/indicator
2. Route to `/api/print/remote` for remote printers
3. Route to `/api/print/receipt` for local printers

```typescript
const handlePrint = async () => {
  if (!receiptData || !configuredPrinter) return

  setPrinting(true)
  try {
    const isRemotePrinter = configuredPrinter.nodeId !== process.env.NEXT_PUBLIC_SYNC_NODE_ID

    if (isRemotePrinter) {
      // Remote printer - forward to remote node
      await fetch('/api/print/remote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          printerId: configuredPrinter.id,
          nodeId: configuredPrinter.nodeId,
          content: receiptData,
          jobType: 'receipt'
        })
      })
    } else {
      // Local printer
      await onPrint(receiptData, configuredPrinter.id)
    }

    onClose()
  } catch (error) {
    console.error('Print failed:', error)
  } finally {
    setPrinting(false)
  }
}
```

### Task 4: Test Complete Flow

1. **Start both nodes**:
   - Node A: `npm run service:start` (has printer)
   - Node B: `npm run service:start` (no printer)

2. **Verify printer discovery**:
   - Check Node B sees Node A's printer
   - Check `/api/printers?includeRemote=true`

3. **Test remote print**:
   - From Node B, select Node A's printer
   - Submit print job
   - Verify job routes to Node A
   - Verify printer prints on Node A

## Benefits

1. **Multi-location support** - Print to any printer on the network
2. **Centralized printing** - One printer can serve multiple POS stations
3. **Failover** - Use backup printer on another node if local fails
4. **Kitchen printer routing** - Orders can print to kitchen printers on different nodes

## Timeline

- **Task 1**: 30 minutes - Integrate printer sync into sync service
- **Task 2**: 45 minutes - Create remote print API
- **Task 3**: 30 minutes - Update print UI
- **Task 4**: 30 minutes - Testing
- **Total**: ~2-3 hours

## Next Steps

1. Review this plan
2. Confirm approach
3. Implement Task 1 first (sync service integration)
4. Test printer discovery works
5. Continue with remaining tasks

## Notes

- The sync service must be running for remote printing to work
- Local USB printing works WITHOUT sync service
- Background worker processes both local and remote print jobs
