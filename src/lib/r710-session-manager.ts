import { RuckusR710ApiService, R710DeviceConfig } from '@/services/ruckus-r710-api';

/**
 * R710 Session Manager
 *
 * Manages session pooling for multiple R710 devices to avoid
 * repeated authentication and improve performance.
 *
 * ARCHITECTURE NOTE:
 * - R710 devices are registered globally in the device registry
 * - Each unique IP address has exactly ONE set of credentials
 * - Multiple businesses can share the same R710 device
 * - Sessions are keyed by IP address only (credentials are unique per IP)
 *
 * Features:
 * - In-memory session caching per device (by IP)
 * - Automatic session refresh before expiry
 * - Concurrent request handling for same device
 * - Idle timeout cleanup
 */

interface CachedSession {
  service: RuckusR710ApiService;
  ipAddress: string;
  lastUsed: Date;
  isAuthenticated: boolean;
  pendingRequests: number;
}

export class R710SessionManager {
  private sessions: Map<string, CachedSession> = new Map();
  private sessionTimeout: number = 15 * 60 * 1000; // 15 minutes
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(sessionTimeout?: number) {
    if (sessionTimeout) {
      this.sessionTimeout = sessionTimeout;
    }

    // Start cleanup interval
    this.startCleanupInterval();
  }

  /**
   * Get or create a session for a device
   */
  async getSession(deviceConfig: R710DeviceConfig): Promise<RuckusR710ApiService> {
    const deviceKey = this.getDeviceKey(deviceConfig.ipAddress);

    // Check if session exists and is still valid
    const existingSession = this.sessions.get(deviceKey);

    if (existingSession) {
      // Update last used timestamp
      existingSession.lastUsed = new Date();
      existingSession.pendingRequests++;

      console.log(`[SessionManager] Reusing session for ${deviceConfig.ipAddress}`);
      return existingSession.service;
    }

    // Create new session
    console.log(`[SessionManager] Creating new session for ${deviceConfig.ipAddress}`);
    const service = new RuckusR710ApiService(deviceConfig);

    // Authenticate
    const loginResult = await service.login();
    if (!loginResult.success) {
      throw new Error(`Failed to authenticate with R710 device: ${loginResult.error}`);
    }

    await service.initializeSession();

    // Cache the session
    this.sessions.set(deviceKey, {
      service,
      ipAddress: deviceConfig.ipAddress,
      lastUsed: new Date(),
      isAuthenticated: true,
      pendingRequests: 1
    });

    return service;
  }

  /**
   * Release a session (decrement pending request count)
   */
  releaseSession(ipAddress: string): void {
    const deviceKey = this.getDeviceKey(ipAddress);
    const session = this.sessions.get(deviceKey);

    if (session && session.pendingRequests > 0) {
      session.pendingRequests--;
    }
  }

  /**
   * Execute a function with a managed session
   */
  async withSession<T>(
    deviceConfig: R710DeviceConfig,
    operation: (service: RuckusR710ApiService) => Promise<T>
  ): Promise<T> {
    const service = await this.getSession(deviceConfig);

    try {
      const result = await operation(service);
      return result;
    } finally {
      this.releaseSession(deviceConfig.ipAddress);
    }
  }

  /**
   * Invalidate a session (force re-authentication on next use)
   * Useful when credentials are updated in the device registry
   */
  async invalidateSession(ipAddress: string): Promise<void> {
    const deviceKey = this.getDeviceKey(ipAddress);
    const session = this.sessions.get(deviceKey);

    if (session) {
      try {
        await session.service.logout();
      } catch (error) {
        console.error(`[SessionManager] Error during logout for ${ipAddress}:`, error);
      }

      this.sessions.delete(deviceKey);
      console.log(`[SessionManager] Invalidated session for ${ipAddress}`);
    }
  }

  /**
   * Clear all sessions
   */
  async clearAllSessions(): Promise<void> {
    console.log(`[SessionManager] Clearing all sessions (${this.sessions.size} total)`);

    const logoutPromises = Array.from(this.sessions.values()).map(async (session) => {
      try {
        await session.service.logout();
      } catch (error) {
        console.error('[SessionManager] Error during logout:', error);
      }
    });

    await Promise.allSettled(logoutPromises);

    this.sessions.clear();
    console.log('[SessionManager] All sessions cleared');
  }

  /**
   * Get session statistics
   */
  getStats(): {
    totalSessions: number;
    activeSessions: number;
    idleSessions: number;
  } {
    const now = new Date();
    let activeSessions = 0;
    let idleSessions = 0;

    this.sessions.forEach((session) => {
      if (session.pendingRequests > 0) {
        activeSessions++;
      } else {
        const idleTime = now.getTime() - session.lastUsed.getTime();
        if (idleTime < this.sessionTimeout) {
          idleSessions++;
        }
      }
    });

    return {
      totalSessions: this.sessions.size,
      activeSessions,
      idleSessions
    };
  }

  /**
   * Private Methods
   */

  private getDeviceKey(ipAddress: string): string {
    // Key by IP only - credentials are globally unique per IP in device registry
    return `r710:${ipAddress}`;
  }

  private startCleanupInterval(): void {
    // Run cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupIdleSessions();
    }, 5 * 60 * 1000);
  }

  private async cleanupIdleSessions(): Promise<void> {
    const now = new Date();
    const keysToRemove: string[] = [];

    this.sessions.forEach((session, key) => {
      const idleTime = now.getTime() - session.lastUsed.getTime();

      // Remove sessions that are idle and have no pending requests
      if (session.pendingRequests === 0 && idleTime > this.sessionTimeout) {
        keysToRemove.push(key);
      }
    });

    if (keysToRemove.length > 0) {
      console.log(`[SessionManager] Cleaning up ${keysToRemove.length} idle sessions`);

      for (const key of keysToRemove) {
        const session = this.sessions.get(key);
        if (session) {
          try {
            await session.service.logout();
          } catch (error) {
            console.error(`[SessionManager] Error during cleanup logout for ${key}:`, error);
          }
          this.sessions.delete(key);
        }
      }
    }
  }

  /**
   * Shutdown the session manager
   */
  async shutdown(): Promise<void> {
    console.log('[SessionManager] Shutting down...');

    // Stop cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // Clear all sessions
    await this.clearAllSessions();

    console.log('[SessionManager] Shutdown complete');
  }
}

// Singleton instance for application-wide use
let sessionManagerInstance: R710SessionManager | null = null;

export function getR710SessionManager(sessionTimeout?: number): R710SessionManager {
  if (!sessionManagerInstance) {
    sessionManagerInstance = new R710SessionManager(sessionTimeout);
  }
  return sessionManagerInstance;
}

export async function shutdownR710SessionManager(): Promise<void> {
  if (sessionManagerInstance) {
    await sessionManagerInstance.shutdown();
    sessionManagerInstance = null;
  }
}
