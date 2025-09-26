import { prisma } from './prisma';
import crypto from 'crypto';

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'LOGIN_FAILED'
  | 'SESSION_CREATED'
  | 'SESSION_DESTROYED'
  | 'PERMISSION_CHANGED'
  | 'ACCOUNT_LOCKED'
  | 'ACCOUNT_UNLOCKED'
  | 'BUSINESS_CREATED'
  | 'BUSINESS_UPDATED'
  | 'EMPLOYEE_HIRED'
  | 'EMPLOYEE_TERMINATED'
  | 'CONTRACT_SIGNED'
  | 'ROLE_CHANGED'
  | 'DATA_EXPORT'
  | 'DATA_IMPORT'
  | 'BACKUP_CREATED'
  | 'BACKUP_RESTORED';

export type AuditEntityType =
  | 'User'
  | 'Business'
  | 'Employee'
  | 'BusinessMembership'
  | 'EmployeeContract'
  | 'Session'
  | 'Authentication'
  | 'Permission'
  | 'SystemConfig'
  | 'DataExport'
  | 'DataImport'
  | 'Backup';

export interface AuditLogEntry {
  userId: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  businessId?: string;
}

export interface AuditContext {
  userId: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  businessId?: string;
}

/**
 * Generate a hash for audit log integrity verification
 */
function generateAuditHash(entry: AuditLogEntry, timestamp: Date): string {
  const data = JSON.stringify({
    ...entry,
    timestamp: timestamp.toISOString(),
  });
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Create an audit log entry with integrity verification
 */
export async function createAuditLog(entry: AuditLogEntry): Promise<void> {
  try {
    const timestamp = new Date();
    const hash = generateAuditHash(entry, timestamp);

    await prisma.auditLog.create({
      data: {
        userId: entry.userId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        oldValues: entry.oldValues || null,
        newValues: entry.newValues || null,
        timestamp,
        metadata: {
          ...entry.metadata,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
          businessId: entry.businessId,
          hash,
        },
        tableName: getTableNameFromEntityType(entry.entityType),
        recordId: entry.entityId,
        changes: entry.oldValues && entry.newValues ?
          generateChangeLog(entry.oldValues, entry.newValues) : null,
        details: {
          action: entry.action,
          entityType: entry.entityType,
          timestamp: timestamp.toISOString(),
        }
      },
    });
  } catch (error) {
    // Log error but don't throw to avoid breaking main operations
    console.error('Failed to create audit log:', error);
  }
}

/**
 * Generate detailed change log between old and new values
 */
function generateChangeLog(oldValues: Record<string, any>, newValues: Record<string, any>): Record<string, any> {
  const changes: Record<string, any> = {};

  // Check for changed values
  for (const [key, newValue] of Object.entries(newValues)) {
    const oldValue = oldValues[key];
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes[key] = {
        from: oldValue,
        to: newValue
      };
    }
  }

  // Check for removed values
  for (const [key, oldValue] of Object.entries(oldValues)) {
    if (!(key in newValues)) {
      changes[key] = {
        from: oldValue,
        to: null
      };
    }
  }

  return changes;
}

/**
 * Map entity type to database table name
 */
function getTableNameFromEntityType(entityType: AuditEntityType): string {
  const mapping: Record<AuditEntityType, string> = {
    'User': 'users',
    'Business': 'businesses',
    'Employee': 'employees',
    'BusinessMembership': 'business_memberships',
    'EmployeeContract': 'employee_contracts',
    'Session': 'sessions',
    'Authentication': 'auth_events',
    'Permission': 'permissions',
    'SystemConfig': 'system_config',
    'DataExport': 'data_exports',
    'DataImport': 'data_imports',
    'Backup': 'backups'
  };

  return mapping[entityType] || 'unknown';
}

/**
 * Audit helper for CREATE operations
 */
