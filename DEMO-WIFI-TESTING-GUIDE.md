# WiFi Portal Testing Guide

**Last Updated:** 2026-01-02
**Version:** 1.0
**Purpose:** Comprehensive testing guide for ESP32 and R710 WiFi portal integrations

---

## 📚 Table of Contents

- [Overview](#overview)
- [ESP32 WiFi Portal Testing](#esp32-wifi-portal-testing)
- [R710 WiFi Portal Testing](#r710-wifi-portal-testing)
- [POS Integration Testing](#pos-integration-testing)
- [Common Testing Scenarios](#common-testing-scenarios)
- [Troubleshooting](#troubleshooting)

---

## Overview

The Multi-Business Management System supports two WiFi portal systems:

| System | Businesses | Integration Type | Token Format |
|--------|-----------|------------------|--------------|
| **ESP32** | Restaurant, Grocery | Direct device integration | Username/Password |
| **R710** | Hardware, Clothing | Ruckus controller API | Username/Password |

**Key Features:**
- Token package configuration
- Token sales through POS
- Direct token sales (R710 only)
- Automatic device synchronization
- Token expiration management
- Receipt printing support

---

## ESP32 WiFi Portal Testing

### Prerequisites

**Test Accounts:**
- **Restaurant Manager:** sarah.johnson@restaurant-demo.com (Password: Demo@123)
- **Grocery Manager:** james.brown@grocery-demo.com (Password: Demo@123)

**Demo Data Required:**
```bash
POST /api/admin/seed-wifi-esp32
```

**Expected Data:**
- 4 token configurations (Restaurant & Grocery)
- 30 active tokens
- 11 token sales through POS

---

### Test 1: View Token Configurations

**Objective:** Verify token package configurations display correctly

**Steps:**
1. Login as Restaurant manager (sarah.johnson@restaurant-demo.com)
2. Navigate to `/wifi-portal/setup`
3. Verify token configs display

**Expected Results:**
- ✅ See list of token configurations
- ✅ Each config shows: name, duration, bandwidth, price
- ✅ "Create Token Config" button visible
- ✅ Edit/Delete buttons on each config

**Sample Data:**
| Name | Duration | Bandwidth | Price |
|------|----------|-----------|-------|
| 1 Hour Basic | 60 min | 10 MB/s | $3.00 |
| 4 Hour Standard | 240 min | 25 MB/s | $10.00 |
| 1 Day Premium | 1440 min | 50 MB/s | $25.00 |
| 1 Week Unlimited | 10080 min | 100 MB/s | $75.00 |

---

### Test 2: Create New Token Configuration

**Objective:** Create a custom token package

**Steps:**
1. Navigate to `/wifi-portal/setup`
2. Click "Create Token Config"
3. Fill in the form:
   - **Name:** "2 Hour Coffee Shop"
   - **Duration:** 120 minutes
   - **Bandwidth:** 15 MB/s
   - **Price:** $5.00
   - **SSID:** "Restaurant-Guest-WiFi"
   - **Device Limit:** 2
4. Click "Save"

**Expected Results:**
- ✅ Success message displays
- ✅ New config appears in list
- ✅ Config is available in POS
- ✅ ESP32 device syncs automatically

**Validation:**
```bash
# Check token config was created
GET /api/wifi-portal/token-configs?businessId=restaurant-demo-business
```

---

### Test 3: Generate Tokens from Configuration

**Objective:** Bulk generate tokens for a package

**Steps:**
1. Navigate to `/wifi-portal/tokens`
2. Click "Generate Tokens"
3. Select token configuration: "1 Hour Basic"
4. Enter quantity: 10
5. Click "Generate"

**Expected Results:**
- ✅ Success message: "10 tokens generated"
- ✅ Tokens appear with status "Active"
- ✅ Each token has unique username/password
- ✅ Tokens show expiration date
- ✅ ESP32 device receives sync update

**Validation:**
- Check `/wifi-portal/tokens` page shows new tokens
- Verify token count increased by 10
- Check ESP32 sync logs for update

---

### Test 4: Token Sales Through Restaurant POS

**Objective:** Sell WiFi tokens through point of sale

**Steps:**
1. Navigate to `/restaurant/pos`
2. Click "WiFi Tokens" tab
3. Select "1 Hour Basic" package
4. Add to cart (quantity: 2)
5. Click "Complete Sale"
6. Select payment method: Cash
7. Print receipt (optional)

**Expected Results:**
- ✅ WiFi tokens appear in cart
- ✅ Correct price displayed ($3.00 × 2 = $6.00)
- ✅ Sale completes successfully
- ✅ 2 tokens marked as "Sold"
- ✅ Receipt shows WiFi credentials
- ✅ Order recorded with WiFi items

**Receipt Validation:**
```
========== WIFI TOKEN ==========
Network: Restaurant-Guest-WiFi
Username: wifi_user_001
Password: SecurePass123
Duration: 1 Hour
Speed: 10 MB/s
Expires: 2026-01-02 23:45
================================
```

---

### Test 5: Token Expiration and Status

**Objective:** Verify token status transitions

**Steps:**
1. Navigate to `/wifi-portal/tokens`
2. Filter by status: "Active"
3. Note token expiration dates
4. Check tokens past expiration

**Expected Results:**
- ✅ Active tokens show future expiration
- ✅ Expired tokens marked as "Expired"
- ✅ Sold tokens marked as "Sold"
- ✅ Used tokens marked as "Used"

**Status Definitions:**
- **Active:** Available for sale/use
- **Sold:** Purchased but not yet activated
- **Used:** Currently in use on ESP32
- **Expired:** Past expiration date
- **Revoked:** Manually disabled

---

### Test 6: ESP32 Device Synchronization

**Objective:** Verify automatic sync with ESP32 devices

**Steps:**
1. Create new token configuration
2. Generate 5 tokens
3. Check ESP32 sync status at `/wifi-portal/devices`
4. Verify device received updates

**Expected Results:**
- ✅ ESP32 device shows "Connected" status
- ✅ Last sync time updates automatically
- ✅ Device shows correct token count
- ✅ Token configurations synced
- ✅ Green status indicator

**Manual Sync:**
- Click "Force Sync" button
- Verify sync completes in <5 seconds
- Check updated timestamp

**Validation Endpoint:**
```bash
GET /api/wifi-portal/esp32/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "devices": [
    {
      "businessId": "restaurant-demo-business",
      "connected": true,
      "lastSync": "2026-01-02T22:30:00Z",
      "tokenCount": 35
    }
  ]
}
```

---

## R710 WiFi Portal Testing

### Prerequisites

**Test Accounts:**
- **Hardware Manager:** thomas.anderson@hardware-demo.com (Password: Demo@123)
- **Clothing Manager:** miro.hwandaza@clothing-demo.com (Password: Demo@123)

**Demo Data Required:**
```bash
POST /api/admin/seed-wifi-r710
```

**Expected Data:**
- 3 token configurations (Hardware & Clothing)
- 18 active tokens
- 5 direct sales transactions

**R710 Controller Access:**
- URL: Configure in `/r710-portal/setup`
- Requires R710 API credentials

---

### Test 1: R710 Integration Setup

**Objective:** Configure R710 controller connection

**Steps:**
1. Login as Hardware manager (thomas.anderson@hardware-demo.com)
2. Navigate to `/r710-portal/setup`
3. Click "Configure R710 Integration"
4. Enter configuration:
   - **Controller IP:** 192.168.1.100
   - **Username:** admin
   - **Password:** [R710 password]
   - **Zone Name:** Main-Zone
5. Click "Test Connection"
6. Click "Save"

**Expected Results:**
- ✅ Connection test succeeds
- ✅ Integration marked as "Connected"
- ✅ WLAN list loads from controller
- ✅ Green status indicator

**Troubleshooting:**
- Ensure R710 controller is accessible
- Check firewall rules
- Verify credentials are correct
- Check network connectivity

---

### Test 2: WLAN Configuration Management

**Objective:** Manage guest WiFi WLAN settings

**Steps:**
1. Navigate to `/r710-portal/wlans`
2. View existing WLANs
3. Click "Create WLAN"
4. Configure new WLAN:
   - **SSID:** "Hardware-Store-Guest"
   - **Authentication:** Open
   - **Bandwidth Limit:** 50 MB/s
   - **Enable Zero-IT:** Yes
5. Click "Save & Sync to R710"

**Expected Results:**
- ✅ WLAN created in database
- ✅ WLAN pushed to R710 controller
- ✅ WLAN appears in controller's WLAN list
- ✅ Success confirmation message

**Validation:**
```bash
GET /api/r710/wlans?businessId=hardware-demo-business
```

---

### Test 3: Create R710 Token Packages

**Objective:** Configure token packages for R710

**Steps:**
1. Navigate to `/r710-portal/token-configs`
2. Click "Create Package"
3. Configure package:
   - **Name:** "Daily Access Pass"
   - **Duration:** 24 hours
   - **Bandwidth:** 30 MB/s
   - **Price:** $15.00
   - **WLAN:** Hardware-Store-Guest
   - **Device Limit:** 3
   - **Auto-expire:** Yes
4. Click "Save"

**Expected Results:**
- ✅ Package created successfully
- ✅ Available for token generation
- ✅ Shows in POS integration
- ✅ Display in sales dashboard

---

### Test 4: Direct Token Sales (R710-Specific)

**Objective:** Sell tokens directly through R710 portal

**Steps:**
1. Navigate to `/r710-portal/sales`
2. Select package: "Daily Access Pass"
3. Enter customer name (optional): "John Doe"
4. Click "Generate & Sell"
5. Select payment method: Credit Card
6. Enter amount: $15.00
7. Click "Complete Sale"

**Expected Results:**
- ✅ Token generated on R710 controller
- ✅ Payment recorded
- ✅ Receipt displays WiFi credentials
- ✅ Token marked as "Sold"
- ✅ Business balance updated
- ✅ Expense account credited

**Receipt Format:**
```
========== R710 WIFI TOKEN ==========
Network: Hardware-Store-Guest
Username: r710_user_045
Password: R710Pass@789
Duration: 24 Hours
Speed: 30 MB/s
Device Limit: 3 devices
Expires: 2026-01-03 22:45
====================================
```

---

### Test 5: Token Sales Through Hardware POS

**Objective:** Sell R710 tokens via point of sale

**Steps:**
1. Navigate to `/hardware/pos`
2. Click "WiFi Tokens" tab (R710 section)
3. Add "Daily Access Pass" to cart
4. Add regular product to cart (test mixed cart)
5. Click "Checkout"
6. Select payment: Cash
7. Print receipt

**Expected Results:**
- ✅ R710 token appears in cart
- ✅ Correct price ($15.00)
- ✅ Mixed cart (products + WiFi) works
- ✅ Sale completes successfully
- ✅ Token credentials generated
- ✅ Receipt shows both product and WiFi details

---

### Test 6: R710 Token Request Feature

**Objective:** Allow customers to request tokens for manager approval

**Steps:**
1. Navigate to `/hardware/pos` as Sales staff
2. Click "Request WiFi Token"
3. Select package: "Daily Access Pass"
4. Enter reason: "Customer at checkout needs WiFi"
5. Submit request
6. **Manager:** Check `/r710-portal/requests`
7. **Manager:** Approve request
8. **Sales:** Generate token from approved request

**Expected Results:**
- ✅ Request submitted successfully
- ✅ Manager sees pending request
- ✅ Approval/rejection workflow works
- ✅ Approved request generates token
- ✅ Notification to requestor

---

### Test 7: Bulk Token Generation (R710)

**Objective:** Pre-generate tokens for busy periods

**Steps:**
1. Navigate to `/r710-portal/tokens`
2. Click "Bulk Generate"
3. Select package: "Daily Access Pass"
4. Enter quantity: 25
5. Click "Generate"
6. Wait for completion

**Expected Results:**
- ✅ Progress indicator shows generation
- ✅ 25 tokens created on R710
- ✅ All tokens have unique credentials
- ✅ Tokens marked as "Active"
- ✅ Success message with count
- ✅ R710 controller updated

**Performance:**
- Should complete in <30 seconds for 25 tokens
- Progress updates every 5 tokens

---

### Test 8: R710 WLAN Synchronization

**Objective:** Verify WLAN config syncs to controller

**Steps:**
1. Navigate to `/r710-portal/wlans`
2. Edit existing WLAN "Hardware-Store-Guest"
3. Change bandwidth limit: 50 MB/s → 75 MB/s
4. Click "Save & Sync"
5. Verify on R710 controller web interface

**Expected Results:**
- ✅ Update saved to database
- ✅ API call to R710 succeeds
- ✅ R710 controller shows new limit
- ✅ Active tokens unaffected
- ✅ Success notification

**Manual Verification:**
- Login to R710 web interface
- Navigate to WLANs section
- Confirm bandwidth limit updated

---

## POS Integration Testing

### Test 1: WiFi Token Tab Visibility

**Objective:** Verify WiFi tab shows only for integrated businesses

**Business-Specific Tests:**

**Restaurant (ESP32):**
1. Navigate to `/restaurant/pos`
2. Verify "WiFi Tokens" tab visible
3. Click tab, verify ESP32 packages display

**Grocery (ESP32):**
1. Navigate to `/grocery/pos`
2. Verify "WiFi Tokens" tab visible
3. Click tab, verify ESP32 packages display

**Hardware (R710):**
1. Navigate to `/hardware/pos`
2. Verify "WiFi Tokens" tab visible
3. Click tab, verify R710 packages display

**Clothing (R710):**
1. Navigate to `/clothing/pos`
2. Verify "WiFi Tokens" tab visible
3. Click tab, verify R710 packages display

---

### Test 2: Mixed Cart (Products + WiFi)

**Objective:** Process order with both products and WiFi tokens

**Steps:**
1. Navigate to `/restaurant/pos`
2. Add regular menu items:
   - Burger ($12.00)
   - Fries ($4.00)
3. Switch to "WiFi Tokens" tab
4. Add "1 Hour Basic" ($3.00)
5. Verify cart totals
6. Complete sale

**Expected Results:**
- ✅ Cart shows all items (food + WiFi)
- ✅ Subtotal: $19.00
- ✅ Tax calculated correctly
- ✅ Payment processes
- ✅ Receipt shows all items
- ✅ WiFi credentials printed

---

### Test 3: WiFi Token Receipt Printing

**Objective:** Verify receipt includes WiFi credentials

**Steps:**
1. Complete WiFi token sale
2. Select "Print Receipt"
3. Choose receipt type: "Customer Copy"
4. Print to thermal printer

**Expected Receipt Sections:**
```
ACME RESTAURANT
123 Main Street
(555) 123-4567

Order #1234
Date: 2026-01-02 22:45

--- ITEMS ---
Burger                    $12.00
Fries                      $4.00

--- WIFI TOKENS ---
========== WIFI TOKEN ==========
Network: Restaurant-Guest-WiFi
Username: wifi_user_123
Password: SecurePass456
Duration: 1 Hour
Speed: 10 MB/s
Expires: 2026-01-02 23:45
================================

Subtotal:                 $16.00
Tax:                       $1.28
Total:                    $17.28

Payment: Cash             $20.00
Change:                    $2.72

Thank you!
```

---

### Test 4: WiFi Sales Reporting

**Objective:** Verify WiFi sales appear in reports

**Steps:**
1. Complete several WiFi token sales
2. Navigate to `/restaurant/reports/sales`
3. Filter by date range
4. Check for WiFi token line items

**Expected Results:**
- ✅ WiFi tokens show as order items
- ✅ Revenue attributed correctly
- ✅ Quantity tracking accurate
- ✅ Salesperson commission calculated
- ✅ Expense account updated

---

## Common Testing Scenarios

### Scenario 1: End-to-End WiFi Token Sale (ESP32)

**Business:** Restaurant
**Duration:** ~5 minutes

**Complete Flow:**
1. **Setup:** Manager creates token config
2. **Generation:** Generate 10 tokens
3. **POS Sale:** Sales staff sells 2 tokens
4. **Payment:** Customer pays cash
5. **Receipt:** Print customer receipt with credentials
6. **Verification:** Check ESP32 sync status
7. **Reporting:** Verify sale in reports

**Success Criteria:**
- ✅ All steps complete without errors
- ✅ Customer receives working credentials
- ✅ Revenue properly recorded
- ✅ ESP32 device updated

---

### Scenario 2: End-to-End WiFi Token Sale (R710)

**Business:** Hardware
**Duration:** ~5 minutes

**Complete Flow:**
1. **Setup:** Manager configures R710 integration
2. **WLAN:** Create guest network WLAN
3. **Package:** Create token package
4. **Direct Sale:** Sell token through R710 portal
5. **Receipt:** Print receipt with credentials
6. **Verification:** Check R710 controller
7. **Reporting:** Verify transaction recorded

**Success Criteria:**
- ✅ R710 integration working
- ✅ Token created on controller
- ✅ Customer receives credentials
- ✅ Payment recorded correctly

---

### Scenario 3: Peak Period Token Management

**Objective:** Handle high-volume token sales

**Setup:**
1. Pre-generate 50 tokens for popular package
2. Configure POS for fast checkout
3. Set up thermal printer for receipts

**Test:**
1. Process 10 consecutive WiFi token sales
2. Mix of single and multiple token purchases
3. Various payment methods
4. All with receipt printing

**Performance Targets:**
- ✅ Each sale completes in <30 seconds
- ✅ No sync delays with ESP32/R710
- ✅ Receipt prints immediately
- ✅ No token conflicts
- ✅ Accurate inventory tracking

---

### Scenario 4: Token Expiration Management

**Objective:** Manage expired and expiring tokens

**Steps:**
1. Navigate to `/wifi-portal/tokens`
2. Filter: "Expiring Soon" (next 24 hours)
3. Review list of expiring tokens
4. Option 1: Extend expiration (if supported)
5. Option 2: Generate replacement tokens
6. Option 3: Archive expired tokens

**Expected Results:**
- ✅ Expiring tokens identified
- ✅ Automated notifications (if configured)
- ✅ Clean-up of old tokens
- ✅ Reporting on expiration rates

---

## Troubleshooting

### ESP32 Issues

**Problem:** ESP32 device shows "Disconnected"

**Solutions:**
1. Check device network connectivity
2. Verify device credentials in `/wifi-portal/devices`
3. Click "Force Sync" to re-establish connection
4. Check ESP32 device logs
5. Restart ESP32 device if needed

**Problem:** Tokens not syncing to ESP32

**Solutions:**
1. Check sync status timestamp
2. Verify ESP32 API endpoint accessible
3. Check for sync errors in logs
4. Manually trigger sync
5. Verify token format compatibility

---

### R710 Issues

**Problem:** Cannot connect to R710 controller

**Solutions:**
1. Verify controller IP address correct
2. Check network connectivity
3. Verify credentials valid
4. Check R710 API enabled
5. Verify firewall not blocking

**Problem:** WLAN sync fails

**Solutions:**
1. Check R710 zone name correct
2. Verify API permissions
3. Check WLAN name doesn't exist
4. Review R710 controller logs
5. Try manual WLAN creation first

---

### POS Integration Issues

**Problem:** WiFi tab not showing in POS

**Solutions:**
1. Verify integration exists for business
2. Check user has correct permissions
3. Verify token configs exist
4. Clear browser cache
5. Check integration status in `/wifi-portal/setup`

**Problem:** WiFi credentials not printing on receipt

**Solutions:**
1. Verify receipt template includes WiFi section
2. Check printer configuration
3. Verify token data in order
4. Test receipt preview first
5. Check thermal printer formatting

---

### General Issues

**Problem:** Token generation is slow

**Solutions:**
1. Generate tokens in smaller batches
2. Check R710/ESP32 response time
3. Verify network latency
4. Consider pre-generating during off-peak
5. Check database performance

**Problem:** Duplicate usernames/passwords

**Solutions:**
1. Should not occur - report as bug
2. Check token generation logic
3. Verify unique constraints in database
4. Review recent sync logs

---

## Performance Benchmarks

**Token Generation:**
- ESP32: <2 seconds for 10 tokens
- R710: <5 seconds for 10 tokens

**POS Sale:**
- Add WiFi to cart: <1 second
- Complete sale: <3 seconds
- Receipt print: <5 seconds

**Synchronization:**
- ESP32 sync: <5 seconds
- R710 sync: <10 seconds

**Report Generation:**
- WiFi sales report: <2 seconds
- Token inventory: <1 second

---

## Testing Checklist

**ESP32 Integration:**
- ☐ Token configs created
- ☐ Tokens generated
- ☐ POS sales working
- ☐ Device sync operational
- ☐ Receipts printing correctly
- ☐ Reporting accurate

**R710 Integration:**
- ☐ Controller connection configured
- ☐ WLANs created and synced
- ☐ Token packages configured
- ☐ Direct sales working
- ☐ POS integration working
- ☐ Bulk generation tested

**General:**
- ☐ Mixed carts working
- ☐ All payment methods supported
- ☐ Receipts format correctly
- ☐ Reports show WiFi revenue
- ☐ Token status transitions correct
- ☐ Expiration management working

---

**Document Version:** 1.0
**Last Updated:** 2026-01-02
**Next Review:** 2026-02-02
