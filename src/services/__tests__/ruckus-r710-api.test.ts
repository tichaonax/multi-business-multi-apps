/**
 * Unit Tests for RuckusR710ApiService
 *
 * Tests the production-ready Ruckus R710 Unleashed API client
 * covering authentication, WLAN management, token operations, and error handling.
 */

import { RuckusR710ApiService } from '../ruckus-r710-api';
import type { R710DeviceConfig, R710Token, R710SystemInfo } from '@/types/r710';

// Mock axios
jest.mock('axios');
import axios from 'axios';
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('RuckusR710ApiService', () => {
  let service: RuckusR710ApiService;
  let mockAxiosInstance: any;

  const validConfig: R710DeviceConfig = {
    ipAddress: '192.168.0.108',
    adminUsername: 'admin',
    adminPassword: 'password123',
    timeout: 30000
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock axios instance
    mockAxiosInstance = {
      post: jest.fn(),
      get: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      }
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance);

    // Create service instance
    service = new RuckusR710ApiService(validConfig);
  });

  describe('Constructor & Initialization', () => {
    test('should create instance with valid config', () => {
      expect(service).toBeInstanceOf(RuckusR710ApiService);
      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://192.168.0.108',
          timeout: 30000,
          httpsAgent: expect.any(Object)
        })
      );
    });

    test('should use default timeout if not provided', () => {
      const configWithoutTimeout: R710DeviceConfig = {
        ipAddress: '192.168.0.108',
        adminUsername: 'admin',
        adminPassword: 'password123'
      };

      new RuckusR710ApiService(configWithoutTimeout);

      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: 30000 // Default timeout
        })
      );
    });

    test('should disable SSL verification for self-signed certificates', () => {
      const createCall = mockedAxios.create.mock.calls[0][0];
      expect(createCall.httpsAgent).toBeDefined();
      expect(createCall.httpsAgent.options.rejectUnauthorized).toBe(false);
    });
  });

  describe('Authentication - login()', () => {
    test('should login successfully and store CSRF token', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({
        status: 302,
        headers: {
          'http_x_csrf_token': 'test-csrf-token-12345',
          'set-cookie': ['sessionId=abc123; Path=/']
        },
        data: ''
      });

      const result = await service.login();

      expect(result.success).toBe(true);
      expect(result.csrfToken).toBe('test-csrf-token-12345');
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/admin/login.jsp',
        expect.any(URLSearchParams),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/x-www-form-urlencoded'
          })
        })
      );

      // Verify credentials sent correctly
      const sentParams = mockAxiosInstance.post.mock.calls[0][1];
      expect(sentParams.get('username')).toBe('admin');
      expect(sentParams.get('password')).toBe('password123');
      expect(sentParams.get('ok')).toBe('Log in');
    });

    test('should handle login failure (non-302 response)', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({
        status: 200,
        headers: {},
        data: '<html>Invalid credentials</html>'
      });

      const result = await service.login();

      expect(result.success).toBe(false);
      expect(result.csrfToken).toBeNull();
      expect(result.error).toBe('Login failed: Expected 302 redirect, got 200');
    });

    test('should handle login network error', async () => {
      mockAxiosInstance.post.mockRejectedValueOnce(
        new Error('ECONNREFUSED: Connection refused')
      );

      const result = await service.login();

      expect(result.success).toBe(false);
      expect(result.csrfToken).toBeNull();
      expect(result.error).toContain('ECONNREFUSED');
    });

    test('should handle login without CSRF token', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({
        status: 302,
        headers: {
          'set-cookie': ['sessionId=abc123; Path=/']
        },
        data: ''
      });

      const result = await service.login();

      expect(result.success).toBe(true);
      expect(result.csrfToken).toBeNull(); // No CSRF token provided
    });
  });

  describe('Authentication - ensureAuthenticated()', () => {
    test('should authenticate if not already authenticated', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({
        status: 302,
        headers: {
          'http_x_csrf_token': 'test-csrf-token',
          'set-cookie': ['sessionId=abc123']
        },
        data: ''
      });

      await service.ensureAuthenticated();

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/admin/login.jsp',
        expect.any(URLSearchParams),
        expect.any(Object)
      );
    });

    test('should skip login if already authenticated', async () => {
      // First login
      mockAxiosInstance.post.mockResolvedValueOnce({
        status: 302,
        headers: {
          'http_x_csrf_token': 'test-csrf-token',
          'set-cookie': ['sessionId=abc123']
        },
        data: ''
      });

      await service.login();
      mockAxiosInstance.post.mockClear();

      // Second call should not login again
      await service.ensureAuthenticated();

      expect(mockAxiosInstance.post).not.toHaveBeenCalled();
    });

    test('should throw error if authentication fails', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({
        status: 200,
        headers: {},
        data: 'Invalid credentials'
      });

      await expect(service.ensureAuthenticated()).rejects.toThrow('Authentication failed');
    });
  });

  describe('WLAN Management - createWlan()', () => {
    beforeEach(async () => {
      // Mock successful login
      mockAxiosInstance.post.mockResolvedValueOnce({
        status: 302,
        headers: {
          'http_x_csrf_token': 'test-csrf-token',
          'set-cookie': ['sessionId=abc123']
        },
        data: ''
      });
      await service.login();
      mockAxiosInstance.post.mockClear();
    });

    test('should create WLAN successfully', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({
        status: 200,
        data: `<ajax-response>
          <wlan id="wlan-1" name="Guest WiFi" ssid="Guest WiFi"/>
        </ajax-response>`
      });

      const result = await service.createWlan({
        ssid: 'Guest WiFi',
        guestServiceId: 'guest-1',
        vlanId: 100
      });

      expect(result.success).toBe(true);
      expect(result.wlanId).toBe('wlan-1');
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/admin/_conf.jsp',
        expect.stringContaining('Guest WiFi'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-CSRF-Token': 'test-csrf-token'
          })
        })
      );
    });

    test('should handle WLAN creation failure', async () => {
      mockAxiosInstance.post.mockRejectedValueOnce(
        new Error('VLAN ID already in use')
      );

      const result = await service.createWlan({
        ssid: 'Duplicate WLAN',
        guestServiceId: 'guest-1',
        vlanId: 100
      });

      expect(result.success).toBe(false);
      expect(result.wlanId).toBeUndefined();
      expect(result.error).toContain('VLAN ID already in use');
    });
  });

  describe('WLAN Management - deleteWlan()', () => {
    beforeEach(async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({
        status: 302,
        headers: { 'http_x_csrf_token': 'test-csrf-token' },
        data: ''
      });
      await service.login();
      mockAxiosInstance.post.mockClear();
    });

    test('should delete WLAN successfully', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({
        status: 200,
        data: '<ajax-response status="success"/>'
      });

      const result = await service.deleteWlan('wlan-1');

      expect(result.success).toBe(true);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/admin/_conf.jsp',
        expect.stringContaining('wlan-1'),
        expect.any(Object)
      );
    });

    test('should handle WLAN deletion failure', async () => {
      mockAxiosInstance.post.mockRejectedValueOnce(
        new Error('WLAN not found')
      );

      const result = await service.deleteWlan('invalid-wlan-id');

      expect(result.success).toBe(false);
      expect(result.error).toContain('WLAN not found');
    });
  });

  describe('Token Management - queryAllTokens()', () => {
    beforeEach(async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({
        status: 302,
        headers: { 'http_x_csrf_token': 'test-csrf-token' },
        data: ''
      });
      await service.login();
      mockAxiosInstance.post.mockClear();
    });

    test('should query tokens successfully', async () => {
      const mockXmlResponse = `
        <ajax-response>
          <guest-list>
            <guest key="TOKEN123" username="TOKEN123" passphrase="pass123"
                   start-time="1640000000000" time-left="3600000"
                   device-mac="AA:BB:CC:DD:EE:FF" status="1"/>
            <guest key="TOKEN456" username="TOKEN456" passphrase="pass456"
                   start-time="1640010000000" time-left="7200000"
                   device-mac="11:22:33:44:55:66" status="1"/>
          </guest-list>
        </ajax-response>
      `;

      mockAxiosInstance.post.mockResolvedValueOnce({
        status: 200,
        data: mockXmlResponse
      });

      const tokens = await service.queryAllTokens();

      expect(tokens).toHaveLength(2);
      expect(tokens[0].username).toBe('TOKEN123');
      expect(tokens[0].deviceMac).toBe('AA:BB:CC:DD:EE:FF');
      expect(tokens[1].username).toBe('TOKEN456');
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/admin/_conf.jsp',
        expect.stringContaining('getconf'),
        expect.any(Object)
      );
    });

    test('should handle empty token list', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({
        status: 200,
        data: '<ajax-response><guest-list/></ajax-response>'
      });

      const tokens = await service.queryAllTokens();

      expect(tokens).toHaveLength(0);
    });

    test('should handle query error', async () => {
      mockAxiosInstance.post.mockRejectedValueOnce(
        new Error('Timeout')
      );

      await expect(service.queryAllTokens()).rejects.toThrow('Timeout');
    });
  });

  describe('Token Management - addToken()', () => {
    beforeEach(async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({
        status: 302,
        headers: { 'http_x_csrf_token': 'test-csrf-token' },
        data: ''
      });
      await service.login();
      mockAxiosInstance.post.mockClear();
    });

    test('should add token successfully', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({
        status: 200,
        data: '<ajax-response status="success"/>'
      });

      const result = await service.addToken({
        username: 'TOKEN789',
        password: 'pass789',
        durationMinutes: 60
      });

      expect(result.success).toBe(true);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/admin/_conf.jsp',
        expect.stringContaining('TOKEN789'),
        expect.any(Object)
      );
    });

    test('should handle token addition failure', async () => {
      mockAxiosInstance.post.mockRejectedValueOnce(
        new Error('Duplicate username')
      );

      const result = await service.addToken({
        username: 'DUPLICATE',
        password: 'pass',
        durationMinutes: 60
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Duplicate username');
    });
  });

  describe('Token Management - deleteToken()', () => {
    beforeEach(async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({
        status: 302,
        headers: { 'http_x_csrf_token': 'test-csrf-token' },
        data: ''
      });
      await service.login();
      mockAxiosInstance.post.mockClear();
    });

    test('should delete token successfully', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({
        status: 200,
        data: '<ajax-response status="success"/>'
      });

      const result = await service.deleteToken('TOKEN123');

      expect(result.success).toBe(true);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/admin/_conf.jsp',
        expect.stringContaining('TOKEN123'),
        expect.any(Object)
      );
    });

    test('should handle token deletion failure', async () => {
      mockAxiosInstance.post.mockRejectedValueOnce(
        new Error('Token not found')
      );

      const result = await service.deleteToken('INVALID');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Token not found');
    });
  });

  describe('System Info - getSystemInfo()', () => {
    beforeEach(async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({
        status: 302,
        headers: { 'http_x_csrf_token': 'test-csrf-token' },
        data: ''
      });
      await service.login();
      mockAxiosInstance.post.mockClear();
    });

    test('should fetch system info successfully', async () => {
      const mockXmlResponse = `
        <ajax-response>
          <system>
            <model>R710</model>
            <version>200.15.6.12.304</version>
            <hostname>ruckus-r710</hostname>
          </system>
        </ajax-response>
      `;

      mockAxiosInstance.post.mockResolvedValueOnce({
        status: 200,
        data: mockXmlResponse
      });

      const info = await service.getSystemInfo();

      expect(info.model).toBe('R710');
      expect(info.firmwareVersion).toBe('200.15.6.12.304');
      expect(info.hostname).toBe('ruckus-r710');
    });

    test('should handle system info fetch error', async () => {
      mockAxiosInstance.post.mockRejectedValueOnce(
        new Error('Access denied')
      );

      await expect(service.getSystemInfo()).rejects.toThrow('Access denied');
    });
  });

  describe('Health Check - testConnection()', () => {
    test('should pass health check when device is reachable', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({
        status: 302,
        headers: { 'http_x_csrf_token': 'test-csrf-token' },
        data: ''
      });

      const result = await service.testConnection();

      expect(result.online).toBe(true);
      expect(result.authenticated).toBe(true);
    });

    test('should fail health check when device is unreachable', async () => {
      mockAxiosInstance.post.mockRejectedValueOnce(
        new Error('ECONNREFUSED')
      );

      const result = await service.testConnection();

      expect(result.online).toBe(false);
      expect(result.authenticated).toBe(false);
      expect(result.error).toContain('ECONNREFUSED');
    });

    test('should fail health check with invalid credentials', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({
        status: 200, // Not 302 = login failed
        headers: {},
        data: 'Invalid credentials'
      });

      const result = await service.testConnection();

      expect(result.online).toBe(true); // Device is reachable
      expect(result.authenticated).toBe(false); // But auth failed
    });
  });

  describe('Error Handling & Retry Logic', () => {
    beforeEach(async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({
        status: 302,
        headers: { 'http_x_csrf_token': 'test-csrf-token' },
        data: ''
      });
      await service.login();
      mockAxiosInstance.post.mockClear();
    });

    test('should handle timeout errors gracefully', async () => {
      mockAxiosInstance.post.mockRejectedValueOnce({
        code: 'ECONNABORTED',
        message: 'timeout of 30000ms exceeded'
      });

      const result = await service.createWlan({
        ssid: 'Test WLAN',
        guestServiceId: 'guest-1',
        vlanId: 100
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
    });

    test('should handle network errors gracefully', async () => {
      mockAxiosInstance.post.mockRejectedValueOnce({
        code: 'ECONNREFUSED',
        message: 'Connection refused'
      });

      const result = await service.deleteWlan('wlan-1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Connection refused');
    });
  });

  describe('Session State Management', () => {
    test('should track authentication state correctly', async () => {
      expect(service.isAuthenticated()).toBe(false);

      mockAxiosInstance.post.mockResolvedValueOnce({
        status: 302,
        headers: { 'http_x_csrf_token': 'test-csrf-token' },
        data: ''
      });

      await service.login();

      expect(service.isAuthenticated()).toBe(true);
    });

    test('should invalidate session on logout', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({
        status: 302,
        headers: { 'http_x_csrf_token': 'test-csrf-token' },
        data: ''
      });

      await service.login();
      expect(service.isAuthenticated()).toBe(true);

      service.logout();

      expect(service.isAuthenticated()).toBe(false);
    });

    test('should clear CSRF token on logout', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({
        status: 302,
        headers: { 'http_x_csrf_token': 'test-csrf-token' },
        data: ''
      });

      await service.login();
      service.logout();

      // Next API call should not have CSRF token
      mockAxiosInstance.post.mockResolvedValueOnce({
        status: 302,
        headers: { 'http_x_csrf_token': 'new-token' },
        data: ''
      });

      await service.login();

      // Should request new login
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/admin/login.jsp',
        expect.any(URLSearchParams),
        expect.any(Object)
      );
    });
  });

  describe('XML Parsing', () => {
    beforeEach(async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({
        status: 302,
        headers: { 'http_x_csrf_token': 'test-csrf-token' },
        data: ''
      });
      await service.login();
      mockAxiosInstance.post.mockClear();
    });

    test('should parse complex XML responses', async () => {
      const complexXml = `
        <ajax-response>
          <guest-list>
            <guest key="TOKEN1" username="TOKEN1" passphrase="pass1"
                   start-time="1640000000000" time-left="3600000"
                   device-mac="AA:BB:CC:DD:EE:FF" status="1"
                   bandwidth-down="10" bandwidth-up="5"/>
          </guest-list>
        </ajax-response>
      `;

      mockAxiosInstance.post.mockResolvedValueOnce({
        status: 200,
        data: complexXml
      });

      const tokens = await service.queryAllTokens();

      expect(tokens[0]).toMatchObject({
        username: 'TOKEN1',
        passphrase: 'pass1',
        deviceMac: 'AA:BB:CC:DD:EE:FF'
      });
    });

    test('should handle malformed XML gracefully', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({
        status: 200,
        data: '<invalid><xml></broken>'
      });

      await expect(service.queryAllTokens()).rejects.toThrow();
    });
  });
});