export async function auditCreate(
  context: AuditContext,
  entityType: AuditEntityType,
  entityId: string,
  newValues: Record<string, any>,
  metadata?: Record<string, any>
): Promise<void> {
  await createAuditLog({
    userId: context.userId,
    action: 'CREATE',
    entityType,
    entityId,
    newValues,
    metadata,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    businessId: context.businessId,
  });
}

/**
 * Audit helper for UPDATE operations
 */
export async function auditUpdate(
  context: AuditContext,
  entityType: AuditEntityType,
  entityId: string,
  oldValues: Record<string, any>,
  newValues: Record<string, any>,
  metadata?: Record<string, any>
): Promise<void> {
  await createAuditLog({
    userId: context.userId,
    action: 'UPDATE',
    entityType,
    entityId,
    oldValues,
    newValues,
    metadata,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    businessId: context.businessId,
  });
}

/**
 * Audit helper for DELETE operations
 */
export async function auditDelete(
  context: AuditContext,
  entityType: AuditEntityType,
  entityId: string,
  oldValues: Record<string, any>,
  metadata?: Record<string, any>
): Promise<void> {
  await createAuditLog({
    userId: context.userId,
    action: 'DELETE',
    entityType,
    entityId,
    oldValues,
    metadata,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    businessId: context.businessId,
  });
}

/**
 * Audit helper for authentication events
 */
export async function auditAuthentication(
  userId: string,
  action: 'LOGIN' | 'LOGOUT' | 'LOGIN_FAILED',
  metadata?: Record<string, any>,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await createAuditLog({
    userId,
    action,
    entityType: 'Authentication',
    entityId: userId,
    metadata,
    ipAddress,
    userAgent,
  });
}

/**
 * Audit helper for data operations
 */
export async function auditDataOperation(
  context: AuditContext,
  action: 'DATA_EXPORT' | 'DATA_IMPORT' | 'BACKUP_CREATED' | 'BACKUP_RESTORED',
  operationId: string,
  metadata?: Record<string, any>
): Promise<void> {
  const entityType = action.startsWith('BACKUP') ? 'Backup' :
                    action.includes('EXPORT') ? 'DataExport' : 'DataImport';

  await createAuditLog({
    userId: context.userId,
    action,
    entityType,
    entityId: operationId,
    metadata,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    businessId: context.businessId,
  });
}

/**
 * Get audit trail for a specific entity
 */
export async function getEntityAuditTrail(
  entityType: AuditEntityType,
  entityId: string,
  limit: number = 50
) {
  return await prisma.auditLog.findMany({
    where: {
      entityType,
      entityId,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      timestamp: 'desc',
    },
    take: limit,
  });
}

/**
 * Detect suspicious audit patterns
 */
