# Printer System Testing Guide

**Last Updated:** 2026-01-02
**Version:** 1.0
**Purpose:** Comprehensive testing guide for printer management and barcode printing system

---

## 📚 Table of Contents

- [Overview](#overview)
- [Printer Registration](#printer-registration)
- [Barcode Template Management](#barcode-template-management)
- [Thermal Printer Configuration](#thermal-printer-configuration)
- [Print Job Testing](#print-job-testing)
- [Integration Testing](#integration-testing)
- [Troubleshooting](#troubleshooting)

---

## Overview

The printer system supports multiple printer types for different business needs:

| Printer Type | Use Cases | Label Sizes | Connectivity |
|--------------|-----------|-------------|--------------|
| **Network Barcode** | Product labels, shelf tags, inventory | 2"×1", 3"×2", 4"×6" | Network (IP) |
| **Thermal Receipt** | Sales receipts, WiFi tokens | 58mm, 80mm | COM port, Network |
| **Document** | Reports, invoices, forms | Letter, A4 | Network, USB |

**Key Features:**
- Multi-printer management per business
- Barcode template designer
- Print queue management
- Thermal receipt formatting
- Batch printing support
- Print job history

---

## Printer Registration

### Prerequisites

**Test Accounts:**
- **Restaurant Manager:** sarah.johnson@restaurant-demo.com (Password: Demo@123)
- **Any Business Manager:** All have printer access

**Demo Data Required:**
```bash
POST /api/admin/seed-printers
```

**Expected Data:**
- 8 registered printers (2 per business)
- 12 barcode templates
- Sample print jobs

---

### Test 1: View Registered Printers

**Objective:** Display all printers for a business

**Steps:**
1. Login as Restaurant manager
2. Navigate to `/admin/printers`
3. View printer list

**Expected Results:**
- ✅ See list of business printers
- ✅ Each printer shows: name, type, status, IP/port
- ✅ "Register Printer" button visible
- ✅ Edit/Delete buttons on each printer

**Sample Data (Restaurant):**
| Name | Type | Connection | Status |
|------|------|------------|--------|
| Restaurant Barcode Printer | Network Barcode | 192.168.1.201 | Active |
| Restaurant Receipt Printer | Thermal Receipt | COM3 | Active |

---

### Test 2: Register Network Barcode Printer

**Objective:** Add a new network barcode printer

**Steps:**
1. Navigate to `/admin/printers`
2. Click "Register Printer"
3. Fill in form:
   - **Name:** "Kitchen Label Printer"
   - **Type:** Network Barcode Printer
   - **IP Address:** 192.168.1.210
   - **Port:** 9100
   - **Default Label Size:** 3" × 2"
   - **Business:** Restaurant
4. Click "Test Connection"
5. Click "Save"

**Expected Results:**
- ✅ Connection test succeeds
- ✅ Printer registered successfully
- ✅ Status shows "Active"
- ✅ Available for print jobs

**Validation:**
```bash
GET /api/admin/printers?businessId=restaurant-demo-business
```

---

### Test 3: Register Thermal Receipt Printer

**Objective:** Configure thermal printer with COM port

**Steps:**
1. Click "Register Printer"
2. Fill in form:
   - **Name:** "Front Counter Thermal"
   - **Type:** Thermal Receipt Printer
   - **Connection Type:** COM Port
   - **Port:** COM5
   - **Baud Rate:** 9600
   - **Paper Width:** 80mm
   - **Characters Per Line:** 48
3. Click "Test Print"
4. Click "Save"

**Expected Results:**
- ✅ Test receipt prints successfully
- ✅ Printer saved with COM port config
- ✅ Paper width and formatting correct
- ✅ Available for POS receipts

**Test Print Format:**
```
================================
      THERMAL PRINTER TEST
================================
Printer: Front Counter Thermal
Port: COM5
Paper: 80mm
Time: 2026-01-02 22:45
================================
  This is a test print
================================
```

---

### Test 4: Register Network Thermal Printer

**Objective:** Configure thermal printer with network connection

**Steps:**
1. Click "Register Printer"
2. Fill in form:
   - **Name:** "Network Receipt Printer"
   - **Type:** Thermal Receipt Printer
   - **Connection Type:** Network
   - **IP Address:** 192.168.1.220
   - **Port:** 9100
   - **Paper Width:** 58mm
   - **Auto-cut:** Enabled
3. Test and save

**Expected Results:**
- ✅ Network connection established
- ✅ Auto-cut feature configured
- ✅ Printer ready for use

---

### Test 5: Configure Default Printers

**Objective:** Set default printer for each type

**Steps:**
1. Navigate to `/admin/printers`
2. For "Restaurant Barcode Printer":
   - Click "Set as Default Barcode"
3. For "Front Counter Thermal":
   - Click "Set as Default Receipt"

**Expected Results:**
- ✅ Default badges appear on printers
- ✅ POS automatically uses defaults
- ✅ Print dialogs pre-select defaults

---

## Barcode Template Management

### Test 1: View Barcode Templates

**Objective:** Display available barcode templates

**Steps:**
1. Navigate to `/admin/barcode-templates`
2. View template library

**Expected Results:**
- ✅ See list of templates
- ✅ Preview thumbnails visible
- ✅ Template details (size, fields, format)
- ✅ "Create Template" button visible

**Sample Templates:**
| Name | Size | Fields | Barcode Type |
|------|------|--------|--------------|
| Standard Product Label | 3" × 2" | Name, Price, SKU | Code 128 |
| Price Tag Small | 2" × 1" | Price, SKU | Code 128 |
| Shelf Tag Large | 4" × 6" | Name, Price, Description, Image | QR Code |

---

### Test 2: Create Custom Barcode Template

**Objective:** Design a custom label template

**Steps:**
1. Navigate to `/admin/barcode-templates`
2. Click "Create Template"
3. Configure template:
   - **Name:** "Grocery Shelf Tag"
   - **Label Size:** 3" × 2"
   - **Orientation:** Landscape
4. Add fields:
   - **Product Name:** Font 16, Bold, Top
   - **Price:** Font 24, Bold, Middle
   - **SKU Barcode:** Code 128, Bottom
   - **Category:** Font 10, Regular, Top Right
5. Click "Save"

**Expected Results:**
- ✅ Template created successfully
- ✅ Live preview updates as you design
- ✅ Template available for printing
- ✅ Template saved to business

---

### Test 3: Template Field Configuration

**Objective:** Configure all available template fields

**Available Fields:**
- Product Name (Text)
- SKU (Barcode)
- Price (Currency)
- Category (Text)
- Description (Text)
- Image (Product photo)
- Custom Text (Static)
- QR Code (Data)

**Steps:**
1. Create new template
2. Add each field type
3. Configure positioning and formatting
4. Preview with sample data

**Expected Results:**
- ✅ All field types render correctly
- ✅ Positioning controls work
- ✅ Formatting options apply
- ✅ Preview accurate

---

### Test 4: Print Test Labels

**Objective:** Print sample labels from template

**Steps:**
1. Navigate to template detail page
2. Click "Print Test Label"
3. Select printer: "Restaurant Barcode Printer"
4. Enter sample data:
   - Product: "Organic Bananas"
   - Price: $2.99
   - SKU: "PRD-BANANAS-001"
5. Click "Print"

**Expected Results:**
- ✅ Print job created
- ✅ Label prints on selected printer
- ✅ All fields render correctly
- ✅ Barcode scannable
- ✅ Format matches preview

---

### Test 5: Batch Print Product Labels

**Objective:** Print labels for multiple products

**Steps:**
1. Navigate to `/admin/products`
2. Select products:
   - Organic Bananas
   - Fresh Milk
   - Whole Wheat Bread
   - (3 products total)
3. Click "Print Labels"
4. Select template: "Standard Product Label"
5. Select printer: "Restaurant Barcode Printer"
6. Set quantity: 2 labels per product
7. Click "Print Batch"

**Expected Results:**
- ✅ Print job queued for 6 labels (3 × 2)
- ✅ Progress indicator shows printing
- ✅ All labels print successfully
- ✅ Each product has 2 labels
- ✅ Job logged in history

**Performance:**
- Should complete in <30 seconds
- Labels print in order selected

---

## Thermal Printer Configuration

### Test 1: Receipt Template Settings

**Objective:** Configure thermal receipt formatting

**Steps:**
1. Navigate to `/admin/receipt-settings`
2. Configure options:
   - **Header:** Business name, address, phone
   - **Show Logo:** Yes (if available)
   - **Line Items:** Name, qty, price
   - **Show Tax:** Yes
   - **Show WiFi Tokens:** Yes (separate section)
   - **Footer:** "Thank you for your business!"
   - **Auto-cut:** Yes
3. Save settings

**Expected Results:**
- ✅ Settings saved successfully
- ✅ Preview updates in real-time
- ✅ Next receipt uses new format

---

### Test 2: Test Thermal Receipt Print

**Objective:** Print a test receipt

**Steps:**
1. Navigate to `/admin/printers`
2. Select thermal printer
3. Click "Print Test Receipt"
4. Select type: "Customer Copy"

**Expected Test Receipt:**
```
        ACME RESTAURANT
        123 Main Street
         (555) 123-4567

        TEST RECEIPT
     2026-01-02 22:45:00

--------------------------------
Sample Item 1         x1  $10.00
Sample Item 2         x2  $15.00
--------------------------------
Subtotal:                 $35.00
Tax (8%):                  $2.80
--------------------------------
TOTAL:                    $37.80
--------------------------------

      Thank you!
       Visit Again

================================
```

**Validation:**
- ✅ Receipt prints correctly
- ✅ Formatting clean
- ✅ Auto-cut works (if enabled)
- ✅ Characters fit within paper width

---

### Test 3: WiFi Token Receipt Format

**Objective:** Verify WiFi credentials print correctly

**Steps:**
1. Create a POS order with WiFi token
2. Complete sale
3. Print customer copy receipt

**Expected WiFi Section:**
```
========== WIFI TOKEN ==========
Network: Restaurant-Guest-WiFi
Username: wifi_user_123
Password: SecurePass456
Duration: 1 Hour
Speed: 10 MB/s
Expires: 2026-01-02 23:45
================================
```

**Validation:**
- ✅ WiFi section clearly separated
- ✅ All credentials visible
- ✅ Formatting easy to read
- ✅ Expiration date/time shown

---

### Test 4: Business vs Customer Receipt Copies

**Objective:** Test different receipt formats

**Steps:**
1. Complete a sale
2. Print "Business Copy"
3. Print "Customer Copy"
4. Compare outputs

**Business Copy (Condensed):**
```
ACME RESTAURANT - BUSINESS COPY
Order #1234
2026-01-02 22:45
--------------------------------
Items: 3
Total: $37.80
Payment: Cash
Cashier: Sarah Johnson
--------------------------------
```

**Customer Copy (Full Details):**
```
        ACME RESTAURANT
        123 Main Street
         (555) 123-4567

Order #1234
2026-01-02 22:45:00
Cashier: Sarah Johnson

--------------------------------
Burger               x1   $12.00
Fries                x1    $4.00
Soda                 x1    $3.00
--------------------------------
Subtotal:                 $19.00
Tax (8%):                  $1.52
--------------------------------
TOTAL:                    $20.52

Payment: Cash             $25.00
Change:                    $4.48
--------------------------------

      Thank you!
       Visit Again
```

---

### Test 5: Receipt Reprint Functionality

**Objective:** Reprint previous receipts

**Steps:**
1. Navigate to `/restaurant/orders`
2. Find completed order
3. Click "View Details"
4. Click "Reprint Receipt"
5. Select: "Customer Copy"
6. Choose printer
7. Click "Print"

**Expected Results:**
- ✅ Receipt reprints with original data
- ✅ Marked as "REPRINT" on receipt
- ✅ Original timestamp preserved
- ✅ Print logged separately

**Reprint Header:**
```
        ACME RESTAURANT
          ** REPRINT **
Original: 2026-01-02 22:45
Reprinted: 2026-01-02 23:15
```

---

## Print Job Testing

### Test 1: View Print Queue

**Objective:** Monitor active and pending print jobs

**Steps:**
1. Navigate to `/admin/print-jobs`
2. View job queue
3. Filter by status: "Pending"

**Expected Results:**
- ✅ See list of print jobs
- ✅ Status indicators (Pending, Printing, Completed, Failed)
- ✅ Job details (printer, type, time)
- ✅ Cancel button for pending jobs

**Job Information:**
| Job ID | Type | Printer | Status | Time | Actions |
|--------|------|---------|--------|------|---------|
| #1234 | Barcode Label | Barcode Printer | Completed | 22:30 | View |
| #1235 | Receipt | Thermal Printer | Completed | 22:35 | Reprint |
| #1236 | Batch Labels | Barcode Printer | Printing | 22:40 | Cancel |

---

### Test 2: Cancel Print Job

**Objective:** Cancel a pending print job

**Steps:**
1. Start a batch print job (20 labels)
2. Navigate to `/admin/print-jobs`
3. Find the active job
4. Click "Cancel"
5. Confirm cancellation

**Expected Results:**
- ✅ Job marked as "Cancelled"
- ✅ Remaining labels don't print
- ✅ Partial prints completed (if any)
- ✅ Printer returns to ready state

---

### Test 3: Retry Failed Print Job

**Objective:** Retry a job that failed

**Steps:**
1. Simulate failed job (disconnect printer)
2. Attempt to print
3. Job fails
4. Reconnect printer
5. Navigate to `/admin/print-jobs`
6. Find failed job
7. Click "Retry"

**Expected Results:**
- ✅ Job queued again
- ✅ Print succeeds on retry
- ✅ Status updates to "Completed"
- ✅ Retry logged in job history

---

### Test 4: Print Job History

**Objective:** Review historical print jobs

**Steps:**
1. Navigate to `/admin/print-jobs`
2. Filter by date range: Last 7 days
3. Group by printer
4. Export to CSV (if available)

**Expected Results:**
- ✅ All jobs within date range shown
- ✅ Grouping by printer works
- ✅ Job details accessible
- ✅ Export contains all data

**Metrics to Check:**
- Total jobs: Count
- Success rate: Percentage
- Average print time: Seconds
- Failed jobs: Count and reasons

---

## Integration Testing

### Test 1: POS Receipt Printing

**Objective:** Print receipt automatically from POS sale

**Steps:**
1. Navigate to `/restaurant/pos`
2. Add items to cart
3. Complete sale
4. System prompts for receipt
5. Click "Print Customer Copy"

**Expected Results:**
- ✅ Default thermal printer auto-selected
- ✅ Receipt prints immediately
- ✅ Print job logged
- ✅ Option to print business copy

---

### Test 2: Product Label Printing from Inventory

**Objective:** Print labels during inventory management

**Steps:**
1. Navigate to `/admin/products`
2. View product details
3. Click "Print Label"
4. Select template and printer
5. Set quantity: 5
6. Print

**Expected Results:**
- ✅ Label dialog opens
- ✅ Default template pre-selected
- ✅ 5 labels print successfully
- ✅ Barcodes match product SKU

---

### Test 3: Bulk Barcode Generation

**Objective:** Generate and print barcodes for new products

**Steps:**
1. Navigate to `/admin/products/bulk-import`
2. Import 10 new products
3. System generates SKUs
4. Prompt: "Print labels for new products?"
5. Select "Yes"
6. Choose template and printer
7. Print all

**Expected Results:**
- ✅ All 10 products get unique barcodes
- ✅ Labels queue automatically
- ✅ Batch prints successfully
- ✅ Job logged with batch ID

---

### Test 4: Printer Selection Per Business

**Objective:** Verify printer isolation between businesses

**Steps:**
1. Login as Restaurant manager
2. Navigate to `/admin/printers`
3. Note available printers
4. **Switch:** Login as Grocery manager
5. Navigate to `/admin/printers`
6. Compare printer lists

**Expected Results:**
- ✅ Each business sees only their printers
- ✅ No cross-business printer access
- ✅ Print jobs isolated per business

---

### Test 5: Multi-Printer Environment

**Objective:** Manage multiple printers of same type

**Scenario:** Restaurant has 3 barcode printers:
- Kitchen (labels for prep)
- Front Counter (price tags)
- Warehouse (inventory labels)

**Steps:**
1. Register all 3 printers
2. Create print job
3. Select specific printer: "Kitchen"
4. Verify job goes to correct printer

**Expected Results:**
- ✅ All printers registered
- ✅ Job routing correct
- ✅ Printer selection persists
- ✅ No print conflicts

---

## Troubleshooting

### Network Printer Issues

**Problem:** Cannot connect to network printer

**Solutions:**
1. Verify IP address is correct
2. Ping the printer IP from server
3. Check printer is powered on
4. Verify network connectivity
5. Check firewall rules (port 9100)
6. Confirm printer supports raw TCP printing

**Validation:**
```bash
# Test network connectivity
ping 192.168.1.201

# Test port availability
telnet 192.168.1.201 9100
```

---

**Problem:** Printer shows "Offline"

**Solutions:**
1. Check printer power and network
2. Click "Refresh Status" in admin
3. Verify printer IP hasn't changed (DHCP)
4. Check for paper jams or errors
5. Review printer display for error codes

---

### Thermal Printer Issues

**Problem:** Receipt formatting is wrong

**Solutions:**
1. Verify paper width setting (58mm or 80mm)
2. Check characters-per-line setting
3. Test with plain text first
4. Adjust font sizes in template
5. Verify printer supports ESC/POS commands

**Correct Settings:**
- 58mm paper: 32 characters per line
- 80mm paper: 48 characters per line

---

**Problem:** COM port not available

**Solutions:**
1. Check COM port number in Device Manager
2. Close other applications using port
3. Verify USB-to-serial driver installed
4. Try different COM port
5. Check baud rate matches printer (9600 typical)

---

**Problem:** Auto-cut not working

**Solutions:**
1. Verify printer supports auto-cut
2. Enable auto-cut in printer settings
3. Check ESC/POS command in template
4. Ensure sufficient paper feed before cut
5. Test with manual cut command

---

### Barcode Printing Issues

**Problem:** Barcode won't scan

**Solutions:**
1. Increase barcode size
2. Verify barcode type correct (Code 128 vs QR)
3. Check print quality/resolution
4. Ensure sufficient white space around barcode
5. Test with different scanner
6. Verify data format is correct

**Best Practices:**
- Minimum barcode height: 0.5 inches
- White space: 0.25 inches on all sides
- High-quality printer setting
- Test scan before printing batch

---

**Problem:** Labels misaligned

**Solutions:**
1. Calibrate printer
2. Verify label size settings match physical labels
3. Check label feed mechanism
4. Adjust label offset in template
5. Clean printer sensors

---

### Print Queue Issues

**Problem:** Jobs stuck in queue

**Solutions:**
1. Check printer status
2. Cancel and retry job
3. Clear print queue
4. Restart print service
5. Check for errors in logs

---

**Problem:** Print jobs printing to wrong printer

**Solutions:**
1. Verify default printer settings
2. Check job printer assignment
3. Ensure unique printer names
4. Review print routing logic
5. Test with explicit printer selection

---

## Performance Benchmarks

**Single Label Print:**
- Network barcode: <3 seconds
- Thermal receipt: <5 seconds

**Batch Printing:**
- 10 labels: <30 seconds
- 50 labels: <2 minutes
- 100 labels: <4 minutes

**Receipt Print:**
- Standard receipt: <5 seconds
- WiFi token receipt: <6 seconds
- Reprint: <4 seconds

**Print Queue:**
- Job creation: <1 second
- Status update: <500ms
- History query: <2 seconds

---

## Testing Checklist

**Printer Registration:**
- ☐ Network barcode printer added
- ☐ Thermal receipt printer (COM) added
- ☐ Thermal receipt printer (Network) added
- ☐ Document printer added (optional)
- ☐ Default printers configured
- ☐ Test prints successful

**Barcode Templates:**
- ☐ Standard templates created
- ☐ Custom template designed
- ☐ All field types tested
- ☐ Preview accuracy verified
- ☐ Test labels printed
- ☐ Barcodes scannable

**Thermal Printing:**
- ☐ Receipt formatting configured
- ☐ Business copy tested
- ☐ Customer copy tested
- ☐ WiFi token format verified
- ☐ Reprint functionality working
- ☐ Auto-cut operational

**Print Jobs:**
- ☐ Queue visible and updating
- ☐ Job cancellation works
- ☐ Retry functionality tested
- ☐ History accessible
- ☐ Failed job handling verified

**Integrations:**
- ☐ POS receipt printing
- ☐ Product label printing
- ☐ Bulk label generation
- ☐ Multi-printer selection
- ☐ Business isolation verified

---

**Document Version:** 1.0
**Last Updated:** 2026-01-02
**Next Review:** 2026-02-02
