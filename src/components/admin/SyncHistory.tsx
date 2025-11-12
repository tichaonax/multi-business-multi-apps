'use client'

/**
 * Sync History Component
 * Shows recent syncs with direction arrows and status
 */

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import {
  CheckCircle,
  AlertTriangle,
  Clock,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  XCircle
} from 'lucide-react'

interface FullSyncSession {
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
  direction: 'pull' | 'push'
  method: 'backup' | 'http'
  phase?: string
  transferSpeed?: number
}

interface SyncHistoryProps {
  sessions: FullSyncSession[]
  onSessionUpdate?: () => void
}

export function SyncHistory({ sessions, onSessionUpdate }: SyncHistoryProps) {
  const [cancellingSessionId, setCancellingSessionId] = useState<string | null>(null)

  const cancelSync = async (sessionId: string) => {
    if (!confirm('Are you sure you want to cancel this sync? This action cannot be undone.')) {
      return
    }

    try {
      setCancellingSessionId(sessionId)

      const response = await fetch('/api/admin/sync/full-sync/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to cancel sync')
      }

      // Refresh data
      if (onSessionUpdate) {
        onSessionUpdate()
      }

    } catch (error) {
      console.error('Failed to cancel sync:', error)
      alert(`Failed to cancel sync: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setCancellingSessionId(null)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PREPARING': return <Clock className="h-4 w-4 text-yellow-500" />
      case 'TRANSFERRING': return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
      case 'COMPLETED': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'FAILED': return <AlertTriangle className="h-4 w-4 text-red-500" />
      default: return <RefreshCw className="h-4 w-4" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      'COMPLETED': 'default',
      'FAILED': 'destructive',
      'TRANSFERRING': 'secondary',
      'PREPARING': 'secondary'
    }
    return variants[status] || 'secondary'
  }

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date()
    const then = new Date(timestamp)
    const diffMs = now.getTime() - then.getTime()
    const diffMins = Math.round(diffMs / 60000)

    if (diffMins < 1) return 'Just now'
    if (diffMins === 1) return '1 min ago'
    if (diffMins < 60) return `${diffMins} mins ago'`
    const diffHours = Math.round(diffMins / 60)
    if (diffHours === 1) return '1 hour ago'
    if (diffHours < 24) return `${diffHours} hours ago`
    const diffDays = Math.round(diffHours / 24)
    if (diffDays === 1) return '1 day ago'
    return `${diffDays} days ago`
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Syncs</CardTitle>
        <CardDescription>
          Recent sync history with status and direction
        </CardDescription>
      </CardHeader>
      <CardContent>
        {sessions.length === 0 && (
          <p className="text-sm text-muted-foreground">No sync history yet</p>
        )}

        <div className="space-y-3">
          {sessions.map((session) => (
            <div
              key={session.sessionId}
              className="border rounded-lg p-4 space-y-2"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(session.status)}
                  <Badge variant={getStatusBadge(session.status)}>
                    {session.status}
                  </Badge>
                  <Badge variant="outline">{session.method.toUpperCase()}</Badge>
                </div>
                <div className="flex items-center space-x-2">
                  {(session.status === 'PREPARING' || session.status === 'TRANSFERRING') && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => cancelSync(session.sessionId)}
                      disabled={cancellingSessionId === session.sessionId}
                    >
                      <XCircle className="h-3 w-3 mr-1" />
                      {cancellingSessionId === session.sessionId ? 'Cancelling...' : 'Cancel'}
                    </Button>
                  )}
                  <span className="text-sm text-muted-foreground">
                    {session.completedAt ? formatTimeAgo(session.completedAt) : formatTimeAgo(session.startedAt)}
                  </span>
                </div>
              </div>

              {/* Direction */}
              <div className="flex items-center space-x-2 text-sm">
                {session.direction === 'push' ? (
                  <>
                    <span className="font-medium">This</span>
                    <ArrowRight className="h-4 w-4 text-green-500" />
                    <span>{session.targetNodeId}</span>
                  </>
                ) : (
                  <>
                    <span>{session.sourceNodeId}</span>
                    <ArrowLeft className="h-4 w-4 text-blue-500" />
                    <span className="font-medium">This</span>
                  </>
                )}
              </div>

              {/* Progress */}
              {(session.status === 'PREPARING' || session.status === 'TRANSFERRING') && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{session.currentStep}</span>
                    <span>{session.progress}%</span>
                  </div>
                  <Progress value={session.progress} className="h-2" />
                  {session.transferredBytes > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(session.transferredBytes)} transferred
                      {session.transferSpeed && session.transferSpeed > 0 && (
                        <> • {formatBytes(session.transferSpeed)}/s</>
                      )}
                    </p>
                  )}
                </div>
              )}

              {/* Error Message */}
              {session.errorMessage && (
                <p className="text-sm text-red-600">{session.errorMessage}</p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
