/**
 * Network Connectivity Monitor
 * Monitors network status and handles offline/online transitions
 */

import { EventEmitter } from 'events'
import { networkInterfaces } from 'os'
import { PrismaClient } from '@prisma/client'

export interface NetworkStatus {
  isOnline: boolean
  hasInternet: boolean
  lastOnlineTime: Date | null
  offlineDuration: number // seconds
  networkInterfaces: Array<{
    name: string
    address: string
    family: string
  }>
}

export interface ConnectivityCheck {
  method: 'ping' | 'http' | 'dns'
  target: string
  timeout: number
  interval: number
}

/**
 * Network Monitor
 * Tracks network connectivity and manages offline state
 */
export class NetworkMonitor extends EventEmitter {
  private prisma: PrismaClient
  private nodeId: string
  private isOnline = true
  private hasInternet = true
  private lastOnlineTime: Date | null = new Date()
  private checkTimer: NodeJS.Timeout | null = null
  private connectivityChecks: ConnectivityCheck[] = []
  private offlineStartTime: Date | null = null

  constructor(prisma: PrismaClient, nodeId: string) {
    super()
    this.prisma = prisma
    this.nodeId = nodeId

    // Default connectivity checks
    this.connectivityChecks = [
      {
        method: 'http',
        target: 'https://www.google.com',
        timeout: 5000,
        interval: 30000 // 30 seconds
      },
      {
        method: 'dns',
        target: 'google.com',
        timeout: 3000,
        interval: 60000 // 60 seconds
      }
    ]

    this.setupConnectivityMonitoring()
  }

  /**
   * Start network monitoring
   */
  async start(): Promise<void> {
    await this.checkConnectivity()
    this.startPeriodicChecks()
    this.emit('started')
  }

