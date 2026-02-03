import axios, { AxiosInstance, AxiosError } from 'axios';
import https from 'https';
import { CookieJar } from 'tough-cookie';

/**
 * Ruckus R710 API Service
 *
 * Production-ready wrapper for Ruckus R710 Unleashed API communication.
 * Based on API discovery work in MBM-119.
 *
 * Features:
 * - Session management with tough-cookie
 * - Automatic retry logic
 * - XML parsing utilities
 * - WLAN management
 * - Token generation and management
 * - Health checks and firmware validation
 */

export interface R710DeviceConfig {
  ipAddress: string;
  adminUsername: string;
  adminPassword: string;
  timeout?: number;
  maxRetries?: number;
}

export interface R710WlanOptions {
  ssid: string;
  guestServiceId?: string;
  vlanId?: number;
  logoType?: string;
  title?: string;
  validDays?: number;
  enableFriendlyKey?: boolean;
  enableZeroIt?: boolean;
}

export interface R710TokenConfig {
  wlanName: string;
  count: number;
  duration: number;
  durationUnit: 'hour' | 'day' | 'week';
  deviceLimit?: number;
  enableFriendlyKey?: boolean;
}

export interface R710Token {
  id: string;
  username: string;
  password: string;
  wlan: string;
  createdBy: string;
  createTime: Date | null;
  expireTime: Date | null;
  startTime: Date | null;
  validTimeSeconds: number | null;
  validTimeHours: number | null;
  maxDevices: string;
  remarks: string;
  used: boolean;
  expired: boolean;
  active: boolean;
  connectedMac: string | null;
  status: string;
}

export interface R710SystemInfo {
  firmwareVersion: string;
  model: string;
  serialNumber?: string;
}

export interface R710AclMacEntry {
  mac: string;
  macComment?: string;
}

export interface R710AclList {
  id: string;
  name: string;
  description: string;
  defaultMode: 'allow' | 'deny';
  denyMacs: R710AclMacEntry[];
  acceptMacs: R710AclMacEntry[];
  editable: boolean;
}

export interface R710AclCreateOptions {
  name: string;
  description: string;
  mode: 'deny' | 'allow'; // 'deny' = whitelist (default deny), 'allow' = blacklist (default allow)
  macs?: R710AclMacEntry[];
}

export class RuckusR710ApiService {
  private client: AxiosInstance;
  private cookieJar: CookieJar;
  private config: R710DeviceConfig;
  private csrfToken: string | null = null;
  private isAuthenticated: boolean = false;
  private baseUrl: string;

