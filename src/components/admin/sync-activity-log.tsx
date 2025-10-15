'use client'

/**
 * Sync Activity Log
 * Real-time display of sync activities and events
 */

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Activity,
  CheckCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  Database,
  Network,
  Shield
} from 'lucide-react'

interface SyncActivity {
  id: string
  type: 'sync_session' | 'conflict_resolution' | 'peer_discovery' | 'sync_error'
  message: string
  details?: string
  timestamp: string
  severity: 'info' | 'warning' | 'error' | 'success'
  nodeId?: string
  tableName?: string
}

export function SyncActivityLog() {
  const [activities, setActivities] = useState<SyncActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const fetchSyncActivity = async () => {
    try {
      // This would fetch from a real-time activity endpoint
      // For now, we'll create mock activities based on recent data
      const [statsResponse] = await Promise.all([
        fetch('/api/sync/stats')
      ])

      if (statsResponse.ok) {
        const stats = await statsResponse.json()
        const mockActivities: SyncActivity[] = []
        
        // Ensure required properties exist
        if (!stats) {
          console.warn('No stats data received')
          return
        }

        // Add recent sessions as activities
        stats.recentSessions.slice(0, 5).forEach((session: any) => {
          const eventsTransferred = session.eventsTransferred || session.metadata?.eventsTransferred || 0
          const participantCount = session.participantNodes?.length || 
                                 session.metadata?.participantNodes?.length || 
                                 (session.sourceNodeId && session.targetNodeId ? 2 : 1)
          
          mockActivities.push({
            id: session.sessionId,
            type: 'sync_session',
            message: `Sync session ${session.status.toLowerCase()}`,
            details: `${eventsTransferred} events transferred with ${participantCount} nodes`,
            timestamp: session.endedAt || session.startedAt,
            severity: session.status === 'COMPLETED' ? 'success' : 'error',
            nodeId: session.sourceNodeId
          })
        })

        // Add recent conflicts as activities
        stats.recentConflicts?.slice(0, 5).forEach((conflict: any) => {
          mockActivities.push({
            id: conflict.id,
            type: 'conflict_resolution',
            message: `${conflict.conflictType || 'Unknown'} conflict resolved`,
            details: `Table: ${conflict.tableName || 'Unknown'}, Strategy: ${conflict.resolutionStrategy || 'Auto'}`,
            timestamp: conflict.createdAt,
            severity: conflict.autoResolved ? 'warning' : 'info',
            nodeId: conflict.resolvedBy || conflict.resolvedByNodeId,
            tableName: conflict.tableName
          })
        })

        // Add peer discovery activities
        stats.syncNodes?.slice(0, 3).forEach((node: any) => {
          if (node.isOnline) {
            mockActivities.push({
              id: `peer-${node.nodeId}`,
              type: 'peer_discovery',
              message: `Peer ${node.nodeName || 'Unknown'} discovered`,
              details: `IP: ${node.ipAddress || 'Unknown'}:${node.port || 'Unknown'}`,
              timestamp: node.lastSeen,
              severity: 'info',
              nodeId: node.nodeId
            })
          }
        })

        // Sort by timestamp (newest first)
        mockActivities.sort((a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )

        setActivities(mockActivities.slice(0, 10)) // Show last 10 activities
      }
    } catch (error) {
      console.error('Failed to fetch sync activity:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSyncActivity()

    let interval: NodeJS.Timeout | null = null
    if (autoRefresh) {
      interval = setInterval(fetchSyncActivity, 10000) // Every 10 seconds
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [autoRefresh])

  const getActivityIcon = (type: string, severity: string) => {
    switch (type) {
      case 'sync_session':
        return severity === 'success' ?
          <CheckCircle className="h-4 w-4 text-green-600" /> :
          <AlertTriangle className="h-4 w-4 text-red-600" />
      case 'conflict_resolution':
        return <Shield className="h-4 w-4 text-yellow-600" />
      case 'peer_discovery':
        return <Network className="h-4 w-4 text-blue-600" />
      case 'sync_error':
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      default:
        return <Activity className="h-4 w-4 text-gray-600" />
    }
  }

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'success':
        return <Badge variant="default">Success</Badge>
      case 'warning':
        return <Badge variant="secondary">Warning</Badge>
      case 'error':
        return <Badge variant="destructive">Error</Badge>
      default:
        return <Badge variant="outline">Info</Badge>
    }
  }

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date()
    const time = new Date(timestamp)
    const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000)

    if (diffInSeconds < 60) return `${diffInSeconds}s ago`
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    return `${Math.floor(diffInSeconds / 86400)}d ago`
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Sync Activity Log</CardTitle>
            <CardDescription>
              Real-time synchronization events and activities
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              <Activity className={`h-4 w-4 mr-1 ${autoRefresh ? 'animate-pulse' : ''}`} />
              {autoRefresh ? 'Live' : 'Paused'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => fetchSyncActivity()}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {activities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Loading activities...
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <Clock className="h-4 w-4" />
                  No recent sync activities
                </div>
              )}
            </div>
          ) : (
            activities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-shrink-0 mt-0.5">
                  {getActivityIcon(activity.type, activity.severity)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-medium text-sm">
                      {activity.message}
                    </div>
                    <div className="flex items-center gap-2">
                      {getSeverityBadge(activity.severity)}
                      <span className="text-xs text-muted-foreground">
                        {formatTimeAgo(activity.timestamp)}
                      </span>
                    </div>
                  </div>
                  {activity.details && (
                    <p className="text-xs text-muted-foreground">
                      {activity.details}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    {activity.nodeId && (
                      <span className="text-xs bg-muted px-2 py-0.5 rounded">
                        Node: {activity.nodeId.substring(0, 8)}...
                      </span>
                    )}
                    {activity.tableName && (
                      <span className="text-xs bg-muted px-2 py-0.5 rounded">
                        Table: {activity.tableName}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}