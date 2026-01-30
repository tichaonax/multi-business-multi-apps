/**
 * Production-safe logger
 * Set LOG_LEVEL environment variable to control verbosity:
 * - 'debug': All logs (development)
 * - 'info': Info, warn, error only
 * - 'warn': Warn and error only
 * - 'error': Errors only
 * - 'silent': No logs
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent'

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4
}

// Default to 'warn' in production for performance
const currentLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) ||
  (process.env.NODE_ENV === 'production' ? 'warn' : 'debug')

const currentLevelNum = LOG_LEVELS[currentLevel] ?? LOG_LEVELS.warn

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= currentLevelNum
}

export const logger = {
  debug: (...args: any[]) => {
    if (shouldLog('debug')) console.log(...args)
  },
  info: (...args: any[]) => {
    if (shouldLog('info')) console.log(...args)
  },
  warn: (...args: any[]) => {
    if (shouldLog('warn')) console.warn(...args)
  },
  error: (...args: any[]) => {
    if (shouldLog('error')) console.error(...args)
  },
  // For critical logs that should always show
  critical: (...args: any[]) => {
    console.error('[CRITICAL]', ...args)
  }
}

export default logger
