import { db } from './db'
import { auditLog } from './schema'

export type AuditAction = 
  | 'CREATE' 
  | 'UPDATE' 
  | 'DELETE' 
  | 'LOGIN' 
  | 'LOGOUT' 
  | 'BACKUP' 
  | 'RESTORE'
  | 'EXPORT'

export interface AuditLogEntry {
  userId: string
  action: AuditAction
  tableName?: string
  recordId?: string
  changes?: Record<string, any>
  metadata?: Record<string, any>
}

export async function createAuditLog(entry: AuditLogEntry) {
  try {
    await db.insert(auditLog).values({
      userId: entry.userId,
      action: entry.action,
      tableName: entry.tableName,
      recordId: entry.recordId,
      changes: entry.changes || {},
    })
  } catch (error) {
    console.error('Failed to create audit log:', error)
  }
}

export async function getAuditLogs(
  filters: {
    userId?: string
    action?: AuditAction
    tableName?: string
    startDate?: Date
    endDate?: Date
    limit?: number
  } = {}
) {
  try {
    if (filters.limit) {
      return await db.select().from(auditLog).limit(filters.limit)
    }
    return await db.select().from(auditLog)
  } catch (error) {
    console.error('Failed to fetch audit logs:', error)
    return []
  }
}