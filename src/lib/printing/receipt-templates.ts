/**
 * Unified Receipt Templates
 *
 * Standardized receipt templates for all business types
 * Uses grocery format as the base template for consistency
 *
 * Architecture:
 * - generateStandardReceipt() creates consistent structure for all receipts
 * - Each business type extends base with specific sections
 * - Dual receipt support (business/customer) for restaurant
 * - Consistent spacing, fonts, alignment across all types
 */

import type {
  ReceiptData,
  RestaurantReceiptData,
  ClothingReceiptData,
  GroceryReceiptData,
  HardwareReceiptData,
  ConstructionReceiptData,
  VehiclesReceiptData,
  ConsultingReceiptData,
  RetailReceiptData,
  ServicesReceiptData,
  RestaurantReceiptItem,
  ClothingReceiptItem,
  GroceryReceiptItem,
  HardwareReceiptItem
} from '@/types/printing';
import { addReprintWatermark } from '@/lib/receipts/watermark';
import { formatDataAmount, formatDuration as formatDurationSmart } from './format-utils';
import { formatPhoneNumberForDisplay } from '@/lib/country-codes';
import { formatDateTime, formatDate as formatDateOnly } from '@/lib/date-format';

// Thermal printer width (characters per line)
// EPSON TM-T20III with 80mm paper = 42 characters
// For 58mm paper, use 32 characters
const RECEIPT_WIDTH = 42;

// ESC/POS Commands (constants for readability)
const ESC = '\x1B'; // ESC
const GS = '\x1D'; // GS
const LF = '\x0A'; // Line feed
const CUT = GS + 'V' + '\x41' + String.fromCharCode(3); // Partial cut paper


// Alignment commands
const ALIGN_LEFT = ESC + 'a' + String.fromCharCode(0);
const ALIGN_CENTER = ESC + 'a' + String.fromCharCode(1);
const ALIGN_RIGHT = ESC + 'a' + String.fromCharCode(2);

/**
 * Strip emojis and other special characters that thermal printers can't render
 * Thermal printers typically only support ASCII (0x20-0x7E) and some extended ASCII
 * This function aggressively removes ALL non-printable-ASCII characters
 */
function stripEmojis(text: string): string {
  if (!text) return '';

  // First pass: Remove common emoji ranges (helps with pattern matching)
  let cleaned = text
    // Variation selectors (emoji modifiers)
    .replace(/[\uFE00-\uFE0F]/g, '')
    // Emoticons
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
    // Symbols & Pictographs (food emojis like 🍽️🍲)
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')
    // Transport & Map
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
    // Misc Symbols
    .replace(/[\u{2600}-\u{26FF}]/gu, '')
    // Dingbats
    .replace(/[\u{2700}-\u{27BF}]/gu, '')
    // Supplemental Symbols
    .replace(/[\u{1F900}-\u{1F9FF}]/gu, '')
    // Extended-A
    .replace(/[\u{1FA70}-\u{1FAFF}]/gu, '')
    // Additional ranges
    .replace(/[\u{1F000}-\u{1F0FF}]/gu, '')
    .replace(/[\u{1F100}-\u{1F1FF}]/gu, '')
    .replace(/[\u{1F200}-\u{1F2FF}]/gu, '')
    .replace(/[\u{1F3FB}-\u{1F3FF}]/gu, '')
    // Zero-width and special chars
    .replace(/[\u200B-\u200D\uFEFF\u2028\u2029]/g, '')
    .replace(/[\u0300-\u036F]/g, '');

  // Second pass: AGGRESSIVE - Keep only printable ASCII (space through tilde)
  // This catches any remaining non-ASCII characters the regexes missed
  cleaned = cleaned.replace(/[^\x20-\x7E]/g, '');

  // Clean up whitespace
  return cleaned.replace(/\s+/g, ' ').trim();
}

/**
 * Generate receipt based on business type
 */
export function generateReceipt(data: ReceiptData): string {
  let receipt = '';

  switch (data.businessType) {
    case 'restaurant':
      receipt = generateRestaurantReceipt(data);
      break;
    case 'clothing':
      receipt = generateClothingReceipt(data);
      break;
    case 'grocery':
      receipt = generateGroceryReceipt(data);
      break;
    case 'hardware':
      receipt = generateHardwareReceipt(data);
      break;
    case 'construction':
      receipt = generateConstructionReceipt(data);
      break;
    case 'vehicles':
      receipt = generateVehiclesReceipt(data);
      break;
    case 'consulting':
      receipt = generateConsultingReceipt(data);
      break;
    case 'retail':
      receipt = generateRetailReceipt(data);
      break;
    case 'services':
      receipt = generateServicesReceipt(data);
      break;
    default:
      receipt = generateGenericReceipt(data);
  }

  // Add watermark if this is a reprint
  if (data.isReprint) {
    receipt = addReprintWatermark(receipt, data.reprintedBy, data.originalPrintDate);
  }

  return receipt;
}

/**
 * ============================================================================
 * STANDARDIZED BASE RECEIPT TEMPLATE
 * ============================================================================
 *
 * All business types use this structure for consistency
 * Based on grocery receipt format (user's preferred format)
 *
 * Structure:
 * 1. Header (business name, address)
 * 2. Receipt Type Label (BUSINESS COPY / CUSTOMER COPY)
 * 3. Transaction Info (receipt #, date, salesperson)
 * 4. Business-Specific Section (table, server, project, etc.)
 * 5. Items (with business-specific details)
 * 6. Totals (subtotal, tax, discount, total)
 * 7. Payment (method, amount paid, change)
 * 8. WiFi Tokens (if any)
 * 9. Footer (phone, thank you message)
 * 10. Paper Cut
 */
interface ReceiptSections {
  /** Optional business-specific section (table, server, project, etc.) */
  businessSpecific?: string
  /** Optional item details renderer (for business-specific item formatting) */
  itemDetailsRenderer?: (item: any, index: number) => string
  /** Optional footer additions (loyalty points, return policy, etc.) */
  footerAdditions?: string
}

