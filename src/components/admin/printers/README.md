# Printer Management Components

## Overview
Complete admin UI for managing network printers and print jobs.

## Components Created

### 1. `printer-management.tsx`
Main admin page component with tabs for printers and print queue.
- Features:
  - Statistics cards (total, online, offline, local, remote)
  - Refresh and discover buttons
  - Add printer button
  - Tabbed interface for printers and queue

### 2. `printer-list.tsx`
Displays list of registered printers with inline actions.
- Features:
  - Online/offline status indicators
  - Local vs remote printer badges
  - Test print functionality
  - Share toggle for local printers
  - Edit/delete buttons (local only)
  - Printer capabilities display

### 3. `printer-editor.tsx`
Modal for adding/editing printer configurations.
- Features:
  - Form validation
  - IP address and port configuration
  - Printer type selection (receipt, label, document)
  - Capabilities checkboxes (ESC/POS, ZPL, PDF, Image)
  - Network sharing toggle
  - Cannot edit remote printers

### 4. `print-queue-dashboard.tsx`
View and manage print jobs across all printers.
- Features:
  - Job statistics (pending, processing, completed, failed)
  - Filter by status (all, pending, failed)
  - Auto-refresh every 10 seconds
  - Retry failed jobs
  - Detailed error messages
  - Timestamp formatting

## Page Created

### `/admin/printers/page.tsx`
Admin page route that wraps PrinterManagement in ContentLayout.

## Integration with Sidebar

To add the printer management link to the admin sidebar, add this code to `src/components/layout/sidebar.tsx` in the Administration section (around line 652, after the Umbrella Business link):

```tsx
{(isSystemAdmin(currentUser) || hasPermission(currentUser, 'canManageNetworkPrinters')) && (
  <Link
    href="/admin/printers"
    className="sidebar-link flex items-center space-x-3"
  >
    <span className="text-lg">🖨️</span>
    <span>Printer Management</span>
  </Link>
)}
```

## Features Implemented

✅ Printer registration (manual and discovery)
✅ Printer editing (local only)
✅ Printer deletion (local only)
✅ Test print functionality
✅ Network sharing toggle
✅ Online/offline status indicators
✅ Local vs remote printer distinction
✅ Print queue monitoring
✅ Failed job retry
✅ Auto-refresh
✅ Statistics and analytics
✅ Permission-based access control

## Permissions Used

- `canManageNetworkPrinters` - Full admin access to printer management
- `canPrintReceipts` - Can print receipts
- `canPrintInventoryLabels` - Can print labels
- `canViewPrintQueue` - Can view print queue (admin)

## Usage

1. Navigate to `/admin/printers`
2. Click "Discover" to scan for network printers
3. Click "Add Printer" to manually register a printer
4. Use test print button to verify printer connectivity
5. Toggle sharing to make printers available across nodes
6. Switch to "Print Queue" tab to monitor jobs
7. Retry failed jobs with the retry button

## Technical Details

- Uses Next.js 14 App Router
- Client-side components ('use client')
- shadcn/ui components (Modal, Button, Card, Badge, etc.)
- Toast notifications for user feedback
- Confirm modal for destructive actions
- API integration with `/api/printers` endpoints
- Real-time status updates
- Responsive design

## Future Enhancements

- Real-time printer status via WebSocket
- Printer driver installation wizard
- Print preview before queuing
- Bulk printer registration
- Printer groups/categories
- Print history analytics
- Scheduled print jobs
