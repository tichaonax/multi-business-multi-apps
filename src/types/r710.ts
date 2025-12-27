/**
 * Type Definitions for Ruckus R710 WiFi Portal Integration
 *
 * Covers device configuration, WLANs, tokens, and API responses
 */

/**
 * R710 Device Configuration
 * Used to connect to a specific R710 device
 */
export interface R710DeviceConfig {
  ipAddress: string;
  adminUsername: string;
  adminPassword: string;
  timeout?: number; // Optional timeout in milliseconds (default: 30000)
}

/**
 * R710 System Information
 * Retrieved from device via API
 */
export interface R710SystemInfo {
  model?: string;
  firmwareVersion?: string;
  hostname?: string;
  macAddress?: string;
  uptime?: number;
}

/**
 * R710 Connection Status
 * Used for health monitoring
 */
export type R710ConnectionStatus = 'CONNECTED' | 'DISCONNECTED' | 'UNKNOWN';

/**
 * R710 WLAN Configuration
 * Parameters for creating a new WLAN on the device
 */
export interface R710WlanConfig {
  ssid: string;
  guestServiceId: string;
  vlanId: number;
  bandwidthDownMb?: number;
  bandwidthUpMb?: number;
  description?: string;
}

/**
 * R710 WLAN Response
 * Result after creating/querying a WLAN
 */
export interface R710WlanResponse {
  success: boolean;
  wlanId?: string;
  ssid?: string;
  error?: string;
}

/**
 * R710 Token (Guest User)
 * Represents a WiFi access token on the device
 */
export interface R710Token {
  key: string; // Unique identifier
  username: string; // Token code
  passphrase?: string; // Password
  startTime?: number; // Unix timestamp (ms)
  timeLeft?: number; // Milliseconds remaining
  deviceMac?: string; // Connected device MAC address
  status?: number; // 0 = inactive, 1 = active
  durationMinutes?: number;
  bandwidthDownMb?: number;
  bandwidthUpMb?: number;
}

/**
 * R710 Token Creation Parameters
 */
export interface R710TokenParams {
  username: string;
  password: string;
  durationMinutes: number;
  bandwidthDownMb?: number;
  bandwidthUpMb?: number;
}

/**
 * R710 API Operation Result
 * Generic success/error response
 */
export interface R710OperationResult {
  success: boolean;
  error?: string;
}

/**
 * R710 Health Check Result
 */
export interface R710HealthCheckResult {
  online: boolean;
  authenticated: boolean;
  error?: string;
  firmwareVersion?: string;
  lastChecked?: Date;
}

/**
 * R710 Device Registry Entry (Database Model)
 * Represents a registered device in the global registry
 */
export interface R710DeviceRegistryEntry {
  id: string;
  ipAddress: string;
  adminUsername: string;
  encryptedAdminPassword: string;
  firmwareVersion?: string;
  model: string;
  description?: string;
  isActive: boolean;
  connectionStatus: R710ConnectionStatus;
  lastHealthCheck?: Date;
  lastConnectedAt?: Date;
  lastError?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * R710 Business Integration
 * Links a business to a registered R710 device
 */
export interface R710BusinessIntegration {
  id: string;
  businessId: string;
  deviceRegistryId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * R710 Available Device (for business selection)
 * Simplified view for dropdown/selection UI
 */
export interface R710AvailableDevice {
  id: string;
  ipAddress: string;
  description?: string;
  model: string;
  firmwareVersion?: string;
  businessCount: number;
  connectionStatus: R710ConnectionStatus;
  lastHealthCheck?: Date;
}