function generateStandardReceipt(data: ReceiptData, sections: ReceiptSections = {}): string {
  let receipt = '';

  // Initialize printer and reset margins
  receipt += ESC + '@';  // Initialize printer (reset all settings)
  receipt += ESC + 'l' + String.fromCharCode(0);  // Set left margin to 0

  // Determine if this is a business copy (condensed) or customer copy (detailed)
  // Default to business copy if receiptType is not specified
  console.log(`📄 [Receipt Template] receiptType="${data.receiptType}" (business=${data.receiptType !== 'customer'}, customer=${data.receiptType === 'customer'})`)
  const isBusinessCopy = data.receiptType !== 'customer'; // business or undefined = business copy
  const isCustomerCopy = data.receiptType === 'customer'; // only true when explicitly 'customer'

  // ============================================================================
  // 1. HEADER - Center aligned
  // ============================================================================
  receipt += ALIGN_CENTER;
  receipt += centerText(stripEmojis(data.businessName)) + LF;

  // Business copy: Only show address (no phone to save paper)
  if (isBusinessCopy) {
    if (data.businessAddress) {
      receipt += centerText(stripEmojis(data.businessAddress)) + LF;
    }
  }

  // Customer copy: Always show BOTH address and phone
  if (isCustomerCopy) {
    if (data.businessAddress) {
      receipt += centerText(stripEmojis(data.businessAddress)) + LF;
    }
    if (data.businessPhone) {
      receipt += centerText(stripEmojis(`Tel: ${formatPhoneNumberForDisplay(data.businessPhone)}`)) + LF;
    }
  }

  // ============================================================================
  // 2. RECEIPT TYPE LABEL (for dual receipts)
  // ============================================================================
  // Always show label to distinguish business vs customer copy
  receipt += ALIGN_CENTER;
  const label = isBusinessCopy ? '--- BUSINESS COPY ---' : '--- CUSTOMER COPY ---';
  receipt += label + LF;

  // ============================================================================
  // 3. TRANSACTION INFO - Left aligned
  // ============================================================================
  receipt += ALIGN_LEFT;
  receipt += `Receipt: ${data.receiptNumber.formattedNumber}` + LF;
  receipt += `Date: ${formatDateTime(data.transactionDate)}` + LF;
  if (data.salespersonName) {
    receipt += `Salesperson: ${stripEmojis(data.salespersonName)}` + LF;
  }
  // Blank line only for customer copy
  if (isCustomerCopy) {
    // receipt += LF;
  }

  // ============================================================================
  // 4. BUSINESS-SPECIFIC SECTION (optional)
  // ============================================================================
  if (sections.businessSpecific) {
    receipt += sections.businessSpecific;
    // Blank line only for customer copy
    if (isCustomerCopy) {
      // receipt += LF;
    }
  }

  // ============================================================================
  // 5. ITEMS SECTION
  // ============================================================================
  data.items.forEach((item, index) => {
    // Standard item line (name, qty, price, total)
    receipt += formatLineItem(item.name, item.quantity, item.unitPrice, item.totalPrice);

    // Business-specific item details (barcode, SKU, allergens, etc.)
    if (sections.itemDetailsRenderer) {
      const details = sections.itemDetailsRenderer(item, index);
      if (details) {
        receipt += details;
      }
    }

    // Default: show barcode or SKU if no custom renderer
    if (!sections.itemDetailsRenderer) {
      if (item.barcode) {
        receipt += `  UPC: ${item.barcode.code}` + LF;
      } else if (item.sku) {
        receipt += `  SKU: ${item.sku}` + LF;
      }
    }

    // Always render item notes (e.g. Meals Program tag)
    if (item.notes) {
      receipt += `  ${item.notes}` + LF;
    }
  });

  // ============================================================================
  // 6. TOTALS SECTION
  // ============================================================================
  // Dotted line before Subtotal (customer copy only)
  if (isCustomerCopy) {
    receipt += line('.') + LF;
  }
  receipt += formatTotal('Subtotal', data.subtotal);
  // Only print tax line if tax > 0 AND tax is charged separately (not included in price)
  if (data.tax > 0 && !data.taxIncludedInPrice) {
    const taxLabel = data.taxLabel || 'Tax';
    receipt += formatTotal(taxLabel, data.tax);
  }
  if (data.discount && data.discount > 0) {
    receipt += formatTotal(data.discountLabel || 'Savings', -data.discount);
  }
  // Dotted line before TOTAL (customer copy only)
  if (isCustomerCopy) {
    receipt += line('.') + LF;
  }
  const grandTotal = data.total + (data.paymentMethod.toUpperCase() === 'ECOCASH' ? (data.ecocashFeeAmount || 0) : 0);
  receipt += formatTotal('TOTAL', grandTotal, true);

  // ============================================================================
  // 7. PAYMENT SECTION
  // ============================================================================
  // Blank line only for customer copy
  if (isCustomerCopy) {
    // receipt += LF;
  }
  receipt += formatPaymentLines(data);

  // ============================================================================
  // 8. WIFI TOKENS SECTION (if any)
  // ============================================================================
  if (data.wifiTokens && data.wifiTokens.length > 0) {
    // Blank line only for customer copy
    if (isCustomerCopy) {
      // receipt += LF;
    }
    receipt += line('-') + LF;
    receipt += ALIGN_CENTER;
    receipt += 'WiFi ACCESS TOKENS' + LF;
    receipt += ALIGN_LEFT;
    receipt += line('-') + LF;

    data.wifiTokens.forEach((token) => {
      // Check if this is an error token
      if (token.success === false || token.error) {
        receipt += ALIGN_CENTER;
        receipt += `Package: ${stripEmojis(token.packageName)}` + LF;
        receipt += `*** ERROR ***` + LF;
        receipt += `${stripEmojis(token.error || 'Token unavailable')}` + LF;
        receipt += ALIGN_LEFT;
        if (isCustomerCopy) {
         //  receipt += LF;
        }
        return;
      }

      // Success token - show full details (strip emojis from all text)
      receipt += `Package: ${stripEmojis(token.packageName)}` + LF;
      receipt += `Token: ${token.tokenCode}` + LF;
      receipt += `Duration: ${formatDurationSmart(token.duration)}` + LF;

      // Show bandwidth limits if available
      if (token.bandwidthDownMb || token.bandwidthUpMb) {
        receipt += `Data: Down ${token.bandwidthDownMb || 0}MB / Up ${token.bandwidthUpMb || 0}MB` + LF;
      }

      // Connection instructions - 3 steps (customer copy only)
      if (isCustomerCopy) {
        receipt += `1. Connect to WiFi "${stripEmojis(token.ssid || 'Guest WiFi')}"` + LF;
        receipt += `2. Visit http://192.168.4.1` + LF;
        receipt += `3. Enter code above to activate` + LF;
        //  receipt += LF;
      }
    });
  }

  // ============================================================================
  // 8b. R710 WIFI TOKENS SECTION (if any)
  // ============================================================================
  if (data.r710Tokens && data.r710Tokens.length > 0) {
    // Blank line only for customer copy
    if (isCustomerCopy) {
     // receipt += LF;
    }
    receipt += line('-') + LF;
    receipt += ALIGN_CENTER;
    receipt += 'R710 WiFi ACCESS' + LF;
    receipt += ALIGN_LEFT;
    receipt += line('-') + LF;

    data.r710Tokens.forEach((token: any) => {
      // Check if this is an error token
      if (token.success === false || token.error) {
        receipt += ALIGN_CENTER;
        receipt += `Package: ${stripEmojis(token.packageName)}` + LF;
        receipt += `*** ERROR ***` + LF;
        receipt += `${stripEmojis(token.error || 'Token unavailable')}` + LF;
        receipt += ALIGN_LEFT;
        if (isCustomerCopy) {
          // receipt += LF;
        }
        return;
      }

      // Success token - show full details (strip emojis from all text)
      receipt += `Package: ${stripEmojis(token.packageName)}` + LF;
      receipt += `Password: ${token.password}` + LF;

      // Duration from durationValue + durationUnit (e.g., "4 Days")
      if (token.durationValue && token.durationUnit) {
        const durationUnit = token.durationUnit.split('_')[1] || token.durationUnit;
        receipt += `Duration: ${token.durationValue} ${durationUnit}` + LF;
      }

      // Expiration date with time (both business and customer copy)
      if (token.expiresAt) {
        receipt += `Expires: ${formatDateTime(new Date(token.expiresAt))}` + LF;
      }

      // Network SSID (customer copy only)
      if (isCustomerCopy && token.ssid) {
        receipt += `Network: ${stripEmojis(token.ssid)}` + LF;
      }

      // Connection instructions - 2 steps (customer copy only)
      if (isCustomerCopy) {
        receipt += `1. Connect to WiFi network above` + LF;
        receipt += `2. Use password to log in` + LF;
        // receipt += LF;
      }
    });
  }

  // ============================================================================
  // 9. FOOTER ADDITIONS (business-specific)
  // ============================================================================
  if (sections.footerAdditions) {
    // Blank line only for customer copy
    if (isCustomerCopy) {
      // receipt += LF;
    }
    receipt += sections.footerAdditions;
  }

  // ============================================================================
  // 10. FOOTER - Center aligned
  // ============================================================================
  // Customer copy only: support phone, return policy, and thank you messages
  if (isCustomerCopy) {
    receipt += LF;
    receipt += ALIGN_CENTER;
    if (data.umbrellaPhone) {
      receipt += centerText(`Support: ${data.umbrellaPhone}`) + LF;
    }
    // Return policy (always print - use default if not configured)
    const returnPolicy = data.returnPolicy || 'All sales are final, returns not accepted';
    // receipt += LF;
    receipt += wrapText(stripEmojis(returnPolicy), RECEIPT_WIDTH) + LF;
    if (data.footerMessage) {
      // receipt += LF;
      receipt += centerText(stripEmojis(data.footerMessage)) + LF;
    }
    // receipt += LF;
    if (data.customerName) {
      receipt += centerText(`Thank you, ${stripEmojis(data.customerName)}!`) + LF;
      if (data.customerPhone) {
        receipt += centerText(formatPhoneNumberForDisplay(data.customerPhone)) + LF;
      }
    } else {
      receipt += centerText('Thank you for your business!') + LF;
    }
    receipt += centerText('Please come again!') + LF;
  }

  // ============================================================================
  // 11. PAPER CUT
  // ============================================================================
  receipt += CUT;

  return receipt;
}

