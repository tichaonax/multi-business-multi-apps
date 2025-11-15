'use client'

/**
 * Print Queue Dashboard
 * View and manage print jobs across all printers
 */

import { useState, useEffect } from 'react'
import { RefreshCw, CheckCircle, XCircle, Clock, AlertCircle, RotateCcw, Filter } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'

interface PrintJob {
  id: string
  printerId: string
  businessId: string
  businessType: string
  userId: string
  jobType: 'receipt' | 'label'
  jobData: any
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  retryCount: number
  errorMessage: string | null
  createdAt: string
  processedAt: string | null
  network_printers?: {
    printerName: string
    nodeId: string
  }
}

export function PrintQueueDashboard() {
  const [jobs, setJobs] = useState<PrintJob[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'failed'>('all')
  const [statistics, setStatistics] = useState({
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
  })
  const { toast } = useToast()

  useEffect(() => {
    fetchJobs()
    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchJobs, 10000)
    return () => clearInterval(interval)
  }, [filter])

  async function fetchJobs() {
    try {
      setLoading(true)
      const params = new URLSearchParams()

      if (filter !== 'all') {
        params.append('status', filter.toUpperCase())
      }

      params.append('limit', '50')
      params.append('sortBy', 'createdAt')
      params.append('sortOrder', 'desc')

      const response = await fetch(`/api/print/jobs?${params}`)

      if (!response.ok) {
        throw new Error('Failed to fetch jobs')
      }

      const data = await response.json()
      setJobs(data.jobs || [])

      // Update statistics
      const stats = {
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
      }

      data.jobs.forEach((job: PrintJob) => {
        if (job.status === 'PENDING') stats.pending++
        else if (job.status === 'PROCESSING') stats.processing++
        else if (job.status === 'COMPLETED') stats.completed++
        else if (job.status === 'FAILED') stats.failed++
      })

      setStatistics(stats)
    } catch (error) {
      console.error('Error fetching jobs:', error)
      toast({
        title: 'Error',
        description: 'Failed to load print jobs',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleRetryJob(jobId: string) {
    try {
      const response = await fetch(`/api/print/jobs/${jobId}/retry`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to retry job')
      }

      toast({
        title: 'Job queued for retry',
        description: 'The print job will be retried',
      })

      fetchJobs()
    } catch (error) {
      console.error('Error retrying job:', error)
      toast({
        title: 'Retry failed',
        description: 'Failed to retry print job',
        variant: 'destructive',
      })
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'PENDING':
        return <Clock className="w-4 h-4 text-yellow-500" />
      case 'PROCESSING':
        return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
      case 'COMPLETED':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'FAILED':
        return <XCircle className="w-4 h-4 text-red-500" />
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />
    }
  }

  function getStatusBadge(status: string) {
    const variants: Record<string, any> = {
      PENDING: 'default',
      PROCESSING: 'default',
      COMPLETED: 'success',
      FAILED: 'destructive',
    }

    return (
      <Badge variant={variants[status] || 'default'}>
        {status}
      </Badge>
    )
  }

  function formatTimestamp(timestamp: string) {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()

    // Less than 1 minute
    if (diff < 60000) {
      return 'Just now'
    }

    // Less than 1 hour
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000)
      return `${minutes}m ago`
    }

    // Less than 24 hours
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000)
      return `${hours}h ago`
    }

    // Otherwise show date
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString()
  }

  if (loading && jobs.length === 0) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center">
          <RefreshCw className="w-6 h-6 animate-spin mr-3" />
          <span className="text-gray-600">Loading print queue...</span>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-sm text-gray-600 flex items-center gap-2">
            <Clock className="w-4 h-4 text-yellow-500" />
            Pending
          </div>
          <div className="text-2xl font-bold mt-1">{statistics.pending}</div>
        </Card>

        <Card className="p-4">
          <div className="text-sm text-gray-600 flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-blue-500" />
            Processing
          </div>
          <div className="text-2xl font-bold mt-1">{statistics.processing}</div>
        </Card>

        <Card className="p-4">
          <div className="text-sm text-gray-600 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            Completed
          </div>
          <div className="text-2xl font-bold mt-1">{statistics.completed}</div>
        </Card>

        <Card className="p-4">
          <div className="text-sm text-gray-600 flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-500" />
            Failed
          </div>
          <div className="text-2xl font-bold mt-1">{statistics.failed}</div>
        </Card>
      </div>

      {/* Filter and Actions */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All Jobs
          </Button>
          <Button
            variant={filter === 'pending' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('pending')}
          >
            Pending
          </Button>
          <Button
            variant={filter === 'failed' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('failed')}
          >
            Failed
          </Button>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchJobs}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Jobs List */}
      {jobs.length === 0 ? (
        <Card className="p-12">
          <div className="text-center text-gray-500">
            <CheckCircle className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium mb-2">No print jobs</h3>
            <p className="text-sm">
              {filter === 'all'
                ? 'The print queue is empty'
                : `No ${filter} print jobs`}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {jobs.map((job) => (
            <Card key={job.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(job.status)}

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {job.jobType.charAt(0).toUpperCase() + job.jobType.slice(1)} Job
                        </span>
                        {getStatusBadge(job.status)}
                        {job.retryCount > 0 && (
                          <Badge variant="outline" className="text-xs">
                            Retry {job.retryCount}
                          </Badge>
                        )}
                      </div>

                      <div className="text-sm text-gray-600 mt-1">
                        {job.network_printers?.printerName || 'Unknown Printer'}
                        {' • '}
                        {job.network_printers?.nodeId || 'Unknown Node'}
                        {' • '}
                        {formatTimestamp(job.createdAt)}
                      </div>

                      {job.errorMessage && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
                          <AlertCircle className="w-4 h-4 inline mr-1" />
                          {job.errorMessage}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {job.status === 'FAILED' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRetryJob(job.id)}
                  >
                    <RotateCcw className="w-4 h-4 mr-1" />
                    Retry
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
