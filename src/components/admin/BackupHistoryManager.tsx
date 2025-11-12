'use client'

/**
 * Backup History Manager
 * Allows admins to view and clear old/failed backup history
 */

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  AlertTriangle,
  Trash2,
  Eye,
  RefreshCw,
  Database,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react'

interface BackupSession {
  id: string
  sessionId: string
  status: string
  createdAt: string
  errorMessage?: string
  sourceNodeId: string
  targetNodeId: string
}

interface ClearPreview {
  preview: boolean
  totalCount: number
  sessions: BackupSession[]
  clearType: string
  olderThanDays?: number
}

export function BackupHistoryManager() {
  const [sessions, setSessions] = useState<BackupSession[]>([])
  const [loading, setLoading] = useState(true)
  const [clearing, setClearing] = useState(false)
  const [preview, setPreview] = useState<ClearPreview | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  // Clear options
  const [clearType, setClearType] = useState<'failed' | 'old' | 'all'>('failed')
  const [olderThanDays, setOlderThanDays] = useState(30)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const fetchBackupHistory = async () => {
    try {
      setLoading(true)
      // Fetch recent backup sessions (you might want to add pagination)
      const response = await fetch('/api/admin/sync/backup-history?limit=100')
      if (response.ok) {
        const data = await response.json()
        setSessions(data.sessions || [])
      }
    } catch (error) {
      console.error('Failed to fetch backup history:', error)
    } finally {
      setLoading(false)
    }
  }

  const previewClear = async () => {
    try {
      const params = new URLSearchParams({
        clearType,
        ...(clearType === 'old' && { olderThanDays: olderThanDays.toString() })
      })

      const response = await fetch(`/api/admin/sync/backup-history/clear?${params}`)
      if (response.ok) {
        const data = await response.json()
        setPreview(data)
        setShowPreview(true)
      }
    } catch (error) {
      console.error('Failed to preview clear:', error)
    }
  }

  const executeClear = async () => {
    if (!confirmDelete) {
      alert('Please confirm the deletion by checking the confirmation box.')
      return
    }

    try {
      setClearing(true)
      const response = await fetch('/api/admin/sync/backup-history/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clearType,
          olderThanDays: clearType === 'old' ? olderThanDays : undefined,
          confirmDelete: true
        })
      })

      if (response.ok) {
        const result = await response.json()
        alert(`Successfully cleared ${result.clearedCount} backup history entries.`)
        setShowPreview(false)
        setPreview(null)
        setConfirmDelete(false)
        await fetchBackupHistory()
      } else {
        const error = await response.json()
        alert(`Failed to clear backup history: ${error.error}`)
      }
    } catch (error) {
      console.error('Failed to clear backup history:', error)
      alert('Failed to clear backup history. Please try again.')
    } finally {
      setClearing(false)
    }
  }

  useEffect(() => {
    fetchBackupHistory()
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'FAILED':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'CANCELLED':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      default:
        return <Clock className="h-4 w-4 text-blue-600" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge variant="default">Completed</Badge>
      case 'FAILED':
        return <Badge variant="destructive">Failed</Badge>
      case 'CANCELLED':
        return <Badge variant="secondary">Cancelled</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const failedCount = sessions.filter(s => s.status === 'FAILED').length
  const totalCount = sessions.length

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Backups</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
            <p className="text-xs text-muted-foreground">
              Backup history entries
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Backups</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{failedCount}</div>
            <p className="text-xs text-muted-foreground">
              {totalCount > 0 ? `${((failedCount / totalCount) * 100).toFixed(1)}% of total` : 'No backups'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {totalCount > 0 ? `${(((totalCount - failedCount) / totalCount) * 100).toFixed(1)}%` : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              Successful backups
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Clear Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Clear Backup History
          </CardTitle>
          <CardDescription>
            Remove old or failed backup history entries to clean up the system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="clearType">Clear Type</Label>
              <Select value={clearType} onValueChange={(value: any) => setClearType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="failed">Failed Backups Only</SelectItem>
                  <SelectItem value="old">Backups Older Than</SelectItem>
                  <SelectItem value="all">All Backup History</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {clearType === 'old' && (
              <div className="space-y-2">
                <Label htmlFor="olderThan">Older Than (Days)</Label>
                <Input
                  id="olderThan"
                  type="number"
                  value={olderThanDays}
                  onChange={(e) => setOlderThanDays(parseInt(e.target.value) || 30)}
                  min={1}
                  max={365}
                />
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="confirm"
              checked={confirmDelete}
              onCheckedChange={setConfirmDelete}
            />
            <Label htmlFor="confirm" className="text-sm">
              I confirm that I want to permanently delete the selected backup history entries
            </Label>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={previewClear}
              disabled={clearing}
              variant="outline"
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <Button
              onClick={executeClear}
              disabled={clearing || !confirmDelete}
              variant="destructive"
            >
              {clearing ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Clear History
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview Results */}
      {showPreview && preview && (
        <Card>
          <CardHeader>
            <CardTitle>Clear Preview</CardTitle>
            <CardDescription>
              {preview.totalCount} entries will be deleted
            </CardDescription>
          </CardHeader>
          <CardContent>
            {preview.totalCount > 0 ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Showing first {Math.min(preview.sessions.length, 10)} of {preview.totalCount} entries:
                </p>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {preview.sessions.slice(0, 10).map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between p-2 border rounded"
                    >
                      <div className="flex items-center gap-2">
                        {getStatusIcon(session.status)}
                        <div>
                          <div className="text-sm font-medium">
                            {session.sessionId.substring(0, 8)}...
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatDate(session.createdAt)}
                          </div>
                        </div>
                      </div>
                      {getStatusBadge(session.status)}
                    </div>
                  ))}
                </div>
                {preview.totalCount > 10 && (
                  <p className="text-xs text-muted-foreground">
                    ... and {preview.totalCount - 10} more entries
                  </p>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground">No entries found to clear.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent Backup History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Backup History</CardTitle>
              <CardDescription>
                Latest backup operations and their status
              </CardDescription>
            </div>
            <Button
              onClick={fetchBackupHistory}
              disabled={loading}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sessions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Loading backup history...
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <Database className="h-4 w-4" />
                    No backup history found
                  </div>
                )}
              </div>
            ) : (
              sessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-start gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {getStatusIcon(session.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium text-sm">
                        Backup Session {session.sessionId.substring(0, 8)}...
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(session.status)}
                        <span className="text-xs text-muted-foreground">
                          {formatDate(session.createdAt)}
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground mb-2">
                      {session.sourceNodeId} → {session.targetNodeId}
                    </div>
                    {session.errorMessage && (
                      <Alert className="mt-2">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          {session.errorMessage}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}