/**
 * ============================================================================
 * BUSINESS-SPECIFIC RECEIPT TEMPLATES
 * ============================================================================
 *
 * Each business type uses the standard template with custom sections
 */

/**
 * 1. Restaurant Receipt Template
 * Uses standard template with restaurant-specific sections
 */
function generateRestaurantReceipt(data: ReceiptData): string {
  const restaurantData = data.businessSpecificData as RestaurantReceiptData;

  // Business-specific section: Table and Server info
  let businessSpecific = '';
  if (restaurantData?.tableNumber) {
    businessSpecific += `Table: ${restaurantData.tableNumber}` + LF;
  }
  if (restaurantData?.serverName) {
    businessSpecific += `Server: ${restaurantData.serverName}` + LF;
  }

  // Meal Program section
  if (data.mealProgram) {
    businessSpecific += line('-') + LF;
    businessSpecific += `MEALS PROGRAM` + LF;
    businessSpecific += `Customer: ${stripEmojis(data.mealProgram.participantName)}` + LF;
    businessSpecific += `Subsidy: $${Number(data.mealProgram.subsidyAmount).toFixed(2)}` + LF;
    businessSpecific += line('-') + LF;
  }

  // Item details renderer: Show allergens, spice level, dietary restrictions
  const itemDetailsRenderer = (item: any, index: number) => {
    const restaurantItem = restaurantData?.items?.[index] as RestaurantReceiptItem;
    if (!restaurantItem) return '';

    let details = '';

    // Spice level
    if (restaurantItem.spiceLevel && restaurantItem.spiceLevel > 0) {
      details += `  Spice: ${'🌶️'.repeat(restaurantItem.spiceLevel)}` + LF;
    }

    // Allergens
    if (restaurantItem.allergens && restaurantItem.allergens.length > 0) {
      details += `  ⚠️  Allergens: ${restaurantItem.allergens.join(', ')}` + LF;
    }

    // Dietary restrictions
    if (restaurantItem.dietaryRestrictions && restaurantItem.dietaryRestrictions.length > 0) {
      details += `  🌱 ${restaurantItem.dietaryRestrictions.join(', ')}` + LF;
    }

    // Special instructions
    if (restaurantItem.specialInstructions) {
      details += `  Note: ${restaurantItem.specialInstructions}` + LF;
    }

    // Preparation time (for kitchen copy)
    if (restaurantItem.preparationTime) {
      details += `  Prep Time: ${restaurantItem.preparationTime} min` + LF;
    }

    return details;
  };

  // Use standard template
  return generateStandardReceipt(data, {
    businessSpecific,
    itemDetailsRenderer,
  });
}

/**
 * 2. Clothing Receipt Template
 * Uses standard template with clothing-specific sections (size, color, brand)
 */
function generateClothingReceipt(data: ReceiptData): string {
  const clothingData = data.businessSpecificData as ClothingReceiptData;

  // Item details renderer: Show size, color, brand
  const itemDetailsRenderer = (item: any, index: number) => {
    const clothingItem = clothingData?.items?.[index] as ClothingReceiptItem;
    if (!clothingItem) return '';

    let details = '';

    // Size and color
    if (clothingItem.size) {
      details += `  Size: ${clothingItem.size}` + LF;
    }
    if (clothingItem.color) {
      details += `  Color: ${clothingItem.color}` + LF;
    }
    if (clothingItem.brand) {
      details += `  Brand: ${clothingItem.brand}` + LF;
    }

    return details;
  };

  // Use standard template (includes R710 token section)
  return generateStandardReceipt(data, {
    itemDetailsRenderer,
  });
}

/**
 * 3. Grocery Receipt Template
 */
function generateGroceryReceipt(data: ReceiptData): string {
  const groceryData = data.businessSpecificData as GroceryReceiptData;

  // Business-specific section: Loyalty points
  let businessSpecific = '';
  if (groceryData?.loyaltyPoints) {
    businessSpecific += `Points Earned: ${groceryData.loyaltyPoints}` + LF;
    businessSpecific += `Points Balance: ${groceryData.loyaltyBalance || 0}` + LF;
  }

  // Item details renderer: Show weight/unit pricing and expiration
  const itemDetailsRenderer = (item: any, index: number) => {
    const groceryItem = groceryData?.items?.[index] as GroceryReceiptItem;
    if (!groceryItem) return '';

    let details = '';

    // Weight and unit pricing for weighed items
    if (groceryItem.weight && groceryItem.unitPricing) {
      details += `  (${groceryItem.weight}${item.unit || 'lb'} @ ${groceryItem.unitPricing})` + LF;
    }

    // Expiration date
    if (groceryItem.expirationDate) {
      details += `  Exp: ${formatDateOnly(groceryItem.expirationDate)}` + LF;
    }

    return details;
  };

  // Footer additions: Return policy
  let footerAdditions = '';
  // const returnPolicy = data.returnPolicy || 'All sales are final, returns not accepted';
  // footerAdditions += wrapText(stripEmojis(returnPolicy), RECEIPT_WIDTH) + LF;
  // footerAdditions += LF;
  // footerAdditions += ALIGN_CENTER;
  // footerAdditions += centerText('Thank you for shopping!') + LF;
  // footerAdditions += centerText('Fresh savings every day!') + LF;

  return generateStandardReceipt(data, {
    businessSpecific,
    itemDetailsRenderer,
    footerAdditions,
  });
}

/**
 * 4. Hardware Receipt Template
 */
