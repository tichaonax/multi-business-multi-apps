/**
 * ESP32 WiFi Portal API Client
 *
 * Wrapper for communicating with the ESP32-based WiFi portal server.
 * Handles token creation, extension, disabling, and status queries.
 */

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface PortalConfig {
  baseUrl: string;      // http://{ip}:{port}
  apiKey: string;       // API authentication key
  timeout?: number;     // Request timeout in ms (default: 10000)
  retries?: number;     // Number of retry attempts (default: 3)
  retryDelay?: number;  // Delay between retries in ms (default: 1000)
  onRetry?: (attempt: number, maxAttempts: number, retryAfter: number, reason: string) => void; // Callback for retry notifications
}

export interface CreateTokenParams {
  durationMinutes: number;      // Token duration (max: 43200 = 30 days)
  bandwidthDownMb: number;      // Download bandwidth limit in MB
  bandwidthUpMb: number;        // Upload bandwidth limit in MB
  maxDevices?: number;          // Max concurrent devices (default: 2)
  businessId: string;           // Business identifier (max 36 chars, required for multi-business ESP32 sharing)
}

export interface BulkCreateTokenParams {
  count: number;                // Number of tokens to create (1-50)
  durationMinutes: number;      // Token duration (max: 43200 = 30 days)
  bandwidthDownMb: number;      // Download bandwidth limit in MB
  bandwidthUpMb: number;        // Upload bandwidth limit in MB
  businessId: string;           // Business identifier (max 36 chars, required for multi-business ESP32 sharing)
}

export interface ExtendTokenParams {
  token: string;                // Existing token code to extend/renew
}

export interface DisableTokenParams {
  token: string;                // Token code to disable
  reason?: string;              // Optional reason for disabling
}

export interface TokenInfoParams {
  token: string;                // Token code to query
}

export interface TokenResponse {
  success: boolean;
  token?: string;               // 8-character alphanumeric code
  businessId?: string;          // Business identifier from ESP32
  ap_ssid?: string;             // Access Point SSID name
  expiresAt?: string;           // ISO 8601 datetime
  durationMinutes?: number;     // Token duration in minutes
  bandwidthDownMb?: number;
  bandwidthUpMb?: number;
  maxDevices?: number;
  newDurationMinutes?: number;  // New duration for extended tokens
  newExpiresAt?: number;        // Unix timestamp for new expiration (extend)
  error?: string;
  message?: string;
}

export interface BulkTokenResponse {
  success: boolean;
  tokens_created: number;       // Number of tokens actually created
  requested: number;            // Number of tokens requested
  tokens: Array<{               // Array of created tokens
    token: string;              // 8-character alphanumeric code
  }>;
  businessId?: string;          // Business identifier (moved to root level)
  duration_minutes?: number;    // Token duration in minutes
  bandwidth_down_mb?: number;   // Download bandwidth limit
  bandwidth_up_mb?: number;     // Upload bandwidth limit
  ap_ssid?: string;             // Access Point SSID
  error?: string;
  message?: string;
}

export interface DeviceInfo {
  mac: string;                  // MAC address
  online: boolean;              // Real-time online status
  currentIp?: string;           // Current IP address if online
}

export interface TokenInfoResponse extends TokenResponse {
  createdAt?: string;           // ISO 8601 datetime
  firstUsedAt?: string | null;  // ISO 8601 datetime or null
  bandwidthUsedDown?: number;   // MB consumed
  bandwidthUsedUp?: number;     // MB consumed
  usageCount?: number;          // Number of connections
  status?: 'ACTIVE' | 'EXPIRED' | 'DISABLED';
  // Device tracking fields (v3.4)
  deviceCount?: number;         // Number of devices used
  maxDevices?: number;          // Max allowed devices
  hostname?: string;            // Primary device hostname
  deviceType?: string;          // Device type (iOS, Android, etc.)
  firstSeen?: number;           // Unix timestamp
  lastSeen?: number;            // Unix timestamp
  devices?: DeviceInfo[];       // Array of device details
}

export interface BatchTokenInfoParams {
  tokens: string[];             // Array of tokens to query (max 50)
}

export interface BatchTokenInfoResponse {
  success: boolean;
  tokens: TokenInfoResponse[];
  error?: string;
}

