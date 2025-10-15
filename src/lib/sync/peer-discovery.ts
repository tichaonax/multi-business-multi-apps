/**
 * Peer Discovery Service using mDNS
 * Automatically discovers other sync nodes on the local network with registration key security
 */

import { EventEmitter } from 'events'
import crypto from 'crypto'
import { networkInterfaces } from 'os'

export interface PeerInfo {
  nodeId: string
  nodeName: string
  ipAddress: string
  port: number
  capabilities: string[]
  registrationKeyHash: string
  lastSeen: Date
  isAuthenticated: boolean
}

export interface DiscoveryOptions {
  nodeId: string
  nodeName: string
  port: number
  registrationKey: string
  broadcastInterval: number // milliseconds
  discoveryPort: number
  serviceName: string
}

/**
 * Peer Discovery Service
 * Uses UDP multicast for peer discovery with registration key authentication
 */
export class PeerDiscoveryService extends EventEmitter {
  private options: DiscoveryOptions
  private udpSocket: any // dgram.Socket
  private broadcastTimer: NodeJS.Timeout | null = null
  private discoveredPeers = new Map<string, PeerInfo>()
  private multicastAddress = '224.0.0.251' // mDNS multicast address
  private isRunning = false

  constructor(options: DiscoveryOptions) {
    super()
    
    // Debug: Check what key peer discovery actually receives
    console.log('🔍 Peer Discovery Constructor:')
    console.log(`   Received registrationKey: "${options.registrationKey}" (${options.registrationKey.length} chars)`)
    
    this.options = options
  }

  /**
   * Start the peer discovery service
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return
    }

    try {
      const dgram = require('dgram')
      this.udpSocket = dgram.createSocket({ type: 'udp4', reuseAddr: true })

      // Configure socket
      this.udpSocket.on('message', this.handleIncomingMessage.bind(this))
      this.udpSocket.on('error', this.handleSocketError.bind(this))

      // Bind to discovery port
      await new Promise<void>((resolve, reject) => {
        this.udpSocket.bind(this.options.discoveryPort, (err: any) => {
          if (err) reject(err)
          else resolve()
        })
      })

      // Join multicast group
      this.udpSocket.addMembership(this.multicastAddress)

      // Start broadcasting our presence
      this.startBroadcasting()

      // Start peer cleanup timer
      this.startPeerCleanup()

      this.isRunning = true
      this.emit('started')

      console.log(`✅ Peer discovery started on port ${this.options.discoveryPort}`)
    } catch (error) {
      console.error('❌ Failed to start peer discovery:', error)
      throw error
    }
  }

  /**
   * Stop the peer discovery service
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return
    }

    try {
      // Stop broadcasting
      if (this.broadcastTimer) {
        clearInterval(this.broadcastTimer)
        this.broadcastTimer = null
      }

      // Send goodbye message
      await this.sendGoodbyeMessage()

      // Close socket
      if (this.udpSocket) {
        this.udpSocket.close()
        this.udpSocket = null
      }

      // Clear discovered peers
      this.discoveredPeers.clear()

      this.isRunning = false
      this.emit('stopped')

      console.log('✅ Peer discovery stopped')
    } catch (error) {
      console.error('❌ Error stopping peer discovery:', error)
    }
  }

  /**
   * Get list of discovered peers
   */
  getDiscoveredPeers(): PeerInfo[] {
    return Array.from(this.discoveredPeers.values())
      .filter(peer => peer.isAuthenticated)
  }

  /**
   * Get specific peer by node ID
   */
  getPeer(nodeId: string): PeerInfo | undefined {
    return this.discoveredPeers.get(nodeId)
  }

  /**
   * Check if a specific peer is available
   */
  isPeerAvailable(nodeId: string): boolean {
    const peer = this.discoveredPeers.get(nodeId)
    return peer ? peer.isAuthenticated : false
  }

  /**
   * Force discovery broadcast
   */
  async forceDiscovery(): Promise<void> {
    if (this.isRunning) {
      await this.broadcastPresence()
    }
  }

  /**
   * Start broadcasting our presence
   */
  private startBroadcasting(): void {
    // Send immediate broadcast
    this.broadcastPresence()

    // Set up periodic broadcasts
    this.broadcastTimer = setInterval(() => {
      this.broadcastPresence()
    }, this.options.broadcastInterval)
  }

  /**
   * Broadcast our presence to the network
   */
  private async broadcastPresence(): Promise<void> {
    try {
      const message = this.createPresenceMessage()
      const messageBuffer = Buffer.from(JSON.stringify(message))

      // Send to multicast address
      this.udpSocket.send(
        messageBuffer,
        0,
        messageBuffer.length,
        this.options.discoveryPort,
        this.multicastAddress
      )

      console.log(`📡 Broadcasting presence: ${this.options.nodeName} (${this.options.nodeId}) to ${this.multicastAddress}:${this.options.discoveryPort}`)
      console.log(`   Registration key hash: ${message.registrationKeyHash.substring(0, 16)}...`)

      this.emit('broadcast', message)
    } catch (error) {
      console.error('Error broadcasting presence:', error)
    }
  }

