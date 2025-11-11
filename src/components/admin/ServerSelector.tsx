'use client'

/**
 * Server Selector Component
 * Radio button selection for target server
 */

import { Server } from 'lucide-react'

interface SyncPeer {
  nodeId: string
  nodeName: string
  ipAddress: string
  port: number
  isActive: boolean
  lastSeen: string
}

interface ServerSelectorProps {
  peers: SyncPeer[]
  selectedPeer: SyncPeer | null
  onSelectPeer: (peer: SyncPeer) => void
}

export function ServerSelector({ peers, selectedPeer, onSelectPeer }: ServerSelectorProps) {
  const thisNodeId = process.env.NEXT_PUBLIC_SYNC_NODE_ID || 'this-server'

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Select Server</label>
      <div className="border rounded-lg p-4 space-y-3">
        {peers.length === 0 && (
          <p className="text-sm text-muted-foreground">No peers available</p>
        )}

        {peers.map(peer => (
          <label
            key={peer.nodeId}
            className={`flex items-center space-x-3 p-3 rounded-md border cursor-pointer transition-colors ${
              selectedPeer?.nodeId === peer.nodeId
                ? 'border-primary bg-primary/5'
                : 'border-border hover:bg-muted/50'
            }`}
          >
            <input
              type="radio"
              name="server"
              value={peer.nodeId}
              checked={selectedPeer?.nodeId === peer.nodeId}
              onChange={() => onSelectPeer(peer)}
              className="h-4 w-4"
            />
            <Server className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <span className="font-medium">{peer.nodeName}</span>
                {peer.nodeId === thisNodeId && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Local</span>
                )}
                {peer.isActive ? (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Online</span>
                ) : (
                  <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">Offline</span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{peer.ipAddress}</p>
            </div>
          </label>
        ))}
      </div>
    </div>
  )
}