export interface PortalHealthResponse {
  success: boolean;
  online: boolean;
  version?: string;
  uptime?: number;              // seconds
  error?: string;
}

export interface TokenListItem {
  token: string;                // 8-character token code
  businessId?: string;          // Business identifier from ESP32
  status: 'unused' | 'active' | 'expired';
  durationMinutes: number;
  firstUse: number;             // Unix timestamp (0 if unused)
  expiresAt: number;            // Unix timestamp
  remainingSeconds: number;
  bandwidthDownMb: number;
  bandwidthUpMb: number;
  bandwidthUsedDown: number;
  bandwidthUsedUp: number;
  usageCount: number;
  deviceCount: number;
  clientMacs: string[];
}

export interface TokenListParams {
  businessId?: string;          // Filter by business identifier (exact match) - for multi-business ESP32 sharing
  status?: 'unused' | 'active' | 'expired' | 'all';
  minAgeMinutes?: number;
  maxAgeMinutes?: number;
  usedOnly?: boolean;
  unusedOnly?: boolean;
  offset?: number;              // Pagination offset (default: 0)
  limit?: number;               // Max tokens per page (default: 20, max: 20 - ESP32 hardware limit)
}

export interface TokenListResponse {
  success: boolean;
  count: number;                // Total count
  tokens: TokenListItem[];
  offset?: number;              // Current offset
  limit?: number;               // Current limit
  hasMore?: boolean;            // True if more tokens available
  error?: string;
}

export interface PurgeTokensParams {
  unusedOnly?: boolean;
  maxAgeMinutes?: number;
  expiredOnly?: boolean;
}

export interface PurgeTokensResponse {
  success: boolean;
  purgedCount: number;
  purgedTokens: string[];
  error?: string;
}

export interface MacFilterEntry {
  mac: string;                  // MAC address (XX:XX:XX:XX:XX:XX)
  token: string;                // Token that added this MAC
  reason?: string;              // Blacklist reason
  note?: string;                // Whitelist note
  added: number;                // Unix timestamp
}

export interface MacListResponse {
  success: boolean;
  blacklist: MacFilterEntry[];
  whitelist: MacFilterEntry[];
  blacklistCount: number;
  whitelistCount: number;
  error?: string;
}

export interface MacFilterParams {
  token?: string;               // Token to extract MACs from
  mac?: string;                 // Individual MAC address (XX:XX:XX:XX:XX:XX)
  reason?: string;              // Blacklist reason (max 31 chars)
  note?: string;                // Whitelist note (max 31 chars)
}

export interface MacRemoveParams {
  mac: string;                  // MAC address to remove
  list?: 'blacklist' | 'whitelist' | 'both'; // Default: 'both'
}

export interface MacClearParams {
  list?: 'blacklist' | 'whitelist' | 'both'; // Default: 'both'
}

export interface MacFilterResponse {
  success: boolean;
  message?: string;
  count?: number;               // Number of MACs affected
  entriesRemoved?: number;      // For clear operation
  error?: string;
}

// ============================================================================
// Error Classes
// ============================================================================

export class PortalAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: any
  ) {
    super(message);
    this.name = 'PortalAPIError';
  }
}

export class PortalNetworkError extends Error {
  constructor(message: string, public originalError?: any) {
    super(message);
    this.name = 'PortalNetworkError';
  }
}

export class PortalValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'PortalValidationError';
  }
}

// ============================================================================
// WiFi Portal API Client
// ============================================================================

export class WifiPortalAPIClient {
  private config: Required<PortalConfig>;

  constructor(config: PortalConfig) {
    // Validate config
    if (!config.baseUrl) {
      throw new PortalValidationError('baseUrl is required');
    }
    if (!config.apiKey) {
      throw new PortalValidationError('apiKey is required');
    }

    // Set defaults
    this.config = {
      baseUrl: config.baseUrl.replace(/\/$/, ''), // Remove trailing slash
      apiKey: config.apiKey,
      timeout: config.timeout || 10000,
      retries: config.retries || 3,
      retryDelay: config.retryDelay || 1000,
    };
  }

  // ==========================================================================
  // Public API Methods
  // ==========================================================================

