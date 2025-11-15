// Printing Module Types
// Comprehensive type definitions for universal printing module

// ============================================================================
// Printer Types
// ============================================================================

export type PrinterType = 'label' | 'receipt' | 'document';
export type PrinterStatus = 'online' | 'offline' | 'busy' | 'error';
export type PrinterCapability = 'esc-pos' | 'zebra-zpl' | 'pdf' | 'raw';

export interface NetworkPrinter {
  id: string;
  printerId: string; // Unique identifier for the printer
  printerName: string;
  printerType: PrinterType;
  nodeId: string; // Which sync node owns this printer
  ipAddress: string | null;
  port: number | null;
  capabilities: PrinterCapability[];
  isShareable: boolean; // Admin configured - can other nodes use this?
  isOnline: boolean;
  lastSeen: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PrinterFormData {
  printerName: string;
  printerType: PrinterType;
  ipAddress?: string;
  port?: number;
  capabilities: PrinterCapability[];
  isShareable: boolean;
}

export interface PrinterDiscoveryResult {
  printerName: string;
  ipAddress: string;
  port: number;
  printerType: PrinterType;
  capabilities: PrinterCapability[];
  manufacturer?: string;
  model?: string;
}

// ============================================================================
// Print Job Types
// ============================================================================

export type PrintJobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
export type PrintJobType = 'receipt' | 'label';

export interface PrintJob {
  id: string;
  printerId: string;
  businessId: string;
  businessType: string; // restaurant, clothing, grocery, etc.
  userId: string; // Who initiated the print
  jobType: PrintJobType;
  jobData: ReceiptData | LabelData; // JSON data for the print job
  status: PrintJobStatus;
  retryCount: number;
  errorMessage: string | null;
  createdAt: Date;
  processedAt: Date | null;
}

export interface PrintJobFormData {
  printerId: string;
  jobType: PrintJobType;
  jobData: ReceiptData | LabelData;
  copies?: number;
}

export interface PrintJobQueueOptions {
  priority?: number; // 1-10, higher = more urgent
  retryLimit?: number; // Max retry attempts
  retryDelay?: number; // Milliseconds between retries
}

// ============================================================================
// Receipt Types
// ============================================================================

export interface ReceiptSequence {
  id: string;
  businessId: string;
  date: string; // YYYY-MM-DD format
  lastSequence: number; // Incremental counter that resets daily
  createdAt: Date;
  updatedAt: Date;
}

export interface ReceiptNumbering {
  globalId: string; // UUID for database tracking
  dailySequence: string; // User-friendly daily number (001, 002, 003...)
  formattedNumber: string; // Combined display format (e.g., "2025-11-13-001")
}

export interface ReceiptData {
  // Common fields for all business types
  receiptNumber: ReceiptNumbering;
  businessId: string;
  businessType: string;
  businessName: string;
  businessAddress?: string;
  businessPhone?: string;
  businessEmail?: string;
  businessLogo?: string; // URL or base64

  // Transaction info
  transactionId: string;
  transactionDate: Date;
  salespersonName: string;
  salespersonId: string;

  // Line items
  items: ReceiptItem[];

  // Totals
  subtotal: number;
  tax: number;
  discount?: number;
  total: number;

  // Payment
  paymentMethod: string; // cash, card, credit, etc.
  amountPaid?: number;
  changeDue?: number;

  // Business-specific data (varies by type)
  businessSpecificData?: RestaurantReceiptData | ClothingReceiptData | GroceryReceiptData |
    HardwareReceiptData | ConstructionReceiptData | VehiclesReceiptData | ConsultingReceiptData |
    RetailReceiptData | ServicesReceiptData;