function generateHardwareReceipt(data: ReceiptData): string {
  const hardwareData = data.businessSpecificData as HardwareReceiptData;

  // ESC/POS commands
  const ESC = '\x1B'; // ESC
  const GS = '\x1D'; // GS
  const LF = '\x0A'; // Line feed
  const CUT = GS + 'V' + '\x41' + String.fromCharCode(3); // Partial cut paper

  let receipt = '';

  // Initialize printer and reset margins
  receipt += ESC + '@';  // Initialize printer (reset all settings)
  receipt += ESC + 'l' + String.fromCharCode(0);  // Set left margin to 0

  // Header - center align
  receipt += ESC + 'a' + String.fromCharCode(1);
  receipt += centerText(data.businessName) + LF;
  if (data.businessAddress) receipt += centerText(data.businessAddress) + LF;
  if (data.businessPhone) receipt += centerText(`Tel: ${formatPhoneNumberForDisplay(data.businessPhone)}`) + LF;

  // Left align for content
  receipt += ESC + 'a' + String.fromCharCode(0);

  // Receipt info
  receipt += `Receipt: ${data.receiptNumber.formattedNumber}` + LF;
  receipt += `Date: ${formatDateTime(data.transactionDate)}` + LF;
  if (data.salespersonName) {
    receipt += `Salesperson: ${data.salespersonName}` + LF;
  }
  if (hardwareData?.projectReference) {
    receipt += `Project: ${hardwareData.projectReference}` + LF;
  }

  // Items with dimensions and bulk pricing
  data.items.forEach((item, index) => {
    const hardwareItem = hardwareData?.items?.[index] as HardwareReceiptItem;

    let itemLine = item.name;
    if (hardwareItem?.cutToSizeDimensions) {
      itemLine += ` [${hardwareItem.cutToSizeDimensions}]`;
    }

    receipt += formatLineItem(itemLine, item.quantity, item.unitPrice, item.totalPrice);
    if (item.barcode) {
      receipt += `  UPC: ${item.barcode.code} (${item.barcode.type})` + LF;
    } else if (item.sku) {
      receipt += `  SKU: ${item.sku}` + LF;
    }

    if (hardwareItem?.manufacturer) {
      receipt += `  Mfg: ${hardwareItem.manufacturer}` + LF;
    }
    if (hardwareItem?.bulkQuantity && hardwareItem?.bulkPricePerUnit) {
      receipt += `  Bulk: ${hardwareItem.bulkQuantity} @ $${hardwareItem.bulkPricePerUnit.toFixed(2)}` + LF;
    }
    if (hardwareItem?.specialOrderETA) {
      receipt += `  Special Order ETA: ${formatDateOnly(hardwareItem.specialOrderETA)}` + LF;
    }
  });
  // Totals
  receipt += formatTotal('Subtotal', data.subtotal);
  // Only print tax line if tax > 0 AND tax is charged separately
  if (data.tax > 0 && !data.taxIncludedInPrice) {
    receipt += formatTotal('Tax', data.tax);
  }
  if (data.discount) {
    receipt += formatTotal(data.discountLabel || 'Discount', -data.discount);
  }
  receipt += formatTotal('TOTAL', data.total, true);

  // Payment
  receipt += formatPaymentLines(data);

  // Return policy (always print - use default if not configured)
  const hardwareReturnPolicy = data.returnPolicy || 'All sales are final, returns not accepted';
  receipt += LF;
  receipt += wrapText(stripEmojis(hardwareReturnPolicy), RECEIPT_WIDTH) + LF;

  // Footer - center align
  receipt += LF;
  receipt += ESC + 'a' + String.fromCharCode(1);
  if (data.umbrellaPhone) {
    receipt += centerText(data.umbrellaPhone) + LF;
  }
  if (data.customerName) {
    receipt += centerText(`Thank you, ${stripEmojis(data.customerName)}!`) + LF;
    if (data.customerPhone) { receipt += centerText(formatPhoneNumberForDisplay(data.customerPhone)) + LF; }
  } else {
    receipt += centerText('Thank you for your business!') + LF;
  }
  receipt += centerText('Pro contractors welcome!') + LF;

  // Cut paper
  receipt += CUT;

  return receipt;
}

/**
 * 5. Construction Receipt/Invoice Template
 */
function generateConstructionReceipt(data: ReceiptData): string {
  const constructionData = data.businessSpecificData as ConstructionReceiptData;

  // ESC/POS commands
  const ESC = '\x1B'; // ESC
  const GS = '\x1D'; // GS
  const LF = '\x0A'; // Line feed
  const CUT = GS + 'V' + '\x41' + String.fromCharCode(3); // Partial cut paper

  let receipt = '';

  // Initialize printer and reset margins
  receipt += ESC + '@';  // Initialize printer (reset all settings)
  receipt += ESC + 'l' + String.fromCharCode(0);  // Set left margin to 0

  // Header - center align
  receipt += ESC + 'a' + String.fromCharCode(1);
  receipt += centerText(data.businessName) + LF;
  if (data.businessAddress) receipt += centerText(data.businessAddress) + LF;
  if (data.businessPhone) receipt += centerText(`Tel: ${formatPhoneNumberForDisplay(data.businessPhone)}`) + LF;
  receipt += centerText('*** INVOICE ***') + LF;

  // Left align for content
  receipt += ESC + 'a' + String.fromCharCode(0);

  // Invoice info
  receipt += `Invoice: ${data.receiptNumber.formattedNumber}` + LF;
  receipt += `Date: ${formatDateTime(data.transactionDate)}` + LF;
  if (data.salespersonName) {
    receipt += `Salesperson: ${data.salespersonName}` + LF;
  }

  if (constructionData) {
    receipt += `Project: ${constructionData.projectName}` + LF;
    receipt += `Code: ${constructionData.projectCode}` + LF;
    receipt += `Contractor: ${constructionData.contractorName}` + LF;
    receipt += `Contact: ${constructionData.contractorContact}` + LF;

    // Project timeline
    receipt += 'Project Timeline:' + LF;
    receipt += `  Start: ${formatDateOnly(constructionData.projectTimeline.startDate)}` + LF;
    receipt += `  End: ${formatDateOnly(constructionData.projectTimeline.endDate)}` + LF;
    receipt += `  Phase: ${constructionData.projectTimeline.currentPhase}` + LF;

    // Budget tracking
    receipt += 'Budget Status:' + LF;
    receipt += formatTotal('Total Budget', constructionData.budgetTotal);
    receipt += formatTotal('Spent', constructionData.budgetSpent);
    receipt += formatTotal('Remaining', constructionData.budgetTotal - constructionData.budgetSpent);
  }

  // Line items
  data.items.forEach(item => {
    receipt += formatLineItem(item.name, item.quantity, item.unitPrice, item.totalPrice);
    if (item.barcode) {
      receipt += `  UPC: ${item.barcode.code} (${item.barcode.type})` + LF;
    } else if (item.sku) {
      receipt += `  SKU: ${item.sku}` + LF;
    }
  });
  // Cost breakdown
  if (constructionData?.laborCost || constructionData?.materialsCost) {
    if (constructionData.materialsCost) {
      receipt += formatTotal('Materials', constructionData.materialsCost);
    }
    if (constructionData.laborHours && constructionData.laborCost) {
      receipt += formatTotal(`Labor (${constructionData.laborHours}hrs)`, constructionData.laborCost);
    }
  }

  // Totals
  receipt += formatTotal('Subtotal', data.subtotal);
  // Only print tax line if tax > 0 AND tax is charged separately
  if (data.tax > 0 && !data.taxIncludedInPrice) {
    receipt += formatTotal('Tax', data.tax);
  }
  receipt += formatTotal('TOTAL', data.total, true);

  // Payment terms
  if (constructionData?.paymentTerms) {
    receipt += `Terms: ${constructionData.paymentTerms}` + LF;
  }
  receipt += formatPaymentLines(data);

  // Return policy (always print - use default if not configured)
  const constructionReturnPolicy = data.returnPolicy || 'All sales are final, returns not accepted';
  receipt += LF;
  receipt += wrapText(stripEmojis(constructionReturnPolicy), RECEIPT_WIDTH) + LF;

  // Footer - center align
  receipt += LF;
  receipt += ESC + 'a' + String.fromCharCode(1);
  if (data.umbrellaPhone) {
    receipt += centerText(data.umbrellaPhone) + LF;
  }
  if (data.customerName) {
    receipt += centerText(`Thank you, ${stripEmojis(data.customerName)}!`) + LF;
    if (data.customerPhone) { receipt += centerText(formatPhoneNumberForDisplay(data.customerPhone)) + LF; }
  } else {
    receipt += centerText('Thank you for your business!') + LF;
  }

  // Cut paper
  receipt += CUT;

  return receipt;
}

/**
 * 6. Vehicles Service Receipt Template
 */
