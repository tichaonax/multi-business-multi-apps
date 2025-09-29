import { db } from './db'
import { createAuditLog } from './audit'
import { getDbName } from './db-names'
import fs from 'fs/promises'
import path from 'path'

export interface BackupOptions {
  includeAuditLog?: boolean
  includeChat?: boolean
  compress?: boolean
}

export async function createBackup(
  userId: string,
  options: BackupOptions = {}
): Promise<string> {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupDir = path.join(process.cwd(), 'backups')
    const backupFile = path.join(backupDir, `backup-${timestamp}.json`)

    await fs.mkdir(backupDir, { recursive: true })

    const backup = {
      timestamp,
      version: '1.0.0',
      data: {} as Record<string, any>,
    }

    const tables = [getDbName('users'), getDbName('businesses')]

    if (options.includeAuditLog) {
      tables.push(getDbName('auditLog') || 'audit_log')
    }

    if (options.includeChat) {
      tables.push(getDbName('chatRooms') || 'chat_rooms', getDbName('chatMessages') || 'chat_messages', getDbName('chatParticipants') || 'chat_participants')
    }

    for (const table of tables) {
      try {
  const result = await db.execute(`SELECT * FROM "${table}"`)
        backup.data[table] = result.rows
      } catch (error) {
        console.warn(`Failed to backup table ${table}:`, error)
        backup.data[table] = []
      }
    }

    await fs.writeFile(backupFile, JSON.stringify(backup, null, 2))

    await createAuditLog({
      userId,
      action: 'BACKUP_CREATED',
      entityType: 'Backup',
      entityId: backupFile,
      metadata: { backupFile, tables },
    })

    return backupFile
  } catch (error) {
    console.error('Backup failed:', error)
    throw new Error('Backup operation failed')
  }
}

export async function restoreBackup(
  userId: string,
  backupFile: string
): Promise<void> {
  try {
    const backupData = await fs.readFile(backupFile, 'utf-8')
    const backup = JSON.parse(backupData)

    if (!backup.data || !backup.version) {
      throw new Error('Invalid backup file format')
    }

    for (const [tableName, tableData] of Object.entries(backup.data)) {
      if (Array.isArray(tableData) && tableData.length > 0) {
        await db.execute(`TRUNCATE TABLE "${tableName}" RESTART IDENTITY CASCADE`)

        const columns = Object.keys(tableData[0]).join(', ')
        const placeholders = tableData[0]
          ? Object.keys(tableData[0]).map((_, i) => `$${i + 1}`).join(', ')
          : ''

        for (const row of tableData) {
          const values = Object.values(row)
          await db.execute(
            `INSERT INTO "${tableName}" (${columns}) VALUES (${placeholders})`,
            values
          )
        }
      }
    }

    await createAuditLog({
      userId,
      action: 'BACKUP_RESTORED',
      entityType: 'Backup',
      entityId: backupFile,
      metadata: { backupFile, timestamp: backup.timestamp },
    })
  } catch (error) {
    console.error('Restore failed:', error)
    throw new Error('Restore operation failed')
  }
}

export async function listBackups(): Promise<string[]> {
  try {
    const backupDir = path.join(process.cwd(), 'backups')
    const files = await fs.readdir(backupDir)
    return files.filter(file => file.endsWith('.json')).sort().reverse()
  } catch (error) {
    return []
  }
}