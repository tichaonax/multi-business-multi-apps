# Ruckus R710 Login Discovery - Test Results

**Date:** 2025-12-24
**Firmware:** 200.15.6.12.304
**Device:** https://192.168.0.108

---

## 🔍 Test Methods Attempted

We tested 5 different authentication methods to discover the correct login endpoint:

### Method 1: Form-based POST with Query Parameters
- **Endpoint:** `POST /admin/login.jsp?username=admin&password=***`
- **Result:** ❌ Failed - Returned login page (X-Auth: Unauthorized)
- **Cookies:** ✅ Received session cookie (`-ejs-session-`)

### Method 2: URLSearchParams POST
- **Endpoint:** `POST /admin/login.jsp` (body: `username=admin&password=***`)
- **Result:** ❌ Failed - Returned login page
- **Cookies:** ✅ Session cookie persisted

### Method 3: Command-based JSON POST
- **Endpoint:** `POST /admin/_wla_cmdstat.jsp`
- **Payload:** `{com: "system", action: "login", username: "admin", password: "***"}`
- **Result:** ❌ Failed - Returned login page
- **Cookies:** ✅ Session cookie persisted

### Method 4: GET then POST (CSRF check)
- **Endpoint:** `GET /admin/login.jsp` then `POST /admin/login.jsp`
- **Result:** ❌ Failed - Returned login page
- **Cookies:** ✅ Session cookie persisted
- **Finding:** Form action is `login.jsp` (relative path)
- **Finding:** No CSRF token found in HTML

### Method 5: Test Session Validity
- **Endpoint:** `GET /admin/_cmdstat.jsp`
- **Result:** ❌ Not authenticated (returned login page)
- **Cookies:** ✅ Session cookie present

---

## 📦 Key Findings

### 1. Session Cookie Behavior
✅ **Cookie Name:** `-ejs-session-`
✅ **Domain:** 192.168.0.108
✅ **Path:** /
✅ **Flags:** Secure, HttpOnly
✅ **Persistence:** Cookie is set on first request and persists across all requests

**Example Cookie:**
```
-ejs-session-=xca837932c9c206ca21b47f5c2b766ec9; path=/; httponly; secure
```

### 2. Response Pattern
All failed login attempts return:
- **Status Code:** 200 OK
- **Content-Type:** text/html
- **Header:** `X-Auth: Unauthorized`
- **Body:** Full login page HTML (Unleashed Login)

### 3. Login Page Structure
From the HTML response, we observed:
- **Form Action:** `login.jsp` (relative path to `/admin/login.jsp`)
- **NO CSRF Token:** No visible CSRF token in the HTML
- **JavaScript-Based:** Login likely handled by JavaScript bundle
- **React Application:** The UI appears to be a React SPA

---

## 🚨 **CRITICAL FINDING**

**None of the traditional HTTP POST methods worked!**

This suggests the login is handled differently:

### Hypothesis 1: JavaScript-Based Auth (Most Likely)
The captured `webpackJsonp-login.js` file shows React components handling login.
Login likely happens via:
1. JavaScript captures form submission
2. Makes XHR/fetch request to a **different endpoint**
3. Processes JSON response
4. Stores auth token or triggers redirect

### Hypothesis 2: The Login Endpoint is Different
The actual login endpoint might be:
- `/admin/` (not `/admin/login.jsp`)
- `/forms/login` or similar
- A REST API endpoint like `/api/login`

### Hypothesis 3: Additional Parameters Required
The login might require:
- A session token from GET request
- A specific `Content-Type` header
- Form data in a specific format
- JavaScript-generated token

---

## 🎯 **NEXT STEPS: Browser Network Capture Required**

To discover the actual login endpoint, we MUST:

### Step 1: Open Browser DevTools
1. Open Chrome/Firefox
2. Open DevTools (F12)
3. Go to **Network** tab
4. Enable **Preserve log**
5. Filter to **XHR** or **Fetch**

### Step 2: Perform Login
1. Navigate to https://192.168.0.108/admin/login.jsp
2. Enter username: `admin`
3. Enter password: `HelloMotto`
4. Click "Login"

### Step 3: Capture the Request
Look for the actual login request in Network tab:
- **URL:** What endpoint does it POST to?
- **Method:** POST, PUT, etc.?
- **Headers:** What headers are sent?
- **Payload:** What's in the request body?
- **Response:** What does the server return?

### Step 4: Document Findings
Once we have the actual login request, we'll:
1. Replicate it exactly in our test script
2. Test authentication success
3. Verify session cookie grants access
4. Document the working auth flow

---

## 📁 Log File
Full request/response details captured in:
```
logs/ruckus-api-requests-2025-12-25.log
```

---

## 🔍 What We Learned

### ✅ Successes:
- HTTP client and cookie jar working correctly
- Session cookies being captured and replayed
- Request/response logging working perfectly
- Tested multiple authentication methods systematically

### ❌ Challenges:
- Traditional form-based auth not working
- Command-based auth not working
- No obvious auth endpoint in HTML
- JavaScript-based UI makes discovery harder

### 🎓 Insights:
- Ruckus Unleashed uses JavaScript-heavy UI
- Login is likely XHR/fetch based (not form POST)
- Browser DevTools capture is essential
- React SPA makes endpoint discovery non-trivial

---

## 📌 Status

**Current Status:** ⏸️ Awaiting browser capture of actual login request

**Blocker:** Need to see the real login XHR/fetch request from browser

**Next Task:** User to perform login in browser with DevTools open and provide:
- Login request URL
- Login request headers
- Login request payload
- Login response format

Once we have this data, we can proceed to Step 3 (Guest WLAN API discovery).

---

**Last Updated:** 2025-12-24
**Test Script:** `scripts/ruckus-api-discovery/test-login.js`