function generateVehiclesReceipt(data: ReceiptData): string {
  const vehiclesData = data.businessSpecificData as VehiclesReceiptData;

  // ESC/POS commands
  const ESC = '\x1B'; // ESC
  const GS = '\x1D'; // GS
  const LF = '\x0A'; // Line feed
  const CUT = GS + 'V' + '\x41' + String.fromCharCode(3); // Partial cut paper

  let receipt = '';

  // Initialize printer and reset margins
  receipt += ESC + '@';  // Initialize printer (reset all settings)
  receipt += ESC + 'l' + String.fromCharCode(0);  // Set left margin to 0

  // Header - center align
  receipt += ESC + 'a' + String.fromCharCode(1);
  receipt += centerText(data.businessName) + LF;
  if (data.businessAddress) receipt += centerText(data.businessAddress) + LF;
  if (data.businessPhone) receipt += centerText(`Tel: ${formatPhoneNumberForDisplay(data.businessPhone)}`) + LF;
  receipt += centerText('SERVICE RECEIPT') + LF;

  // Left align for content
  receipt += ESC + 'a' + String.fromCharCode(0);

  // Receipt info
  receipt += `Receipt: ${data.receiptNumber.formattedNumber}` + LF;
  receipt += `Date: ${formatDateTime(data.transactionDate)}` + LF;
  if (data.salespersonName) {
    receipt += `Salesperson: ${data.salespersonName}` + LF;
  }
  if (vehiclesData?.technicianName && vehiclesData.technicianName !== data.salespersonName) {
    receipt += `Technician: ${vehiclesData.technicianName}` + LF;
  }

  // Vehicle info
  if (vehiclesData?.vehicleInfo) {
    const v = vehiclesData.vehicleInfo;
    receipt += 'Vehicle Information:' + LF;
    receipt += `  ${v.year} ${v.make} ${v.model}` + LF;
    receipt += `  Plate: ${v.licensePlate}` + LF;
    if (v.vin) {
      receipt += `  VIN: ${v.vin}` + LF;
    }
    receipt += `  Mileage: ${vehiclesData.currentMileage.toLocaleString()}` + LF;
  }

  // Services performed
  if (vehiclesData?.servicesPerformed && vehiclesData.servicesPerformed.length > 0) {
    receipt += 'Services Performed:' + LF;
    vehiclesData.servicesPerformed.forEach(service => {
      receipt += `  • ${service}` + LF;
    });
  }

  // Parts used
  if (vehiclesData?.partsUsed && vehiclesData.partsUsed.length > 0) {
    receipt += 'Parts:' + LF;
    vehiclesData.partsUsed.forEach(part => {
      receipt += formatLineItem(
        `${part.partName} [${part.partNumber}]`,
        part.quantity,
        part.price,
        part.price * part.quantity
      );
    });
  }

  // Labor
  if (vehiclesData?.laborHours && vehiclesData?.laborRate) {
    receipt += formatTotal(`Labor (${vehiclesData.laborHours}hrs @ $${vehiclesData.laborRate}/hr)`,
      vehiclesData.laborHours * vehiclesData.laborRate);
  }

  // Totals
  receipt += formatTotal('Subtotal', data.subtotal);
  // Only print tax line if tax > 0 AND tax is charged separately
  if (data.tax > 0 && !data.taxIncludedInPrice) {
    receipt += formatTotal('Tax', data.tax);
  }
  receipt += formatTotal('TOTAL', data.total, true);

  // Payment
  receipt += formatPaymentLines(data);

  // Next service
  if (vehiclesData?.nextServiceDue) {
    receipt += LF;
    receipt += 'Next Service Due:' + LF;
    receipt += `  @ ${vehiclesData.nextServiceDue.mileage.toLocaleString()} miles` + LF;
    receipt += `  or ${formatDateOnly(vehiclesData.nextServiceDue.date)}` + LF;
  }

  // Warranty
  if (vehiclesData?.warranty) {
    receipt += LF;
    receipt += `Warranty: ${vehiclesData.warranty}` + LF;
  }

  // Return policy (always print - use default if not configured)
  const vehiclesReturnPolicy = data.returnPolicy || 'All sales are final, returns not accepted';
  receipt += LF;
  receipt += wrapText(stripEmojis(vehiclesReturnPolicy), RECEIPT_WIDTH) + LF;

  // Footer - center align
  receipt += LF;
  receipt += ESC + 'a' + String.fromCharCode(1);
  if (data.umbrellaPhone) {
    receipt += centerText(data.umbrellaPhone) + LF;
  }
  if (data.customerName) {
    receipt += centerText(`Thank you, ${stripEmojis(data.customerName)}!`) + LF;
    if (data.customerPhone) { receipt += centerText(formatPhoneNumberForDisplay(data.customerPhone)) + LF; }
  } else {
    receipt += centerText('Thank you for your business!') + LF;
  }
  receipt += centerText('Drive safe!') + LF;

  // Cut paper
  receipt += CUT;

  return receipt;
}

/**
 * 7. Consulting Receipt/Invoice Template
 */
function generateConsultingReceipt(data: ReceiptData): string {
  const consultingData = data.businessSpecificData as ConsultingReceiptData;

  // ESC/POS commands
  const ESC = '\x1B'; // ESC
  const GS = '\x1D'; // GS
  const LF = '\x0A'; // Line feed
  const CUT = GS + 'V' + '\x41' + String.fromCharCode(3); // Partial cut paper

  let receipt = '';

  // Initialize printer and reset margins
  receipt += ESC + '@';  // Initialize printer (reset all settings)
  receipt += ESC + 'l' + String.fromCharCode(0);  // Set left margin to 0

  // Header - center align
  receipt += ESC + 'a' + String.fromCharCode(1);
  receipt += centerText(data.businessName) + LF;
  if (data.businessAddress) receipt += centerText(data.businessAddress) + LF;
  if (data.businessPhone) receipt += centerText(`Tel: ${formatPhoneNumberForDisplay(data.businessPhone)}`) + LF;
  receipt += centerText('CONSULTING INVOICE') + LF;

  // Left align for content
  receipt += ESC + 'a' + String.fromCharCode(0);

  // Invoice info
  if (consultingData) {
    receipt += `Invoice: ${consultingData.invoiceNumber}` + LF;
    receipt += `Date: ${formatDateOnly(consultingData.invoiceDate)}` + LF;
    if (data.salespersonName) {
      receipt += `Salesperson: ${data.salespersonName}` + LF;
    }

    // Client info
    receipt += 'Client:' + LF;
    receipt += `  ${consultingData.clientName}` + LF;
    receipt += `  ${consultingData.clientContact}` + LF;
    receipt += LF + `Project: ${consultingData.projectName}` + LF;

    // Service hours breakdown
    if (consultingData.serviceHours && consultingData.serviceHours.length > 0) {
      receipt += 'Hours Breakdown:' + LF;
      consultingData.serviceHours.forEach(entry => {
        receipt += `${formatDateOnly(entry.date)}:` + LF;
        receipt += `  ${entry.hours}hrs @ $${entry.hourlyRate}/hr` + LF;
        receipt += `  ${entry.description}` + LF;
        receipt += formatTotal('  Total', entry.hours * entry.hourlyRate);
        receipt += LF;
      });
      
    }
  }

  // Line items
  data.items.forEach(item => {
    receipt += formatLineItem(item.name, item.quantity, item.unitPrice, item.totalPrice);
    if (item.barcode) {
      receipt += `  UPC: ${item.barcode.code} (${item.barcode.type})` + LF;
    } else if (item.sku) {
      receipt += `  SKU: ${item.sku}` + LF;
    }
  });
  // Totals
  receipt += formatTotal('Subtotal', data.subtotal);
  // Only print tax line if tax > 0 AND tax is charged separately
  if (data.tax > 0 && !data.taxIncludedInPrice) {
    receipt += formatTotal('Tax', data.tax);
  }
  receipt += formatTotal('TOTAL', data.total, true);

  // Payment terms
  if (consultingData?.paymentTerms) {
    receipt += `Payment Terms: ${consultingData.paymentTerms}` + LF;
  }
  receipt += formatPaymentLines(data);

  // Return policy (always print - use default if not configured)
  const consultingReturnPolicy = data.returnPolicy || 'All sales are final, returns not accepted';
  receipt += LF;
  receipt += wrapText(stripEmojis(consultingReturnPolicy), RECEIPT_WIDTH) + LF;

  // Footer - center align
  receipt += LF;
  receipt += ESC + 'a' + String.fromCharCode(1);
  if (data.umbrellaPhone) {
    receipt += centerText(data.umbrellaPhone) + LF;
  }
  if (data.customerName) {
    receipt += centerText(`Thank you, ${stripEmojis(data.customerName)}!`) + LF;
    if (data.customerPhone) { receipt += centerText(formatPhoneNumberForDisplay(data.customerPhone)) + LF; }
  } else {
    receipt += centerText('Thank you for your business!') + LF;
  }

  // Cut paper
  receipt += CUT;

  return receipt;
}