  /**
   * Stop network monitoring
   */
  stop(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer)
      this.checkTimer = null
    }
    this.emit('stopped')
  }

  /**
   * Get current network status
   */
  getNetworkStatus(): NetworkStatus {
    const networkIfaces = this.getNetworkInterfaces()
    const offlineDuration = this.offlineStartTime
      ? Math.floor((new Date().getTime() - this.offlineStartTime.getTime()) / 1000)
      : 0

    return {
      isOnline: this.isOnline,
      hasInternet: this.hasInternet,
      lastOnlineTime: this.lastOnlineTime,
      offlineDuration,
      networkInterfaces: networkIfaces
    }
  }

  /**
   * Force connectivity check
   */
  async forceCheck(): Promise<NetworkStatus> {
    await this.checkConnectivity()
    return this.getNetworkStatus()
  }

  /**
   * Add custom connectivity check
   */
  addConnectivityCheck(check: ConnectivityCheck): void {
    this.connectivityChecks.push(check)
  }

  /**
   * Setup connectivity monitoring
   */
  private setupConnectivityMonitoring(): void {
    // Monitor network interface changes (Windows/Node.js specific)
    if (process.platform === 'win32') {
      // Use periodic checks since Node.js doesn't have native network event monitoring
      this.startPeriodicNetworkInterfaceCheck()
    }
  }

  /**
   * Start periodic connectivity checks
   */
  private startPeriodicChecks(): void {
    // Primary connectivity check every 30 seconds
    this.checkTimer = setInterval(async () => {
      await this.checkConnectivity()
    }, 30000)
  }

  /**
   * Start periodic network interface monitoring
   */
  private startPeriodicNetworkInterfaceCheck(): void {
    let lastNetworkHash = this.getNetworkInterfaceHash()

    setInterval(() => {
      const currentNetworkHash = this.getNetworkInterfaceHash()
      if (currentNetworkHash !== lastNetworkHash) {
        lastNetworkHash = currentNetworkHash
        this.emit('network_interface_changed', this.getNetworkInterfaces())
        // Trigger immediate connectivity check
        this.checkConnectivity()
      }
    }, 10000) // Check every 10 seconds
  }

  /**
   * Check connectivity using multiple methods
   */
  private async checkConnectivity(): Promise<void> {
    const wasOnline = this.isOnline
    const hadInternet = this.hasInternet

    // Check local network interfaces
    const hasLocalNetwork = this.hasActiveNetworkInterface()

    // Check internet connectivity
    const hasInternetConnectivity = await this.checkInternetConnectivity()

    this.isOnline = hasLocalNetwork
    this.hasInternet = hasInternetConnectivity

    // Handle state changes
    if (wasOnline && !this.isOnline) {
      // Going offline
      this.offlineStartTime = new Date()
      this.lastOnlineTime = new Date()
      await this.handleOfflineTransition()
      this.emit('offline', this.getNetworkStatus())
    } else if (!wasOnline && this.isOnline) {
      // Coming online
      this.offlineStartTime = null
      await this.handleOnlineTransition()
      this.emit('online', this.getNetworkStatus())
    }

    if (hadInternet !== this.hasInternet) {
      if (this.hasInternet) {
        this.emit('internet_restored', this.getNetworkStatus())
      } else {
        this.emit('internet_lost', this.getNetworkStatus())
      }
    }

    // Emit periodic status
    this.emit('status', this.getNetworkStatus())
  }

  /**
   * Check if we have active network interfaces
   */
  private hasActiveNetworkInterface(): boolean {
    const interfaces = networkInterfaces()

    for (const [name, nets] of Object.entries(interfaces)) {
      if (nets) {
        for (const net of nets) {
          // Skip loopback interfaces
          if (!net.internal && net.family === 'IPv4') {
            return true
          }
        }
      }
    }

    return false
  }

  /**
   * Check internet connectivity using multiple methods
   */
  private async checkInternetConnectivity(): Promise<boolean> {
    const results = await Promise.allSettled(
      this.connectivityChecks.map(check => this.performConnectivityCheck(check))
    )

    // Return true if any check succeeds
    return results.some(result => result.status === 'fulfilled' && result.value === true)
  }

  /**
   * Perform a single connectivity check
   */
  private async performConnectivityCheck(check: ConnectivityCheck): Promise<boolean> {
    try {
      switch (check.method) {
        case 'http':
          return await this.checkHttp(check.target, check.timeout)
        case 'dns':
          return await this.checkDns(check.target, check.timeout)
        case 'ping':
          return await this.checkPing(check.target, check.timeout)
        default:
          return false
      }
    } catch (error) {
      return false
    }
  }

  /**
   * HTTP connectivity check
   */
  private async checkHttp(url: string, timeout: number): Promise<boolean> {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-cache'
      })

      clearTimeout(timeoutId)
      return response.ok
    } catch (error) {
      return false
    }
  }

  /**
   * DNS connectivity check
   */
  private async checkDns(hostname: string, timeout: number): Promise<boolean> {
    return new Promise((resolve) => {
      const dns = require('dns')

      const timer = setTimeout(() => {
        resolve(false)
      }, timeout)

      dns.lookup(hostname, (err: any) => {
        clearTimeout(timer)
        resolve(!err)
      })
    })
  }

  /**
   * Ping connectivity check (Windows)
   */
  private async checkPing(target: string, timeout: number): Promise<boolean> {
    return new Promise((resolve) => {
      const { exec } = require('child_process')

      const command = process.platform === 'win32'
        ? `ping -n 1 -w ${timeout} ${target}`
        : `ping -c 1 -W ${Math.floor(timeout / 1000)} ${target}`

      const timer = setTimeout(() => {
        resolve(false)
      }, timeout + 1000)

      exec(command, (error: any, stdout: string) => {
        clearTimeout(timer)
        if (error) {
          resolve(false)
        } else {
          resolve(stdout.includes('TTL=') || stdout.includes('ttl='))
        }
      })
    })
  }

  /**
   * Get network interfaces information
   */
  private getNetworkInterfaces(): Array<{ name: string; address: string; family: string }> {
    const interfaces = networkInterfaces()
    const result: Array<{ name: string; address: string; family: string }> = []

    for (const [name, nets] of Object.entries(interfaces)) {
      if (nets) {
        for (const net of nets) {
          if (!net.internal) {
            result.push({
              name,
              address: net.address,
              family: net.family
            })
          }
        }
      }
    }

    return result
  }

  /**
   * Get hash of network interfaces for change detection
   */
  private getNetworkInterfaceHash(): string {
    const interfaces = this.getNetworkInterfaces()
    const interfaceString = interfaces
      .map(iface => `${iface.name}:${iface.address}`)
      .sort()
      .join('|')

    const crypto = require('crypto')
    return crypto.createHash('md5').update(interfaceString).digest('hex')
  }

  /**
   * Handle transition to offline state
   */
  private async handleOfflineTransition(): Promise<void> {
    try {
      // Record network partition in database
      await this.prisma.networkPartition.create({
        data: {
          nodeId: this.nodeId,
          partitionType: 'NETWORK_DISCONNECTION',
          startTime: new Date(),
          detectedAt: new Date(),
          isResolved: false,
          partitionMetadata: {
            reason: 'Network interface disconnected',
            lastKnownPeers: [],
            networkInterfaces: this.getNetworkInterfaces()
          }
        }
      })

      console.log('🔌 Network disconnected - entering offline mode')
    } catch (error) {
      console.error('Failed to record offline transition:', error)
    }
  }

  /**
   * Handle transition to online state
   */
  private async handleOnlineTransition(): Promise<void> {
    try {
      // Resolve any open network partitions
      await this.prisma.networkPartition.updateMany({
        where: {
          nodeId: this.nodeId,
          isResolved: false,
          partitionType: 'NETWORK_DISCONNECTION'
        },
        data: {
          isResolved: true,
          endTime: new Date(),
          resolutionMetadata: {
            reconnectedAt: new Date().toISOString(),
            networkInterfaces: this.getNetworkInterfaces()
          }
        }
      })

      console.log('🌐 Network reconnected - resuming sync operations')
    } catch (error) {
      console.error('Failed to record online transition:', error)
    }
  }
}

/**
 * Create network monitor instance
 */
export function createNetworkMonitor(prisma: PrismaClient, nodeId: string): NetworkMonitor {
  return new NetworkMonitor(prisma, nodeId)
}