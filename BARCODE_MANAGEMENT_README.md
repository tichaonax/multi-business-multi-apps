# Barcode Management System

## Overview
The Barcode Management System provides comprehensive barcode generation, printing, and inventory management capabilities for the multi-business platform. It supports various barcode symbologies and integrates with thermal printers for label printing.

## Features

### 🏷️ Barcode Templates
- Create and manage barcode templates with different symbologies (CODE128, EAN13, CODE39, etc.)
- Customize layout, colors, dimensions, and display options
- Business-specific or global templates
- Visual template designer with HTML/CSS support

### 🖨️ Print Jobs
- Queue and manage barcode printing jobs
- Support for inventory items, products, and custom data
- Integration with thermal printers
- Print job status tracking and history
- Batch printing capabilities

### 📦 Inventory Integration
- Link barcodes to inventory items
- Track barcode usage and printing history
- Batch number and expiry date management
- Location-based inventory tracking

## API Endpoints

### Templates
- `GET /api/barcodes/templates` - List barcode templates
- `POST /api/barcodes/templates` - Create new template
- `PUT /api/barcodes/templates` - Update template
- `DELETE /api/barcodes/templates?id={id}` - Delete template

### Print Jobs
- `GET /api/barcodes/print-jobs` - List print jobs
- `POST /api/barcodes/print-jobs` - Create print job
- `PUT /api/barcodes/print-jobs` - Update print job status
- `PATCH /api/barcodes/print-jobs?jobId={id}` - Generate barcode image

### Inventory Items
- `GET /api/barcodes/inventory-items` - List inventory items
- `POST /api/barcodes/inventory-items` - Add inventory item
- `PUT /api/barcodes/inventory-items` - Update inventory item
- `DELETE /api/barcodes/inventory-items?id={id}` - Remove inventory item

## Supported Symbologies

- **CODE128** - Most common, variable length
- **EAN13** - 13-digit European Article Number
- **EAN8** - 8-digit European Article Number
- **CODE39** - Alphanumeric, variable length
- **UPC** - Universal Product Code
- **ITF** - Interleaved 2 of 5
- **MSI** - Modified Plessey
- **Pharmacode** - Pharmaceutical industry
- **Codabar** - Used in libraries and blood banks

## Permissions

Access to barcode management requires the `BARCODE_MANAGEMENT` permission. Admin users are automatically granted this permission.

## Technical Implementation

### Dependencies
- `jsbarcode` - Client-side barcode generation
- `@types/jsbarcode` - TypeScript definitions
- `canvas` - Server-side barcode rendering

### Database Schema
- `BarcodeTemplates` - Template configurations
- `BarcodePrintJobs` - Print job queue and history
- `BarcodeInventoryItems` - Inventory item barcode mappings
- `Permissions` & `UserPermissions` - Access control

### Integration Points
- Business management system
- Inventory management
- Print queue system
- User permission system

## Usage

### Creating Templates
1. Navigate to Admin → Barcode Management
2. Click "Create Template"
3. Select symbology and configure options
4. Define layout template (HTML/CSS)
5. Save template

### Printing Barcodes
1. Select template and item type
2. Choose inventory item or enter custom data
3. Set quantity and printer
4. Queue print job
5. Monitor status in print jobs tab

### Managing Inventory
1. Link inventory items to barcode templates
2. Set custom labels and tracking information
3. Track printing history and usage

## Future Enhancements

- Advanced template designer with drag-and-drop
- Bulk import/export of barcode data
- Mobile app for barcode scanning
- Integration with external barcode services
- QR code generation
- Label sheet printing (multiple barcodes per page)