/**
 * 8. Retail Receipt Template
 */
function generateRetailReceipt(data: ReceiptData): string {
  const retailData = data.businessSpecificData as RetailReceiptData;

  // ESC/POS commands
  const ESC = '\x1B'; // ESC
  const GS = '\x1D'; // GS
  const LF = '\x0A'; // Line feed
  const CUT = GS + 'V' + '\x41' + String.fromCharCode(3); // Partial cut paper

  let receipt = '';

  // Initialize printer and reset margins
  receipt += ESC + '@';  // Initialize printer (reset all settings)
  receipt += ESC + 'l' + String.fromCharCode(0);  // Set left margin to 0

  // Header - center align
  receipt += ESC + 'a' + String.fromCharCode(1);
  receipt += centerText(data.businessName) + LF;
  if (data.businessAddress) receipt += centerText(data.businessAddress) + LF;
  if (data.businessPhone) receipt += centerText(`Tel: ${formatPhoneNumberForDisplay(data.businessPhone)}`) + LF;

  // Left align for content
  receipt += ESC + 'a' + String.fromCharCode(0);

  // Receipt info
  receipt += `Receipt: ${data.receiptNumber.formattedNumber}` + LF;
  receipt += `Date: ${formatDateTime(data.transactionDate)}` + LF;
  if (data.salespersonName) {
    receipt += `Salesperson: ${data.salespersonName}` + LF;
  }

  // Items
  data.items.forEach(item => {
    receipt += formatLineItem(item.name, item.quantity, item.unitPrice, item.totalPrice);
    if (item.barcode) {
      receipt += `  UPC: ${item.barcode.code} (${item.barcode.type})` + LF;
    } else if (item.sku) {
      receipt += `  SKU: ${item.sku}` + LF;
    }
  });
  // Totals
  receipt += formatTotal('Subtotal', data.subtotal);
  // Only print tax line if tax > 0 AND tax is charged separately
  if (data.tax > 0 && !data.taxIncludedInPrice) {
    receipt += formatTotal('Tax', data.tax);
  }
  if (data.discount) {
    receipt += formatTotal(data.discountLabel || 'Discount', -data.discount);
  }
  receipt += formatTotal('TOTAL', data.total, true);

  // Payment
  receipt += formatPaymentLines(data);

  // Loyalty points
  if (retailData?.loyaltyPoints) {
    receipt += LF;
    receipt += `Points Earned: ${retailData.loyaltyPoints}` + LF;
    receipt += `Points Balance: ${retailData.loyaltyBalance || 0}` + LF;
  }

  // Promotions
  if (retailData?.promotions && retailData.promotions.length > 0) {
    receipt += LF;
    receipt += 'Active Promotions:' + LF;
    retailData.promotions.forEach(promo => {
      receipt += `  • ${promo}` + LF;
    });
  }

  // Return policy (always print - use default if not configured)
  const retailReturnPolicy = data.returnPolicy || 'All sales are final, returns not accepted';
  receipt += LF;
  receipt += wrapText(stripEmojis(retailReturnPolicy), RECEIPT_WIDTH) + LF;

  // Footer - center align
  receipt += LF;
  receipt += ESC + 'a' + String.fromCharCode(1);
  if (retailData?.surveyQRCode) {
    receipt += centerText('Scan for Survey & Save 10%!') + LF;
    receipt += centerText('[QR CODE]') + LF;
    receipt += LF;
  }
  if (data.umbrellaPhone) {
    receipt += centerText(data.umbrellaPhone) + LF;
  }
  if (data.customerName) {
    receipt += centerText(`Thank you, ${stripEmojis(data.customerName)}!`) + LF;
    if (data.customerPhone) { receipt += centerText(formatPhoneNumberForDisplay(data.customerPhone)) + LF; }
  } else {
    receipt += centerText('Thank you for shopping!') + LF;
  }
  receipt += LF;

  // Cut paper
  receipt += CUT;

  return receipt;
}

/**
 * 9. Services Receipt Template
 * Uses standard template (which includes R710 WiFi token section) with service-specific sections
 */
function generateServicesReceipt(data: ReceiptData): string {
  const servicesData = data.businessSpecificData as ServicesReceiptData;
  const LF = '\x0A';

  // Business-specific section: Technician, service description, labor, parts
  let businessSpecific = '';
  if (servicesData?.technicianName && servicesData.technicianName !== data.salespersonName) {
    businessSpecific += `Technician: ${stripEmojis(servicesData.technicianName)}` + LF;
    if (servicesData?.technicianId) {
      businessSpecific += `Tech ID: ${servicesData.technicianId}` + LF;
    }
  }
  if (servicesData?.serviceDescription) {
    businessSpecific += 'Service:' + LF;
    businessSpecific += wrapText(stripEmojis(servicesData.serviceDescription)) + LF;
  }
  if (servicesData?.laborHours && servicesData?.hourlyRate) {
    businessSpecific += formatTotal(`Labor (${servicesData.laborHours}hrs @ $${servicesData.hourlyRate}/hr)`,
      servicesData.laborHours * servicesData.hourlyRate);
  }
  if (servicesData?.partsUsed && servicesData.partsUsed.length > 0) {
    businessSpecific += 'Parts:' + LF;
    servicesData.partsUsed.forEach(part => {
      businessSpecific += formatLineItem(part.name, part.quantity, part.price, part.price * part.quantity);
    });
  }

  // Footer additions: warranty, follow-up
  let footerAdditions = '';
  if (servicesData?.warranty) {
    footerAdditions += `Warranty: ${stripEmojis(servicesData.warranty)}` + LF;
  }
  if (servicesData?.followUpDate) {
    footerAdditions += `Follow-up: ${formatDateOnly(servicesData.followUpDate)}` + LF;
  }

  // Use standard template (includes R710 WiFi token section)
  return generateStandardReceipt(data, {
    businessSpecific,
    footerAdditions,
  });
}

/**
 * 10. Generic Receipt Template (fallback)
 */