  /**
   * Create presence message
   */
  private createPresenceMessage(): any {
    const ipAddress = this.getLocalIPAddress()
    const registrationKeyHash = this.hashRegistrationKey()

    return {
      type: 'presence',
      nodeId: this.options.nodeId,
      nodeName: this.options.nodeName,
      ipAddress,
      port: this.options.port,
      serviceName: this.options.serviceName,
      registrationKeyHash,
      capabilities: [
        'sync-v1',
        'compression',
        'encryption',
        'vector-clocks',
        'conflict-resolution'
      ],
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    }
  }

  /**
   * Send goodbye message when leaving
   */
  private async sendGoodbyeMessage(): Promise<void> {
    try {
      const message = {
        type: 'goodbye',
        nodeId: this.options.nodeId,
        timestamp: new Date().toISOString()
      }

      const messageBuffer = Buffer.from(JSON.stringify(message))

      this.udpSocket.send(
        messageBuffer,
        0,
        messageBuffer.length,
        this.options.discoveryPort,
        this.multicastAddress
      )
    } catch (error) {
      console.error('Error sending goodbye message:', error)
    }
  }

  /**
   * Handle incoming discovery messages
   */
  private handleIncomingMessage(buffer: Buffer, remoteInfo: any): void {
    try {
      // Validate buffer
      if (!buffer || buffer.length === 0) {
        return
      }

      // Convert to string and clean null bytes
      let messageStr = buffer.toString('utf8').replace(/\0/g, '')

      // Trim whitespace
      messageStr = messageStr.trim()

      // Skip empty messages
      if (!messageStr) {
        return
      }

      // Validate JSON format
      if (!messageStr.startsWith('{') || !messageStr.endsWith('}')) {
        // Don't log every non-JSON message (too noisy from other mDNS services)
        return
      }

      const message = JSON.parse(messageStr)

      // Log all valid JSON messages for debugging
      console.log(`📨 Received message from ${remoteInfo.address}:${remoteInfo.port} type=${message.type || 'unknown'}`)

      // Validate message structure
      if (!message || typeof message !== 'object' || !message.type) {
        console.warn('Invalid message structure - missing required fields')
        return
      }

      // Ignore our own messages
      if (message.nodeId === this.options.nodeId) {
        return
      }

      switch (message.type) {
        case 'presence':
          this.handlePresenceMessage(message, remoteInfo)
          break

        case 'goodbye':
          this.handleGoodbyeMessage(message)
          break

        case 'auth_challenge':
          this.handleAuthChallenge(message, remoteInfo)
          break

        case 'auth_response':
          this.handleAuthResponse(message)
          break

        default:
          console.warn('Unknown message type:', message.type)
      }
    } catch (error) {
      // Only log if it's not a common parsing error
      if (error instanceof SyntaxError && error.message.includes('JSON')) {
        console.warn('Received malformed JSON message, ignoring')
      } else {
        console.error('Error parsing discovery message:', error)
      }
    }
  }

  /**
   * Handle presence message from another node
   */
  private handlePresenceMessage(message: any, remoteInfo: any): void {
    console.log(`🔍 Processing presence from ${message.nodeName} (${message.nodeId})`)
    console.log(`   Service: ${message.serviceName} (expected: ${this.options.serviceName})`)
    console.log(`   Reg hash: ${message.registrationKeyHash?.substring(0, 16)}...`)

    // Verify service name matches
    if (message.serviceName !== this.options.serviceName) {
      console.warn(`❌ Service name mismatch: got ${message.serviceName}, expected ${this.options.serviceName}`)
      return
    }

    // Verify registration key hash
    const expectedHash = this.hashRegistrationKey()
    console.log(`   Expected: ${expectedHash.substring(0, 16)}...`)

    if (message.registrationKeyHash !== expectedHash) {
      console.warn(`❌ Registration key mismatch from node ${message.nodeId}`)
      console.warn(`   Got:      ${message.registrationKeyHash}`)
      console.warn(`   Expected: ${expectedHash}`)
      return
    }

    // Create or update peer info
    const peer: PeerInfo = {
      nodeId: message.nodeId,
      nodeName: message.nodeName,
      ipAddress: message.ipAddress || remoteInfo.address,
      port: message.port,
      capabilities: message.capabilities || [],
      registrationKeyHash: message.registrationKeyHash,
      lastSeen: new Date(),
      isAuthenticated: true // Registration key already verified
    }

    const wasNew = !this.discoveredPeers.has(peer.nodeId)
    this.discoveredPeers.set(peer.nodeId, peer)

    if (wasNew) {
      this.emit('peer_discovered', peer)
      console.log(`🔍 Discovered new peer: ${peer.nodeName} (${peer.nodeId})`)
    } else {
      this.emit('peer_updated', peer)
    }
  }

