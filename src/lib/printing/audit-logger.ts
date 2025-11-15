/**
 * Audit Logger for Printer Operations
 * Logs all printer-related activities for security and troubleshooting
 */

export enum PrinterAuditAction {
  PRINTER_REGISTERED = 'PRINTER_REGISTERED',
  PRINTER_UPDATED = 'PRINTER_UPDATED',
  PRINTER_DELETED = 'PRINTER_DELETED',
  PRINTER_TEST_PRINTED = 'PRINTER_TEST_PRINTED',
  PRINTER_SHARED = 'PRINTER_SHARED',
  PRINTER_UNSHARED = 'PRINTER_UNSHARED',
  PRINT_JOB_QUEUED = 'PRINT_JOB_QUEUED',
  PRINT_JOB_COMPLETED = 'PRINT_JOB_COMPLETED',
  PRINT_JOB_FAILED = 'PRINT_JOB_FAILED',
  PRINT_JOB_RETRIED = 'PRINT_JOB_RETRIED',
  PRINTER_DISCOVERED = 'PRINTER_DISCOVERED',
  PRINTER_STATUS_CHANGED = 'PRINTER_STATUS_CHANGED',
  CROSS_NODE_PRINT = 'CROSS_NODE_PRINT',
  PERMISSION_DENIED = 'PERMISSION_DENIED'
}

interface AuditLogEntry {
  timestamp: Date
  action: PrinterAuditAction
  userId?: string
  userEmail?: string
  printerId?: string
  printerName?: string
  jobId?: string
  businessId?: string
  nodeId?: string
  details?: Record<string, any>
  ipAddress?: string
  userAgent?: string
}

/**
 * Log a printer audit event
 */
export function logPrinterAudit(entry: AuditLogEntry): void {
  const formattedEntry = {
    ...entry,
    timestamp: entry.timestamp.toISOString(),
    // Sanitize sensitive data
    details: entry.details ? sanitizeDetails(entry.details) : undefined
  }

  // Log to console (can be extended to write to database, external logging service, etc.)
  console.log('[PRINTER_AUDIT]', JSON.stringify(formattedEntry))

  // TODO: Future enhancements:
  // - Write to audit_logs table in database
  // - Send to external logging service (e.g., CloudWatch, Datadog)
  // - Trigger alerts for security-sensitive events (e.g., PERMISSION_DENIED)
}

/**
 * Sanitize audit log details to remove sensitive information
 */
function sanitizeDetails(details: Record<string, any>): Record<string, any> {
  const sanitized = { ...details }

  // Remove sensitive fields
  const sensitiveFields = ['password', 'token', 'apiKey', 'secret', 'credentials']
  sensitiveFields.forEach(field => {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]'
    }
  })

  return sanitized
}

/**
 * Helper: Log printer registration
 */
export function auditPrinterRegistered(
  printerId: string,
  printerName: string,
  userId: string,
  userEmail?: string,
  nodeId?: string
): void {
  logPrinterAudit({
    timestamp: new Date(),
    action: PrinterAuditAction.PRINTER_REGISTERED,
    userId,
    userEmail,
    printerId,
    printerName,
    nodeId,
    details: {
      message: `Printer "${printerName}" registered by user ${userEmail || userId}`
    }
  })
}

/**
 * Helper: Log printer update
 */
export function auditPrinterUpdated(
  printerId: string,
  printerName: string,
  userId: string,
  userEmail?: string,
  changes?: Record<string, any>
): void {
  logPrinterAudit({
    timestamp: new Date(),
    action: PrinterAuditAction.PRINTER_UPDATED,
    userId,
    userEmail,
    printerId,
    printerName,
    details: {
      message: `Printer "${printerName}" updated by user ${userEmail || userId}`,
      changes
    }
  })
}

/**
 * Helper: Log printer deletion
 */
export function auditPrinterDeleted(
  printerId: string,
  printerName: string,
  userId: string,
  userEmail?: string
): void {
  logPrinterAudit({
    timestamp: new Date(),
    action: PrinterAuditAction.PRINTER_DELETED,
    userId,
    userEmail,
    printerId,
    printerName,
    details: {
      message: `Printer "${printerName}" deleted by user ${userEmail || userId}`
    }
  })
}

/**
 * Helper: Log print job queued
 */
