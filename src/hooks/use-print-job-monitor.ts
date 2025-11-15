/**
 * usePrintJobMonitor Hook
 * Monitors print job status and shows toast notifications
 * Polls for job status and notifies user of completion/failure
 */

import { useState, useEffect, useCallback } from 'react'
import { useToast } from '@/components/ui/use-toast'
import { CheckCircle, XCircle, Clock } from 'lucide-react'

interface PrintJob {
  id: string
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  errorMessage?: string | null
}

interface MonitorOptions {
  jobId: string
  onComplete?: () => void
  onFailed?: (error: string) => void
  pollInterval?: number
  maxAttempts?: number
}

export function usePrintJobMonitor() {
  const { toast } = useToast()
  const [monitoredJobs, setMonitoredJobs] = useState<Set<string>>(new Set())

  /**
   * Start monitoring a print job
   */
  const monitorJob = useCallback(async (options: MonitorOptions) => {
    const {
      jobId,
      onComplete,
      onFailed,
      pollInterval = 2000, // Check every 2 seconds
      maxAttempts = 30, // Max 60 seconds (30 attempts * 2s)
    } = options

    // Prevent duplicate monitoring
    if (monitoredJobs.has(jobId)) {
      return
    }

    setMonitoredJobs(prev => new Set(prev).add(jobId))

    let attempts = 0

    const checkStatus = async () => {
      try {
        attempts++

        const response = await fetch(`/api/print/jobs?jobId=${jobId}&limit=1`)
        if (!response.ok) {
          throw new Error('Failed to fetch job status')
        }

        const data = await response.json()
        const job: PrintJob = data.jobs?.[0]

        if (!job) {
          throw new Error('Job not found')
        }

        // Job completed successfully
        if (job.status === 'COMPLETED') {
          toast({
            title: 'Print completed',
            description: 'Your print job has been processed successfully',
          })
          setMonitoredJobs(prev => {
            const next = new Set(prev)
            next.delete(jobId)
            return next
          })
          onComplete?.()
          return
        }

        // Job failed
        if (job.status === 'FAILED') {
          toast({
            title: 'Print failed',
            description: job.errorMessage || 'The print job could not be completed',
            variant: 'destructive',
          })
          setMonitoredJobs(prev => {
            const next = new Set(prev)
            next.delete(jobId)
            return next
          })
          onFailed?.(job.errorMessage || 'Unknown error')
          return
        }

        // Still pending or processing - check again
        if (job.status === 'PENDING' || job.status === 'PROCESSING') {
          if (attempts >= maxAttempts) {
            // Timeout - job is taking too long
            toast({
              title: 'Print job queued',
              description: 'Your print job is still being processed. Check the print queue for status.',
              variant: 'default',
            })
            setMonitoredJobs(prev => {
              const next = new Set(prev)
              next.delete(jobId)
              return next
            })
            return
          }

          // Schedule next check
          setTimeout(checkStatus, pollInterval)
          return
        }
      } catch (error) {
        console.error('Error monitoring print job:', error)
        setMonitoredJobs(prev => {
          const next = new Set(prev)
          next.delete(jobId)
          return next
        })
      }
    }

    // Start monitoring
    checkStatus()
  }, [monitoredJobs, toast])

  /**
   * Show initial print job queued notification
   */
  const notifyJobQueued = useCallback((jobId: string, printerName?: string) => {
    toast({
      title: 'Print job queued',
      description: printerName
        ? `Your print job has been sent to ${printerName}`
        : 'Your print job has been queued',
    })
  }, [toast])

  /**
   * Show print job started notification
   */
  const notifyJobStarted = useCallback((jobId: string) => {
    toast({
      title: 'Printing...',
      description: 'Your print job is being processed',
    })
  }, [toast])

  return {
    monitorJob,
    notifyJobQueued,
    notifyJobStarted,
    isMonitoring: monitoredJobs.size > 0,
    monitoredJobCount: monitoredJobs.size,
  }
}