function generateGenericReceipt(data: ReceiptData): string {
  // ESC/POS commands
  const ESC = '\x1B'; // ESC
  const GS = '\x1D'; // GS
  const LF = '\x0A'; // Line feed
  const CUT = GS + 'V' + '\x41' + String.fromCharCode(3); // Partial cut paper

  let receipt = '';

  // Initialize printer and reset margins
  receipt += ESC + '@';  // Initialize printer (reset all settings)
  receipt += ESC + 'l' + String.fromCharCode(0);  // Set left margin to 0

  // Header - center align
  receipt += ESC + 'a' + String.fromCharCode(1);
  receipt += centerText(data.businessName) + LF;
  if (data.businessAddress) receipt += centerText(data.businessAddress) + LF;
  if (data.businessPhone) receipt += centerText(`Tel: ${formatPhoneNumberForDisplay(data.businessPhone)}`) + LF;

  // Left align for content
  receipt += ESC + 'a' + String.fromCharCode(0);

  // Receipt info
  receipt += `Receipt: ${data.receiptNumber.formattedNumber}` + LF;
  receipt += `Date: ${formatDateTime(data.transactionDate)}` + LF;
  if (data.salespersonName) {
    receipt += `Salesperson: ${data.salespersonName}` + LF;
  }

  // Items
  data.items.forEach(item => {
    receipt += formatLineItem(item.name, item.quantity, item.unitPrice, item.totalPrice);
    if (item.barcode) {
      receipt += `  UPC: ${item.barcode.code} (${item.barcode.type})\n`;
    } else if (item.sku) {
      receipt += `  SKU: ${item.sku}\n`;
    }
    if (item.notes) {
      receipt += `  ${item.notes}` + LF;
    }
  });
  // Totals
  receipt += formatTotal('Subtotal', data.subtotal);
  // Only print tax line if tax > 0 AND tax is charged separately
  if (data.tax > 0 && !data.taxIncludedInPrice) {
    receipt += formatTotal('Tax', data.tax);
  }
  if (data.discount) {
    receipt += formatTotal(data.discountLabel || 'Discount', -data.discount);
  }
  receipt += formatTotal('TOTAL', data.total, true);

  // Payment
  receipt += formatPaymentLines(data);

  // Return policy (always print - use default if not configured)
  const genericReturnPolicy = data.returnPolicy || 'All sales are final, returns not accepted';
  receipt += LF;
  receipt += wrapText(stripEmojis(genericReturnPolicy), RECEIPT_WIDTH) + LF;

  // Footer - center align
  receipt += ESC + 'a' + String.fromCharCode(1);
  receipt += LF;
  if (data.umbrellaPhone) {
    receipt += centerText(data.umbrellaPhone) + LF;
  }
  if (data.customerName) {
    receipt += centerText(`Thank you, ${stripEmojis(data.customerName)}!`) + LF;
    if (data.customerPhone) { receipt += centerText(formatPhoneNumberForDisplay(data.customerPhone)) + LF; }
  } else {
    receipt += centerText(data.footerMessage || 'Thank you!') + LF;
  }

  // Cut paper
  receipt += CUT;

  return receipt;
}

// ============================================================================
// Utility Functions
// ============================================================================

function centerText(text: string): string {
  const ESC = '\x1B';
  const LF = '\x0A';
  // ESC/POS handles centering automatically - don't add manual padding
  // ESC a 1 = center, ESC a 0 = left align
  return text; // Just return text, alignment is set by caller
}

function line(char: string = '='): string {
  return char.repeat(RECEIPT_WIDTH);
}

/**
 * Build payment lines for a receipt section.
 * For EcoCash: shows ref, sub-total, fee, total paid.
 * For other methods: shows amount paid and change.
 */
const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: 'Cash',
  CARD: 'Card',
  MOBILE: 'Mobile Money',
  MOBILE_MONEY: 'Mobile Money',
  ECOCASH: 'EcoCash',
  ON_DELIVERY: 'Pay on Delivery',
  ON_PICKUP: 'Pay on Pickup',
  EXPENSE_ACCOUNT: 'Expense Account',
  BANK_TRANSFER: 'Bank Transfer',
  STORE_CREDIT: 'Store Credit',
}

function formatPaymentLines(data: ReceiptData): string {
  const method = data.paymentMethod.toUpperCase()
  const label = PAYMENT_METHOD_LABELS[method] || data.paymentMethod
  let out = `Payment: ${label}` + LF;
  if (method === 'ECOCASH') {
    if (data.ecocashTransactionCode) {
      out += `EcoCash Ref: ${data.ecocashTransactionCode}` + LF;
    }
    const fee = data.ecocashFeeAmount || 0;
    if (fee > 0) {
      out += formatTotal('Sub-total', data.total);
      out += formatTotal('EcoCash Fee', fee);
      out += formatTotal('Total Paid', data.total + fee);
    }
  } else if (method === 'ON_DELIVERY') {
    out += formatTotal('Due on Delivery', data.total);
  } else if (method === 'ON_PICKUP') {
    out += formatTotal('Due on Pickup', data.total);
  } else {
    if (data.amountPaid) {
      out += formatTotal('Amount Paid', data.amountPaid);
    }
    if (data.changeDue && data.changeDue > 0) {
      out += formatTotal('Change', data.changeDue);
    }
  }
  return out;
}

// Note: formatDateTime and formatDateOnly are now imported from @/lib/date-format for consistent global formatting

function formatMoney(amount: number | undefined | null): string {
  const safeAmount = typeof amount === 'number' ? amount : 0;
  return `$${safeAmount.toFixed(2)}`;
}

function formatLineItem(name: string, qty: number, unitPrice: number, total: number): string {
  const qtyStr = qty > 1 ? `${qty}x ` : '';
  const cleanName = stripEmojis(name); // Strip emojis from item name
  const nameWithQty = `${qtyStr}${cleanName}`;
  const totalStr = formatMoney(total);

  // Try to fit on one line
  if (nameWithQty.length + totalStr.length + 1 <= RECEIPT_WIDTH) {
    const padding = RECEIPT_WIDTH - nameWithQty.length - totalStr.length;
    return nameWithQty + ' '.repeat(padding) + totalStr + '\n';
  } else {
    // Multi-line if name is too long
    return nameWithQty + '\n' + ' '.repeat(RECEIPT_WIDTH - totalStr.length) + totalStr + '\n';
  }
}

function formatTotal(label: string, amount: number | undefined | null, bold: boolean = false): string {
  const amountStr = formatMoney(amount);
  const padding = RECEIPT_WIDTH - label.length - amountStr.length;
  return label + ' '.repeat(Math.max(1, padding)) + amountStr + '\n';
}

function wrapText(text: string, width: number = RECEIPT_WIDTH): string {
  const words = text.split(' ');
  let lines: string[] = [];
  let currentLine = '';

  words.forEach(word => {
    if ((currentLine + word).length > width) {
      if (currentLine) lines.push(currentLine.trim());
      currentLine = word + ' ';
    } else {
      currentLine += word + ' ';
    }
  });

  if (currentLine) lines.push(currentLine.trim());

  return lines.join('\n');
}

// Duration formatting now uses smart formatter from format-utils
// Delegates to formatDurationSmart for consistent MB→GB, mins→hours/days formatting
function formatDuration(minutes: number): string {
  return formatDurationSmart(minutes);
}

// ─────────────────────────────────────────────────────────────────────────────
// MBM-184: DELIVERY RECEIPT TEMPLATES
// ─────────────────────────────────────────────────────────────────────────────

export interface DeliveryReceiptItem {
  name: string
  quantity: number
}

export interface DeliveryReceiptData {
  businessName: string
  businessAddress?: string
  businessPhone?: string
  orderNumber: string
  orderId: string
  customerName: string
  customerPhone?: string
  items: DeliveryReceiptItem[]
  deliveryNote?: string
  transactionDate: Date
  barcodeEscPos?: string   // pre-rendered GS v 0 raster from generateBarcodeEscPos()
  dailyDeliveryCount?: number  // today's delivery order sequence count
  // Credit / payment fields (customer copy only)
  orderTotal?: number
  creditUsed?: number
  creditBalance?: number  // remaining after this order
  paymentMode?: 'PREPAID' | 'PARTIAL' | 'ON_DELIVERY'
}

export interface DeliveryRunSheetData {
  businessName: string
  runDate: Date
  driverName: string
  vehiclePlate?: string
  odometerStart?: number
  orders: Array<{
    orderNumber: string
    customerName: string
    deliveryNote?: string   // address / instructions
    amountDue: number       // cash to collect (total - creditUsed)
    paymentMode: string
  }>
}

/**
 * Kitchen copy — no prices, bold DELIVERY COPY header, items + qty only.
 * Printed immediately when a delivery order is placed.
 */