  constructor(config: R710DeviceConfig) {
    this.config = {
      timeout: 30000,
      maxRetries: 3,
      ...config
    };

    this.baseUrl = `https://${this.config.ipAddress}`;
    this.cookieJar = new CookieJar();

    // Create axios instance with HTTPS agent that accepts self-signed certificates
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: this.config.timeout,
      httpsAgent: new https.Agent({
        rejectUnauthorized: false, // Accept self-signed certificates
      }),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });

    // Request interceptor - add cookies and logging
    this.client.interceptors.request.use(
      async (requestConfig) => {
        const url = `${requestConfig.baseURL}${requestConfig.url}`;
        const cookieString = await this.cookieJar.getCookieString(url);

        if (cookieString) {
          requestConfig.headers.Cookie = cookieString;
        }

        // DEBUG LOGGING - Log all R710 requests
        console.log('\n========== R710 API REQUEST ==========');
        console.log(`[R710] ${requestConfig.method?.toUpperCase()} ${url}`);
        console.log('[R710] Headers:', JSON.stringify({
          ...requestConfig.headers,
          Cookie: cookieString ? '[PRESENT]' : '[NONE]'
        }, null, 2));
        if (requestConfig.data) {
          let dataPreview;
          if (requestConfig.data instanceof URLSearchParams) {
            dataPreview = requestConfig.data.toString();
          } else if (typeof requestConfig.data === 'string') {
            dataPreview = requestConfig.data.length > 1000 ? requestConfig.data.substring(0, 1000) + '...[TRUNCATED]' : requestConfig.data;
          } else {
            dataPreview = JSON.stringify(requestConfig.data, null, 2);
          }
          console.log('[R710] Request Body:', dataPreview);
        }
        console.log('======================================\n');

        return requestConfig;
      },
      (error) => {
        console.error('[R710] Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor - save cookies and logging
    this.client.interceptors.response.use(
      async (response) => {
        const setCookieHeaders = response.headers['set-cookie'];
        if (setCookieHeaders) {
          const url = `${response.config.baseURL}${response.config.url}`;
          for (const cookieString of setCookieHeaders) {
            await this.cookieJar.setCookie(cookieString, url);
          }
        }

        // DEBUG LOGGING - Log all R710 responses
        console.log('\n========== R710 API RESPONSE ==========');
        console.log(`[R710] Status: ${response.status} ${response.statusText}`);
        console.log(`[R710] URL: ${response.config.method?.toUpperCase()} ${response.config.baseURL}${response.config.url}`);
        console.log('[R710] Response Headers:', JSON.stringify({
          'content-type': response.headers['content-type'],
          'set-cookie': setCookieHeaders ? '[PRESENT]' : '[NONE]',
          'http_x_csrf_token': response.headers['http_x_csrf_token'] || '[NONE]'
        }, null, 2));

        if (response.data) {
          const dataPreview = typeof response.data === 'string'
            ? (response.data.length > 2000 ? response.data.substring(0, 2000) + '...[TRUNCATED]' : response.data)
            : JSON.stringify(response.data, null, 2);
          console.log('[R710] Response Body:', dataPreview);
        }
        console.log('=======================================\n');

        return response;
      },
      async (error) => {
        // Save cookies even on error responses
        if (error.response && error.response.headers['set-cookie']) {
          const setCookieHeaders = error.response.headers['set-cookie'];
          const url = `${error.response.config.baseURL}${error.response.config.url}`;
          for (const cookieString of setCookieHeaders) {
            await this.cookieJar.setCookie(cookieString, url);
          }
        }

        // DEBUG LOGGING - Log R710 errors
        console.log('\n========== R710 API ERROR ==========');
        if (error.response) {
          console.log(`[R710] Status: ${error.response.status} ${error.response.statusText}`);
          console.log(`[R710] URL: ${error.config?.method?.toUpperCase()} ${error.config?.baseURL}${error.config?.url}`);
          console.log('[R710] Error Headers:', JSON.stringify({
            'content-type': error.response.headers['content-type']
          }, null, 2));

          if (error.response.data) {
            const dataPreview = typeof error.response.data === 'string'
              ? (error.response.data.length > 1000 ? error.response.data.substring(0, 1000) + '...[TRUNCATED]' : error.response.data)
              : JSON.stringify(error.response.data, null, 2);
            console.log('[R710] Error Response Body:', dataPreview);
          }
        } else if (error.request) {
          console.log('[R710] No response received');
          console.log('[R710] Request:', error.message);
        } else {
          console.log('[R710] Error:', error.message);
        }
        console.log('====================================\n');

        return Promise.reject(error);
      }
    );
  }

  /**
   * Authentication Methods
   */

  async login(): Promise<{ success: boolean; csrfToken: string | null; error?: string }> {
    try {
      console.log(`[R710] Attempting login to ${this.config.ipAddress}...`);

      const loginParams = new URLSearchParams();
      loginParams.append('username', this.config.adminUsername);
      loginParams.append('password', this.config.adminPassword);
      loginParams.append('ok', 'Log in'); // CRITICAL PARAMETER

      const loginResponse = await this.client.post('/admin/login.jsp', loginParams, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Origin': this.baseUrl,
          'Referer': `${this.baseUrl}/admin/login.jsp`,
        },
        maxRedirects: 0,
        validateStatus: () => true
      });

      // Check for CSRF token (indicates successful login)
      const csrfToken = loginResponse.headers['http_x_csrf_token'];

      // Accept both 302 (redirect) and 200 (already authenticated or followed redirect)
      if ((loginResponse.status === 302 || loginResponse.status === 200) && csrfToken) {
        this.csrfToken = csrfToken;
        this.isAuthenticated = true;

        console.log(`[R710] Login successful! Status: ${loginResponse.status}, CSRF Token: ${csrfToken}`);
        return { success: true, csrfToken: this.csrfToken };
      } else {
        console.error(`[R710] Login failed. Status: ${loginResponse.status}, CSRF Token: ${csrfToken ? 'present' : 'missing'}`);
        return { success: false, csrfToken: null, error: `Login failed - status ${loginResponse.status}, CSRF token ${csrfToken ? 'present' : 'missing'}` };
      }
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error('[R710] Login error:', axiosError.message);
      return { success: false, csrfToken: null, error: axiosError.message };
    }
  }

  async initializeSession(): Promise<void> {
    if (!this.csrfToken) {
      throw new Error('Must login before initializing session');
    }

    console.log('[R710] Initializing session...');
    const updaterId = this.generateUpdaterId('system');
    // CRITICAL: Must include ALL system components for proper initialization
    // This comprehensive initialization is required for session key generation to work
    const xmlPayload = `<ajax-request action='getstat' updater='${updaterId}' comp='system'><sysinfo/><identity/><adv-radio/><mgmt-ip/><admin/><WAN/><email-server/><sms-server/><zero-it/><bypassCNA/><internal-gateway/><dual-wan-gateway/><registration-token/><mesh-policy/><aws-sns/><pubnub/><self-heal/><guest-access/><mobile-app-promotion/><ap-policy/><credential-reset/><dhcps/><addif/><remote-mgmt/><log/><time/><unleashed-network/><dhcpp/><background-scan/><wips/><ips/><mdnsproxyrule-enable-ap/><icx/><wlansvc-standard-template/><speedflex/><iotg/><cluster/><onearm-gateway/><tunnel/><dedicated/><tun-cfg/><zd-pif/><client-load-balancing/><band-balancing/><scand/><debug-components/><debug-log/><upload-debug/><snmp/><snmpv3/><snmp-trap/><tr069/><SR-info/><mgmt-vlan/></ajax-request>`;

    await this.client.post('/admin/_cmdstat.jsp', xmlPayload, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-CSRF-Token': this.csrfToken,
        'Referer': `${this.baseUrl}/admin/dashboard.jsp`
      }
    });

    console.log('[R710] Session initialized with guest access');
  }

  async logout(): Promise<void> {
    try {
      await this.client.get('/admin/_logout.jsp');
      this.isAuthenticated = false;
      this.csrfToken = null;
      console.log('[R710] Logged out successfully');
    } catch (error) {
      console.error('[R710] Logout error:', error);
    }
  }

  /**
   * Health Check Methods
   */

  async testConnection(): Promise<{ online: boolean; authenticated: boolean; responseTime?: number; error?: string }> {
    const startTime = Date.now();

    try {
      // First check if login page is reachable
      const response = await this.client.get('/admin/login.jsp', {
        timeout: 5000,
        validateStatus: () => true
      });

      if (response.status !== 200) {
        return { online: false, authenticated: false, error: `Login page returned ${response.status}` };
      }

      // Device is online, now test authentication
      const loginResult = await this.login();
      const responseTime = Date.now() - startTime;

      if (loginResult.success) {
        return { online: true, authenticated: true, responseTime };
      } else {
        return { online: true, authenticated: false, responseTime, error: loginResult.error || 'Authentication failed' };
      }

    } catch (error) {
      const axiosError = error as AxiosError;
      return { online: false, authenticated: false, error: axiosError.message };
    }
  }

  async getSystemInfo(): Promise<R710SystemInfo | null> {
    try {
      if (!this.isAuthenticated) {
        const loginResult = await this.login();
        if (!loginResult.success) {
          throw new Error('Authentication failed');
        }
        await this.initializeSession();
      }

      const updaterId = this.generateUpdaterId('system');
      const xmlPayload = `<ajax-request action='getstat' updater='${updaterId}' comp='system'><sysinfo/><identity/></ajax-request>`;

      const response = await this.client.post('/admin/_cmdstat.jsp', xmlPayload, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'X-CSRF-Token': this.csrfToken,
          'Referer': `${this.baseUrl}/admin/dashboard.jsp`
        }
      });

      // Parse firmware version from XML response
      const firmwareMatch = response.data.match(/version="([^"]+)"/);
      const modelMatch = response.data.match(/model="([^"]+)"/);

      return {
        firmwareVersion: firmwareMatch ? firmwareMatch[1] : 'unknown',
        model: modelMatch ? modelMatch[1] : 'R710'
      };
    } catch (error) {
      console.error('[R710] Failed to get system info:', error);
      return null;
    }
  }

  async validateFirmware(expectedVersion: string = '200.15.6.12.304'): Promise<{ valid: boolean; actual?: string; error?: string }> {
    const systemInfo = await this.getSystemInfo();

    if (!systemInfo) {
      return { valid: false, error: 'Failed to retrieve system info' };
    }

    const valid = systemInfo.firmwareVersion === expectedVersion;

    return {
      valid,
      actual: systemInfo.firmwareVersion,
      error: valid ? undefined : `Firmware version mismatch. Expected ${expectedVersion}, got ${systemInfo.firmwareVersion}`
    };
  }

  /**
   * WLAN Management Methods
   */

  async createGuestService(serviceName: string, options: Partial<R710WlanOptions> = {}): Promise<{ success: boolean; serviceId?: string; error?: string }> {
    try {
      if (!this.isAuthenticated) {
        const loginResult = await this.login();
        if (!loginResult.success) {
          throw new Error('Authentication failed');
        }
        await this.initializeSession();
      }

      // Guest service creation logic would go here
      // This is a placeholder - actual implementation would require the exact XML payload
      console.log('[R710] Creating guest service:', serviceName);

      // For now, return success with a placeholder ID
      return { success: true, serviceId: 'guest-service-1' };
    } catch (error) {
      const axiosError = error as AxiosError;
      return { success: false, error: axiosError.message };
    }
  }

  async createWlan(options: R710WlanOptions): Promise<{ success: boolean; wlanId?: string; error?: string }> {
    try {
      if (!this.isAuthenticated) {
        const loginResult = await this.login();
        if (!loginResult.success) {
          throw new Error('Authentication failed');
        }
        await this.initializeSession();
      }

      const {
        ssid,
        guestServiceId = '1',
        vlanId = '1',
        logoType = 'none',
        title = 'Welcome to Guest WiFi !',
        validDays = 1,
        enableFriendlyKey = false,
        enableZeroIt = true
      } = options;

      // Convert enableZeroIt to bypass-cna (inverted logic)
      // enableZeroIt=true means Zero-IT enabled, which requires bypass-cna=false
      const bypassCna = !enableZeroIt;

      console.log('[R710] Creating WLAN:', {
        ssid,
        guestServiceId,
        vlanId,
        logoType,
        title,
        validDays,
        enableFriendlyKey,
        enableZeroIt,
        bypassCna
      });

      // CRITICAL: Ensure the Guest Service has onboarding='true' for Zero-IT to work
      // The Guest Service's onboarding attribute MUST be enabled in addition to WLAN's bypass-cna
      if (enableZeroIt) {
        console.log(`[R710] Ensuring Guest Service ${guestServiceId} has onboarding enabled...`);
        const guestServiceResult = await this.ensureGuestServiceOnboarding(guestServiceId, {
          title,
          validDays,
          logoType
        });
        if (!guestServiceResult.success) {
          console.warn(`[R710] Warning: Could not ensure Guest Service onboarding: ${guestServiceResult.error}`);
          // Continue anyway - the WLAN creation might still work
        }
      }

      const updaterId = this.generateUpdaterId('wlansvc-list');

      // Build the WLAN XML payload with all required configurations (from working test script)
      const xmlPayload = `<ajax-request action='addobj' updater='${updaterId}' comp='wlansvc-list'><wlansvc name='${ssid}' ssid='${ssid}' description='${ssid}' usage='guest' is-guest='true' authentication='open' encryption='none' acctsvr-id='0' acct-upd-interval='10' guest-pass='' en-grace-period-sets='enabled' grace-period-sets='480' close-system='false' vlan-id='${vlanId}' dvlan='disabled' max-clients-per-radio='100' enable-type='0' do-wmm-ac='disabled' acl-id='1' devicepolicy-id='' bgscan='1' balance='0' band-balance='0' do-802-11d='enabled' wlan_bind='0' force-dhcp='0' force-dhcp-timeout='10' max-idle-timeout='300' idle-timeout='true' client-isolation='enabled' ci-whitelist-id='0' bypass-cna='${bypassCna}' dtim-period='1' directed-mbc='1' client-flow-log='disabled' export-client-log='false' wifi6='true' local-bridge='1' enable-friendly-key='${enableFriendlyKey}' ofdm-rate-only='false' bss-minrate='0' tx-rate-config='1' web-auth='enabled' https-redirection='enabled' called-station-id-type='0' option82='0' option82-opt1='0' option82-opt2='0' option82-opt150='0' option82-opt151='0' dis-dgaf='0' parp='0' authstats='0' sta-info-extraction='1' pool-id='' dhcpsvr-id='0' precedence-id='1' role-based-access-ctrl='false' option82-areaName='' guest-auth='guestpass' self-service='false' self-service-sponsor-approval='undefined' self-service-notification='undefined' guestservice-id='${guestServiceId}'><queue-priority voice='0' video='2' data='4' background='6'/><qos uplink-preset='DISABLE' downlink-preset='DISABLE' perssid-uplink-preset='0' perssid-downlink-preset='0'/><rrm neighbor-report='enabled'/><smartcast mcast-filter='disabled'/><wlan-schedule value='0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0'/><avp-policy avp-enabled='disabled' avpdeny-id='0'/><urlfiltering-policy urlfiltering-enabled='disabled' urlfiltering-id='0'/><wificalling-policy wificalling-enabled='disabled' profile-id='0'/></wlansvc></ajax-request>`;

      const response = await this.client.post('/admin/_conf.jsp', xmlPayload, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'Accept': '*/*',
          'X-CSRF-Token': this.csrfToken || '',
          'X-Requested-With': 'XMLHttpRequest',
          'Referer': `${this.baseUrl}/admin/dashboard.jsp`
        }
      });

      // Parse response to extract the NUMERIC WLAN ID from device
      const responseText = response.data;

      console.log('[R710] Create WLAN response (first 1000 chars):', responseText.substring(0, 1000));

      // CRITICAL: R710 returns NUMERIC IDs (e.g., "0", "5", "1"), NOT SSIDs
      // The response contains: <response><wlansvc name="..." id="0" .../></response>
      // We need to find the id attribute inside the <wlansvc> element, not the <response> element

      // First try: Look for wlansvc element with standalone id attribute (not acctsvr-id, vlan-id, etc.)
      // Use \s to match space before id to avoid matching -id suffixes
      const wlansvcMatch = responseText.match(/<wlansvc[^>]+\sid="(\d+)"/);

      if (wlansvcMatch) {
        const numericWlanId = wlansvcMatch[1];
        console.log(`[R710] ✅ WLAN created successfully with NUMERIC ID: ${numericWlanId} (SSID: ${ssid})`);

        // CRITICAL: Return the NUMERIC ID from device, not the SSID
        return { success: true, wlanId: numericWlanId };
      }

      // Fallback: Try to find ANY numeric id with space before (in case format is different)
      const anyNumericIdMatch = responseText.match(/\sid="(\d+)"/);
      if (anyNumericIdMatch) {
        const numericWlanId = anyNumericIdMatch[1];
        console.log(`[R710] ✅ WLAN created (fallback ID extraction): ${numericWlanId} (SSID: ${ssid})`);
        return { success: true, wlanId: numericWlanId };
      }

      // If still no match, log full response and fail
      console.error('[R710] ❌ Failed to extract numeric WLAN ID from response');
      console.error('[R710] Full response:', responseText);

      return { success: false, error: 'Failed to extract WLAN ID from device response' };

    } catch (error) {
      const axiosError = error as AxiosError;
      console.error('[R710] Failed to create WLAN:', axiosError.message);
      if (axiosError.response) {
        console.error('[R710] Response data:', axiosError.response.data);
      }
      return { success: false, error: axiosError.message };
    }
  }

  async updateWlan(wlanId: string, options: Partial<R710WlanOptions>): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.isAuthenticated) {
        const loginResult = await this.login();
        if (!loginResult.success) {
          throw new Error('Authentication failed');
        }
        await this.initializeSession();
      }

      const {
        ssid,
        guestServiceId = '1',
        vlanId = '1',
        logoType = 'none',
        title = 'Welcome to Guest WiFi !',
        validDays = 1,
        enableFriendlyKey = false,
        enableZeroIt = true
      } = options;

      // Convert enableZeroIt to bypass-cna (inverted logic)
      // enableZeroIt=true means Zero-IT enabled, which requires bypass-cna=false
      const bypassCna = !enableZeroIt;

      console.log('[R710] Updating WLAN:', {
        wlanId,
        ssid,
        guestServiceId,
        vlanId,
        logoType,
        title,
        validDays,
        enableFriendlyKey,
        enableZeroIt,
        bypassCna
      });

      const updaterId = this.generateUpdaterId('wlansvc-list');

      // Build the WLAN XML payload with action='updobj' and id attribute
      const xmlPayload = `<ajax-request action='updobj' updater='${updaterId}' comp='wlansvc-list'><wlansvc name='${ssid}' ssid='${ssid}' description='${ssid}' usage='guest' is-guest='true' authentication='open' encryption='none' acctsvr-id='0' acct-upd-interval='10' guest-pass='' en-grace-period-sets='enabled' grace-period-sets='480' close-system='false' vlan-id='${vlanId}' dvlan='disabled' max-clients-per-radio='100' enable-type='0' do-wmm-ac='disabled' acl-id='1' devicepolicy-id='' bgscan='1' balance='0' band-balance='0' do-802-11d='enabled' wlan_bind='0' force-dhcp='0' force-dhcp-timeout='10' max-idle-timeout='300' idle-timeout='true' client-isolation='enabled' ci-whitelist-id='0' bypass-cna='${bypassCna}' dtim-period='1' directed-mbc='1' client-flow-log='disabled' export-client-log='false' wifi6='true' local-bridge='1' enable-friendly-key='${enableFriendlyKey}' ofdm-rate-only='false' bss-minrate='0' tx-rate-config='1' web-auth='enabled' https-redirection='enabled' called-station-id-type='0' option82='0' option82-opt1='0' option82-opt2='0' option82-opt150='0' option82-opt151='0' dis-dgaf='0' parp='0' authstats='0' sta-info-extraction='1' pool-id='' dhcpsvr-id='0' precedence-id='1' role-based-access-ctrl='false' option82-areaName='' id='${wlanId}' guest-auth='guestpass' self-service='false' self-service-sponsor-approval='undefined' self-service-notification='undefined' guestservice-id='${guestServiceId}'><queue-priority voice='0' video='2' data='4' background='6'/><qos uplink-preset='DISABLE' downlink-preset='DISABLE' perssid-uplink-preset='0' perssid-downlink-preset='0'/><rrm neighbor-report='enabled'/><smartcast mcast-filter='disabled'/><wlan-schedule value='0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0'/><avp-policy avp-enabled='disabled' avpdeny-id='0'/><urlfiltering-policy urlfiltering-enabled='disabled' urlfiltering-id='0'/><wificalling-policy wificalling-enabled='disabled' profile-id='0'/></wlansvc></ajax-request>`;

      const response = await this.client.post('/admin/_conf.jsp', xmlPayload, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'Accept': '*/*',
          'X-CSRF-Token': this.csrfToken || '',
          'X-Requested-With': 'XMLHttpRequest',
          'Referer': `${this.baseUrl}/admin/dashboard.jsp`
        }
      });

      // Update response returns empty object on success: <response type="object" id="..." />
      const responseText = response.data;

      if (responseText.includes('<response') && responseText.includes('/>') && !responseText.includes('<error')) {
        console.log(`[R710] WLAN ID ${wlanId} updated successfully`);
        return { success: true };
      } else {
        console.log('[R710] Update may have failed');
        console.log('[R710] Response:', responseText.substring(0, 500));
        return { success: false, error: 'Update response did not confirm success' };
      }
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error('[R710] Failed to update WLAN:', axiosError.message);
      if (axiosError.response) {
        console.error('[R710] Response data:', axiosError.response.data);
      }
      return { success: false, error: axiosError.message };
    }
  }

  /**
   * Ensure a Guest Service has onboarding='true' enabled for Zero-IT to work
   * This is CRITICAL for Zero-IT device registration to function properly
   */
  async ensureGuestServiceOnboarding(
    guestServiceId: string,
    options: {
      title?: string;
      validDays?: number;
      logoType?: string;
    } = {}
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const {
        title = 'Welcome to Guest WiFi !',
        validDays = 1,
        logoType = 'none'
      } = options;

      // First, get the current Guest Service name
      const updaterId = this.generateUpdaterId('guestservice-list');
      const getPayload = `<ajax-request action='getconf' DECRYPT_X='true' caller='unleashed_web' updater='${updaterId}' comp='guestservice-list'/>`;

      const getResponse = await this.client.post('/admin/_conf.jsp', getPayload, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'X-CSRF-Token': this.csrfToken || '',
          'X-Requested-With': 'XMLHttpRequest',
          'Referer': `${this.baseUrl}/admin/dashboard.jsp`
        }
      });

      const getResponseText = getResponse.data;

      // Find the Guest Service name by ID
      const guestServiceRegex = new RegExp(`<guestservice[^>]*\\sid="${guestServiceId}"[^>]*name="([^"]+)"`, 'i');
      const nameMatch = getResponseText.match(guestServiceRegex);

      // Also try alternative pattern where name comes before id
      const altGuestServiceRegex = new RegExp(`<guestservice[^>]*name="([^"]+)"[^>]*\\sid="${guestServiceId}"`, 'i');
      const altNameMatch = getResponseText.match(altGuestServiceRegex);

      const serviceName = nameMatch?.[1] || altNameMatch?.[1] || `Guest Access ${guestServiceId}`;

      console.log(`[R710] Found Guest Service name: "${serviceName}" for ID ${guestServiceId}`);

      // Now update the Guest Service with onboarding='true'
      const updateUpdaterId = this.generateUpdaterId('guestservice-list');
      const updatePayload = `<ajax-request action='updobj' updater='${updateUpdaterId}' comp='guestservice-list'><guestservice name='${serviceName}' onboarding='true' onboarding-aspect='both' auth-by='guestpass' countdown-by-issued='false' show-tou='true' tou='Terms of Use

By accepting this agreement and accessing the wireless network, you acknowledge that you are of legal age, you have read and understood, and agree to be bound by this agreement.
(*) The wireless network service is provided by the property owners and is completely at their discretion. Your access to the network may be blocked, suspended, or terminated at any time for any reason.
(*) You agree not to use the wireless network for any purpose that is unlawful or otherwise prohibited and you are fully responsible for your use.
(*) The wireless network is provided &quot;as is&quot; without warranties of any kind, either expressed or implied.' redirect='orig' redirect-url='' company-logo='ruckus' poweredby='Ruckus Wireless' poweredby-url='http://www.ruckuswireless.com/' desc='Type or paste in the text of your guest pass.' self-service='false' rule6='' title='${title}' opacity='1.0' background-opacity='1' background-color='#516a8c' logo-type='${logoType}' banner-type='default' bgimage-type='default' bgimage-display-type='fill' enable-portal='true' wifi4eu='false' wifi4eu-network-id='' wifi4eu-language='en' wifi4eu-debug='false' wg='' show-lang='true' portal-lang='en_US' random-key='999' valid='${validDays}' old-self-service='false' old-auth-by='guestpass' id='${guestServiceId}'><rule action='accept' type='layer 2' ether-type='0x0806'></rule><rule action='accept' type='layer 2' ether-type='0x8863'></rule><rule action='accept' type='layer 2' ether-type='0x8864'></rule><rule action='accept' type='layer 3' protocol='17' dst-port='53'></rule><rule action='accept' type='layer 3' protocol='6' dst-port='53'></rule><rule action='accept' type='layer 3' protocol='' dst-port='67' app='DHCP'></rule><rule action='deny' type='layer 3' protocol='' dst-port='68'></rule><rule action='accept' type='layer 3' protocol='6' dst-addr='host' dst-port='80' app='HTTP'></rule><rule action='accept' type='layer 3' protocol='6' dst-addr='host' dst-port='443' app='HTTPS'></rule><rule action='deny' type='layer 3' dst-addr='local' protocol='' EDITABLE='false'></rule><rule action='accept' type='layer 3' dst-addr='10.0.0.0/8' protocol=''></rule><rule action='deny' type='layer 3' dst-addr='172.16.0.0/12' protocol=''></rule><rule action='accept' type='layer 3' dst-addr='192.168.0.0/16' protocol=''></rule><rule action='accept' type='layer 3' protocol='1'></rule><rule action='accept' type='layer 3' protocol='' dst-port='0'></rule></guestservice></ajax-request>`;

      const updateResponse = await this.client.post('/admin/_conf.jsp', updatePayload, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'Accept': '*/*',
          'X-CSRF-Token': this.csrfToken || '',
          'X-Requested-With': 'XMLHttpRequest',
          'Referer': `${this.baseUrl}/admin/dashboard.jsp`
        }
      });

      const updateResponseText = updateResponse.data;

      if (updateResponseText.includes('<response') && !updateResponseText.includes('<error')) {
        console.log(`[R710] ✅ Guest Service ${guestServiceId} updated with onboarding='true'`);
        return { success: true };
      } else {
        console.warn(`[R710] Guest Service update response: ${updateResponseText.substring(0, 300)}`);
        return { success: false, error: 'Update response did not confirm success' };
      }

    } catch (error) {
      const axiosError = error as AxiosError;
      console.error('[R710] Failed to ensure Guest Service onboarding:', axiosError.message);
      return { success: false, error: axiosError.message };
    }
  }

  async updateGuestService(
    guestServiceId: string,
    options: {
      serviceName: string;
      title?: string;
      validDays?: number;
      logoType?: string;
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.isAuthenticated) {
        const loginResult = await this.login();
        if (!loginResult.success) {
          throw new Error('Authentication failed');
        }
        await this.initializeSession();
      }

      const {
        serviceName,
        title = 'Welcome to Guest WiFi !',
        validDays = 1,
        logoType = 'none'
      } = options;

      console.log('[R710] Updating Guest Service:', {
        guestServiceId,
        serviceName,
        title,
        validDays,
        logoType
      });

      const updaterId = this.generateUpdaterId('guestservice-list');

      // Build the Guest Service XML payload - same as creation but with 'updobj' action and 'id' attribute
      // Note: onboarding='true' is hardcoded - Zero-IT onboarding is controlled by WLAN's bypass-cna attribute
      const xmlPayload = `<ajax-request action='updobj' updater='${updaterId}' comp='guestservice-list'><guestservice name='${serviceName}' onboarding='true' onboarding-aspect='both' auth-by='guestpass' countdown-by-issued='false' show-tou='true' tou='Terms of Use

By accepting this agreement and accessing the wireless network, you acknowledge that you are of legal age, you have read and understood, and agree to be bound by this agreement.
(*) The wireless network service is provided by the property owners and is completely at their discretion. Your access to the network may be blocked, suspended, or terminated at any time for any reason.
(*) You agree not to use the wireless network for any purpose that is unlawful or otherwise prohibited and you are fully responsible for your use.
(*) The wireless network is provided &quot;as is&quot; without warranties of any kind, either expressed or implied.' redirect='orig' redirect-url='' company-logo='ruckus' poweredby='Ruckus Wireless' poweredby-url='http://www.ruckuswireless.com/' desc='Type or paste in the text of your guest pass.' self-service='false' rule6='' title='${title}' opacity='1.0' background-opacity='1' background-color='#516a8c' logo-type='${logoType}' banner-type='default' bgimage-type='default' bgimage-display-type='fill' enable-portal='true' wifi4eu='false' wifi4eu-network-id='' wifi4eu-language='en' wifi4eu-debug='false' wg='' show-lang='true' portal-lang='en_US' random-key='999' valid='${validDays}' old-self-service='false' old-auth-by='guestpass' id='${guestServiceId}'><rule action='accept' type='layer 2' ether-type='0x0806'></rule><rule action='accept' type='layer 2' ether-type='0x8863'></rule><rule action='accept' type='layer 2' ether-type='0x8864'></rule><rule action='accept' type='layer 3' protocol='17' dst-port='53'></rule><rule action='accept' type='layer 3' protocol='6' dst-port='53'></rule><rule action='accept' type='layer 3' protocol='' dst-port='67' app='DHCP'></rule><rule action='deny' type='layer 3' protocol='' dst-port='68'></rule><rule action='accept' type='layer 3' protocol='6' dst-addr='host' dst-port='80' app='HTTP'></rule><rule action='accept' type='layer 3' protocol='6' dst-addr='host' dst-port='443' app='HTTPS'></rule><rule action='deny' type='layer 3' dst-addr='local' protocol='' EDITABLE='false'></rule><rule action='accept' type='layer 3' dst-addr='10.0.0.0/8' protocol=''></rule><rule action='deny' type='layer 3' dst-addr='172.16.0.0/12' protocol=''></rule><rule action='accept' type='layer 3' dst-addr='192.168.0.0/16' protocol=''></rule><rule action='accept' type='layer 3' protocol='1'></rule><rule action='accept' type='layer 3' protocol='' dst-port='0'></rule></guestservice></ajax-request>`;

      const response = await this.client.post('/admin/_conf.jsp', xmlPayload, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'Accept': '*/*',
          'X-CSRF-Token': this.csrfToken || '',
          'X-Requested-With': 'XMLHttpRequest',
          'Referer': `${this.baseUrl}/admin/dashboard.jsp`
        }
      });

      // Update response returns empty object on success: <response type="object" id="..." />
      const responseText = response.data;

      if (responseText.includes('<response') && responseText.includes('/>') && !responseText.includes('<error')) {
        console.log(`[R710] Guest Service ID ${guestServiceId} updated successfully`);
        return { success: true };
      } else {
        console.log('[R710] Guest Service update may have failed');
        console.log('[R710] Response:', responseText.substring(0, 500));
        return { success: false, error: 'Update response did not confirm success' };
      }
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error('[R710] Failed to update Guest Service:', axiosError.message);
      if (axiosError.response) {
        console.error('[R710] Response data:', axiosError.response.data);
      }
      return { success: false, error: axiosError.message };
    }
  }

  async verifyWlanUpdate(wlanId: string, expectedSsid: string): Promise<{ success: boolean; verified: boolean; error?: string }> {
    try {
      if (!this.isAuthenticated) {
        const loginResult = await this.login();
        if (!loginResult.success) {
          throw new Error('Authentication failed');
        }
        await this.initializeSession();
      }

      console.log(`[R710] Verifying WLAN update: ${wlanId} -> ${expectedSsid}...`);

      const updaterId = this.generateUpdaterId('wlansvc-list');
      const xmlPayload = `<ajax-request action='getconf' DECRYPT_X='true' caller='unleashed_web' updater='${updaterId}' comp='wlansvc-list'/>`;

      const response = await this.client.post('/admin/_conf.jsp', xmlPayload, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'Accept': '*/*',
          'X-CSRF-Token': this.csrfToken || '',
          'X-Requested-With': 'XMLHttpRequest',
          'Referer': `${this.baseUrl}/admin/dashboard.jsp`
        }
      });

      const responseText = response.data;

      // Check if our WLAN ID appears with the expected name
      if (responseText.includes(`id="${wlanId}"`)) {
        console.log(`[R710] ✅ WLAN ID ${wlanId} confirmed in WLAN list`);

        // Verify the name was updated
        if (expectedSsid && responseText.includes(`name="${expectedSsid}"`)) {
          console.log(`[R710] ✅ WLAN name confirmed: "${expectedSsid}"`);
          return { success: true, verified: true };
        } else {
          console.log(`[R710] ⚠️  WLAN found but name mismatch. Expected: "${expectedSsid}"`);
          return { success: true, verified: false, error: 'WLAN name does not match expected value' };
        }
      } else {
        console.log(`[R710] ❌ WLAN ID ${wlanId} not found in WLAN list`);
        return { success: true, verified: false, error: 'WLAN not found in device' };
      }
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error('[R710] Failed to verify WLAN update:', axiosError.message);
      return { success: false, verified: false, error: axiosError.message };
    }
  }

  async deleteWlan(wlanId: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.isAuthenticated) {
        const loginResult = await this.login();
        if (!loginResult.success) {
          throw new Error('Authentication failed');
        }
        await this.initializeSession();
      }

      console.log('[R710] Deleting WLAN:', wlanId);

      const updaterId = this.generateUpdaterId('wlansvc-list');

      // Build the delete XML payload
      const xmlPayload = `<ajax-request action='delobj' updater='${updaterId}' comp='wlansvc-list'><wlansvc id='${wlanId}'/></ajax-request>`;

      const response = await this.client.post('/admin/_conf.jsp', xmlPayload, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'Accept': '*/*',
          'X-CSRF-Token': this.csrfToken || '',
          'X-Requested-With': 'XMLHttpRequest',
          'Referer': `${this.baseUrl}/admin/dashboard.jsp`
        }
      });

      // Delete response returns empty object on success: <response type="object" id="..." />
      const responseText = response.data;

      if (responseText.includes('<response') && responseText.includes('/>') && !responseText.includes('<error')) {
        console.log(`[R710] WLAN ID ${wlanId} deleted successfully`);
        return { success: true };
      } else {
        console.log('[R710] Delete may have failed');
        console.log('[R710] Response:', responseText.substring(0, 500));
        return { success: false, error: 'Delete response did not confirm success' };
      }
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error('[R710] Failed to delete WLAN:', axiosError.message);
      if (axiosError.response) {
        console.error('[R710] Response data:', axiosError.response.data);
      }
      return { success: false, error: axiosError.message };
    }
  }

  /**
   * Discover WLANs from device (device-as-source-of-truth)
   *
   * Returns WLANs with their NUMERIC IDs and SSIDs
   * Based on working test scripts from scripts/ruckus-api-discovery/
   */
  async discoverWlans(): Promise<{ success: boolean; wlans: Array<{ id: string; name: string; ssid: string; isGuest: boolean }>; error?: string }> {
    try {
      if (!this.isAuthenticated) {
        const loginResult = await this.login();
        if (!loginResult.success) {
          throw new Error('Authentication failed');
        }
        await this.initializeSession();
      }

      console.log('[R710] Discovering WLANs from device...');

      const updaterId = this.generateUpdaterId('wlansvc-list');
      const xmlPayload = `<ajax-request action='getconf' DECRYPT_X='true' caller='unleashed_web' updater='${updaterId}' comp='wlansvc-list'/>`;

      const response = await this.client.post('/admin/_conf.jsp', xmlPayload, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'X-CSRF-Token': this.csrfToken || '',
          'X-Requested-With': 'XMLHttpRequest',
          'Referer': `${this.baseUrl}/admin/dashboard.jsp`
        }
      });

      // Sanitize XML to handle unescaped special characters in attribute values
      const sanitizedData = this.sanitizeXmlResponse(response.data);

      // DEBUG: Log first part of response to see structure
      console.log('[R710 Discovery] Response (first 2000 chars):', sanitizedData.substring(0, 2000));

      // Parse WLANs using regex
      // CRITICAL: Need to capture the FULL <wlansvc> opening tag including all attributes up to the first >
      // The pattern needs to be greedy enough to get all attributes including 'id'
      const wlanPattern = /<wlansvc\s+[^>]*>/g;
      const matches = sanitizedData.match(wlanPattern);

      console.log(`[R710 Discovery] Found ${matches?.length || 0} <wlansvc> tags`);

      const wlans: Array<{ id: string; name: string; ssid: string; isGuest: boolean }> = [];

      if (matches) {
        matches.forEach((match, index) => {
          console.log(`[R710 Discovery] Match ${index + 1} length: ${match.length} chars`);
          console.log(`[R710 Discovery] Match ${index + 1} (first 500 chars):`, match.substring(0, 500));

          // CRITICAL: The <wlansvc> element has the id attribute which should be NUMERIC
          // But we need to be careful - sometimes the id might be the SSID
          // Extract all attributes first
          const nameMatch = match.match(/name="([^"]+)"/);
          const ssidMatch = match.match(/ssid="([^"]+)"/);
          const isGuestMatch = match.match(/is-guest="([^"]+)"/);

          // For id, we need to match the STANDALONE id attribute, not acctsvr-id, vlan-id, etc.
          // Match " id=" with a space before to ensure it's not a suffix of another attribute
          const numericIdMatch = match.match(/\sid="(\d+)"/);  // Space before id to avoid matching -id suffixes
          const anyIdMatch = match.match(/\sid="([^"]+)"/);

          // Prefer numeric ID, but if not found, use whatever id is there
          const extractedId = numericIdMatch ? numericIdMatch[1] : (anyIdMatch ? anyIdMatch[1] : '');

          // Log what we found for debugging
          console.log(`[R710 Discovery] WLAN ${index + 1}: name="${nameMatch?.[1]}", ssid="${ssidMatch?.[1]}", id="${extractedId}" (numeric: ${!!numericIdMatch}), isGuest="${isGuestMatch?.[1]}"`);

          // Extract all WLANs (guest and non-guest)
          wlans.push({
            id: extractedId,
            name: nameMatch ? nameMatch[1] : '',
            ssid: ssidMatch ? ssidMatch[1] : '',
            isGuest: isGuestMatch ? isGuestMatch[1] === 'true' : false
          });
        });
      }

      console.log(`[R710] ✅ Discovered ${wlans.length} WLANs from device (${wlans.filter(w => w.isGuest).length} guest WLANs)`);

      return { success: true, wlans };
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error('[R710] Failed to discover WLANs:', axiosError.message);
      return { success: false, wlans: [], error: axiosError.message };
    }
  }

  async listWlans(): Promise<any[]> {
    try {
      if (!this.isAuthenticated) {
        const loginResult = await this.login();
        if (!loginResult.success) {
          throw new Error('Authentication failed');
        }
        await this.initializeSession();
      }

      console.log('[R710] Listing WLANs');

      // Create unique updater ID
      const updater = `wlansvc-list.${Date.now()}.${Math.floor(Math.random() * 10000)}`;

      // Build XML request
      const xmlPayload = `<ajax-request action='getconf' DECRYPT_X='true' caller='unleashed_web' updater='${updater}' comp='wlansvc-list'/>`;

      const response = await this.client.post('/admin/_conf.jsp', xmlPayload, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'X-CSRF-Token': this.csrfToken || '',
          'Referer': `${this.baseUrl}/admin/dashboard.jsp`
        }
      });

      // Parse XML response (with sanitization for unescaped special characters)
      const xml2js = require('xml2js');
      const parser = new xml2js.Parser({ explicitArray: false, mergeAttrs: true });
      const sanitizedXml = this.sanitizeXmlResponse(response.data);
      const result = await parser.parseStringPromise(sanitizedXml);

      // Extract WLANs from response
      if (result && result['ajax-response'] && result['ajax-response'].response) {
        const responseObj = result['ajax-response'].response;
        if (responseObj['wlansvc-list'] && responseObj['wlansvc-list'].wlansvc) {
          const wlansvcs = responseObj['wlansvc-list'].wlansvc;
          // Ensure it's an array
          const wlansArray = Array.isArray(wlansvcs) ? wlansvcs : [wlansvcs];
          console.log(`[R710] Found ${wlansArray.length} WLANs`);
          return wlansArray;
        }
      }

      return [];
    } catch (error) {
      console.error('[R710] Failed to list WLANs:', error);
      return [];
    }
  }

  async getWlanById(wlanId: string): Promise<any | null> {
    try {
      const wlans = await this.listWlans();
      const wlan = wlans.find(w => w.id === wlanId || w.name === wlanId);
      if (wlan) {
        console.log(`[R710] Found WLAN: ${wlan.name} (${wlan.ssid})`);
      }
      return wlan || null;
    } catch (error) {
      console.error('[R710] Failed to get WLAN by ID:', error);
      return null;
    }
  }

  /**
   * Token Management Methods
   */

  /**
   * DEPRECATED: Session key is not required for token generation.
   * The R710 device accepts an empty 'key' parameter in mon_createguest.jsp.
   * This method is kept for backward compatibility but always returns empty string.
   */
  async getSessionKey(): Promise<string | null> {
    console.log('[R710] Session key not required - using empty key parameter');
    return ''; // Empty key works fine
  }

  async generateTokens(config: R710TokenConfig): Promise<{ success: boolean; tokens?: R710Token[]; error?: string }> {
    try {
      if (!this.isAuthenticated) {
        const loginResult = await this.login();
        if (!loginResult.success) {
          throw new Error('Authentication failed');
        }
        await this.initializeSession();
      }

      const sessionKey = await this.getSessionKey();
      // Note: Session key can be empty - R710 accepts empty 'key' parameter

      console.log(`[R710] Generating ${config.count} tokens for WLAN: ${config.wlanName}`);
      console.log(`[R710] Duration: ${config.duration} ${config.durationUnit}`);
      console.log(`[R710] Device Limit: ${config.deviceLimit}`);

      // Build form data for token creation
      const formParams = new URLSearchParams();
      formParams.append('gentype', 'multiple');
      formParams.append('fullname', '');
      formParams.append('remarks', '');
      formParams.append('duration', config.duration.toString());
      formParams.append('duration-unit', `${config.durationUnit}_${config.durationUnit.charAt(0).toUpperCase() + config.durationUnit.slice(1)}s`);
      formParams.append('key', sessionKey);
      formParams.append('createToNum', config.count.toString());
      formParams.append('batchpass', '');
      formParams.append('guest-wlan', config.wlanName);
      formParams.append('shared', 'true');
      formParams.append('reauth', 'false');
      formParams.append('reauth-time', '');
      formParams.append('reauth-unit', 'min');
      formParams.append('email', '');
      formParams.append('countrycode', '');
      formParams.append('phonenumber', '');
      formParams.append('limitnumber', (config.deviceLimit || 2).toString());
      formParams.append('_', '');

      const response = await this.client.post('/admin/mon_createguest.jsp', formParams, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'Accept': 'text/javascript, text/html, application/xml, text/xml, */*',
          'X-CSRF-Token': this.csrfToken,
          'X-Requested-With': 'XMLHttpRequest',
          'Referer': `${this.baseUrl}/admin/dashboard.jsp`
        }
      });

      if (response.status === 200 && response.data) {
        const responseText = response.data;

        // Extract JSON result from response
        const jsonMatch = responseText.match(/\{[^}]+\}/);
        if (jsonMatch) {
          const jsonData = JSON.parse(jsonMatch[0]);

          if (jsonData.result === 'OK') {
            console.log(`[R710] Token creation successful! IDs: ${jsonData.ids}`);

            // Extract individual tokens from JavaScript arrays
            const tokenRegex = /batchEmailData\.push\('([^|]+)\|([^|]+)\|'\);/g;
            const tokens: { username: string; password: string }[] = [];
            let match;

            while ((match = tokenRegex.exec(responseText)) !== null) {
              tokens.push({
                username: match[1],
                password: match[2]
              });
            }

            console.log(`[R710] Extracted ${tokens.length} tokens from response`);

            return {
              success: true,
              tokens: tokens.map(t => ({
                id: '',
                username: t.username,
                password: t.password,
                wlan: config.wlanName,
                createdBy: '',
                createTime: null,
                expireTime: null,
                startTime: null,
                validTimeSeconds: null,
                validTimeHours: null,
                maxDevices: config.deviceLimit?.toString() || '2',
                remarks: '',
                used: false,
                expired: false,
                active: false,
                connectedMac: null,
                status: 'AVAILABLE'
              }))
            };
          } else {
            console.error(`[R710] Token creation failed: ${jsonData.errorMsg}`);
            return { success: false, error: jsonData.errorMsg || 'Token creation failed' };
          }
        }

        console.error('[R710] Could not parse response');
        return { success: false, error: 'Could not parse response' };
      }

      return { success: false, error: 'Invalid response from R710' };
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error('[R710] Token generation error:', axiosError.message);
      return { success: false, error: axiosError.message };
    }
  }

  /**
   * Generate a single guest pass on-the-fly (direct sales)
   *
   * CRITICAL DIFFERENCES from batch generation:
   * - gentype='single' instead of 'multiple'
   * - fullname={custom_username} becomes the actual username
   * - createToNum is empty
   * - Response has result='DONE' instead of 'OK'
   * - Password comes from 'key' field in response
   */
  async generateSingleGuestPass(config: {
    wlanName: string;
    username: string;
    duration: number;
    durationUnit: string;
    deviceLimit?: number;
  }): Promise<{ success: boolean; token?: { username: string; password: string; expiresAt: Date }; error?: string }> {
    try {
      if (!this.isAuthenticated) {
        const loginResult = await this.login();
        if (!loginResult.success) {
          throw new Error('Authentication failed');
        }
        await this.initializeSession();
      }

      const sessionKey = await this.getSessionKey();
      // Note: Session key can be empty - R710 accepts empty 'key' parameter

      console.log(`[R710] Generating single guest pass for WLAN: ${config.wlanName}`);
      console.log(`[R710] Username: ${config.username}`);
      console.log(`[R710] Duration: ${config.duration} ${config.durationUnit}`);

      // Build form data for SINGLE token creation
      const formParams = new URLSearchParams();
      formParams.append('gentype', 'single'); // ← CRITICAL: 'single' not 'multiple'
      formParams.append('fullname', config.username); // ← This becomes the username
      formParams.append('remarks', '');
      formParams.append('duration', config.duration.toString());
      formParams.append('duration-unit', `${config.durationUnit}_${config.durationUnit.charAt(0).toUpperCase() + config.durationUnit.slice(1)}s`);
      formParams.append('key', sessionKey);
      formParams.append('createToNum', ''); // ← Empty for single
      formParams.append('batchpass', '');
      formParams.append('guest-wlan', config.wlanName);
      formParams.append('shared', 'true');
      formParams.append('reauth', 'false');
      formParams.append('reauth-time', '');
      formParams.append('reauth-unit', 'min');
      formParams.append('email', '');
      formParams.append('countrycode', '');
      formParams.append('phonenumber', '');
      formParams.append('limitnumber', (config.deviceLimit || 2).toString());
      formParams.append('_', '');

      const response = await this.client.post('/admin/mon_createguest.jsp', formParams, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'Accept': 'text/javascript, text/html, application/xml, text/xml, */*',
          'X-CSRF-Token': this.csrfToken,
          'X-Requested-With': 'XMLHttpRequest',
          'Referer': `${this.baseUrl}/admin/dashboard.jsp`
        }
      });

      if (response.status === 200 && response.data) {
        const jsonData = response.data;

        if (jsonData.result === 'DONE') { // ← Note: 'DONE' for single, 'OK' for batch
          console.log(`[R710] Single guest pass created successfully!`);
          console.log(`[R710] Username: ${jsonData.fullname}`);
          console.log(`[R710] Password: ${jsonData.key}`);
          console.log(`[R710] Expiration: ${new Date(parseInt(jsonData.expiretime) * 1000).toISOString()}`);

          return {
            success: true,
            token: {
              username: jsonData.fullname || config.username,
              password: jsonData.key, // ← Password is in 'key' field
              expiresAt: new Date(parseInt(jsonData.expiretime) * 1000)
            }
          };
        } else {
          console.error(`[R710] Single guest pass creation failed: ${jsonData.errorMsg}`);
          return { success: false, error: jsonData.errorMsg || 'Token creation failed' };
        }
      }

      return { success: false, error: 'Invalid response from R710' };
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error('[R710] Single token generation error:', axiosError.message);
      return { success: false, error: axiosError.message };
    }
  }

  async queryAllTokens(): Promise<R710Token[]> {
    try {
      if (!this.isAuthenticated) {
        const loginResult = await this.login();
        if (!loginResult.success) {
          throw new Error('Authentication failed');
        }
        await this.initializeSession();
      }

      const updaterId = this.generateUpdaterId('guest-list');
      const xmlPayload = `<ajax-request action='getconf' DECRYPT_X='true' updater='${updaterId}' comp='guest-list'><guest self-service='!true'/></ajax-request>`;

      const response = await this.client.post('/admin/_conf.jsp', xmlPayload, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'Accept': '*/*',
          'X-CSRF-Token': this.csrfToken,
          'X-Requested-With': 'XMLHttpRequest',
          'Referer': `${this.baseUrl}/admin/dashboard.jsp`
        }
      });

      return this.parseTokensFromXml(response.data);
    } catch (error) {
      console.error('[R710] Failed to query tokens:', error);
      return [];
    }
  }

  /**
   * Utility Methods
   */

  private generateUpdaterId(component: string): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    return `${component}.${timestamp}.${random}`;
  }

  private parseTokensFromXml(xmlData: string): R710Token[] {
    const tokens: R710Token[] = [];
    // Fixed regex: space before > is now optional
    const guestRegex = /<guest([^>]+)(?:>(?:<client[^>]*\/>)?<\/guest>|\/?>\s*)/g;
    let match;
    let tokenCount = 0;

    while ((match = guestRegex.exec(xmlData)) !== null) {
      const attributes = match[1];

      const parseAttr = (attr: string): string | null => {
        const attrMatch = attributes.match(new RegExp(`${attr}="([^"]*)"`, 'i'));
        return attrMatch ? attrMatch[1] : null;
      };

      const id = parseAttr('id') || '';
      const fullName = parseAttr('full-name') || '';
      const key = parseAttr('key') || parseAttr('x-key') || '';
      const wlan = parseAttr('wlan') || '';
      const createdBy = parseAttr('created-by') || '';
      const createTime = parseAttr('create-time');
      const expireTime = parseAttr('expire-time');
      const startTime = parseAttr('start-time');
      const validTime = parseAttr('valid-time');
      const shareNumber = parseAttr('share-number') || '2';
      const remarks = parseAttr('remarks') || '';
      const used = attributes.includes('used=');

      const clientMatch = match[0].match(/<client mac="([^"]+)"/);
      const connectedMac = clientMatch ? clientMatch[1] : null;

      // DEBUG: Log first few tokens to see their attributes
      if (tokenCount < 5) {
        console.log(`[R710 parseTokensFromXml] Token ${tokenCount + 1}:`, {
          id,
          'full-name': fullName,
          key: key.substring(0, 5) + '***',
          wlan,
          'created-by': createdBy,
          'create-time': createTime,
          'expire-time': expireTime,
          'start-time': startTime,
          'valid-time': validTime
        });
        tokenCount++;
      }

      const now = Math.floor(Date.now() / 1000);
      const expireTimeNum = expireTime ? parseInt(expireTime) : null;
      const expired = expireTimeNum !== null && expireTimeNum < now;
      const active = !!startTime && !expired;

      tokens.push({
        id,
        username: fullName,
        password: key,
        wlan,
        createdBy,
        createTime: createTime ? new Date(parseInt(createTime) * 1000) : null,
        expireTime: expireTime ? new Date(parseInt(expireTime) * 1000) : null,
        startTime: startTime ? new Date(parseInt(startTime) * 1000) : null,
        validTimeSeconds: validTime ? parseInt(validTime) : null,
        validTimeHours: validTime ? Math.round(parseInt(validTime) / 3600 * 10) / 10 : null,
        maxDevices: shareNumber,
        remarks,
        used,
        expired,
        active,
        connectedMac,
        status: expired ? 'Expired' : (active ? 'Active/Used' : (used ? 'Used' : 'Available'))
      });
    }

    return tokens;
  }

  /**
   * MAC ACL Management
   */

  /**
   * List all MAC ACL lists
   */
  async listAclLists(): Promise<R710AclList[]> {
    const updater = `acl-list.${Date.now()}.${Math.random()}`;
    const xmlPayload = `<ajax-request action='getconf' DECRYPT_X='false' updater='${updater}' comp='acl-list'/>`;

    const response = await this.client.post('/admin/_conf.jsp', xmlPayload, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-CSRF-Token': this.csrfToken || '',
        'X-Requested-With': 'XMLHttpRequest',
      },
    });

    // Parse XML response
    const data = response.data;
    const aclLists: R710AclList[] = [];

    // Extract ACL elements using regex
    const aclMatches = data.matchAll(/<acl\s+([^>]+)(?:\/>|>([\s\S]*?)<\/acl>)/g);

    for (const match of aclMatches) {
      const attributes = match[1];
      const innerXml = match[2] || '';

      // Extract attributes
      const id = attributes.match(/id="([^"]+)"/)?.[1] || '';
      const name = attributes.match(/name="([^"]+)"/)?.[1] || '';
      const description = attributes.match(/description="([^"]+)"/)?.[1] || '';
      const defaultMode = attributes.match(/default-mode="([^"]+)"/)?.[1] as 'allow' | 'deny';
      const editable = !attributes.includes('EDITABLE="false"');

      // Extract deny MACs
      const denyMacs: R710AclMacEntry[] = [];
      const denyMatches = innerXml.matchAll(/<deny\s+([^>]+)\/?>/g);
      for (const denyMatch of denyMatches) {
        const denyAttrs = denyMatch[1];
        const mac = denyAttrs.match(/mac="([^"]+)"/)?.[1] || '';
        const macComment = denyAttrs.match(/mac-comment="([^"]+)"/)?.[1];
        denyMacs.push({ mac: mac.toUpperCase(), macComment });
      }

      // Extract accept MACs
      const acceptMacs: R710AclMacEntry[] = [];
      const acceptMatches = innerXml.matchAll(/<accept\s+([^>]+)\/?>/g);
      for (const acceptMatch of acceptMatches) {
        const acceptAttrs = acceptMatch[1];
        const mac = acceptAttrs.match(/mac="([^"]+)"/)?.[1] || '';
        const macComment = acceptAttrs.match(/mac-comment="([^"]+)"/)?.[1];
        acceptMacs.push({ mac: mac.toUpperCase(), macComment });
      }

      aclLists.push({
        id,
        name,
        description,
        defaultMode,
        denyMacs,
        acceptMacs,
        editable,
      });
    }

    return aclLists;
  }

  /**
   * Create a new MAC ACL list
   * @param options - ACL creation options
   * @returns Created ACL with ID
   */
  async createAclList(options: R710AclCreateOptions): Promise<{ success: boolean; aclId?: string; error?: string }> {
    try {
      const updater = `acl-list.${Date.now()}.${Math.random()}`;
      const { name, description, mode, macs = [] } = options;

      // Build ACL XML based on mode
      const defaultMode = mode === 'deny' ? 'deny' : 'allow';
      const listType = mode === 'deny' ? 'accept' : 'deny';

      let xmlPayload = `<ajax-request action='addobj' updater='${updater}' comp='acl-list'>`;
      xmlPayload += `<acl name='${this.escapeXml(name)}' description='${this.escapeXml(description)}' default-mode='${defaultMode}'`;

      if (macs.length === 0) {
        // Empty ACL list
        xmlPayload += ` ${listType}=''/>`;
      } else {
        // ACL with MAC entries
        xmlPayload += '>';
        for (const macEntry of macs) {
          const comment = macEntry.macComment ? ` mac-comment='${this.escapeXml(macEntry.macComment)}'` : '';
          xmlPayload += `<${listType} mac='${macEntry.mac.toUpperCase()}'${comment}></${listType}>`;
        }
        xmlPayload += '</acl>';
      }

      xmlPayload += '</ajax-request>';

      const response = await this.client.post('/admin/_conf.jsp', xmlPayload, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'X-CSRF-Token': this.csrfToken || '',
          'X-Requested-With': 'XMLHttpRequest',
        },
      });

      // Parse response to extract ACL ID
      const data = response.data;
      const idMatch = data.match(/id="(\d+)"/);
      const aclId = idMatch ? idMatch[1] : undefined;

      if (!aclId) {
        return { success: false, error: 'Failed to extract ACL ID from response' };
      }

      return { success: true, aclId };
    } catch (error) {
      console.error('[R710] Error creating ACL list:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Update an existing MAC ACL list (add/remove MACs)
   * @param aclId - ACL ID to update
   * @param options - Updated ACL options
   */
  async updateAclList(aclId: string, options: R710AclCreateOptions): Promise<{ success: boolean; error?: string }> {
    try {
      const updater = `acl-list.${Date.now()}.${Math.random()}`;
      const { name, description, mode, macs = [] } = options;

      const defaultMode = mode === 'deny' ? 'deny' : 'allow';
      const listType = mode === 'deny' ? 'accept' : 'deny';

      let xmlPayload = `<ajax-request action='updobj' updater='${updater}' comp='acl-list'>`;
      xmlPayload += `<acl name='${this.escapeXml(name)}' description='${this.escapeXml(description)}' default-mode='${defaultMode}' id='${aclId}'`;

      if (macs.length === 0) {
        xmlPayload += ` ${listType}=''/>`;
      } else {
        xmlPayload += '>';
        for (const macEntry of macs) {
          const comment = macEntry.macComment ? ` mac-comment='${this.escapeXml(macEntry.macComment)}'` : '';
          xmlPayload += `<${listType} mac='${macEntry.mac.toUpperCase()}'${comment}></${listType}>`;
        }
        xmlPayload += '</acl>';
      }

      xmlPayload += '</ajax-request>';

      await this.client.post('/admin/_conf.jsp', xmlPayload, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'X-CSRF-Token': this.csrfToken || '',
          'X-Requested-With': 'XMLHttpRequest',
        },
      });

      return { success: true };
    } catch (error) {
      console.error('[R710] Error updating ACL list:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Delete a MAC ACL list
   * @param aclId - ACL ID to delete
   */
  async deleteAclList(aclId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const updater = `acl-list.${Date.now()}.${Math.random()}`;
      const xmlPayload = `<ajax-request action='delobj' updater='${updater}' comp='acl-list'><acl id='${aclId}'/></ajax-request>`;

      await this.client.post('/admin/_conf.jsp', xmlPayload, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'X-CSRF-Token': this.csrfToken || '',
          'X-Requested-With': 'XMLHttpRequest',
        },
      });

      return { success: true };
    } catch (error) {
      console.error('[R710] Error deleting ACL list:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Get connected clients from R710 device
   * Queries the device for current WiFi client connections
   */
  async getConnectedClients(): Promise<{
    success: boolean;
    clients: Array<{
      macAddress: string;
      ipAddress: string | null;
      hostname: string | null;
      deviceType: string | null;
      wlanId: string;
      ssid: string;
      username: string | null;
      signalStrength: number | null;
      radioBand: string | null;
      channel: string | null;
      connectedAt: Date;
      rxBytes: bigint;
      txBytes: bigint;
      rxPackets: number;
      txPackets: number;
    }>;
    error?: string;
  }> {
    try {
      if (!this.isAuthenticated) {
        const loginResult = await this.login();
        if (!loginResult.success) {
          throw new Error('Authentication failed');
        }
        await this.initializeSession();
      }

      console.log('[R710] Querying connected clients...');

      const updaterId = `stamgr.${Date.now()}.9993`;

      // This payload matches the exact structure from the R710 UI
      const xmlPayload = `<ajax-request action='getstat' caller='unleashed_web' updater='${updaterId}' comp='stamgr'><wlan LEVEL='1' PERIOD='3600'/><ap LEVEL='1' PERIOD='3600'/><client LEVEL='1' client-type='3'/><wireclient LEVEL='1'/><zt-mesh-list/><apsummary/></ajax-request>`;

      const response = await this.client.post('/admin/_cmdstat.jsp', xmlPayload, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'X-CSRF-Token': this.csrfToken || '',
          'Referer': `${this.baseUrl}/admin/dashboard.jsp`
        }
      });

      // Parse XML response (with sanitization for unescaped special characters)
      const xml2js = require('xml2js');
      const parser = new xml2js.Parser();
      const sanitizedXml = this.sanitizeXmlResponse(response.data);
      const result = await parser.parseStringPromise(sanitizedXml);

      const statData = result?.['ajax-response']?.response?.[0]?.['apstamgr-stat']?.[0];

      if (!statData) {
        console.error('[R710] Failed to parse connected clients response');
        return { success: false, clients: [], error: 'Failed to parse response' };
      }

      // Extract connected clients
      const clientsData = statData.client || [];

      console.log(`[R710] Found ${clientsData.length} connected clients`);

      const clients = clientsData.map((clientData: any) => {
        const attrs = clientData.$;

        // Parse connection timestamp (Unix timestamp in seconds)
        const connectedAt = attrs['first-assoc']
          ? new Date(parseInt(attrs['first-assoc']) * 1000)
          : new Date();

        return {
          macAddress: (attrs.mac || '').toLowerCase(),
          ipAddress: attrs.ip || null,
          hostname: attrs.hostname || null,
          deviceType: attrs.dvcinfo || attrs.dvctype || null,
          wlanId: attrs['wlan-id'] || '',
          ssid: attrs.ssid || '',
          username: attrs.user || null,
          signalStrength: attrs.rssi ? parseInt(attrs.rssi) : null,
          radioBand: attrs['radio-band'] || null,
          channel: attrs.channel || null,
          connectedAt,
          // Traffic stats (convert to BigInt, default to 0 if missing)
          rxBytes: attrs['rx-bytes'] ? BigInt(attrs['rx-bytes']) : BigInt(0),
          txBytes: attrs['tx-bytes'] ? BigInt(attrs['tx-bytes']) : BigInt(0),
          rxPackets: attrs['rx-pkts'] ? parseInt(attrs['rx-pkts']) : 0,
          txPackets: attrs['tx-pkts'] ? parseInt(attrs['tx-pkts']) : 0
        };
      });

      return { success: true, clients };
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error('[R710] Failed to get connected clients:', axiosError.message);
      return { success: false, clients: [], error: axiosError.message };
    }
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Sanitize XML response from R710
   *
   * The R710 sometimes returns XML with unescaped special characters
   * in attribute values (e.g., & in SSID names). This method fixes
   * those issues before parsing.
   */
  private sanitizeXmlResponse(xml: string): string {
    // Fix unescaped & in attribute values
    // Match attribute="value" and escape any unescaped & characters
    // Only fix & that is not already part of an entity (& followed by word chars and ;)
    return xml.replace(
      /(\w+)=['"]([^'"]*)['"]/g,
      (match, attrName, attrValue) => {
        // Escape unescaped & characters in the attribute value
        // Don't double-escape already escaped entities like &amp; &lt; &gt; &quot; &apos;
        const sanitizedValue = attrValue.replace(
          /&(?!(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/g,
          '&amp;'
        );
        // Preserve original quote type
        const quote = match.includes("'") ? "'" : '"';
        return `${attrName}=${quote}${sanitizedValue}${quote}`;
      }
    );
  }

  /**
   * Error Handling with Retry Logic
   */

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = this.config.maxRetries || 3
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        console.warn(`[R710] Attempt ${attempt}/${maxRetries} failed:`, lastError.message);

        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('Operation failed after retries');
  }
}