  /**
   * Create a new WiFi access token
   *
   * @param params Token configuration parameters
   * @returns Token response with token code and expiration
   * @throws PortalAPIError, PortalNetworkError, PortalValidationError
   */
  async createToken(params: CreateTokenParams): Promise<TokenResponse> {
    this.validateCreateTokenParams(params);

    const formData = new URLSearchParams({
      api_key: this.config.apiKey,
      duration: params.durationMinutes.toString(),
      bandwidth_down: params.bandwidthDownMb.toString(),
      bandwidth_up: params.bandwidthUpMb.toString(),
      businessId: params.businessId, // Required for multi-business ESP32 sharing
    });

    const response = await this.request<TokenResponse>('POST', '/api/token', formData);

    // Map the API response to our expected interface
    if (response.success && response.token) {
      return {
        success: true,
        token: response.token,
        businessId: (response as any).businessId || params.businessId,
        ap_ssid: (response as any).ap_ssid,
        durationMinutes: (response as any).duration_minutes,
        bandwidthDownMb: (response as any).bandwidth_down_mb,
        bandwidthUpMb: (response as any).bandwidth_up_mb,
      };
    }

    return response;
  }

  /**
   * Create multiple tokens in a single request (bulk creation)
   *
   * @param params Bulk token creation parameters
   * @returns Response containing array of created tokens
   * @throws PortalAPIError, PortalNetworkError, PortalValidationError
   */
  async bulkCreateTokens(params: BulkCreateTokenParams): Promise<BulkTokenResponse> {
    this.validateBulkCreateTokenParams(params);

    const formData = new URLSearchParams({
      api_key: this.config.apiKey,
      count: params.count.toString(),
      duration: params.durationMinutes.toString(),
      bandwidth_down: params.bandwidthDownMb.toString(),
      bandwidth_up: params.bandwidthUpMb.toString(),
      businessId: params.businessId,
    });

    const response = await this.request<BulkTokenResponse>('POST', '/api/tokens/bulk_create', formData);

    return response;
  }

  /**
   * Get information about an existing token
   *
   * @param params Token query parameters
   * @returns Detailed token information including usage stats and device info
   * @throws PortalAPIError, PortalNetworkError, PortalValidationError
   */
  async getTokenInfo(params: TokenInfoParams): Promise<TokenInfoResponse> {
    this.validateToken(params.token);

    const url = `/api/token/info?token=${encodeURIComponent(params.token)}&api_key=${encodeURIComponent(this.config.apiKey)}`;
    const response = await this.request<TokenInfoResponse>('GET', url);

    // Map the API response to our expected interface
    if (response.success) {
      const apiResponse = response as any;
      return {
        success: true,
        token: apiResponse.token,
        businessId: apiResponse.businessId, // Business identifier from ESP32
        status: apiResponse.status?.toUpperCase(),
        createdAt: apiResponse.created ? new Date(apiResponse.created * 1000).toISOString() : undefined,
        firstUsedAt: apiResponse.first_use ? new Date(apiResponse.first_use * 1000).toISOString() : null,
        durationMinutes: apiResponse.duration_minutes,
        bandwidthDownMb: apiResponse.bandwidth_down_mb,
        bandwidthUpMb: apiResponse.bandwidth_up_mb,
        bandwidthUsedDown: apiResponse.bandwidth_used_down_mb,
        bandwidthUsedUp: apiResponse.bandwidth_used_up_mb,
        usageCount: apiResponse.usage_count,
        // Device tracking (v3.4)
        deviceCount: apiResponse.device_count,
        maxDevices: apiResponse.max_devices,
        hostname: apiResponse.hostname,
        deviceType: apiResponse.device_type,
        firstSeen: apiResponse.first_seen,
        lastSeen: apiResponse.last_seen,
        devices: apiResponse.devices,
      };
    }

    return response;
  }

