'use client'

/**
 * Full Sync Panel Component
 * Bidirectional sync with server selection, direction control, and progress tracking
 */

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Database,
  AlertTriangle,
  RefreshCw,
  XCircle
} from 'lucide-react'
import { ServerSelector } from './ServerSelector'
import { DirectionSelector } from './DirectionSelector'
import { SyncHistory } from './SyncHistory'

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

interface SyncPeer {
  nodeId: string
  nodeName: string
  ipAddress: string
  port: number
  isActive: boolean
  lastSeen: string
}

export function FullSyncPanel() {
  const [sessions, setSessions] = useState<FullSyncSession[]>([])
  const [peers, setPeers] = useState<SyncPeer[]>([])
  const [selectedPeer, setSelectedPeer] = useState<SyncPeer | null>(null)
  const [direction, setDirection] = useState<'pull' | 'push'>('push')
  const [method, setMethod] = useState<'backup' | 'http'>('backup')
  const [compressionEnabled, setCompressionEnabled] = useState(false)
  const [verifyAfterSync, setVerifyAfterSync] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isInitiating, setIsInitiating] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [hasInitializedPeers, setHasInitializedPeers] = useState(false)

  useEffect(() => {
    fetchFullSyncData()
    fetchPeers()
    const interval = setInterval(() => {
      fetchFullSyncData()
      fetchPeers()
    }, 5000) // Update every 5 seconds
    return () => clearInterval(interval)
  }, [])

  const fetchFullSyncData = async () => {
    try {
      setError(null)
      const response = await fetch('/api/admin/sync/full-sync')
      if (!response.ok) {
        throw new Error('Failed to fetch full sync sessions')
      }
      const data = await response.json()
      setSessions(data.sessions || [])
    } catch (error) {
      console.error('Failed to fetch full sync data:', error)
      setError(error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchPeers = async () => {
    try {
      const response = await fetch('/api/sync/stats')
      if (response.ok) {
        const data = await response.json()
        const newPeers = data.syncNodes || []
        setPeers(newPeers)
        
        // Only auto-select first peer on initial load, not on every refresh
        if (newPeers.length > 0 && !selectedPeer && !hasInitializedPeers) {
          setSelectedPeer(newPeers[0])
          setHasInitializedPeers(true)
        } else if (selectedPeer && newPeers.length > 0) {
          // Ensure selectedPeer is still valid, if not, keep current selection or clear it
          const stillExists = newPeers.some((peer: SyncPeer) => peer.nodeId === selectedPeer.nodeId)
          if (!stillExists) {
            // Selected peer is no longer available, clear selection
            setSelectedPeer(null)
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch peers:', error)
    }
  }

  const initiateFullSync = async () => {
    try {
      if (!selectedPeer) {
        setError('Please select a target server')
        return
      }

      setIsInitiating(true)
      setError(null)

      const response = await fetch('/api/admin/sync/full-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: direction,
          targetPeer: selectedPeer,
          options: {
            method,
            compressionEnabled,
            verifyAfterSync
          }
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to initiate full sync')
      }

      const result = await response.json()
      console.log('Full sync initiated:', result)

      // Refresh data
      setTimeout(() => {
        fetchFullSyncData()
      }, 1000)

    } catch (error) {
      console.error('Failed to initiate full sync:', error)
      setError(error instanceof Error ? error.message : 'Full sync initiation failed')
    } finally {
      setIsInitiating(false)
    }
  }

  const cancelSync = async (sessionId: string) => {
    if (!confirm('Are you sure you want to cancel this sync? This action cannot be undone.')) {
      return
    }

    try {
      setIsCancelling(true)
      setError(null)

      const response = await fetch('/api/admin/sync/full-sync/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to cancel sync')
      }

      const result = await response.json()
      console.log('Sync cancelled:', result)

      // Refresh data
      setTimeout(() => {
        fetchFullSyncData()
      }, 1000)

    } catch (error) {
      console.error('Failed to cancel sync:', error)
      setError(error instanceof Error ? error.message : 'Sync cancellation failed')
    } finally {
      setIsCancelling(false)
    }
  }

  // Get active sync session if any
  const activeSession = sessions.find(s => ['PREPARING', 'TRANSFERRING'].includes(s.status))

  if (isLoading && sessions.length === 0) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <RefreshCw className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading full sync data...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Active Sync Status */}
      {activeSession && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center">
                <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                Sync In Progress
              </span>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => cancelSync(activeSession.sessionId)}
                disabled={isCancelling}
              >
                <XCircle className="h-4 w-4 mr-1" />
                {isCancelling ? 'Cancelling...' : 'Cancel Sync'}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>{activeSession.currentStep}</span>
                  <span>{activeSession.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${activeSession.progress}%` }}
                  />
                </div>
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <div>Session: {activeSession.sessionId}</div>
                <div>Direction: {activeSession.direction.toUpperCase()}</div>
                <div>Method: {activeSession.method}</div>
                {activeSession.transferSpeed && (
                  <div>Speed: {(activeSession.transferSpeed / 1024 / 1024).toFixed(2)} MB/s</div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Database className="h-5 w-5 mr-2" />
            Full Sync
          </CardTitle>
          <CardDescription>
            Synchronize all data with another server
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Server Selection */}
            <ServerSelector
              peers={peers}
              selectedPeer={selectedPeer}
              onSelectPeer={setSelectedPeer}
            />

            {/* Direction Selector */}
            <DirectionSelector
              direction={direction}
              selectedPeer={selectedPeer}
              onDirectionChange={setDirection}
            />

            {/* Method Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Transfer Method</label>
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="method"
                    value="backup"
                    checked={method === 'backup'}
                    onChange={(e) => setMethod('backup')}
                    className="h-4 w-4"
                  />
                  <span>Backup Method (fast, recommended)</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="method"
                    value="http"
                    checked={method === 'http'}
                    onChange={(e) => setMethod('http')}
                    className="h-4 w-4"
                    disabled={direction === 'pull'}
                  />
                  <span>HTTP Method (fallback, slow){direction === 'pull' && ' - Not available for PULL'}</span>
                </label>
              </div>
            </div>

            {/* Options */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Options</label>
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={compressionEnabled}
                    onChange={(e) => setCompressionEnabled(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <span>Compress backup (faster transfer)</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={verifyAfterSync}
                    onChange={(e) => setVerifyAfterSync(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <span>Verify after sync</span>
                </label>
              </div>
            </div>

            {/* Start Button */}
            <Button
              onClick={initiateFullSync}
              className="w-full"
              disabled={!selectedPeer || !selectedPeer.isActive || isInitiating || !!activeSession}
            >
              {isInitiating ? 'Starting...' : activeSession ? 'Sync In Progress...' : `Start Full Sync`}
            </Button>

            {!selectedPeer && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  No sync peers found. Make sure the remote server sync service is running.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sync History */}
      <SyncHistory sessions={sessions} onSessionUpdate={fetchFullSyncData} />
    </div>
  )
}
