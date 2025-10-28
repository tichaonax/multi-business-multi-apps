/**
 * Layby Automation Scheduler
 *
 * This file contains the scheduler setup for running layby automation tasks.
 * In production, this would be integrated with a job scheduler like:
 * - node-cron
 * - Bull/BullMQ (Redis-based)
 * - AWS EventBridge
 * - Vercel Cron
 * - GitHub Actions
 */

import { runAllAutomation } from './automation'

export interface ScheduleConfig {
  enabled: boolean
  interval: 'hourly' | 'daily' | 'custom'
  customCron?: string // Cron expression for custom schedules
}

export interface JobResult {
  jobId: string
  startTime: Date
  endTime: Date
  duration: number
  success: boolean
  processed: number
  errors: number
  details: any
}

// In-memory job history (in production, store in database)
const jobHistory: JobResult[] = []

/**
 * Run scheduled automation job
 * This function is called by the scheduler at configured intervals
 */
export async function runScheduledJob(
  businessId?: string
): Promise<JobResult> {
  const jobId = `job-${Date.now()}-${Math.random().toString(36).substring(7)}`
  const startTime = new Date()

  console.log(`[Scheduler] Starting job ${jobId} at ${startTime.toISOString()}`)

  try {
    // Run all automation tasks
    const result = await runAllAutomation(businessId)

    const endTime = new Date()
    const duration = endTime.getTime() - startTime.getTime()

    const jobResult: JobResult = {
      jobId,
      startTime,
      endTime,
      duration,
      success: true,
      processed: result.totalProcessed,
      errors: result.totalErrors,
      details: {
        paymentReminders: result.paymentReminders,
        overdueNotifications: result.overdueNotifications,
        lateFees: result.lateFees,
        defaults: result.defaults
      }
    }

    // Store in history (limit to last 100 jobs)
    jobHistory.push(jobResult)
    if (jobHistory.length > 100) {
      jobHistory.shift()
    }

    console.log(`[Scheduler] Job ${jobId} completed in ${duration}ms: ${jobResult.processed} processed, ${jobResult.errors} errors`)

    return jobResult
  } catch (error) {
    const endTime = new Date()
    const duration = endTime.getTime() - startTime.getTime()

    const jobResult: JobResult = {
      jobId,
      startTime,
      endTime,
      duration,
      success: false,
      processed: 0,
      errors: 1,
      details: {
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }

    jobHistory.push(jobResult)
    if (jobHistory.length > 100) {
      jobHistory.shift()
    }

    console.error(`[Scheduler] Job ${jobId} failed after ${duration}ms:`, error)

    return jobResult
  }
}

/**
 * Get job history
 */
export function getJobHistory(limit = 20): JobResult[] {
  return jobHistory.slice(-limit).reverse()
}

/**
 * Get last job result
 */
export function getLastJobResult(): JobResult | null {
  return jobHistory.length > 0 ? jobHistory[jobHistory.length - 1] : null
}

/**
 * Setup scheduler with node-cron (if available)
 * Example usage in production:
 *
 * import cron from 'node-cron'
 * import { setupScheduler } from '@/lib/layby/scheduler'
 *
 * // Run every day at 9 AM
 * setupScheduler({ enabled: true, interval: 'daily' })
 *
 * // Or use custom cron expression
 * setupScheduler({ enabled: true, interval: 'custom', customCron: '0 9 * * *' })
 */
export function setupScheduler(config: ScheduleConfig) {
  if (!config.enabled) {
    console.log('[Scheduler] Automation scheduler is disabled')
    return
  }

  console.log('[Scheduler] Setting up layby automation scheduler')

  // Map interval to cron expression
  let cronExpression: string

  switch (config.interval) {
    case 'hourly':
      cronExpression = '0 * * * *' // Every hour at minute 0
      break
    case 'daily':
      cronExpression = '0 9 * * *' // Every day at 9:00 AM
      break
    case 'custom':
      if (!config.customCron) {
        throw new Error('Custom cron expression required for custom interval')
      }
      cronExpression = config.customCron
      break
    default:
      cronExpression = '0 9 * * *' // Default: daily at 9:00 AM
  }

  console.log(`[Scheduler] Configured with cron expression: ${cronExpression}`)

  // In production, use actual cron library:
  /*
  try {
    const cron = require('node-cron')

    cron.schedule(cronExpression, async () => {
      console.log('[Scheduler] Triggered scheduled automation job')
      await runScheduledJob()
    })

    console.log('[Scheduler] Scheduler started successfully')
  } catch (error) {
    console.error('[Scheduler] Failed to setup cron job:', error)
    console.log('[Scheduler] Falling back to manual API calls')
  }
  */

  // For now, log that manual API calls are needed
  console.log('[Scheduler] Automation configured. Use POST /api/layby-automation to run manually')
  console.log('[Scheduler] Or setup external scheduler (cron, Vercel Cron, etc.) to call the API')
}

/**
 * Vercel Cron configuration example
 * Add this to vercel.json:
 *
 * {
 *   "crons": [
 *     {
 *       "path": "/api/layby-automation",
 *       "schedule": "0 9 * * *"
 *     }
 *   ]
 * }
 */

/**
 * GitHub Actions workflow example
 * Create .github/workflows/layby-automation.yml:
 *
 * name: Layby Automation
 * on:
 *   schedule:
 *     - cron: '0 9 * * *'  # Daily at 9 AM UTC
 * jobs:
 *   run-automation:
 *     runs-on: ubuntu-latest
 *     steps:
 *       - name: Run layby automation
 *         run: |
 *           curl -X POST https://your-domain.com/api/layby-automation \
 *           -H "Content-Type: application/json" \
 *           -d '{"task": "all", "apiKey": "${{ secrets.LAYBY_AUTOMATION_API_KEY }}"}'
 */

/**
 * Simple interval-based scheduler (for development/testing)
 * Not recommended for production - use proper job scheduler
 */
export function startIntervalScheduler(intervalMinutes = 60) {
  console.log(`[Scheduler] Starting interval scheduler (every ${intervalMinutes} minutes)`)

  const intervalMs = intervalMinutes * 60 * 1000

  // Run immediately
  runScheduledJob().catch(console.error)

  // Then run at intervals
  const intervalId = setInterval(() => {
    runScheduledJob().catch(console.error)
  }, intervalMs)

  // Return function to stop the scheduler
  return () => {
    clearInterval(intervalId)
    console.log('[Scheduler] Interval scheduler stopped')
  }
}

/**
 * Check scheduler health
 */
export function getSchedulerHealth() {
  const lastJob = getLastJobResult()

  if (!lastJob) {
    return {
      status: 'unknown',
      message: 'No jobs have been run yet',
      lastRun: null
    }
  }

  const now = new Date()
  const timeSinceLastRun = now.getTime() - lastJob.endTime.getTime()
  const hoursSinceLastRun = timeSinceLastRun / (1000 * 60 * 60)

  // Consider unhealthy if no job in last 25 hours (expecting daily runs)
  const isHealthy = hoursSinceLastRun < 25

  return {
    status: isHealthy ? 'healthy' : 'warning',
    message: isHealthy
      ? `Last run ${Math.floor(hoursSinceLastRun)} hours ago`
      : `No run in ${Math.floor(hoursSinceLastRun)} hours - check scheduler`,
    lastRun: {
      time: lastJob.endTime,
      success: lastJob.success,
      processed: lastJob.processed,
      errors: lastJob.errors,
      duration: lastJob.duration
    }
  }
}
