'use client'

/**
 * Initial Load Monitor Component
 * Real-time monitoring and management of initial data loads for new nodes
 */

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Download,
  Upload,
  Clock,
  Database,
  CheckCircle,
  AlertTriangle,
  Play,
  Square,
  RefreshCw,
  HardDrive,
  Network
} from 'lucide-react'

interface InitialLoadSession {
  sessionId: string
  sourceNodeId: string
  targetNodeId: string
  status: 'PREPARING' | 'TRANSFERRING' | 'VALIDATING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  progress: number
  currentStep: string
  totalRecords: number
  transferredRecords: number
  transferredBytes: number
  startedAt: string
  completedAt?: string
  estimatedTimeRemaining: number
  errorMessage?: string
}

interface DataSnapshot {
  snapshotId: string
  totalRecords: number
  totalSize: number
  createdAt: string
  tables: Array<{
    tableName: string
    recordCount: number
    dataSize: number
  }>
}

export function InitialLoadMonitor() {
  const [sessions, setSessions] = useState<InitialLoadSession[]>([])
  const [snapshots, setSnapshots] = useState<DataSnapshot[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchInitialLoadData()
    const interval = setInterval(fetchInitialLoadData, 5000) // Update every 5 seconds
    return () => clearInterval(interval)
  }, [])

  const fetchInitialLoadData = async () => {
    try {
      setError(null)

      // Fetch initial load sessions
      const response = await fetch('/api/admin/sync/initial-load')
      if (!response.ok) {
        throw new Error('Failed to fetch initial load sessions')
      }
      const data = await response.json()
      setSessions(data.sessions || [])

    } catch (error) {
      console.error('Failed to fetch initial load data:', error)
      setError(error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  const createSnapshot = async () => {
    try {
      const response = await fetch('/api/admin/sync/initial-load', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'snapshot' })
      })

      if (!response.ok) {
        throw new Error('Failed to create snapshot')
      }

      const result = await response.json()
      console.log('Snapshot created:', result)
      await fetchInitialLoadData()

    } catch (error) {
      console.error('Failed to create snapshot:', error)
      setError(error instanceof Error ? error.message : 'Snapshot creation failed')
    }
  }

  const initiateInitialLoad = async () => {
    try {
      // Mock peer for demonstration
      const mockPeer = {
        nodeId: 'target-node-001',
        nodeName: 'Target Node 1',
        ipAddress: '192.168.1.100',
        port: 3001
      }

      const response = await fetch('/api/admin/sync/initial-load', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'initiate',
          targetPeer: mockPeer,
          options: {
            compressionEnabled: true,
            encryptionEnabled: true,
            checksumVerification: true
          }
        })
      })

      if (!response.ok) {
        throw new Error('Failed to initiate initial load')
      }

      const result = await response.json()
      console.log('Initial load initiated:', result)
      await fetchInitialLoadData()

    } catch (error) {
      console.error('Failed to initiate initial load:', error)
      setError(error instanceof Error ? error.message : 'Initial load initiation failed')
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PREPARING': return <Clock className="h-4 w-4 text-yellow-500" />
      case 'TRANSFERRING': return <Download className="h-4 w-4 text-blue-500" />
      case 'VALIDATING': return <CheckCircle className="h-4 w-4 text-orange-500" />
      case 'COMPLETED': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'FAILED': return <AlertTriangle className="h-4 w-4 text-red-500" />
      case 'CANCELLED': return <Square className="h-4 w-4 text-gray-500" />
      default: return <RefreshCw className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PREPARING': return 'secondary'
      case 'TRANSFERRING': return 'default'
      case 'VALIDATING': return 'outline'
      case 'COMPLETED': return 'default'
      case 'FAILED': return 'destructive'
      case 'CANCELLED': return 'secondary'
      default: return 'secondary'
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDuration = (startTime: string, endTime?: string) => {
    const start = new Date(startTime)
    const end = endTime ? new Date(endTime) : new Date()
    const diff = end.getTime() - start.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`
    }
    return `${minutes}m`
  }

  const formatTimeRemaining = (seconds: number) => {
    if (seconds <= 0) return 'Unknown'
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`
    }
    return `${minutes}m ${seconds % 60}s`
  }

  if (isLoading && sessions.length === 0) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <RefreshCw className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading initial load data...</span>
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

      {/* Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Database className="h-5 w-5 mr-2" />
            Initial Load Controls
          </CardTitle>
          <CardDescription>
            Manage data snapshots and initial loads for new nodes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4">
            <Button onClick={createSnapshot} className="flex items-center">
              <HardDrive className="h-4 w-4 mr-2" />
              Create Snapshot
            </Button>
            <Button onClick={initiateInitialLoad} className="flex items-center">
              <Upload className="h-4 w-4 mr-2" />
              Initiate Load
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Transfers</CardTitle>
            <Network className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sessions.filter(s => ['PREPARING', 'TRANSFERRING', 'VALIDATING'].includes(s.status)).length}
            </div>
            <p className="text-xs text-muted-foreground">
              {sessions.filter(s => s.status === 'TRANSFERRING').length} transferring
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sessions.filter(s => s.status === 'COMPLETED').length}
            </div>
            <p className="text-xs text-muted-foreground">
              {sessions.filter(s => s.status === 'FAILED').length} failed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Records</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sessions.reduce((sum, s) => sum + s.totalRecords, 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {sessions.reduce((sum, s) => sum + s.transferredRecords, 0).toLocaleString()} transferred
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Data Volume</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatBytes(sessions.reduce((sum, s) => sum + s.transferredBytes, 0))}
            </div>
            <p className="text-xs text-muted-foreground">Transferred</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Download className="h-5 w-5 mr-2" />
            Initial Load Sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <div className="text-center py-8">
              <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No initial load sessions</p>
              <p className="text-sm text-muted-foreground">Create a snapshot and initiate loads for new nodes</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sessions.map((session) => (
                <div key={session.sessionId} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        {getStatusIcon(session.status)}
                        <Badge variant={getStatusColor(session.status)}>
                          {session.status}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {session.sourceNodeId} → {session.targetNodeId}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {formatDuration(session.startedAt, session.completedAt)}
                        </span>
                      </div>

                      <h4 className="font-medium mb-1">{session.currentStep}</h4>

                      {['PREPARING', 'TRANSFERRING', 'VALIDATING'].includes(session.status) && (
                        <div className="space-y-2">
                          <Progress value={session.progress} className="w-full" />
                          <div className="flex justify-between text-sm text-muted-foreground">
                            <span>{session.progress}% complete</span>
                            <span>
                              {session.transferredRecords.toLocaleString()} / {session.totalRecords.toLocaleString()} records
                            </span>
                          </div>
                          {session.estimatedTimeRemaining > 0 && (
                            <p className="text-sm text-muted-foreground">
                              Est. {formatTimeRemaining(session.estimatedTimeRemaining)} remaining
                            </p>
                          )}
                        </div>
                      )}

                      {session.status === 'COMPLETED' && (
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Records:</span>
                            <span className="ml-2 font-medium">{session.totalRecords.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Data:</span>
                            <span className="ml-2 font-medium">{formatBytes(session.transferredBytes)}</span>
                          </div>
                        </div>
                      )}

                      {session.errorMessage && (
                        <p className="text-sm text-red-600 mt-2">
                          {session.errorMessage}
                        </p>
                      )}
                    </div>

                    <div className="flex space-x-2">
                      {['PREPARING', 'TRANSFERRING', 'VALIDATING'].includes(session.status) && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => console.log('Cancel session:', session.sessionId)}
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
    </div>
  )
}