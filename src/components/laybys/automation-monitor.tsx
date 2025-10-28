'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { RefreshCw, CheckCircle2, XCircle, AlertCircle, Clock, Play } from 'lucide-react'

interface JobResult {
  jobId: string
  startTime: string
  endTime: string
  duration: number
  success: boolean
  processed: number
  errors: number
  details: any
}

interface HealthStatus {
  status: 'healthy' | 'warning' | 'unknown'
  message: string
  lastRun: {
    time: string
    success: boolean
    processed: number
    errors: number
    duration: number
  } | null
}

export function AutomationMonitor() {
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [lastJob, setLastJob] = useState<JobResult | null>(null)
  const [history, setHistory] = useState<JobResult[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchLogs()
  }, [])

  const fetchLogs = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/layby-automation/logs')
      if (!response.ok) {
        throw new Error('Failed to fetch automation logs')
      }

      const data = await response.json()
      setHealth(data.data.health)
      setLastJob(data.data.lastJob)
      setHistory(data.data.history)
    } catch (err) {
      console.error('Error fetching logs:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const runAutomation = async (task = 'all') => {
    try {
      setRunning(true)
      setError(null)

      const response = await fetch('/api/layby-automation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ task })
      })

      if (!response.ok) {
        throw new Error('Failed to run automation')
      }

      const result = await response.json()
      alert(`Automation completed: ${result.data.totalProcessed} processed, ${result.data.totalErrors} errors`)

      // Refresh logs
      await fetchLogs()
    } catch (err) {
      console.error('Error running automation:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setRunning(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${(ms / 60000).toFixed(1)}m`
  }

  if (loading) {
    return (
      <div className="card p-8 text-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
        <p className="text-secondary mt-4">Loading automation status...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Error Display */}
      {error && (
        <div className="card p-6 bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertCircle className="h-5 w-5" />
            <p className="font-semibold">Error</p>
          </div>
          <p className="text-sm mt-2">{error}</p>
        </div>
      )}

      {/* Health Status */}
      {health && (
        <div className={`card p-6 ${health.status === 'healthy' ? 'bg-green-50 dark:bg-green-950' : health.status === 'warning' ? 'bg-yellow-50 dark:bg-yellow-950' : 'bg-gray-50 dark:bg-gray-900'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {health.status === 'healthy' ? (
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              ) : health.status === 'warning' ? (
                <AlertCircle className="h-8 w-8 text-yellow-600" />
              ) : (
                <Clock className="h-8 w-8 text-gray-600" />
              )}
              <div>
                <h3 className="text-lg font-semibold">Automation Health</h3>
                <p className="text-sm text-secondary">{health.message}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={fetchLogs} variant="outline" size="sm" disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              <Button onClick={() => runAutomation('all')} disabled={running} size="sm">
                <Play className="h-4 w-4 mr-2" />
                {running ? 'Running...' : 'Run Now'}
              </Button>
            </div>
          </div>

          {health.lastRun && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t">
              <div>
                <p className="text-xs text-secondary">Last Run</p>
                <p className="text-sm font-medium">{formatDate(health.lastRun.time)}</p>
              </div>
              <div>
                <p className="text-xs text-secondary">Processed</p>
                <p className="text-sm font-medium">{health.lastRun.processed}</p>
              </div>
              <div>
                <p className="text-xs text-secondary">Errors</p>
                <p className="text-sm font-medium">{health.lastRun.errors}</p>
              </div>
              <div>
                <p className="text-xs text-secondary">Duration</p>
                <p className="text-sm font-medium">{formatDuration(health.lastRun.duration)}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div className="card p-6">
        <h3 className="font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Button onClick={() => runAutomation('reminders')} variant="outline" disabled={running} size="sm">
            Payment Reminders
          </Button>
          <Button onClick={() => runAutomation('overdue')} variant="outline" disabled={running} size="sm">
            Overdue Notifications
          </Button>
          <Button onClick={() => runAutomation('late-fees')} variant="outline" disabled={running} size="sm">
            Apply Late Fees
          </Button>
          <Button onClick={() => runAutomation('defaults')} variant="outline" disabled={running} size="sm">
            Process Defaults
          </Button>
        </div>
      </div>

      {/* Job History */}
      {history.length > 0 && (
        <div className="card p-6">
          <h3 className="font-semibold mb-4">Recent Automation Jobs</h3>
          <div className="space-y-3">
            {history.map((job) => (
              <div
                key={job.jobId}
                className={`p-4 rounded border ${job.success ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950' : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950'}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {job.success ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                      <span className="font-mono text-xs text-secondary">{job.jobId}</span>
                    </div>
                    <p className="text-sm font-medium">
                      {formatDate(job.startTime)}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-secondary">
                      <span>Processed: {job.processed}</span>
                      <span>Errors: {job.errors}</span>
                      <span>Duration: {formatDuration(job.duration)}</span>
                    </div>
                  </div>
                </div>

                {job.details && (
                  <details className="mt-3">
                    <summary className="text-xs text-secondary cursor-pointer hover:text-primary">
                      View Details
                    </summary>
                    <pre className="text-xs bg-background p-3 rounded mt-2 overflow-x-auto">
                      {JSON.stringify(job.details, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Setup Instructions */}
      <div className="card p-6 bg-blue-50 dark:bg-blue-950">
        <h3 className="font-semibold mb-2">Automation Setup</h3>
        <p className="text-sm text-secondary mb-3">
          For production, set up automated job scheduling using one of these methods:
        </p>
        <ul className="text-sm text-secondary space-y-1 list-disc list-inside">
          <li>Vercel Cron: Configure in vercel.json</li>
          <li>GitHub Actions: Create workflow to call API</li>
          <li>Server Cron: Use node-cron or system crontab</li>
          <li>External Scheduler: AWS EventBridge, Zapier, etc.</li>
        </ul>
        <p className="text-sm text-secondary mt-3">
          Recommended: Run daily at 9:00 AM local time
        </p>
      </div>
    </div>
  )
}