  /**
   * Get information about multiple tokens in a single request (v3.4)
   *
   * @param params Batch query parameters (max 50 tokens)
   * @returns Array of token information with device details
   * @throws PortalAPIError, PortalNetworkError, PortalValidationError
   */
  async batchGetTokenInfo(params: BatchTokenInfoParams): Promise<BatchTokenInfoResponse> {
    if (!params.tokens || params.tokens.length === 0) {
      throw new PortalValidationError('At least one token is required', 'tokens');
    }

    if (params.tokens.length > 20) {
      throw new PortalValidationError('Maximum 20 tokens per batch request', 'tokens');
    }

    // Validate all tokens
    params.tokens.forEach(token => this.validateToken(token));

    // Create comma-separated list (DO NOT encode - ESP32 doesn't decode URL params properly)
    const tokenList = params.tokens.join(',');
    const url = `/api/token/batch_info?api_key=${encodeURIComponent(this.config.apiKey)}&tokens=${tokenList}`;

    const response = await this.request<any>('GET', url);

    // Map the API response
    if (response.success && response.tokens) {
      const mappedTokens = response.tokens.map((apiToken: any) => ({
        success: true,
        token: apiToken.token,
        businessId: apiToken.businessId, // Business identifier from ESP32
        status: apiToken.status?.toUpperCase(),
        createdAt: apiToken.created ? new Date(apiToken.created * 1000).toISOString() : undefined,
        firstUsedAt: apiToken.first_use ? new Date(apiToken.first_use * 1000).toISOString() : null,
        durationMinutes: apiToken.duration_minutes,
        bandwidthDownMb: apiToken.bandwidth_down_mb,
        bandwidthUpMb: apiToken.bandwidth_up_mb,
        bandwidthUsedDown: apiToken.bandwidth_used_down_mb,
        bandwidthUsedUp: apiToken.bandwidth_used_up_mb,
        usageCount: apiToken.usage_count,
        // Device tracking (v3.4)
        deviceCount: apiToken.device_count,
        maxDevices: apiToken.max_devices,
        hostname: apiToken.hostname,
        deviceType: apiToken.device_type,
        firstSeen: apiToken.first_seen,
        lastSeen: apiToken.last_seen,
        devices: apiToken.devices,
      }));

      return {
        success: true,
        tokens: mappedTokens,
      };
    }

    return response;
  }

  /**
   * Extend/renew an existing token by resetting its timer and usage counters
   *
   * Resets first_use, bandwidth usage, and usage_count to zero while preserving
   * the original duration and bandwidth limits from token creation.
   *
   * @param params Extension parameters (only requires token)
   * @returns Updated token response with new expiration time
   * @throws PortalAPIError, PortalNetworkError, PortalValidationError
   */
  async extendToken(params: ExtendTokenParams): Promise<TokenResponse> {
    this.validateToken(params.token);

    const formData = new URLSearchParams({
      api_key: this.config.apiKey,
      token: params.token,
    });

    const response = await this.request<TokenResponse>('POST', '/api/token/extend', formData);

    // Map the API response to our expected interface
    if (response.success) {
      return {
        success: true,
        token: params.token,
        durationMinutes: (response as any).duration_minutes,
        bandwidthDownMb: (response as any).bandwidth_down_mb,
        bandwidthUpMb: (response as any).bandwidth_up_mb,
        newDurationMinutes: (response as any).new_duration_minutes,
        newExpiresAt: (response as any).new_expires_at,
      };
    }

    return response;
  }

  /**
   * Disable an existing token (prevents further use)
   *
   * @param params Disable parameters
   * @returns Success response
   * @throws PortalAPIError, PortalNetworkError, PortalValidationError
   */
  async disableToken(params: DisableTokenParams): Promise<TokenResponse> {
    this.validateToken(params.token);

    const formData = new URLSearchParams({
      api_key: this.config.apiKey,
      token: params.token,
    });

    if (params.reason) {
      formData.append('reason', params.reason);
    }

    return this.request<TokenResponse>('POST', '/api/token/disable', formData);
  }

