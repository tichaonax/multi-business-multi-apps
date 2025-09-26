'use client'

/**
 * Sync Status Widget
 * Shows sync system status on the main dashboard
 */

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Activity,
  Server,
  Network,
  AlertTriangle,
  CheckCircle,
  Clock,
  ExternalLink
} from 'lucide-react'
import Link from 'next/link'

interface SyncStatusSummary {
  isServiceRunning: boolean
  healthScore: number
  activePeers: number
  totalEvents: number
  recentConflicts: number
  lastSyncTime: string | null
  syncErrors: number
}

export function SyncStatusWidget() {
  const [status, setStatus] = useState<SyncStatusSummary | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchSyncStatus = async () => {
    try {
      // Fetch both service status and stats
      const [serviceResponse, statsResponse] = await Promise.all([
        fetch('/api/sync/service'),
        fetch('/api/sync/stats')
      ])

      let serviceRunning = false
      let syncData = null

      if (serviceResponse.ok) {
        const serviceData = await serviceResponse.json()
        serviceRunning = serviceData.isRunning
      }

      if (statsResponse.ok) {
        syncData = await statsResponse.json()
      }

      if (syncData) {
        setStatus({
          isServiceRunning: serviceRunning,
          healthScore: syncData.overview.healthScore,
          activePeers: syncData.overview.activeSyncNodes,
          totalEvents: syncData.overview.totalSyncEvents,
          recentConflicts: syncData.last24Hours.conflicts,
          lastSyncTime: syncData.recentSessions[0]?.endTime || null,
          syncErrors: syncData.overview.failedEvents
        })
      } else {
        setStatus({
          isServiceRunning: serviceRunning,
          healthScore: serviceRunning ? 50 : 0,
          activePeers: 0,
          totalEvents: 0,
          recentConflicts: 0,
          lastSyncTime: null,
          syncErrors: 0
        })
      }
    } catch (error) {
      console.error('Failed to fetch sync status:', error)
      setStatus({
        isServiceRunning: false,
        healthScore: 0,
        activePeers: 0,
        totalEvents: 0,
        recentConflicts: 0,
        lastSyncTime: null,
        syncErrors: 0
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSyncStatus()

    // Refresh every 60 seconds
    const interval = setInterval(fetchSyncStatus, 60000)
    return () => clearInterval(interval)
  }, [])

  const getStatusColor = () => {
    if (!status?.isServiceRunning) return 'text-red-600'
    if (status.healthScore >= 90) return 'text-green-600'
    if (status.healthScore >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getStatusIcon = () => {
    if (!status?.isServiceRunning) return <Server className="h-4 w-4 text-red-600" />
    if (status.healthScore >= 90) return <CheckCircle className="h-4 w-4 text-green-600" />
    if (status.healthScore >= 70) return <Activity className="h-4 w-4 text-yellow-600" />
    return <AlertTriangle className="h-4 w-4 text-red-600" />
  }

  const getStatusText = () => {
    if (!status?.isServiceRunning) return 'Service Offline'
    if (status.healthScore >= 90) return 'Healthy'
    if (status.healthScore >= 70) return 'Warning'
    return 'Critical'
  }

  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Database Sync</CardTitle>
          <Network className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-16">
            <Clock className="h-4 w-4 animate-pulse text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Database Sync</CardTitle>
        <Network className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Service Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <span className={`text-sm font-medium ${getStatusColor()}`}>
                {getStatusText()}
              </span>
            </div>
            {status && (
              <Badge variant={status.isServiceRunning ? "default" : "destructive"}>
                {status.isServiceRunning ? "Online" : "Offline"}
              </Badge>
            )}
          </div>

          {/* Metrics */}
          {status && status.isServiceRunning && (
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-muted-foreground">Active Peers</div>
                <div className="font-medium">{status.activePeers}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Health Score</div>
                <div className={`font-medium ${getStatusColor()}`}>
                  {status.healthScore}%
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Sync Events</div>
                <div className="font-medium">{status.totalEvents.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Recent Conflicts</div>
                <div className="font-medium">
                  {status.recentConflicts > 0 ? (
                    <span className="text-yellow-600">{status.recentConflicts}</span>
                  ) : (
                    <span className="text-green-600">0</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Last Sync Time */}
          {status && status.lastSyncTime && (
            <div className="text-xs text-muted-foreground">
              Last sync: {new Date(status.lastSyncTime).toLocaleString()}
            </div>
          )}

          {/* Errors Warning */}
          {status && status.syncErrors > 0 && (
            <div className="flex items-center gap-1 text-xs text-red-600">
              <AlertTriangle className="h-3 w-3" />
              {status.syncErrors} sync errors
            </div>
          )}

          {/* Action Button */}
          <div className="pt-2">
            <Link href="/admin/sync">
              <Button size="sm" variant="outline" className="w-full">
                <ExternalLink className="h-3 w-3 mr-1" />
                Manage Sync
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}