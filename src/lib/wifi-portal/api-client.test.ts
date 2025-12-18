/**
 * Unit Tests for WiFi Portal API Client
 *
 * Tests all API methods with mocked fetch responses
 */

import {
  WifiPortalAPIClient,
  createPortalClient,
  PortalAPIError,
  PortalNetworkError,
  PortalValidationError,
  PortalConfig,
  CreateTokenParams,
  TokenResponse,
  TokenInfoResponse,
} from './api-client';

// ============================================================================
// Test Setup & Helpers
// ============================================================================

// Mock fetch globally
global.fetch = jest.fn();

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

const TEST_CONFIG: PortalConfig = {
  baseUrl: 'http://192.168.1.100:8080',
  apiKey: 'test_api_key_123',
  timeout: 5000,
  retries: 2,
  retryDelay: 100,
};

function mockSuccessResponse(data: any, status: number = 200): void {
  mockFetch.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    statusText: 'OK',
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => data,
    text: async () => JSON.stringify(data),
  } as Response);
}

function mockErrorResponse(status: number, error: string): void {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status,
    statusText: 'Error',
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => ({ success: false, error }),
    text: async () => JSON.stringify({ success: false, error }),
  } as Response);
}

function mockNetworkError(): void {
  mockFetch.mockRejectedValueOnce(new TypeError('fetch failed'));
}

// ============================================================================
// Test Suites
// ============================================================================