  /**
   * Handle goodbye message from a node
   */
  private handleGoodbyeMessage(message: any): void {
    const peer = this.discoveredPeers.get(message.nodeId)
    if (peer) {
      this.discoveredPeers.delete(message.nodeId)
      this.emit('peer_left', peer)
      console.log(`👋 Peer left: ${peer.nodeName} (${peer.nodeId})`)
    }
  }

  /**
   * Handle authentication challenge
   */
  private handleAuthChallenge(message: any, remoteInfo: any): void {
    // Respond to authentication challenge
    const response = {
      type: 'auth_response',
      nodeId: this.options.nodeId,
      challengeId: message.challengeId,
      registrationKeyHash: this.hashRegistrationKey(),
      timestamp: new Date().toISOString()
    }

    const responseBuffer = Buffer.from(JSON.stringify(response))
    this.udpSocket.send(
      responseBuffer,
      0,
      responseBuffer.length,
      remoteInfo.port,
      remoteInfo.address
    )
  }

  /**
   * Handle authentication response
   */
  private handleAuthResponse(message: any): void {
    const expectedHash = this.hashRegistrationKey()
    if (message.registrationKeyHash === expectedHash) {
      const peer = this.discoveredPeers.get(message.nodeId)
      if (peer) {
        peer.isAuthenticated = true
        this.emit('peer_authenticated', peer)
      }
    }
  }

  /**
   * Handle socket errors
   */
  private handleSocketError(error: Error): void {
    console.error('Peer discovery socket error:', error)
    this.emit('error', error)
  }

  /**
   * Start periodic cleanup of stale peers
   */
  private startPeerCleanup(): void {
    setInterval(() => {
      this.cleanupStalePeers()
    }, 60000) // Check every minute
  }

  /**
   * Remove peers that haven't been seen recently
   */
  private cleanupStalePeers(): void {
    const staleThreshold = new Date(Date.now() - 5 * 60 * 1000) // 5 minutes

    for (const [nodeId, peer] of this.discoveredPeers.entries()) {
      if (peer.lastSeen < staleThreshold) {
        this.discoveredPeers.delete(nodeId)
        this.emit('peer_stale', peer)
        console.log(`🕐 Removed stale peer: ${peer.nodeName} (${peer.nodeId})`)
      }
    }
  }

  /**
   * Get local IP address for broadcasting
   * Prioritizes proper network interfaces over VPN/virtual interfaces
   */
  private getLocalIPAddress(): string {
    const interfaces = networkInterfaces()
    const candidates: Array<{ name: string; address: string; priority: number }> = []

    for (const [name, nets] of Object.entries(interfaces)) {
      if (nets) {
        for (const net of nets) {
          // Skip internal interfaces and IPv6
          if (!net.internal && net.family === 'IPv4') {
            const priority = this.getInterfacePriority(name, net.address)
            candidates.push({ name, address: net.address, priority })
          }
        }
      }
    }

    // Sort by priority (higher is better) and return the best candidate
    if (candidates.length > 0) {
      candidates.sort((a, b) => b.priority - a.priority)
      console.log(`📡 Selected IP ${candidates[0].address} from interface ${candidates[0].name} (priority: ${candidates[0].priority})`)
      return candidates[0].address
    }

    return '127.0.0.1' // Fallback
  }

  /**
   * Assign priority to network interfaces
   * Higher priority = preferred interface
   */
  private getInterfacePriority(interfaceName: string, ipAddress: string): number {
    // Exclude APIPA/link-local addresses (169.254.x.x)
    if (ipAddress.startsWith('169.254.')) {
      return 1 // Very low priority
    }

    // Exclude other reserved/private ranges that shouldn't be used for sync
    if (ipAddress.startsWith('10.') && interfaceName.toLowerCase().includes('docker')) {
      return 2 // Low priority for Docker interfaces
    }

    const lowerName = interfaceName.toLowerCase()

    // High priority for standard network interfaces
    if (lowerName.includes('wi-fi') || lowerName === 'wifi') {
      return 100 // Highest priority for Wi-Fi
    }
    if (lowerName.includes('ethernet') || lowerName.startsWith('eth')) {
      return 95 // High priority for Ethernet
    }

    // Medium priority for standard private networks
    if (ipAddress.startsWith('192.168.') || ipAddress.startsWith('10.0.')) {
      return 50
    }

    // Low priority for VPN and virtual interfaces
    if (lowerName.includes('tailscale') || lowerName.includes('vpn') || 
        lowerName.includes('virtual') || lowerName.includes('vmware') ||
        lowerName.includes('hyper-v') || lowerName.includes('bluetooth')) {
      return 10
    }

    // Default priority for other interfaces
    return 30
  }

  /**
   * Hash registration key for secure peer authentication
   */
  private hashRegistrationKey(): string {
    const input = this.options.registrationKey
    return crypto.createHash('sha256').update(input).digest('hex')
  }
}

/**
 * Create and configure peer discovery service
 */
export function createPeerDiscovery(options: DiscoveryOptions): PeerDiscoveryService {
  return new PeerDiscoveryService(options)
}