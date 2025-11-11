'use client'

/**
 * Admin Sync Dashboard
 * Comprehensive monitoring and control interface for the sync system
 */

import { useState, useEffect } from 'react'
import { ContentLayout } from '@/components/layout/content-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Activity,
  Server,
  AlertTriangle,
  CheckCircle,
  Clock,
  Network,
  RefreshCw,
  Play,
  Square,
  RotateCcw,
  Users,
  Database,
  TrendingUp,
  Shield
} from 'lucide-react'
import { SyncActivityLog } from '@/components/admin/sync-activity-log'
import { PartitionMonitor } from '@/components/admin/partition-monitor'
import { FullSyncPanel } from '@/components/admin/FullSyncPanel'

interface SyncStats {
  overview: {
    totalSyncEvents: number
    processedEvents: number
    pendingEvents: number
    failedEvents: number
    conflictResolutions: number
    activeSyncNodes: number
    healthScore: number
    successRate: number
    conflictRate: number
  }
  last24Hours: {
    events: number
    conflicts: number
    sessions: number
  }
  syncNodes: Array<{
    nodeId: string
    nodeName: string
    ipAddress: string
    port: number
    isActive: boolean
    isOnline: boolean
    lastSeen: string
    lastSeenAgo: number
    capabilities: any
    createdAt: string
  }>
  recentSessions: Array<{
    sessionId: string
    initiatorNodeId: string
    participantNodes: string[]
    status: string
    startTime: string
    endTime: string | null
    eventsTransferred: number
    conflictsDetected: number
    conflictsResolved: number
  }>
  recentConflicts: Array<{
    id: string
    conflictType: string
    tableName: string
    resolutionStrategy: string
    resolvedByNodeId: string
    autoResolved: boolean
    humanReviewed: boolean
    createdAt: string
    conflictMetadata: any
  }>
  metrics: Array<{
    date: string
    eventsGenerated: number
    eventsReceived: number
    eventsProcessed: number
    conflictsDetected: number
    conflictsResolved: number
    peersConnected: number
    dataTransferred: number
  }>
  timestamp: string
}

interface ServiceStatus {
  isRunning: boolean
  output?: string
  error?: string
  timestamp: string
}

