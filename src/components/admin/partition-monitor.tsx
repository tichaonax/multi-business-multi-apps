'use client'

/**
 * Partition Monitor Component
 * Real-time monitoring and management of network partitions
 */

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  Play,
  Square,
  Network,
  Activity,
  Zap,
  Shield
} from 'lucide-react'

interface PartitionInfo {
  partitionId: string
  partitionType: 'NETWORK_DISCONNECTION' | 'SYNC_FAILURE' | 'PEER_UNREACHABLE' | 'DATA_INCONSISTENCY'
  affectedPeers: Array<{ nodeId: string; nodeName: string }>
  detectedAt: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  isResolved: boolean
  metadata: {
    failureCount: number
    errorMessages: string[]
  }
}

interface RecoverySession {
  sessionId: string
  partitionId: string
  strategy: string
  startedAt: string
  status: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  progress: number
  currentStep: string
  errorMessage?: string
}

interface RecoveryMetrics {
  totalRecoveries: number
  successfulRecoveries: number
  failedRecoveries: number
  averageRecoveryTime: number
  recoverySuccessRate: number
  commonFailureReasons: Array<{ reason: string; count: number }>
}

export function PartitionMonitor() {
  const [partitions, setPartitions] = useState<PartitionInfo[]>([])
  const [recoverySessions, setRecoverySessions] = useState<RecoverySession[]>([])
  const [recoveryMetrics, setRecoveryMetrics] = useState<RecoveryMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPartitionData()
    const interval = setInterval(fetchPartitionData, 10000) // Update every 10 seconds
    return () => clearInterval(interval)
  }, [])

  const fetchPartitionData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Fetch active partitions
      const partitionsResponse = await fetch('/api/admin/sync/partitions')
      if (!partitionsResponse.ok) {
        throw new Error('Failed to fetch partitions')
      }
      const partitionsData = await partitionsResponse.json()
      setPartitions(partitionsData.partitions || [])

      // Fetch recovery sessions
      const sessionsResponse = await fetch('/api/admin/sync/recovery-sessions')
      if (!sessionsResponse.ok) {
        throw new Error('Failed to fetch recovery sessions')
      }
      const sessionsData = await sessionsResponse.json()
      setRecoverySessions(sessionsData.sessions || [])

      // Fetch recovery metrics
      const metricsResponse = await fetch('/api/admin/sync/recovery-metrics')
      if (!metricsResponse.ok) {
        throw new Error('Failed to fetch recovery metrics')
      }
      const metricsData = await metricsResponse.json()
      setRecoveryMetrics(metricsData.metrics)

    } catch (error) {
      console.error('Failed to fetch partition data:', error)
      setError(error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  const initiateRecovery = async (partitionId: string, strategy?: string) => {
    try {
      const response = await fetch('/api/admin/sync/initiate-recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partitionId, strategy })
      })

      if (!response.ok) {
        throw new Error('Failed to initiate recovery')
      }

      const result = await response.json()
      console.log('Recovery initiated:', result)

      // Refresh data
      await fetchPartitionData()
    } catch (error) {
      console.error('Failed to initiate recovery:', error)
      setError(error instanceof Error ? error.message : 'Recovery initiation failed')
    }
  }

  const cancelRecovery = async (sessionId: string) => {
    try {
      const response = await fetch('/api/admin/sync/cancel-recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      })

      if (!response.ok) {
        throw new Error('Failed to cancel recovery')
      }

      // Refresh data
      await fetchPartitionData()
    } catch (error) {
      console.error('Failed to cancel recovery:', error)
      setError(error instanceof Error ? error.message : 'Recovery cancellation failed')
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'destructive'
      case 'HIGH': return 'destructive'
      case 'MEDIUM': return 'outline'
      case 'LOW': return 'secondary'
      default: return 'secondary'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return <AlertTriangle className="h-4 w-4 text-red-500" />
      case 'HIGH': return <AlertTriangle className="h-4 w-4 text-orange-500" />
      case 'MEDIUM': return <Clock className="h-4 w-4 text-yellow-500" />
      case 'LOW': return <CheckCircle className="h-4 w-4 text-green-500" />
      default: return <Activity className="h-4 w-4" />
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'RUNNING': return <Play className="h-4 w-4 text-blue-500" />
      case 'COMPLETED': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'FAILED': return <AlertTriangle className="h-4 w-4 text-red-500" />
      case 'CANCELLED': return <Square className="h-4 w-4 text-gray-500" />
      default: return <Activity className="h-4 w-4" />
    }
  }

  const formatDuration = (startTime: string) => {
    const start = new Date(startTime)
    const now = new Date()
    const diff = now.getTime() - start.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`
    }
    return `${minutes}m`
  }

  if (isLoading && partitions.length === 0) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <RefreshCw className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading partition data...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Partitions</CardTitle>
            <Network className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{partitions.filter(p => !p.isResolved).length}</div>
            <p className="text-xs text-muted-foreground">
              {partitions.filter(p => p.severity === 'CRITICAL').length} critical
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recovery Sessions</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {recoverySessions.filter(s => s.status === 'RUNNING').length}
            </div>
            <p className="text-xs text-muted-foreground">
              {recoverySessions.filter(s => s.status === 'COMPLETED').length} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {recoveryMetrics ? Math.round(recoveryMetrics.recoverySuccessRate * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {recoveryMetrics?.totalRecoveries || 0} total recoveries
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Recovery Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {recoveryMetrics ? Math.round(recoveryMetrics.averageRecoveryTime / 60) : 0}m
            </div>
            <p className="text-xs text-muted-foreground">Average duration</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Partitions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2" />
            Active Partitions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {partitions.filter(p => !p.isResolved).length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-muted-foreground">No active partitions detected</p>
              <p className="text-sm text-muted-foreground">All nodes are synchronized</p>
            </div>
          ) : (
            <div className="space-y-4">
              {partitions.filter(p => !p.isResolved).map((partition) => (
                <div key={partition.partitionId} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        {getSeverityIcon(partition.severity)}
                        <Badge variant={getSeverityColor(partition.severity)}>
                          {partition.severity}
                        </Badge>
                        <Badge variant="outline">{partition.partitionType}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {formatDuration(partition.detectedAt)} ago
                        </span>
                      </div>

                      <h4 className="font-medium mb-1">
                        {partition.partitionType.replace(/_/g, ' ')}
                      </h4>

                      <p className="text-sm text-muted-foreground mb-2">
                        Affected peers: {partition.affectedPeers.map(p => p.nodeName).join(', ') || 'None'}
                      </p>

                      {partition.metadata.errorMessages.length > 0 && (
                        <p className="text-sm text-red-600">
                          {partition.metadata.errorMessages[0]}
                        </p>
                      )}
                    </div>

                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        onClick={() => initiateRecovery(partition.partitionId, 'FORCE_RESYNC')}
                      >
                        Force Resync
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => initiateRecovery(partition.partitionId)}
                      >
                        Auto Recover
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recovery Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            Recovery Sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recoverySessions.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No recovery sessions</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recoverySessions.map((session) => (
                <div key={session.sessionId} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        {getStatusIcon(session.status)}
                        <Badge variant={session.status === 'RUNNING' ? 'default' : 'secondary'}>
                          {session.status}
                        </Badge>
                        <Badge variant="outline">{session.strategy}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {formatDuration(session.startedAt)}
                        </span>
                      </div>

                      <h4 className="font-medium mb-1">{session.currentStep}</h4>

                      {session.status === 'RUNNING' && (
                        <div className="space-y-2">
                          <Progress value={session.progress} className="w-full" />
                          <p className="text-sm text-muted-foreground">
                            {session.progress}% complete
                          </p>
                        </div>
                      )}

                      {session.errorMessage && (
                        <p className="text-sm text-red-600 mt-2">
                          {session.errorMessage}
                        </p>
                      )}
                    </div>

                    <div className="flex space-x-2">
                      {session.status === 'RUNNING' && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => cancelRecovery(session.sessionId)}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recovery Metrics */}
      {recoveryMetrics && (
        <Card>
          <CardHeader>
            <CardTitle>Recovery Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-4">Recovery Statistics</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Total Recoveries:</span>
                    <span className="font-medium">{recoveryMetrics.totalRecoveries}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Successful:</span>
                    <span className="font-medium text-green-600">
                      {recoveryMetrics.successfulRecoveries}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Failed:</span>
                    <span className="font-medium text-red-600">
                      {recoveryMetrics.failedRecoveries}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Success Rate:</span>
                    <span className="font-medium">
                      {Math.round(recoveryMetrics.recoverySuccessRate * 100)}%
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-4">Common Failure Reasons</h4>
                <div className="space-y-2">
                  {recoveryMetrics.commonFailureReasons.slice(0, 5).map((reason, index) => (
                    <div key={index} className="flex justify-between">
                      <span className="text-sm truncate">{reason.reason}</span>
                      <Badge variant="secondary">{reason.count}</Badge>
                    </div>
                  ))}
                  {recoveryMetrics.commonFailureReasons.length === 0 && (
                    <p className="text-sm text-muted-foreground">No failure data available</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}