export function auditPrintJobQueued(
  jobId: string,
  printerId: string,
  printerName: string,
  userId: string,
  businessId: string,
  jobType: 'receipt' | 'label',
  userEmail?: string
): void {
  logPrinterAudit({
    timestamp: new Date(),
    action: PrinterAuditAction.PRINT_JOB_QUEUED,
    userId,
    userEmail,
    printerId,
    printerName,
    jobId,
    businessId,
    details: {
      message: `${jobType} print job queued for printer "${printerName}"`,
      jobType
    }
  })
}

/**
 * Helper: Log print job completed
 */
export function auditPrintJobCompleted(
  jobId: string,
  printerId: string,
  printerName: string
): void {
  logPrinterAudit({
    timestamp: new Date(),
    action: PrinterAuditAction.PRINT_JOB_COMPLETED,
    printerId,
    printerName,
    jobId,
    details: {
      message: `Print job completed on printer "${printerName}"`
    }
  })
}

/**
 * Helper: Log print job failed
 */
export function auditPrintJobFailed(
  jobId: string,
  printerId: string,
  printerName: string,
  errorMessage?: string
): void {
  logPrinterAudit({
    timestamp: new Date(),
    action: PrinterAuditAction.PRINT_JOB_FAILED,
    printerId,
    printerName,
    jobId,
    details: {
      message: `Print job failed on printer "${printerName}"`,
      error: errorMessage
    }
  })
}

/**
 * Helper: Log print job retry
 */
export function auditPrintJobRetried(
  jobId: string,
  printerId: string,
  printerName: string,
  userId: string,
  userEmail?: string,
  retryAttempt?: number
): void {
  logPrinterAudit({
    timestamp: new Date(),
    action: PrinterAuditAction.PRINT_JOB_RETRIED,
    userId,
    userEmail,
    printerId,
    printerName,
    jobId,
    details: {
      message: `Print job retried by user ${userEmail || userId}`,
      retryAttempt
    }
  })
}

/**
 * Helper: Log printer sharing toggle
 */
export function auditPrinterShared(
  printerId: string,
  printerName: string,
  userId: string,
  isShared: boolean,
  userEmail?: string
): void {
  logPrinterAudit({
    timestamp: new Date(),
    action: isShared ? PrinterAuditAction.PRINTER_SHARED : PrinterAuditAction.PRINTER_UNSHARED,
    userId,
    userEmail,
    printerId,
    printerName,
    details: {
      message: `Printer "${printerName}" ${isShared ? 'shared' : 'unshared'} on network by user ${userEmail || userId}`
    }
  })
}

/**
 * Helper: Log cross-node printing
 */
export function auditCrossNodePrint(
  jobId: string,
  printerId: string,
  printerName: string,
  sourceNodeId: string,
  targetNodeId: string,
  userId: string,
  userEmail?: string
): void {
  logPrinterAudit({
    timestamp: new Date(),
    action: PrinterAuditAction.CROSS_NODE_PRINT,
    userId,
    userEmail,
    printerId,
    printerName,
    jobId,
    nodeId: targetNodeId,
    details: {
      message: `Cross-node print from node ${sourceNodeId} to node ${targetNodeId}`,
      sourceNodeId,
      targetNodeId
    }
  })
}

/**
 * Helper: Log permission denied
 */
export function auditPermissionDenied(
  userId: string,
  action: string,
  resource: string,
  userEmail?: string,
  ipAddress?: string
): void {
  logPrinterAudit({
    timestamp: new Date(),
    action: PrinterAuditAction.PERMISSION_DENIED,
    userId,
    userEmail,
    ipAddress,
    details: {
      message: `Permission denied for user ${userEmail || userId}: ${action} on ${resource}`,
      deniedAction: action,
      deniedResource: resource
    }
  })
}

/**
 * Helper: Log printer status change
 */
export function auditPrinterStatusChanged(
  printerId: string,
  printerName: string,
  oldStatus: string,
  newStatus: string,
  nodeId?: string
): void {
  logPrinterAudit({
    timestamp: new Date(),
    action: PrinterAuditAction.PRINTER_STATUS_CHANGED,
    printerId,
    printerName,
    nodeId,
    details: {
      message: `Printer "${printerName}" status changed from ${oldStatus} to ${newStatus}`,
      oldStatus,
      newStatus
    }
  })
}