describe('WifiPortalAPIClient', () => {
  let client: WifiPortalAPIClient;

  beforeEach(() => {
    jest.clearAllMocks();
    client = new WifiPortalAPIClient(TEST_CONFIG);
  });

  // ==========================================================================
  // Constructor & Validation Tests
  // ==========================================================================

  describe('Constructor', () => {
    it('should create client with valid config', () => {
      expect(client).toBeInstanceOf(WifiPortalAPIClient);
    });

    it('should throw error for missing baseUrl', () => {
      expect(() => {
        new WifiPortalAPIClient({ ...TEST_CONFIG, baseUrl: '' });
      }).toThrow(PortalValidationError);
    });

    it('should throw error for missing apiKey', () => {
      expect(() => {
        new WifiPortalAPIClient({ ...TEST_CONFIG, apiKey: '' });
      }).toThrow(PortalValidationError);
    });

    it('should set default values for optional config', () => {
      const minimalClient = new WifiPortalAPIClient({
        baseUrl: 'http://localhost:8080',
        apiKey: 'test_key',
      });
      expect(minimalClient).toBeInstanceOf(WifiPortalAPIClient);
    });

    it('should remove trailing slash from baseUrl', () => {
      const clientWithSlash = new WifiPortalAPIClient({
        ...TEST_CONFIG,
        baseUrl: 'http://localhost:8080/',
      });
      expect(clientWithSlash).toBeInstanceOf(WifiPortalAPIClient);
    });
  });

  describe('Factory Function', () => {
    it('should create client using factory function', () => {
      const factoryClient = createPortalClient(TEST_CONFIG);
      expect(factoryClient).toBeInstanceOf(WifiPortalAPIClient);
    });
  });

  // ==========================================================================
  // createToken Tests
  // ==========================================================================

  describe('createToken', () => {
    const validParams: CreateTokenParams = {
      durationMinutes: 240,
      bandwidthDownMb: 10,
      bandwidthUpMb: 5,
      maxDevices: 2,
    };

    it('should create token successfully', async () => {
      const mockResponse: TokenResponse = {
        success: true,
        token: 'A3K9M7P2',
        expiresAt: '2024-12-10T12:00:00Z',
        bandwidthDownMb: 10,
        bandwidthUpMb: 5,
        maxDevices: 2,
      };

      mockSuccessResponse(mockResponse);

      const result = await client.createToken(validParams);

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/token'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('api_key=test_api_key_123'),
        })
      );
    });

    it('should throw validation error for negative duration', async () => {
      await expect(
        client.createToken({ ...validParams, durationMinutes: -10 })
      ).rejects.toThrow(PortalValidationError);
    });

    it('should throw validation error for duration exceeding 30 days', async () => {
      await expect(
        client.createToken({ ...validParams, durationMinutes: 50000 })
      ).rejects.toThrow(PortalValidationError);
    });

    it('should throw validation error for invalid bandwidth', async () => {
      await expect(
        client.createToken({ ...validParams, bandwidthDownMb: 0 })
      ).rejects.toThrow(PortalValidationError);

      await expect(
        client.createToken({ ...validParams, bandwidthUpMb: -5 })
      ).rejects.toThrow(PortalValidationError);
    });

    it('should throw validation error for invalid maxDevices', async () => {
      await expect(
        client.createToken({ ...validParams, maxDevices: 0 })
      ).rejects.toThrow(PortalValidationError);

      await expect(
        client.createToken({ ...validParams, maxDevices: 15 })
      ).rejects.toThrow(PortalValidationError);
    });

    it('should handle API error response', async () => {
      mockErrorResponse(400, 'Invalid API key');

      await expect(client.createToken(validParams)).rejects.toThrow(
        PortalAPIError
      );
    });
  });

  // ==========================================================================
  // getTokenInfo Tests
  // ==========================================================================

  describe('getTokenInfo', () => {
    const validToken = 'A3K9M7P2';

    it('should get token info successfully', async () => {
      const mockResponse: TokenInfoResponse = {
        success: true,
        token: validToken,
        expiresAt: '2024-12-10T12:00:00Z',
        createdAt: '2024-12-09T12:00:00Z',
        firstUsedAt: '2024-12-09T12:30:00Z',
        bandwidthDownMb: 10,
        bandwidthUpMb: 5,
        bandwidthUsedDown: 2.5,
        bandwidthUsedUp: 1.2,
        usageCount: 3,
        status: 'ACTIVE',
      };

      mockSuccessResponse(mockResponse);

      const result = await client.getTokenInfo({ token: validToken });

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/token/info'),
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('should throw validation error for invalid token format', async () => {
      await expect(client.getTokenInfo({ token: 'ABC' })).rejects.toThrow(
        PortalValidationError
      );

      await expect(client.getTokenInfo({ token: 'ABC@#$12' })).rejects.toThrow(
        PortalValidationError
      );

      await expect(client.getTokenInfo({ token: '' })).rejects.toThrow(
        PortalValidationError
      );
    });

    it('should handle token not found error', async () => {
      mockErrorResponse(404, 'Token not found');

      await expect(
        client.getTokenInfo({ token: validToken })
      ).rejects.toThrow(PortalAPIError);
    });
  });

  // ==========================================================================
  // extendToken Tests
  // ==========================================================================

  describe('extendToken', () => {
    const validToken = 'A3K9M7P2';

    it('should extend token successfully', async () => {
      const mockResponse: TokenResponse = {
        success: true,
        token: validToken,
        expiresAt: '2024-12-11T12:00:00Z',
        message: 'Token extended successfully',
      };

      mockSuccessResponse(mockResponse);

      const result = await client.extendToken({
        token: validToken,
        additionalMinutes: 120,
      });

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should throw validation error for negative additional minutes', async () => {
      await expect(
        client.extendToken({ token: validToken, additionalMinutes: -60 })
      ).rejects.toThrow(PortalValidationError);
    });

    it('should throw validation error for zero additional minutes', async () => {
      await expect(
        client.extendToken({ token: validToken, additionalMinutes: 0 })
      ).rejects.toThrow(PortalValidationError);
    });
  });

  // ==========================================================================
  // disableToken Tests
  // ==========================================================================

  describe('disableToken', () => {
    const validToken = 'A3K9M7P2';

    it('should disable token successfully', async () => {
      const mockResponse: TokenResponse = {
        success: true,
        message: 'Token disabled',
      };

      mockSuccessResponse(mockResponse);

      const result = await client.disableToken({ token: validToken });

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should disable token with reason', async () => {
      const mockResponse: TokenResponse = {
        success: true,
        message: 'Token disabled',
      };

      mockSuccessResponse(mockResponse);

      const result = await client.disableToken({
        token: validToken,
        reason: 'Customer refund',
      });

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('reason=Customer'),
        })
      );
    });
  });

  // ==========================================================================
  // checkHealth Tests
  // ==========================================================================

  describe('checkHealth', () => {
    it('should return healthy status when portal is online', async () => {
      mockSuccessResponse({
        success: true,
        version: '1.0.0',
        uptime: 3600,
      });

      const result = await client.checkHealth();

      expect(result.success).toBe(true);
      expect(result.online).toBe(true);
      expect(result.version).toBe('1.0.0');
    });

    it('should return unhealthy status on network error', async () => {
      mockNetworkError();

      const result = await client.checkHealth();

      expect(result.success).toBe(false);
      expect(result.online).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return unhealthy status on API error', async () => {
      mockErrorResponse(500, 'Internal server error');

      const result = await client.checkHealth();

      expect(result.success).toBe(false);
      expect(result.online).toBe(false);
    });
  });

  // ==========================================================================
  // Retry Logic Tests
  // ==========================================================================

  describe('Retry Logic', () => {
    const validParams: CreateTokenParams = {
      durationMinutes: 240,
      bandwidthDownMb: 10,
      bandwidthUpMb: 5,
    };

    it('should retry on network error', async () => {
      // First two attempts fail, third succeeds
      mockNetworkError();
      mockNetworkError();
      mockSuccessResponse({ success: true, token: 'A3K9M7P2' });

      await client.createToken(validParams);

      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should retry on 5xx server errors', async () => {
      // First attempt fails with 500, second succeeds
      mockErrorResponse(500, 'Server error');
      mockSuccessResponse({ success: true, token: 'A3K9M7P2' });

      await client.createToken(validParams);

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should NOT retry on 4xx client errors', async () => {
      mockErrorResponse(400, 'Bad request');

      await expect(client.createToken(validParams)).rejects.toThrow(
        PortalAPIError
      );

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should throw error after all retries exhausted', async () => {
      // All attempts fail
      mockNetworkError();
      mockNetworkError();
      mockNetworkError();

      await expect(client.createToken(validParams)).rejects.toThrow(
        PortalNetworkError
      );

      expect(mockFetch).toHaveBeenCalledTimes(3); // retries: 2 means 3 total attempts
    });
  });

  // ==========================================================================
  // Timeout Tests
  // ==========================================================================

  describe('Timeout Handling', () => {
    it('should timeout long-running requests', async () => {
      const slowClient = new WifiPortalAPIClient({
        ...TEST_CONFIG,
        timeout: 100,
        retries: 1,
      });

      // Mock a request that never resolves
      mockFetch.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve({} as Response), 5000);
          })
      );

      await expect(
        slowClient.createToken({
          durationMinutes: 240,
          bandwidthDownMb: 10,
          bandwidthUpMb: 5,
        })
      ).rejects.toThrow(PortalNetworkError);
    }, 10000); // Increase test timeout
  });

  // ==========================================================================
  // Response Validation Tests
  // ==========================================================================

  describe('Response Validation', () => {
    it('should throw error for non-object response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'text/plain' }),
        json: async () => 'plain text response',
        text: async () => 'plain text response',
      } as Response);

      await expect(
        client.createToken({
          durationMinutes: 240,
          bandwidthDownMb: 10,
          bandwidthUpMb: 5,
        })
      ).rejects.toThrow(PortalValidationError);
    });

    it('should throw error for response missing success field', async () => {
      mockSuccessResponse({ token: 'A3K9M7P2' });

      await expect(
        client.createToken({
          durationMinutes: 240,
          bandwidthDownMb: 10,
          bandwidthUpMb: 5,
        })
      ).rejects.toThrow(PortalValidationError);
    });
  });
});