  /**
   * Check if the portal server is reachable and healthy
   *
   * @returns Health status
   */
  async checkHealth(): Promise<PortalHealthResponse> {
    try {
      const url = `/api/health?api_key=${encodeURIComponent(this.config.apiKey)}`;
      const response = await this.request<PortalHealthResponse>('GET', url, undefined, false);
      return {
        success: true,
        online: true,
        ...response,
      };
    } catch (error) {
      return {
        success: false,
        online: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get a complete list of all active tokens with metadata (v3.5 enhanced filtering)
   *
   * @param params Optional filtering parameters
   * @returns List of all tokens with status and usage information
   * @throws PortalAPIError, PortalNetworkError, PortalValidationError
   */
  async listTokens(params?: TokenListParams): Promise<TokenListResponse> {
    const queryParams = new URLSearchParams({
      api_key: this.config.apiKey,
    });

    // CRITICAL: Filter by businessId for multi-business ESP32 sharing
    if (params?.businessId) {
      queryParams.append('business_id', params.businessId);
    }
    if (params?.status) {
      queryParams.append('status', params.status);
    }
    if (params?.minAgeMinutes !== undefined) {
      queryParams.append('min_age_minutes', params.minAgeMinutes.toString());
    }
    if (params?.maxAgeMinutes !== undefined) {
      queryParams.append('max_age_minutes', params.maxAgeMinutes.toString());
    }
    if (params?.usedOnly !== undefined) {
      queryParams.append('used_only', params.usedOnly.toString());
    }
    if (params?.unusedOnly !== undefined) {
      queryParams.append('unused_only', params.unusedOnly.toString());
    }
    if (params?.offset !== undefined) {
      queryParams.append('offset', params.offset.toString());
    }
    if (params?.limit !== undefined) {
      queryParams.append('limit', params.limit.toString());
    }

    const url = `/api/tokens/list?${queryParams.toString()}`;
    const response = await this.request<any>('GET', url);

    // Map the API response to match TokenListResponse interface
    if (response.success && response.tokens) {
      const mappedTokens = response.tokens.map((apiToken: any) => ({
        token: apiToken.token,
        businessId: apiToken.businessId, // Business identifier from ESP32
        status: apiToken.status,
        durationMinutes: apiToken.duration_minutes || 0,
        firstUse: apiToken.first_use || 0,
        expiresAt: apiToken.expires_at || 0,
        remainingSeconds: apiToken.remaining_seconds || 0,
        bandwidthDownMb: apiToken.bandwidth_down_mb || 0,
        bandwidthUpMb: apiToken.bandwidth_up_mb || 0,
        bandwidthUsedDown: apiToken.bandwidth_used_down || 0,
        bandwidthUsedUp: apiToken.bandwidth_used_up || 0,
        usageCount: apiToken.usage_count || 0,
        deviceCount: apiToken.device_count || 0,
        clientMacs: apiToken.client_macs || [],
      }));

      return {
        success: true,
        count: response.total_count || response.count || mappedTokens.length,
        tokens: mappedTokens,
        offset: response.offset,
        limit: response.limit,
        hasMore: response.has_more,
      };
    }

    return response;
  }

  /**
   * Purge tokens based on age and usage criteria (v3.5)
   *
   * @param params Purge filtering parameters
   * @returns Purge result with count and list of purged tokens
   * @throws PortalAPIError, PortalNetworkError, PortalValidationError
   */
  async purgeTokens(params?: PurgeTokensParams): Promise<PurgeTokensResponse> {
    const formData = new URLSearchParams({
      api_key: this.config.apiKey,
    });

    if (params?.unusedOnly !== undefined) {
      formData.append('unused_only', params.unusedOnly.toString());
    }
    if (params?.maxAgeMinutes !== undefined) {
      formData.append('max_age_minutes', params.maxAgeMinutes.toString());
    }
    if (params?.expiredOnly !== undefined) {
      formData.append('expired_only', params.expiredOnly.toString());
    }

    const response = await this.request<any>('POST', '/api/tokens/purge', formData);

    // Map the API response
    if (response.success) {
      return {
        success: true,
        purgedCount: response.purged_count || 0,
        purgedTokens: response.purged_tokens || [],
      };
    }

    return response;
  }

  /**
   * Add MAC addresses to the blacklist (either from a token or individual MAC)
   *
   * @param params Blacklist parameters (provide either token or mac)
   * @returns Success response with count of MACs added
   * @throws PortalAPIError, PortalNetworkError, PortalValidationError
   */
  async blacklistToken(params: MacFilterParams): Promise<MacFilterResponse> {
    if (!params.token && !params.mac) {
      throw new PortalValidationError('Either token or mac is required', 'token/mac');
    }

    if (params.token && params.mac) {
      throw new PortalValidationError('Cannot specify both token and mac', 'token/mac');
    }

    const formData = new URLSearchParams({
      api_key: this.config.apiKey,
    });

    if (params.token) {
      this.validateToken(params.token);
      formData.append('token', params.token);
    } else if (params.mac) {
      if (!/^([0-9A-F]{2}:){5}[0-9A-F]{2}$/i.test(params.mac)) {
        throw new PortalValidationError(
          'Invalid MAC address format (use XX:XX:XX:XX:XX:XX)',
          'mac'
        );
      }
      formData.append('mac', params.mac.toUpperCase());
    }

    if (params.reason) {
      formData.append('reason', params.reason.substring(0, 31));
    }

    return this.request<MacFilterResponse>('POST', '/api/mac/blacklist', formData);
  }

  /**
   * Add MAC addresses to the whitelist (either from a token or individual MAC)
   *
   * @param params Whitelist parameters (provide either token or mac)
   * @returns Success response with count of MACs added
   * @throws PortalAPIError, PortalNetworkError, PortalValidationError
   */
  async whitelistToken(params: MacFilterParams): Promise<MacFilterResponse> {
    if (!params.token && !params.mac) {
      throw new PortalValidationError('Either token or mac is required', 'token/mac');
    }

    if (params.token && params.mac) {
      throw new PortalValidationError('Cannot specify both token and mac', 'token/mac');
    }

    const formData = new URLSearchParams({
      api_key: this.config.apiKey,
    });

    if (params.token) {
      this.validateToken(params.token);
      formData.append('token', params.token);
    } else if (params.mac) {
      if (!/^([0-9A-F]{2}:){5}[0-9A-F]{2}$/i.test(params.mac)) {
        throw new PortalValidationError(
          'Invalid MAC address format (use XX:XX:XX:XX:XX:XX)',
          'mac'
        );
      }
      formData.append('mac', params.mac.toUpperCase());
    }

    if (params.note) {
      formData.append('note', params.note.substring(0, 31));
    }

    return this.request<MacFilterResponse>('POST', '/api/mac/whitelist', formData);
  }

  /**
   * Get all MAC filter entries (blacklist and whitelist)
   *
   * @returns List of all MAC filters
   * @throws PortalAPIError, PortalNetworkError, PortalValidationError
   */
  async listMacFilters(): Promise<MacListResponse> {
    const url = `/api/mac/list?api_key=${encodeURIComponent(this.config.apiKey)}`;
    return this.request<MacListResponse>('GET', url);
  }

  /**
   * Remove a MAC address from blacklist, whitelist, or both
   *
   * @param params Remove parameters
   * @returns Success response
   * @throws PortalAPIError, PortalNetworkError, PortalValidationError
   */
  async removeMacFilter(params: MacRemoveParams): Promise<MacFilterResponse> {
    if (!params.mac || !/^([0-9A-F]{2}:){5}[0-9A-F]{2}$/i.test(params.mac)) {
      throw new PortalValidationError(
        'Invalid MAC address format (use XX:XX:XX:XX:XX:XX)',
        'mac'
      );
    }

    const formData = new URLSearchParams({
      api_key: this.config.apiKey,
      mac: params.mac.toUpperCase(),
    });

    if (params.list) {
      formData.append('list', params.list);
    }

    return this.request<MacFilterResponse>('POST', '/api/mac/remove', formData);
  }

  /**
   * Clear all entries from blacklist, whitelist, or both
   *
   * @param params Clear parameters
   * @returns Success response with count of entries removed
   * @throws PortalAPIError, PortalNetworkError, PortalValidationError
   */
  async clearMacFilters(params: MacClearParams = {}): Promise<MacFilterResponse> {
    const formData = new URLSearchParams({
      api_key: this.config.apiKey,
    });

    if (params.list) {
      formData.append('list', params.list);
    }

    return this.request<MacFilterResponse>('POST', '/api/mac/clear', formData);
  }

  // ==========================================================================
  // Private Helper Methods
  // ==========================================================================

  /**
   * Make HTTP request with retry logic
   */
  private async request<T>(
    method: 'GET' | 'POST',
    endpoint: string,
    body?: URLSearchParams,
    retry: boolean = true
  ): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`;
    let lastError: Error | null = null;
    const maxAttempts = retry ? this.config.retries : 1;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        const options: RequestInit = {
          method,
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        };

        if (method === 'POST' && body) {
          options.body = body.toString();
        }

        const response = await fetch(url, options);
        clearTimeout(timeoutId);

        // Log raw response for debugging ESP32 issues
        const responseText = await response.text();
        const responseClone = new Response(responseText);

        console.log(`ESP32 API Response [${response.status}] for ${method} ${url}:`, {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: responseText.substring(0, 1000) // Log first 1000 chars
        });

        // Parse response using cloned response
        const contentType = responseClone.headers.get('content-type');
        let data: any;

        if (contentType?.includes('application/json')) {
          try {
            data = await responseClone.json();
          } catch (jsonError) {
            // JSON parsing failed, fall back to text parsing
            console.error('ESP32 JSON parsing failed:', {
              error: jsonError.message,
              responseText: responseText.substring(0, 500),
              position: jsonError.message.match(/position (\d+)/)?.[1]
            });
            throw new PortalAPIError(
              `Invalid JSON response from ESP32 portal: ${jsonError.message}`,
              'INVALID_JSON_RESPONSE',
              { responseText: responseText.substring(0, 500) } // Include first 500 chars for debugging
            );
          }
        } else {
          // Try to parse as JSON anyway
          try {
            data = JSON.parse(responseText);
          } catch {
            data = { success: responseClone.ok, message: responseText };
          }
        }

        // Handle 503 Server Busy (semaphore concurrency control) - CRITICAL: Must retry with Retry-After
        if (response.status === 503) {
          const baseRetryAfter = parseInt(response.headers.get('Retry-After') || '5', 10);
          
          // Exponential backoff: multiply retry time by attempt number for repeated 503s
          const exponentialMultiplier = attempt; // 1x, 2x, 3x for attempts 1, 2, 3
          const retryAfter = baseRetryAfter * exponentialMultiplier;
          
          console.log(`⏳ ESP32 server busy (503), retrying in ${retryAfter}s... (Attempt ${attempt}/${maxAttempts}, backoff: ${exponentialMultiplier}x)`);

          // Call retry callback if provided
          if (this.config.onRetry) {
            try {
              this.config.onRetry(attempt, maxAttempts, retryAfter, 'Server Busy (503)');
            } catch (callbackError) {
              console.warn('onRetry callback error:', callbackError);
            }
          }

          // If we have more attempts, wait and retry
          if (attempt < maxAttempts) {
            await this.delay(retryAfter * 1000); // Convert to milliseconds
            continue; // Retry the request
          }

          // All retries exhausted
          throw new PortalAPIError(
            `Server busy after ${maxAttempts} attempts. Please try again later.`,
            503,
            { retryAfter, message: data.error || data.message || 'Server is processing other requests' }
          );
        }

        // Handle 507 No Slots Available
        if (response.status === 507) {
          throw new PortalAPIError(
            data.error || data.message || 'No token slots available on ESP32 device',
            507,
            data
          );
        }

        // Handle other HTTP errors
        if (!response.ok) {
          throw new PortalAPIError(
            data.error || data.message || `HTTP ${response.status}: ${response.statusText}`,
            response.status,
            data
          );
        }

        // Validate response structure
        this.validateResponse(data);

        return data as T;

      } catch (error: any) {
        lastError = error;

        // Don't retry on validation errors
        if (error instanceof PortalValidationError) {
          throw error;
        }

        // Don't retry on 4xx errors EXCEPT 503 (Server Busy - handled above with Retry-After)
        if (error instanceof PortalAPIError && error.statusCode) {
          // 503 is already handled above in the response check with proper Retry-After logic
          // Don't retry on other 4xx client errors
          if (error.statusCode >= 400 && error.statusCode < 500 && error.statusCode !== 503) {
            throw error;
          }
          // 507 No Slots Available - don't retry (terminal error)
          if (error.statusCode === 507) {
            throw error;
          }
        }

        // Handle network errors
        if (error.name === 'AbortError') {
          lastError = new PortalNetworkError(
            `Request timeout after ${this.config.timeout}ms`,
            error
          );
        } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
          lastError = new PortalNetworkError(
            `Network error: Unable to reach portal at ${this.config.baseUrl}`,
            error
          );
        }

        // Retry logic
        if (attempt < maxAttempts) {
          await this.delay(this.config.retryDelay * attempt); // Exponential backoff
          continue;
        }

        // All retries exhausted
        throw lastError;
      }
    }

    throw lastError || new PortalNetworkError('Request failed after all retries');
  }

  /**
   * Delay execution for specified milliseconds
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Validate token format (8-character alphanumeric)
   */
  private validateToken(token: string): void {
    if (!token || typeof token !== 'string') {
      throw new PortalValidationError('Token is required', 'token');
    }

    if (!/^[A-Z0-9]{8}$/i.test(token)) {
      throw new PortalValidationError(
        'Token must be 8-character alphanumeric code',
        'token'
      );
    }
  }

  /**
   * Validate create token parameters
   */
  private validateCreateTokenParams(params: CreateTokenParams): void {
    if (!params.businessId || typeof params.businessId !== 'string') {
      throw new PortalValidationError(
        'businessId is required for multi-business ESP32 sharing',
        'businessId'
      );
    }

    if (params.businessId.length > 36) {
      throw new PortalValidationError(
        'businessId cannot exceed 36 characters',
        'businessId'
      );
    }

    if (!params.durationMinutes || params.durationMinutes <= 0) {
      throw new PortalValidationError(
        'durationMinutes must be positive',
        'durationMinutes'
      );
    }

    if (params.durationMinutes > 43200) {
      throw new PortalValidationError(
        'durationMinutes cannot exceed 43200 (30 days)',
        'durationMinutes'
      );
    }

    if (!params.bandwidthDownMb || params.bandwidthDownMb <= 0) {
      throw new PortalValidationError(
        'bandwidthDownMb must be positive',
        'bandwidthDownMb'
      );
    }

    if (!params.bandwidthUpMb || params.bandwidthUpMb <= 0) {
      throw new PortalValidationError(
        'bandwidthUpMb must be positive',
        'bandwidthUpMb'
      );
    }

    if (params.maxDevices && (params.maxDevices < 1 || params.maxDevices > 10)) {
      throw new PortalValidationError(
        'maxDevices must be between 1 and 10',
        'maxDevices'
      );
    }
  }

  /**
   * Validate bulk token creation parameters
   */
  private validateBulkCreateTokenParams(params: BulkCreateTokenParams): void {
    if (!params.businessId || typeof params.businessId !== 'string') {
      throw new PortalValidationError(
        'businessId is required for multi-business ESP32 sharing',
        'businessId'
      );
    }

    if (params.businessId.length > 36) {
      throw new PortalValidationError(
        'businessId cannot exceed 36 characters',
        'businessId'
      );
    }

    if (!params.count || params.count < 1 || params.count > 50) {
      throw new PortalValidationError(
        'count must be between 1 and 50',
        'count'
      );
    }

    if (!params.durationMinutes || params.durationMinutes <= 0) {
      throw new PortalValidationError(
        'durationMinutes must be positive',
        'durationMinutes'
      );
    }

    if (params.durationMinutes > 43200) {
      throw new PortalValidationError(
        'durationMinutes cannot exceed 43200 (30 days)',
        'durationMinutes'
      );
    }

    if (params.bandwidthDownMb < 0) {
      throw new PortalValidationError(
        'bandwidthDownMb cannot be negative',
        'bandwidthDownMb'
      );
    }

    if (params.bandwidthUpMb < 0) {
      throw new PortalValidationError(
        'bandwidthUpMb cannot be negative',
        'bandwidthUpMb'
      );
    }
  }

  /**
   * Validate API response structure
   */
  private validateResponse(data: any): void {
    if (typeof data !== 'object' || data === null) {
      throw new PortalValidationError('Invalid response format from portal');
    }

    if (typeof data.success !== 'boolean') {
      throw new PortalValidationError('Response missing success field');
    }

    if (!data.success && !data.error && !data.message) {
      throw new PortalValidationError('Error response missing error/message field');
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a new WiFi Portal API client instance
 *
 * @param config Portal configuration
 * @returns Configured API client
 */
export function createPortalClient(config: PortalConfig): WifiPortalAPIClient {
  return new WifiPortalAPIClient(config);
}