export async function detectSuspiciousActivity(timeWindowHours: number = 24): Promise<{
  multipleFailedLogins: any[];
  bulkOperations: any[];
  unusualPermissionChanges: any[];
  rapidDataOperations: any[];
}> {
  const timeThreshold = new Date(Date.now() - timeWindowHours * 60 * 60 * 1000);

  // Multiple failed logins from same IP
  const multipleFailedLogins = await prisma.$queryRaw`
    SELECT
      JSON_EXTRACT(metadata, '$.ipAddress') as ipAddress,
      COUNT(*) as failedAttempts,
      MAX(timestamp) as lastAttempt,
      GROUP_CONCAT(DISTINCT user_id) as userIds
    FROM audit_logs
    WHERE action = 'LOGIN_FAILED'
      AND timestamp > ${timeThreshold}
      AND JSON_EXTRACT(metadata, '$.ipAddress') IS NOT NULL
    GROUP BY JSON_EXTRACT(metadata, '$.ipAddress')
    HAVING COUNT(*) >= 5
    ORDER BY failedAttempts DESC
  `;

  // Bulk operations (many actions by same user in short time)
  const bulkOperations = await prisma.$queryRaw`
    SELECT
      user_id as userId,
      action,
      entity_type as entityType,
      COUNT(*) as actionCount,
      MIN(timestamp) as firstAction,
      MAX(timestamp) as lastAction,
      JSON_EXTRACT(metadata, '$.businessId') as businessId
    FROM audit_logs
    WHERE timestamp > ${timeThreshold}
      AND action IN ('CREATE', 'UPDATE', 'DELETE', 'DATA_EXPORT', 'DATA_IMPORT')
    GROUP BY user_id, action, entity_type
    HAVING COUNT(*) >= 10
    ORDER BY actionCount DESC
  `;

  // Unusual permission changes
  const unusualPermissionChanges = await prisma.auditLog.findMany({
    where: {
      action: 'PERMISSION_CHANGED',
      timestamp: {
        gt: timeThreshold,
      },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      timestamp: 'desc',
    },
  });

  // Rapid data operations (exports, imports, backups)
  const rapidDataOperations = await prisma.auditLog.findMany({
    where: {
      action: {
        in: ['DATA_EXPORT', 'DATA_IMPORT', 'BACKUP_CREATED', 'BACKUP_RESTORED']
      },
      timestamp: {
        gt: timeThreshold,
      },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      timestamp: 'desc',
    },
  });

  return {
    multipleFailedLogins,
    bulkOperations,
    unusualPermissionChanges,
    rapidDataOperations,
  };
}

/**
 * Get audit statistics for dashboard
 */
export async function getAuditStatistics(days: number = 30) {
  const timeThreshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const stats = await prisma.auditLog.groupBy({
    by: ['action'],
    where: {
      timestamp: {
        gt: timeThreshold,
      },
    },
    _count: {
      action: true,
    },
    orderBy: {
      _count: {
        action: 'desc',
      },
    },
  });

  const totalLogs = await prisma.auditLog.count({
    where: {
      timestamp: {
        gt: timeThreshold,
      },
    },
  });

  const uniqueUsers = await prisma.auditLog.groupBy({
    by: ['userId'],
    where: {
      timestamp: {
        gt: timeThreshold,
      },
    },
    _count: {
      userId: true,
    },
  });

  const businessActivity = await prisma.auditLog.groupBy({
    by: ['entityType'],
    where: {
      timestamp: {
        gt: timeThreshold,
      },
      entityType: {
        in: ['Business', 'Employee', 'BusinessMembership'],
      },
    },
    _count: {
      entityType: true,
    },
  });

  return {
    totalLogs,
    uniqueUsers: uniqueUsers.length,
    actionBreakdown: stats,
    businessActivity,
  };
}

/**
 * Get audit logs with filtering and pagination
 */
export async function getAuditLogs(options: {
  userId?: string;
  businessId?: string;
  entityType?: AuditEntityType;
  action?: AuditAction;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
  search?: string;
}) {
  const {
    userId,
    businessId,
    entityType,
    action,
    startDate,
    endDate,
    page = 1,
    limit = 50,
    search
  } = options;

  const skip = (page - 1) * limit;

  const where: any = {};

  if (userId) where.userId = userId;
  if (entityType) where.entityType = entityType;
  if (action) where.action = action;

  if (businessId) {
    where.metadata = {
      path: ['businessId'],
      equals: businessId
    };
  }

  if (startDate || endDate) {
    where.timestamp = {};
    if (startDate) where.timestamp.gte = startDate;
    if (endDate) where.timestamp.lte = endDate;
  }

  if (search) {
    where.OR = [
      {
        user: {
          name: {
            contains: search,
            mode: 'insensitive'
          }
        }
      },
      {
        user: {
          email: {
            contains: search,
            mode: 'insensitive'
          }
        }
      },
      {
        action: {
          contains: search,
          mode: 'insensitive'
        }
      },
      {
        entityType: {
          contains: search,
          mode: 'insensitive'
        }
      }
    ];
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
      skip,
      take: limit,
    }),
    prisma.auditLog.count({ where })
  ]);

  return {
    logs,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
}