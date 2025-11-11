'use client'

/**
 * Direction Selector Component
 * PULL (remote → local) or PUSH (local → remote)
 */

import { ArrowDown, ArrowUp } from 'lucide-react'

interface SyncPeer {
  nodeId: string
  nodeName: string
  ipAddress: string
  port: number
  isActive: boolean
  lastSeen: string
}

interface DirectionSelectorProps {
  direction: 'pull' | 'push'
  selectedPeer: SyncPeer | null
  onDirectionChange: (direction: 'pull' | 'push') => void
}

export function DirectionSelector({ direction, selectedPeer, onDirectionChange }: DirectionSelectorProps) {
  const peerName = selectedPeer?.nodeName || 'Server'

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Direction</label>
      <div className="space-y-3">
        {/* PULL: Remote → This */}
        <label
          className={`flex items-center space-x-3 p-4 rounded-md border cursor-pointer transition-colors ${
            direction === 'pull'
              ? 'border-primary bg-primary/5'
              : 'border-border hover:bg-muted/50'
          }`}
        >
          <input
            type="radio"
            name="direction"
            value="pull"
            checked={direction === 'pull'}
            onChange={() => onDirectionChange('pull')}
            className="h-4 w-4"
          />
          <ArrowDown className="h-5 w-5 text-blue-500" />
          <div className="flex-1">
            <div className="font-medium">Pull from selected server → This</div>
            <p className="text-sm text-muted-foreground">
              Download data from {peerName} and restore it locally
            </p>
          </div>
        </label>

        {/* PUSH: This → Remote */}
        <label
          className={`flex items-center space-x-3 p-4 rounded-md border cursor-pointer transition-colors ${
            direction === 'push'
              ? 'border-primary bg-primary/5'
              : 'border-border hover:bg-muted/50'
          }`}
        >
          <input
            type="radio"
            name="direction"
            value="push"
            checked={direction === 'push'}
            onChange={() => onDirectionChange('push')}
            className="h-4 w-4"
          />
          <ArrowUp className="h-5 w-5 text-green-500" />
          <div className="flex-1">
            <div className="font-medium">Push to selected server ← This</div>
            <p className="text-sm text-muted-foreground">
              Upload data from this server and restore it on {peerName}
            </p>
          </div>
        </label>
      </div>
    </div>
  )
}