export function generateDeliveryKitchenReceipt(data: DeliveryReceiptData): string {
  let r = ''
  r += ESC + '@'  // initialise printer

  r += ALIGN_CENTER
  r += centerText(stripEmojis(data.businessName)) + LF
  if (data.businessAddress) r += centerText(stripEmojis(data.businessAddress)) + LF
  r += LF
  r += line('=') + LF
  const kitchenHeader = data.dailyDeliveryCount !== undefined
    ? (() => {
        const left = 'KITCHEN COPY -- DELIVERY'
        const right = `#${data.dailyDeliveryCount}`
        const pad = RECEIPT_WIDTH - left.length - right.length
        return left + ' '.repeat(Math.max(1, pad)) + right
      })()
    : centerText('KITCHEN COPY -- DELIVERY')
  r += kitchenHeader + LF
  r += line('=') + LF

  r += ALIGN_LEFT
  r += `Order : ${data.orderNumber}` + LF
  r += `Date  : ${formatDateTime(data.transactionDate)}` + LF
  r += `Name  : ${stripEmojis(data.customerName)}` + LF
  if (data.customerPhone) r += `Phone : ${formatPhoneNumberForDisplay(data.customerPhone)}` + LF

  if (data.deliveryNote) {
    r += line('-') + LF
    r += `Note: ${stripEmojis(data.deliveryNote)}` + LF
  }

  r += line('-') + LF
  r += ALIGN_CENTER
  r += 'ITEMS' + LF
  r += ALIGN_LEFT
  r += line('-') + LF

  data.items.forEach((item) => {
    // qty right-aligned against name, no price
    const name = stripEmojis(item.name).substring(0, 30)
    const qty = `x${item.quantity}`
    const pad = RECEIPT_WIDTH - name.length - qty.length
    r += name + ' '.repeat(Math.max(1, pad)) + qty + LF
  })

  r += line('=') + LF

  // Barcode raster — pre-rendered via generateBarcodeEscPos() in the browser
  if (data.barcodeEscPos) {
    r += ALIGN_CENTER
    r += LF
    r += data.barcodeEscPos
    r += LF + LF
  }

  r += CUT
  return r
}

/**
 * Customer copy — full receipt with delivery note + credit/payment section + barcode.
 * Barcode encodes "DEL-{orderId}" for global scan handler.
 */
export function generateDeliveryCustomerReceipt(data: DeliveryReceiptData): string {
  let r = ''
  r += ESC + '@'

  r += ALIGN_CENTER
  r += centerText(stripEmojis(data.businessName)) + LF
  if (data.businessAddress) r += centerText(stripEmojis(data.businessAddress)) + LF
  if (data.businessPhone)   r += centerText(`Tel: ${formatPhoneNumberForDisplay(data.businessPhone)}`) + LF
  r += LF
  r += line('=') + LF
  const deliveryHeader = data.dailyDeliveryCount !== undefined
    ? (() => {
        const left = 'DELIVERY ORDER'
        const right = `#${data.dailyDeliveryCount}`
        const pad = RECEIPT_WIDTH - left.length - right.length
        return left + ' '.repeat(Math.max(1, pad)) + right
      })()
    : centerText('DELIVERY ORDER')
  r += deliveryHeader + LF
  r += line('=') + LF

  r += ALIGN_LEFT
  r += `Order  : ${data.orderNumber}` + LF
  r += `Date   : ${formatDateTime(data.transactionDate)}` + LF
  r += `Name   : ${stripEmojis(data.customerName)}` + LF
  if (data.customerPhone) r += `Phone  : ${formatPhoneNumberForDisplay(data.customerPhone)}` + LF

  if (data.deliveryNote) {
    r += line('-') + LF
    r += wrapText(`Delivery note: ${stripEmojis(data.deliveryNote)}`, RECEIPT_WIDTH) + LF
  }

  r += line('-') + LF
  data.items.forEach((item) => {
    const name = stripEmojis(item.name).substring(0, 30)
    const qty = `x${item.quantity}`
    const pad = RECEIPT_WIDTH - name.length - qty.length
    r += name + ' '.repeat(Math.max(1, pad)) + qty + LF
  })
  r += line('-') + LF

  // Payment / credit section
  if (data.orderTotal !== undefined) {
    r += formatTotal('Order Total', data.orderTotal)
  }
  if (data.creditUsed && data.creditUsed > 0) {
    r += formatTotal('Credit Used', -data.creditUsed)
  }

  const balanceDue = (data.orderTotal || 0) - (data.creditUsed || 0)
  r += formatTotal('Balance Due', balanceDue, true)

  r += line('-') + LF

  if (data.paymentMode === 'PREPAID') {
    r += ALIGN_CENTER
    r += 'PAID IN FULL (prepaid credit)' + LF
    if (data.creditBalance !== undefined) {
      r += `Remaining credit: $${data.creditBalance.toFixed(2)}` + LF
    }
  } else if (data.paymentMode === 'PARTIAL') {
    r += ALIGN_CENTER
    r += 'PARTIAL PREPAY -- balance due on delivery' + LF
    if (data.creditBalance !== undefined) {
      r += `Remaining credit: $${data.creditBalance.toFixed(2)}` + LF
    }
  } else {
    r += ALIGN_CENTER
    r += 'PAYMENT DUE ON DELIVERY' + LF
  }

  // Barcode raster — pre-rendered via generateBarcodeEscPos() in the browser
  if (data.barcodeEscPos) {
    r += LF
    r += ALIGN_CENTER
    r += data.barcodeEscPos
    r += LF
  }

  r += ALIGN_CENTER
  r += centerText('Thank you for your order!') + LF
  r += CUT
  return r
}

/**
 * Driver run sheet — single long printout listing all orders in a delivery run.
 * Driver uses as a physical checklist; printed before dispatch.
 */
export function generateDeliveryRunSheet(data: DeliveryRunSheetData): string {
  let r = ''
  r += ESC + '@'

  r += ALIGN_CENTER
  r += centerText(stripEmojis(data.businessName)) + LF
  r += line('=') + LF
  r += centerText('DELIVERY RUN SHEET') + LF
  r += line('=') + LF

  r += ALIGN_LEFT
  r += `Date   : ${formatDateTime(data.runDate)}` + LF
  r += `Driver : ${stripEmojis(data.driverName)}` + LF
  if (data.vehiclePlate) r += `Vehicle: ${data.vehiclePlate}` + LF
  if (data.odometerStart != null) r += `Odo Out: ${data.odometerStart} km` + LF
  r += `Odo In : ____________` + LF
  r += line('=') + LF

  r += ALIGN_CENTER
  r += `${data.orders.length} ORDERS` + LF
  r += ALIGN_LEFT
  r += line('=') + LF

  data.orders.forEach((order, i) => {
    r += `[${i + 1}] Order: ${order.orderNumber}` + LF
    r += `    Name : ${stripEmojis(order.customerName)}` + LF
    if (order.deliveryNote) {
      r += wrapText(`    Addr : ${stripEmojis(order.deliveryNote)}`, RECEIPT_WIDTH) + LF
    }
    if (order.paymentMode === 'PREPAID') {
      r += `    Pay  : PREPAID (no cash)` + LF
    } else {
      r += `    Pay  : COLLECT $${order.amountDue.toFixed(2)}` + LF
    }
    r += `    Done : [ ]` + LF
    r += line('-') + LF
  })

  const cashOrders = data.orders.filter(o => o.paymentMode !== 'PREPAID')
  const totalCash = cashOrders.reduce((s, o) => s + o.amountDue, 0)
  r += ALIGN_RIGHT
  r += `Total to collect: $${totalCash.toFixed(2)}` + LF
  r += ALIGN_LEFT
  r += LF
  r += `Signature: _______________________` + LF
  r += CUT
  return r
}