  // Footer
  footerMessage?: string;
  returnPolicy?: string;
}

export interface ReceiptItem {
  name: string;
  sku?: string;
  quantity: number;
  unit?: string; // ea, lb, kg, etc.
  unitPrice: number;
  totalPrice: number;
  notes?: string;
}

// Business-Specific Receipt Data

export interface RestaurantReceiptData {
  receiptType: 'kitchen' | 'customer'; // Dual receipt support
  tableNumber?: string;
  serverName?: string;
  orderTime: Date;
  items: RestaurantReceiptItem[];
}

export interface RestaurantReceiptItem extends ReceiptItem {
  allergens?: string[]; // nuts, dairy, eggs, etc.
  dietaryRestrictions?: string[]; // vegetarian, vegan, gluten-free, etc.
  spiceLevel?: number; // 0-5
  preparationTime?: number; // minutes
  calories?: number;
  specialInstructions?: string;
}

export interface ClothingReceiptData {
  items: ClothingReceiptItem[];
  returnPolicy: string;
  returnWindowDays: number;
}

export interface ClothingReceiptItem extends ReceiptItem {
  size?: string;
  color?: string;
  season?: string;
  brand?: string;
}

export interface GroceryReceiptData {
  items: GroceryReceiptItem[];
  loyaltyPoints?: number;
  loyaltyBalance?: number;
}

export interface GroceryReceiptItem extends ReceiptItem {
  weight?: number; // For weight-based items
  unitPricing?: string; // e.g., "$3.99/lb"
  expirationDate?: Date;
  category?: string; // produce, meat, dairy, etc.
}

export interface HardwareReceiptData {
  items: HardwareReceiptItem[];
  projectReference?: string;
}

export interface HardwareReceiptItem extends ReceiptItem {
  cutToSizeDimensions?: string; // e.g., "24\" x 48\""
  bulkQuantity?: number;
  bulkPricePerUnit?: number;
  specialOrderETA?: Date;
  manufacturer?: string;
}

export interface ConstructionReceiptData {
  projectCode: string;
  projectName: string;
  contractorName: string;
  contractorContact: string;
  budgetTotal: number;
  budgetSpent: number;
  projectTimeline: {
    startDate: Date;
    endDate: Date;
    currentPhase: string;
  };
  laborHours?: number;
  materialsCost?: number;
  laborCost?: number;
  paymentTerms?: string;
}

export interface VehiclesReceiptData {
  vehicleInfo: {
    make: string;
    model: string;
    year: number;
    licensePlate: string;
    vin?: string;
  };
  currentMileage: number;
  nextServiceDue?: {
    mileage: number;
    date: Date;
  };
  servicesPerformed: string[];
  partsUsed: Array<{
    partNumber: string;
    partName: string;
    quantity: number;
    price: number;
  }>;
  laborHours: number;
  laborRate: number;
  technicianName: string;
  warranty?: string;
}

export interface ConsultingReceiptData {
  clientName: string;
  clientContact: string;
  projectName: string;
  invoiceNumber: string;
  invoiceDate: Date;
  serviceHours: Array<{
    date: Date;
    hours: number;
    description: string;
    hourlyRate: number;
  }>;
  paymentTerms: string; // net 30, due on receipt, etc.
}

export interface RetailReceiptData {
  loyaltyPoints?: number;
  loyaltyBalance?: number;
  promotions?: string[];
  surveyQRCode?: string; // QR code for feedback survey
}

export interface ServicesReceiptData {
  serviceDescription: string;
  laborHours: number;
  hourlyRate: number;
  partsUsed: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  warranty?: string; // e.g., "90 days parts and labor"
  technicianName: string;
  technicianId: string;
  followUpDate?: Date;
}

// ============================================================================
// Label Types
// ============================================================================

export type LabelFormat = 'standard' | 'with-price' | 'compact' | 'business-specific';
export type BarcodeFormat = 'code128' | 'code39' | 'ean13' | 'upca' | 'qr';

export interface LabelData {
  // Common fields
  sku: string;
  itemName: string;
  price?: number;
  barcode: {
    format: BarcodeFormat;
    data: string; // Data to encode in barcode
  };

  // Business info
  businessId: string;
  businessType: string;
  businessName?: string;

  // Label format
  labelFormat: LabelFormat;

  // Business-specific data
  businessSpecificData?: ClothingLabelData | GroceryLabelData | HardwareLabelData |
    ConstructionLabelData | VehiclesLabelData;
}

export interface ClothingLabelData {
  size?: string;
  color?: string;
  season?: string;
  brand?: string;
  styleNumber?: string;
}

export interface GroceryLabelData {
  weight?: number;
  unit?: string; // lb, kg, oz
  expirationDate?: Date;
  packDate?: Date;
  category?: string; // produce, meat, dairy
}

export interface HardwareLabelData {
  manufacturer?: string;
  model?: string;
  dimensions?: string; // For cut-to-size items
  location?: string; // Warehouse location
}

export interface ConstructionLabelData {
  projectCode?: string;
  materialType?: string;
  deliveryDate?: Date;
  location?: string; // Job site location
}

export interface VehiclesLabelData {
  vehicleId?: string;
  nextServiceDate?: Date;
  nextServiceMileage?: number;
}

// ============================================================================
// Printer Template Types
// ============================================================================

export interface PrinterTemplate {
  id: string;
  name: string;
  businessType: string;
  templateType: 'receipt' | 'label';
  template: string; // Template string with placeholders
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// ESC/POS Command Types
// ============================================================================

export interface ESCPOSOptions {
  encoding?: 'ascii' | 'utf8';
  width?: number; // Characters per line (default 32 or 48)
  codePage?: string;
}

export interface ESCPOSCommand {
  type: 'text' | 'feed' | 'cut' | 'align' | 'bold' | 'barcode' | 'qr';
  data?: any;
}

// ============================================================================
// ZPL (Zebra Programming Language) Types
// ============================================================================

export interface ZPLOptions {
  labelWidth: number; // dots
  labelHeight: number; // dots
  dpi: number; // 203, 300, or 600
}

export interface ZPLCommand {
  type: 'field' | 'barcode' | 'graphic' | 'box' | 'line';
  x: number;
  y: number;
  data?: any;
}

// ============================================================================
// Print Preview Types
// ============================================================================

export interface PrintPreview {
  printerId: string;
  printerName: string;
  jobType: PrintJobType;
  preview: string; // HTML or plain text representation
  estimatedPages: number;
}

// ============================================================================
// Utility Types
// ============================================================================

export interface PrinterStatistics {
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  averageProcessingTime: number; // milliseconds
  lastJobTime?: Date;
}

export interface PrintQueueStats {
  pendingJobs: number;
  processingJobs: number;
  completedJobs: number;
  failedJobs: number;
  oldestPendingJob?: Date;
}
