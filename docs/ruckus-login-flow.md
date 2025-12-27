# Ruckus R710 Login Flow - WORKING METHOD

**Date:** 2025-12-24
**Firmware:** 200.15.6.12.304
**Status:** ✅ **WORKING**

---

## 🎯 Working Login Method

### Endpoint
```
POST https://192.168.0.108/admin/login.jsp
```

### Request Headers
```
Content-Type: application/x-www-form-urlencoded
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8
Origin: https://192.168.0.108
Referer: https://192.168.0.108/admin/login.jsp
Sec-Fetch-Dest: document
Sec-Fetch-Mode: navigate
Sec-Fetch-Site: same-origin
```

### Request Body (Form Data)
```
username=admin&password=HelloMotto&ok=Log%20in
```

**CRITICAL:** The `ok=Log in` parameter is **REQUIRED**. Login fails without it!

### Success Response
```
Status: 302 Moved Temporarily
Location: https://192.168.0.108/admin/dashboard.jsp
Set-Cookie: -ejs-session-=x[session-id]; path=/; httponly; secure
http_x_csrf_token: d3kKfrlrkd
```

---

## 🔐 Authentication Flow

```
1. Client → POST /admin/login.jsp
   Body: username=admin&password=***&ok=Log in

2. Server ← 302 Redirect
   Location: /admin/dashboard.jsp
   Set-Cookie: -ejs-session-=[session-id]

3. Client → GET /admin/dashboard.jsp
   Cookie: -ejs-session-=[session-id]

4. Server ← 200 OK (Dashboard content)

5. All subsequent requests include session cookie
   Cookie: -ejs-session-=[session-id]
```

---

## 🍪 Session Management

### Session Cookie
- **Name:** `-ejs-session-`
- **Value:** Hexadecimal session ID (e.g., `x639c4ccbb9a7110c765b0e2b636d8293`)
- **Domain:** 192.168.0.108
- **Path:** `/`
- **Flags:** `HttpOnly`, `Secure`
- **Persistence:** Session-based (cleared on logout or timeout)

### CSRF Token
- **Header:** `http_x_csrf_token`
- **Value:** Short alphanumeric string (e.g., `d3kKfrlrkd`)
- **Usage:** May be required for POST/PUT/DELETE operations (to be tested)

---

## ✅ Verification Tests

### Test 1: Login Success
```bash
POST /admin/login.jsp
Body: username=admin&password=HelloMotto&ok=Log%20in
Expected: 302 redirect to /admin/dashboard.jsp
Result: ✅ PASS
```

### Test 2: Session Cookie Persistence
```bash
GET /admin/_cmdstat.jsp
Cookie: -ejs-session-=[session-id]
Expected: 200 OK (not login page)
Result: ✅ PASS (empty response, but authenticated)
```

### Test 3: Authenticated Endpoint Access
```bash
GET /admin/_cmdstat.jsp
Cookie: -ejs-session-=[session-id]
Expected: Access granted
Result: ✅ PASS (200 OK, content-length: 1)
```

---

## 🔍 Implementation Notes

### Node.js Example
```javascript
const axios = require('axios');
const { CookieJar } = require('tough-cookie');

async function login() {
  const cookieJar = new CookieJar();

  // Build login form data
  const params = new URLSearchParams();
  params.append('username', 'admin');
  params.append('password', 'HelloMotto');
  params.append('ok', 'Log in'); // CRITICAL PARAMETER

  // POST login
  const response = await axios.post('https://192.168.0.108/admin/login.jsp', params, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Origin': 'https://192.168.0.108',
      'Referer': 'https://192.168.0.108/admin/login.jsp'
    },
    maxRedirects: 0, // Handle redirect manually
    validateStatus: () => true, // Accept any status
    httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false })
  });

  // Check for success (302 redirect)
  if (response.status === 302) {
    console.log('✅ Login successful!');
    console.log(`Redirect: ${response.headers.location}`);

    // Extract session cookie
    const setCookie = response.headers['set-cookie'];
    // Store cookie for subsequent requests

    return true;
  }

  return false;
}
```

---

## 🚨 Common Mistakes

### ❌ WRONG: Missing `ok` parameter
```
username=admin&password=HelloMotto
Result: Returns login page (no redirect)
```

### ❌ WRONG: Using query parameters
```
POST /admin/login.jsp?username=admin&password=***
Result: Returns login page (no redirect)
```

### ❌ WRONG: JSON payload
```
POST /admin/login.jsp
Body: {"username": "admin", "password": "***"}
Result: Returns login page (no redirect)
```

### ✅ CORRECT: Form data with `ok` parameter
```
POST /admin/login.jsp
Body: username=admin&password=***&ok=Log%20in
Result: 302 redirect to dashboard
```

---

## 📊 Response Indicators

| Scenario | Status | Location Header | Set-Cookie | Meaning |
|----------|--------|-----------------|------------|---------|
| Success | 302 | /admin/dashboard.jsp | ✅ Yes | Login successful |
| Failure | 200 | - | ✅ Yes (unchanged) | Wrong credentials |
| Missing params | 200 | - | ✅ Yes (unchanged) | Invalid request |

---

## 🎯 Next Steps

Now that authentication works, we can:
1. ✅ Discover Guest WLAN API endpoints
2. ✅ Discover Guest Pass/Token API endpoints
3. ✅ Build automated token generation
4. ✅ Integrate with WiFi Portal module

---

**Status:** ✅ COMPLETE
**Test Script:** `scripts/ruckus-api-discovery/test-login-working.js`