export default function AdminSyncPage() {
  const [stats, setStats] = useState<SyncStats | null>(null)
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [serviceLoading, setServiceLoading] = useState(false)

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/sync/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Failed to fetch sync stats:', error)
    }
  }

  const fetchServiceStatus = async () => {
    try {
      const response = await fetch('/api/sync/service')
      if (response.ok) {
        const data = await response.json()
        setServiceStatus(data)
      }
    } catch (error) {
      console.error('Failed to fetch service status:', error)
    }
  }

  const controlService = async (action: string) => {
    setServiceLoading(true)
    try {
      const response = await fetch('/api/sync/service', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })

      if (response.ok) {
        const result = await response.json()
        console.log(`Service ${action} result:`, result)
        // Refresh status after action
        setTimeout(fetchServiceStatus, 2000)
      }
    } catch (error) {
      console.error(`Failed to ${action} service:`, error)
    } finally {
      setServiceLoading(false)
    }
  }

  const refreshData = async () => {
    setRefreshing(true)
    await Promise.all([fetchStats(), fetchServiceStatus()])
    setRefreshing(false)
  }

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([fetchStats(), fetchServiceStatus()])
      setLoading(false)
    }

    loadData()

    // Auto-refresh every 15 seconds for more responsive UI
    const interval = setInterval(refreshData, 15000)
    return () => clearInterval(interval)
  }, [])

  const getHealthColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getHealthBadge = (score: number) => {
    if (score >= 90) return { variant: 'default' as const, text: 'Excellent' }
    if (score >= 70) return { variant: 'secondary' as const, text: 'Good' }
    if (score >= 50) return { variant: 'destructive' as const, text: 'Warning' }
    return { variant: 'destructive' as const, text: 'Critical' }
  }

  const formatTimeAgo = (seconds: number) => {
    if (seconds < 60) return `${seconds}s ago`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
  }

  if (loading) {
    return (
      <ContentLayout
        title="Sync Management"
        subtitle="Database synchronization monitoring and controls"
        breadcrumb={[
          { label: 'Admin', href: '/admin' },
          { label: 'Sync Management', isActive: true }
        ]}
      >
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
        </div>
      </ContentLayout>
    )
  }

  return (
    <ContentLayout
      title="Sync Management"
      subtitle="Database synchronization monitoring and controls"
      breadcrumb={[
        { label: 'Admin', href: '/admin' },
        { label: 'Sync Management', isActive: true }
      ]}
      headerActions={
        <div className="flex items-center gap-2">
          {stats?.timestamp && (
            <span className="text-xs text-muted-foreground">
              Updated: {new Date(stats.timestamp).toLocaleTimeString()}
            </span>
          )}
          <Button onClick={refreshData} disabled={refreshing} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Service Status and Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Sync Service Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      serviceStatus?.isRunning ? 'bg-green-500' : 'bg-red-500'
                    }`}
                  />
                  <span className="font-medium">
                    {serviceStatus?.isRunning ? 'Running' : 'Stopped'}
                  </span>
                </div>
                {serviceStatus?.timestamp && (
                  <span className="text-sm text-muted-foreground">
                    Last checked: {new Date(serviceStatus.timestamp).toLocaleTimeString()}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => controlService('start')}
                  disabled={serviceLoading || serviceStatus?.isRunning}
                >
                  <Play className="h-4 w-4 mr-1" />
                  Start
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => controlService('stop')}
                  disabled={serviceLoading || !serviceStatus?.isRunning}
                >
                  <Square className="h-4 w-4 mr-1" />
                  Stop
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => controlService('restart')}
                  disabled={serviceLoading}
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Restart
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => controlService('sync')}
                  disabled={serviceLoading || !serviceStatus?.isRunning}
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Force Sync
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Overview Cards */}
        {stats && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">System Health</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  <span className={getHealthColor(stats.overview.healthScore)}>
                    {stats.overview.healthScore}%
                  </span>
                </div>
                <div className="mt-2">
                  <Badge {...getHealthBadge(stats.overview.healthScore)}>
                    {getHealthBadge(stats.overview.healthScore).text}
                  </Badge>
                </div>
                <Progress value={stats.overview.healthScore} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Nodes</CardTitle>
                <Network className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.overview.activeSyncNodes}</div>
                <p className="text-xs text-muted-foreground">
                  Connected peers
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sync Events</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.overview.totalSyncEvents}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.overview.processedEvents} processed, {stats.overview.pendingEvents} pending
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Conflicts</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.overview.conflictResolutions}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.overview.conflictRate.toFixed(1)}% of events
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Activity Log */}
        <SyncActivityLog />

        {/* Detailed Tabs */}
        {stats && (
          <Tabs defaultValue="nodes" className="space-y-4">
            <TabsList>
              <TabsTrigger value="nodes">Sync Nodes</TabsTrigger>
              <TabsTrigger value="sessions">Recent Sessions</TabsTrigger>
              <TabsTrigger value="conflicts">Conflicts</TabsTrigger>
              <TabsTrigger value="partitions">Partitions</TabsTrigger>
              <TabsTrigger value="full-sync">Full Sync</TabsTrigger>
              <TabsTrigger value="metrics">Metrics</TabsTrigger>
            </TabsList>

            <TabsContent value="nodes" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Sync Nodes</CardTitle>
                      <CardDescription>
                        Connected nodes in the sync network
                      </CardDescription>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={refreshData}
                      disabled={refreshing}
                    >
                      <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {stats.syncNodes.map((node) => (
                      <div
                        key={node.nodeId}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={`w-3 h-3 rounded-full ${
                              node.isOnline 
                                ? 'bg-green-500 animate-pulse' 
                                : 'bg-gray-400'
                            }`}
                          />
                          <div>
                            <div className="font-medium">{node.nodeName}</div>
                            <div className="text-sm text-muted-foreground">
                              {node.ipAddress}:{node.port}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              ID: {node.nodeId.substring(0, 8)}...
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm">
                            {node.isOnline ? (
                              <Badge variant="default">Online</Badge>
                            ) : (
                              <Badge variant="secondary">Offline</Badge>
                            )}
                          </div>
                          {node.lastSeenAgo && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {formatTimeAgo(node.lastSeenAgo)}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {stats.syncNodes.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        No sync nodes connected
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sessions" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Sync Sessions</CardTitle>
                  <CardDescription>
                    Latest synchronization sessions between nodes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {stats.recentSessions.map((session) => (
                      <div
                        key={session.sessionId}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div>
                          <div className="font-medium">
                            {session.initiatorNodeId}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(session.startTime).toLocaleString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm">
                            <Badge
                              variant={
                                session.status === 'COMPLETED' ? 'default' :
                                session.status === 'FAILED' ? 'destructive' : 'secondary'
                              }
                            >
                              {session.status}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {session.eventsTransferred} events transferred
                          </div>
                        </div>
                      </div>
                    ))}
                    {stats.recentSessions.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        No recent sync sessions
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="conflicts" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Conflicts</CardTitle>
                  <CardDescription>
                    Recently resolved data conflicts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {stats.recentConflicts.map((conflict) => (
                      <div
                        key={conflict.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div>
                          <div className="font-medium">
                            {conflict.tableName} - {conflict.conflictType}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Resolved by: {conflict.resolutionStrategy}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm">
                            <Badge
                              variant={conflict.autoResolved ? 'default' : 'secondary'}
                            >
                              {conflict.autoResolved ? 'Auto' : 'Manual'}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {new Date(conflict.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
                    {stats.recentConflicts.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        No recent conflicts
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="partitions" className="space-y-4">
              <PartitionMonitor />
            </TabsContent>

            <TabsContent value="full-sync" className="space-y-4">
              <FullSyncPanel />
            </TabsContent>

            <TabsContent value="metrics" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Sync Metrics</CardTitle>
                  <CardDescription>
                    Historical synchronization metrics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {stats.last24Hours.events}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Events (24h)
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {stats.last24Hours.sessions}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Sessions (24h)
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-600">
                          {stats.last24Hours.conflicts}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Conflicts (24h)
                        </div>
                      </div>
                    </div>

                    {stats.metrics.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium">Daily Metrics (Last 7 Days)</h4>
                        {stats.metrics.slice(0, 7).map((metric) => (
                          <div
                            key={metric.date}
                            className="flex items-center justify-between p-2 border-b"
                          >
                            <div className="text-sm">
                              {new Date(metric.date).toLocaleDateString()}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {metric.eventsProcessed} events, {metric.conflictsResolved} conflicts
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </ContentLayout>
  )
}