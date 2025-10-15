/**
 * Daily Rotating Log Manager
 * Handles log rotation, cleanup, and file management for sync service
 */

import * as fs from 'fs'
import * as path from 'path'
import { createWriteStream, WriteStream } from 'fs'

export interface LogRotationConfig {
  logDir: string
  baseFileName: string
  maxAge: number // days
  maxFiles?: number
  dateFormat?: string
}

export class DailyRotatingLogger {
  private config: LogRotationConfig
  private currentLogFile: string = ''
  private currentDate: string = ''
  private logStream: WriteStream | null = null
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor(config: LogRotationConfig) {
    this.config = {
      maxFiles: 14, // Default 2 weeks
      dateFormat: 'YYYY-MM-DD',
      ...config
    }

    // Ensure log directory exists
    this.ensureLogDirectory()
    
    // Initialize current log file
    this.rotateIfNeeded()
    
    // Set up daily cleanup check (run every hour)
    this.cleanupInterval = setInterval(() => {
      this.rotateIfNeeded()
      this.cleanupOldLogs()
    }, 60 * 60 * 1000) // 1 hour
  }

  private ensureLogDirectory(): void {
    if (!fs.existsSync(this.config.logDir)) {
      fs.mkdirSync(this.config.logDir, { recursive: true })
    }
  }

  private getCurrentDateString(): string {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  private getLogFileName(date: string): string {
    const baseName = path.parse(this.config.baseFileName).name
    const ext = path.parse(this.config.baseFileName).ext || '.log'
    return `${baseName}-${date}${ext}`
  }

  private rotateIfNeeded(): void {
    const currentDate = this.getCurrentDateString()
    
    if (this.currentDate !== currentDate) {
      // Close existing stream
      if (this.logStream) {
        this.logStream.end()
        this.logStream = null
      }

      // Update current date and file
      this.currentDate = currentDate
      this.currentLogFile = path.join(this.config.logDir, this.getLogFileName(currentDate))

      // Create new log stream
      this.logStream = createWriteStream(this.currentLogFile, { flags: 'a' })

      // Log rotation event
      this.writeLog('info', `Log rotated to: ${this.currentLogFile}`)
      
      // Clean up old logs after rotation
      setTimeout(() => this.cleanupOldLogs(), 1000)
    }
  }

  private cleanupOldLogs(): void {
    try {
      const files = fs.readdirSync(this.config.logDir)
      const logFiles = files.filter(file => {
        const baseName = path.parse(this.config.baseFileName).name
        return file.startsWith(`${baseName}-`) && file.includes('-')
      })

      // Sort by date (newest first)
      const sortedFiles = logFiles
        .map(file => {
          const match = file.match(/-(\d{4}-\d{2}-\d{2})/)
          if (match) {
            return {
              file,
              date: new Date(match[1]),
              fullPath: path.join(this.config.logDir, file)
            }
          }
          return null
        })
        .filter(Boolean)
        .sort((a, b) => b!.date.getTime() - a!.date.getTime())

      const now = new Date()
      const maxAge = this.config.maxAge * 24 * 60 * 60 * 1000 // Convert days to milliseconds

      let deletedCount = 0
      
      for (const logFile of sortedFiles) {
        if (!logFile) continue

        const age = now.getTime() - logFile.date.getTime()
        
        // Delete if older than maxAge OR if we have more than maxFiles
        const isOld = age > maxAge
        const exceedsLimit = this.config.maxFiles && sortedFiles.indexOf(logFile) >= this.config.maxFiles
        
        if (isOld || exceedsLimit) {
          try {
            fs.unlinkSync(logFile.fullPath)
            deletedCount++
            this.writeLog('info', `Deleted old log file: ${logFile.file} (age: ${Math.round(age / (24 * 60 * 60 * 1000))} days)`)
          } catch (error) {
            this.writeLog('error', `Failed to delete log file ${logFile.file}: ${error}`)
          }
        }
      }

      if (deletedCount > 0) {
        this.writeLog('info', `Cleanup completed: ${deletedCount} old log files deleted`)
      }

    } catch (error) {
      this.writeLog('error', `Log cleanup failed: ${error}`)
    }
  }

  public writeLog(level: string, message: string, data?: any): void {
    this.rotateIfNeeded()

    if (!this.logStream) {
      console.error('Log stream not available')
      return
    }

    const timestamp = new Date().toISOString()
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...(data && { data })
    }

    const logLine = JSON.stringify(logEntry) + '\n'
    
    try {
      this.logStream.write(logLine)
    } catch (error) {
      console.error('Failed to write log:', error)
    }
  }

  public info(message: string, data?: any): void {
    this.writeLog('info', message, data)
  }

  public warn(message: string, data?: any): void {
    this.writeLog('warn', message, data)
  }

  public error(message: string, data?: any): void {
    this.writeLog('error', message, data)
  }

  public debug(message: string, data?: any): void {
    this.writeLog('debug', message, data)
  }

  public getLogStats(): { currentFile: string; totalFiles: number; oldestFile?: string; newestFile?: string } {
    try {
      const files = fs.readdirSync(this.config.logDir)
      const baseName = path.parse(this.config.baseFileName).name
      const logFiles = files
        .filter(file => file.startsWith(`${baseName}-`))
        .sort()

      return {
        currentFile: this.currentLogFile,
        totalFiles: logFiles.length,
        oldestFile: logFiles[0],
        newestFile: logFiles[logFiles.length - 1]
      }
    } catch (error) {
      return {
        currentFile: this.currentLogFile,
        totalFiles: 0
      }
    }
  }

  public close(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }

    if (this.logStream) {
      this.logStream.end()
      this.logStream = null
    }
  }
}

// Singleton instance for sync service
let syncServiceLogger: DailyRotatingLogger | null = null

export function createSyncServiceLogger(): DailyRotatingLogger {
  if (!syncServiceLogger) {
    syncServiceLogger = new DailyRotatingLogger({
      logDir: path.join(process.cwd(), 'data', 'sync'),
      baseFileName: 'sync-service.log',
      maxAge: 14, // 2 weeks
      maxFiles: 20 // Keep max 20 files as safety buffer
    })
  }
  return syncServiceLogger
}

export function getSyncServiceLogger(): DailyRotatingLogger | null {
  return syncServiceLogger
}