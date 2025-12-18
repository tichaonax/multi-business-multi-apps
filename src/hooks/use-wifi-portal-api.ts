/**
 * React Hook for WiFi Portal API Client with Toast Notifications
 * 
 * Wraps the WifiPortalAPIClient with automatic toast notifications for retries.
 * Use this hook in React components that need to interact with the WiFi Portal API.
 */

'use client';

import { useMemo } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { 
  WifiPortalAPIClient, 
  PortalConfig,
  CreateTokenParams,
  BulkCreateTokenParams,
  ExtendTokenParams,
  DisableTokenParams,
  TokenInfoParams,
  BatchTokenInfoParams,
  TokenListParams,
  PurgeTokensParams,
  MacFilterParams,
  MacRemoveParams,
  MacClearParams,
  TokenResponse,
  BulkTokenResponse,
  TokenInfoResponse,
  BatchTokenInfoResponse,
  TokenListResponse,
  PurgeTokensResponse,
  MacListResponse,
  MacFilterResponse,
  PortalHealthResponse
} from '@/lib/wifi-portal/api-client';

/**
 * Custom hook for WiFi Portal API with automatic toast notifications
 * 
 * @param config Portal configuration (baseUrl, apiKey, etc.)
 * @returns API client instance with all methods
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const portalApi = useWifiPortalAPI({
 *     baseUrl: 'http://192.168.0.100',
 *     apiKey: 'your-api-key'
 *   });
 * 
 *   const handleCreateToken = async () => {
 *     const result = await portalApi.createToken({
 *       durationMinutes: 120,
 *       bandwidthDownMb: 1000,
 *       bandwidthUpMb: 1000,
 *       businessId: 'business-123'
 *     });
 *     // Toast notifications will automatically show during retries
 *   };
 * }
 * ```
 */
export function useWifiPortalAPI(config: Omit<PortalConfig, 'onRetry'>): WifiPortalAPIClient {
  const { push: showToast } = useToast();

  const client = useMemo(() => {
    // Add toast notification callback to config
    const configWithToast: PortalConfig = {
      ...config,
      onRetry: (attempt, maxAttempts, retryAfter, reason) => {
        const message = `⏳ ${reason} - Retrying in ${retryAfter}s (${attempt}/${maxAttempts})`;
        showToast(message);
      }
    };

    return new WifiPortalAPIClient(configWithToast);
  }, [config.baseUrl, config.apiKey, config.timeout, config.retries, config.retryDelay, showToast]);

  return client;
}

/**
 * Type-safe wrapper for useWifiPortalAPI that re-exports all types
 */
export type {
  PortalConfig,
  CreateTokenParams,
  BulkCreateTokenParams,
  ExtendTokenParams,
  DisableTokenParams,
  TokenInfoParams,
  BatchTokenInfoParams,
  TokenListParams,
  PurgeTokensParams,
  MacFilterParams,
  MacRemoveParams,
  MacClearParams,
  TokenResponse,
  BulkTokenResponse,
  TokenInfoResponse,
  BatchTokenInfoResponse,
  TokenListResponse,
  PurgeTokensResponse,
  MacListResponse,
  MacFilterResponse,
  PortalHealthResponse
};
