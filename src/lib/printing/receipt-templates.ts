/**
 * Receipt Templates
 * Business-specific receipt templates for all 10 business types
 * Generates formatted receipt text suitable for thermal printers
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

// Thermal printer width (characters per line)
// EPSON TM-T20III with 80mm paper = 42 characters
// For 58mm paper, use 32 characters
const RECEIPT_WIDTH = 42;

/**
 * Generate receipt based on business type
 */
export function generateReceipt(data: ReceiptData): string {
  switch (data.businessType) {
    case 'restaurant':
      return generateRestaurantReceipt(data);
    case 'clothing':
      return generateClothingReceipt(data);
    case 'grocery':
      return generateGroceryReceipt(data);
    case 'hardware':
      return generateHardwareReceipt(data);
    case 'construction':
      return generateConstructionReceipt(data);
    case 'vehicles':
      return generateVehiclesReceipt(data);
    case 'consulting':
      return generateConsultingReceipt(data);
    case 'retail':
      return generateRetailReceipt(data);
    case 'services':
      return generateServicesReceipt(data);
    default:
      return generateGenericReceipt(data);
  }
}

/**
 * 1. Restaurant Receipt Template
 * Supports dual receipts (kitchen + customer)
 */
function generateRestaurantReceipt(data: ReceiptData): string {
  const restaurantData = data.businessSpecificData as RestaurantReceiptData;
  const isKitchenReceipt = restaurantData?.receiptType === 'kitchen';

  // ESC/POS commands
  const ESC = '\x1B'; // ESC
  const LF = '\x0A'; // Line feed
  const CUT = ESC + 'd' + String.fromCharCode(3); // Cut paper

  let receipt = '';

  // Initialize printer and reset margins
  receipt += ESC + '@';  // Initialize printer (reset all settings)
  receipt += ESC + 'l' + String.fromCharCode(0);  // Set left margin to 0

  // Header - center align
  receipt += ESC + 'a' + String.fromCharCode(1);
  receipt += '='.repeat(RECEIPT_WIDTH) + LF;
  receipt += centerText(data.businessName) + LF;
  if (data.businessAddress) receipt += centerText(data.businessAddress) + LF;
  if (data.businessPhone) receipt += centerText(data.businessPhone) + LF;
  receipt += '='.repeat(RECEIPT_WIDTH) + LF;

  // Receipt type
  receipt += centerText(isKitchenReceipt ? '*** KITCHEN COPY ***' : 'CUSTOMER RECEIPT') + LF;
  receipt += '='.repeat(RECEIPT_WIDTH) + LF;

  // Left align for content
  receipt += ESC + 'a' + String.fromCharCode(0);

  // Receipt number and date
  receipt += `Receipt: ${data.receiptNumber.formattedNumber}` + LF;
  receipt += `Date: ${formatDate(data.transactionDate)}` + LF;
  receipt += `Transaction: ${data.transactionId}` + LF;

  if (restaurantData?.tableNumber) {
    receipt += `Table: ${restaurantData.tableNumber}` + LF;
  }
  if (restaurantData?.serverName) {
    receipt += `Server: ${restaurantData.serverName}` + LF;
  }

  receipt += '='.repeat(RECEIPT_WIDTH) + LF;

  // Items
  if (isKitchenReceipt && restaurantData?.items) {
    // Kitchen receipt with cooking instructions
    restaurantData.items.forEach((item: RestaurantReceiptItem) => {
      receipt += `${item.quantity}x ${item.name}` + LF;

      if (item.spiceLevel) {
        receipt += `  Spice Level: ${'🌶️'.repeat(item.spiceLevel)}` + LF;
      }
      if (item.allergens && item.allergens.length > 0) {
        receipt += `  ⚠️  ALLERGENS: ${item.allergens.join(', ')}` + LF;
      }
      if (item.dietaryRestrictions && item.dietaryRestrictions.length > 0) {
        receipt += `  🌱 ${item.dietaryRestrictions.join(', ')}` + LF;
      }
      if (item.specialInstructions) {
        receipt += `  Note: ${item.specialInstructions}` + LF;
      }
      if (item.preparationTime) {
        receipt += `  Prep Time: ${item.preparationTime} min` + LF;
      }
      receipt += LF;
    });
  } else {
    // Customer receipt with prices
    data.items.forEach(item => {
      receipt += formatLineItem(item.name, item.quantity, item.unitPrice, item.totalPrice);
      if (item.notes) {
        receipt += `  Note: ${item.notes}` + LF;
      }
    });
  }

  receipt += '='.repeat(RECEIPT_WIDTH) + LF;

  // Totals (customer receipt only)
  if (!isKitchenReceipt) {
    receipt += formatTotal('Subtotal', data.subtotal);
    receipt += formatTotal('Tax', data.tax);
    if (data.discount) {
      receipt += formatTotal('Discount', -data.discount);
    }
    receipt += '='.repeat(RECEIPT_WIDTH) + LF;
    receipt += formatTotal('TOTAL', data.total, true);
    receipt += '='.repeat(RECEIPT_WIDTH) + LF;

    // Payment
    receipt += `Payment: ${data.paymentMethod.toUpperCase()}` + LF;
    if (data.amountPaid) {
      receipt += formatTotal('Paid', data.amountPaid);
    }
    if (data.changeDue) {
      receipt += formatTotal('Change', data.changeDue);
    }
  }

  // Footer - center align
  receipt += ESC + 'a' + String.fromCharCode(1);
  receipt += LF;
  receipt += centerText(data.footerMessage || 'Thank you for dining with us!') + LF;
  receipt += centerText('Please visit again!') + LF + LF;

  // Cut paper
  receipt += CUT;

  return receipt;
}

/**
 * 2. Clothing Receipt Template
 */
function generateClothingReceipt(data: ReceiptData): string {
  const clothingData = data.businessSpecificData as ClothingReceiptData;

  let receipt = '';

  // Header
  receipt += centerText(data.businessName) + '\n';
  if (data.businessAddress) receipt += centerText(data.businessAddress) + '\n';
  if (data.businessPhone) receipt += centerText(data.businessPhone) + '\n';
  receipt += line() + '\n';

  // Receipt info
  receipt += `Receipt: ${data.receiptNumber.formattedNumber}\n`;
  receipt += `Date: ${formatDate(data.transactionDate)}\n`;
  receipt += `Salesperson: ${data.salespersonName}\n`;
  receipt += line() + '\n';

  // Items with size/color
  data.items.forEach((item, index) => {
    const clothingItem = clothingData?.items?.[index] as ClothingReceiptItem;
    let itemLine = `${item.quantity}x ${item.name}`;

    if (clothingItem?.size || clothingItem?.color) {
      const details = [];
      if (clothingItem.size) details.push(`Size: ${clothingItem.size}`);
      if (clothingItem.color) details.push(`Color: ${clothingItem.color}`);
      itemLine += ` (${details.join(', ')})`;
    }

    receipt += formatLineItem(itemLine, 1, item.totalPrice, item.totalPrice);
    if (clothingItem?.brand) {
      receipt += `  Brand: ${clothingItem.brand}\n`;
    }
  });

  receipt += line() + '\n';

  // Totals
  receipt += formatTotal('Subtotal', data.subtotal);
  receipt += formatTotal('Tax', data.tax);
  if (data.discount) {
    receipt += formatTotal('Discount', -data.discount);
  }
  receipt += line() + '\n';
  receipt += formatTotal('TOTAL', data.total, true);
  receipt += line() + '\n';

  // Payment
  receipt += `Payment: ${data.paymentMethod.toUpperCase()}\n`;

  // Return policy
  receipt += '\n';
  receipt += centerText('RETURN POLICY') + '\n';
  receipt += line('-') + '\n';
  const returnPolicy = clothingData?.returnPolicy || 'Returns accepted within 30 days with receipt';
  receipt += wrapText(returnPolicy) + '\n';

  // Footer
  receipt += '\n';
  receipt += centerText('Thank you for shopping with us!') + '\n';

  return receipt;
}

/**
 * 3. Grocery Receipt Template
 */
function generateGroceryReceipt(data: ReceiptData): string {
  const groceryData = data.businessSpecificData as GroceryReceiptData;

  let receipt = '';

  // Header
  receipt += centerText(data.businessName) + '\n';
  if (data.businessAddress) receipt += centerText(data.businessAddress) + '\n';
  receipt += line() + '\n';

  // Receipt info
  receipt += `Receipt: ${data.receiptNumber.formattedNumber}\n`;
  receipt += `Date: ${formatDate(data.transactionDate)}\n`;
  receipt += `Cashier: ${data.salespersonName}\n`;
  receipt += line() + '\n';

  // Items with weight/unit pricing
  data.items.forEach((item, index) => {
    const groceryItem = groceryData?.items?.[index] as GroceryReceiptItem;

    let itemLine = item.name;
    if (groceryItem?.weight && groceryItem?.unitPricing) {
      itemLine += ` (${groceryItem.weight}${item.unit || 'lb'} @ ${groceryItem.unitPricing})`;
    }

    receipt += formatLineItem(itemLine, item.quantity, item.unitPrice, item.totalPrice);

    if (groceryItem?.expirationDate) {
      receipt += `  Exp: ${formatDate(groceryItem.expirationDate)}\n`;
    }
  });

  receipt += line() + '\n';

  // Totals
  receipt += formatTotal('Subtotal', data.subtotal);
  receipt += formatTotal('Tax', data.tax);
  if (data.discount) {
    receipt += formatTotal('Savings', -data.discount);
  }
  receipt += line() + '\n';
  receipt += formatTotal('TOTAL', data.total, true);
  receipt += line() + '\n';

  // Payment
  receipt += `Payment: ${data.paymentMethod.toUpperCase()}\n`;

  // Loyalty points
  if (groceryData?.loyaltyPoints) {
    receipt += '\n';
    receipt += `Points Earned: ${groceryData.loyaltyPoints}\n`;
    receipt += `Points Balance: ${groceryData.loyaltyBalance || 0}\n`;
  }

  // Footer
  receipt += '\n';
  receipt += centerText('Thank you for shopping!') + '\n';
  receipt += centerText('Fresh savings every day!') + '\n';

  return receipt;
}

/**
 * 4. Hardware Receipt Template
 */
function generateHardwareReceipt(data: ReceiptData): string {
  const hardwareData = data.businessSpecificData as HardwareReceiptData;

  let receipt = '';

  // Header
  receipt += centerText(data.businessName) + '\n';
  if (data.businessAddress) receipt += centerText(data.businessAddress) + '\n';
  if (data.businessPhone) receipt += centerText(data.businessPhone) + '\n';
  receipt += line() + '\n';

  // Receipt info
  receipt += `Receipt: ${data.receiptNumber.formattedNumber}\n`;
  receipt += `Date: ${formatDate(data.transactionDate)}\n`;
  receipt += `Associate: ${data.salespersonName}\n`;
  if (hardwareData?.projectReference) {
    receipt += `Project: ${hardwareData.projectReference}\n`;
  }
  receipt += line() + '\n';

  // Items with dimensions and bulk pricing
  data.items.forEach((item, index) => {
    const hardwareItem = hardwareData?.items?.[index] as HardwareReceiptItem;

    let itemLine = item.name;
    if (hardwareItem?.cutToSizeDimensions) {
      itemLine += ` [${hardwareItem.cutToSizeDimensions}]`;
    }

    receipt += formatLineItem(itemLine, item.quantity, item.unitPrice, item.totalPrice);

    if (hardwareItem?.manufacturer) {
      receipt += `  Mfg: ${hardwareItem.manufacturer}\n`;
    }
    if (hardwareItem?.bulkQuantity && hardwareItem?.bulkPricePerUnit) {
      receipt += `  Bulk: ${hardwareItem.bulkQuantity} @ $${hardwareItem.bulkPricePerUnit.toFixed(2)}\n`;
    }
    if (hardwareItem?.specialOrderETA) {
      receipt += `  Special Order ETA: ${formatDate(hardwareItem.specialOrderETA)}\n`;
    }
  });

  receipt += line() + '\n';

  // Totals
  receipt += formatTotal('Subtotal', data.subtotal);
  receipt += formatTotal('Tax', data.tax);
  if (data.discount) {
    receipt += formatTotal('Discount', -data.discount);
  }
  receipt += line() + '\n';
  receipt += formatTotal('TOTAL', data.total, true);
  receipt += line() + '\n';

  // Payment
  receipt += `Payment: ${data.paymentMethod.toUpperCase()}\n`;

  // Footer
  receipt += '\n';
  receipt += centerText('Thank you for your business!') + '\n';
  receipt += centerText('Pro contractors welcome!') + '\n';

  return receipt;
}

/**
 * 5. Construction Receipt/Invoice Template
 */
function generateConstructionReceipt(data: ReceiptData): string {
  const constructionData = data.businessSpecificData as ConstructionReceiptData;

  let receipt = '';

  // Header
  receipt += centerText(data.businessName) + '\n';
  if (data.businessAddress) receipt += centerText(data.businessAddress) + '\n';
  if (data.businessPhone) receipt += centerText(data.businessPhone) + '\n';
  receipt += line() + '\n';
  receipt += centerText('*** INVOICE ***') + '\n';
  receipt += line() + '\n';

  // Invoice info
  receipt += `Invoice: ${data.receiptNumber.formattedNumber}\n`;
  receipt += `Date: ${formatDate(data.transactionDate)}\n`;

  if (constructionData) {
    receipt += `Project: ${constructionData.projectName}\n`;
    receipt += `Code: ${constructionData.projectCode}\n`;
    receipt += `Contractor: ${constructionData.contractorName}\n`;
    receipt += `Contact: ${constructionData.contractorContact}\n`;
    receipt += line() + '\n';

    // Project timeline
    receipt += 'Project Timeline:\n';
    receipt += `  Start: ${formatDate(constructionData.projectTimeline.startDate)}\n`;
    receipt += `  End: ${formatDate(constructionData.projectTimeline.endDate)}\n`;
    receipt += `  Phase: ${constructionData.projectTimeline.currentPhase}\n`;
    receipt += line() + '\n';

    // Budget tracking
    receipt += 'Budget Status:\n';
    receipt += formatTotal('Total Budget', constructionData.budgetTotal);
    receipt += formatTotal('Spent', constructionData.budgetSpent);
    receipt += formatTotal('Remaining', constructionData.budgetTotal - constructionData.budgetSpent);
    receipt += line() + '\n';
  }

  // Line items
  data.items.forEach(item => {
    receipt += formatLineItem(item.name, item.quantity, item.unitPrice, item.totalPrice);
  });

  receipt += line() + '\n';

  // Cost breakdown
  if (constructionData?.laborCost || constructionData?.materialsCost) {
    if (constructionData.materialsCost) {
      receipt += formatTotal('Materials', constructionData.materialsCost);
    }
    if (constructionData.laborHours && constructionData.laborCost) {
      receipt += formatTotal(`Labor (${constructionData.laborHours}hrs)`, constructionData.laborCost);
    }
    receipt += line() + '\n';
  }

  // Totals
  receipt += formatTotal('Subtotal', data.subtotal);
  receipt += formatTotal('Tax', data.tax);
  receipt += line() + '\n';
  receipt += formatTotal('TOTAL', data.total, true);
  receipt += line() + '\n';

  // Payment terms
  if (constructionData?.paymentTerms) {
    receipt += `Terms: ${constructionData.paymentTerms}\n`;
  }
  receipt += `Payment: ${data.paymentMethod.toUpperCase()}\n`;

  // Footer
  receipt += '\n';
  receipt += centerText('Thank you for your business!') + '\n';

  return receipt;
}

/**
 * 6. Vehicles Service Receipt Template
 */
function generateVehiclesReceipt(data: ReceiptData): string {
  const vehiclesData = data.businessSpecificData as VehiclesReceiptData;

  let receipt = '';

  // Header
  receipt += centerText(data.businessName) + '\n';
  if (data.businessAddress) receipt += centerText(data.businessAddress) + '\n';
  if (data.businessPhone) receipt += centerText(data.businessPhone) + '\n';
  receipt += line() + '\n';
  receipt += centerText('SERVICE RECEIPT') + '\n';
  receipt += line() + '\n';

  // Receipt info
  receipt += `Receipt: ${data.receiptNumber.formattedNumber}\n`;
  receipt += `Date: ${formatDate(data.transactionDate)}\n`;
  receipt += `Technician: ${vehiclesData?.technicianName || data.salespersonName}\n`;
  receipt += line() + '\n';

  // Vehicle info
  if (vehiclesData?.vehicleInfo) {
    const v = vehiclesData.vehicleInfo;
    receipt += 'Vehicle Information:\n';
    receipt += `  ${v.year} ${v.make} ${v.model}\n`;
    receipt += `  Plate: ${v.licensePlate}\n`;
    if (v.vin) {
      receipt += `  VIN: ${v.vin}\n`;
    }
    receipt += `  Mileage: ${vehiclesData.currentMileage.toLocaleString()}\n`;
    receipt += line() + '\n';
  }

  // Services performed
  if (vehiclesData?.servicesPerformed && vehiclesData.servicesPerformed.length > 0) {
    receipt += 'Services Performed:\n';
    vehiclesData.servicesPerformed.forEach(service => {
      receipt += `  • ${service}\n`;
    });
    receipt += line() + '\n';
  }

  // Parts used
  if (vehiclesData?.partsUsed && vehiclesData.partsUsed.length > 0) {
    receipt += 'Parts:\n';
    vehiclesData.partsUsed.forEach(part => {
      receipt += formatLineItem(
        `${part.partName} [${part.partNumber}]`,
        part.quantity,
        part.price,
        part.price * part.quantity
      );
    });
    receipt += line() + '\n';
  }

  // Labor
  if (vehiclesData?.laborHours && vehiclesData?.laborRate) {
    receipt += formatTotal(`Labor (${vehiclesData.laborHours}hrs @ $${vehiclesData.laborRate}/hr)`,
      vehiclesData.laborHours * vehiclesData.laborRate);
    receipt += line() + '\n';
  }

  // Totals
  receipt += formatTotal('Subtotal', data.subtotal);
  receipt += formatTotal('Tax', data.tax);
  receipt += line() + '\n';
  receipt += formatTotal('TOTAL', data.total, true);
  receipt += line() + '\n';

  // Payment
  receipt += `Payment: ${data.paymentMethod.toUpperCase()}\n`;

  // Next service
  if (vehiclesData?.nextServiceDue) {
    receipt += '\n';
    receipt += 'Next Service Due:\n';
    receipt += `  @ ${vehiclesData.nextServiceDue.mileage.toLocaleString()} miles\n`;
    receipt += `  or ${formatDate(vehiclesData.nextServiceDue.date)}\n`;
  }

  // Warranty
  if (vehiclesData?.warranty) {
    receipt += '\n';
    receipt += `Warranty: ${vehiclesData.warranty}\n`;
  }

  // Footer
  receipt += '\n';
  receipt += centerText('Thank you for your business!') + '\n';
  receipt += centerText('Drive safe!') + '\n';

  return receipt;
}

/**
 * 7. Consulting Receipt/Invoice Template
 */
function generateConsultingReceipt(data: ReceiptData): string {
  const consultingData = data.businessSpecificData as ConsultingReceiptData;

  let receipt = '';

  // Header
  receipt += centerText(data.businessName) + '\n';
  if (data.businessAddress) receipt += centerText(data.businessAddress) + '\n';
  if (data.businessPhone) receipt += centerText(data.businessPhone) + '\n';
  receipt += line() + '\n';
  receipt += centerText('CONSULTING INVOICE') + '\n';
  receipt += line() + '\n';

  // Invoice info
  if (consultingData) {
    receipt += `Invoice: ${consultingData.invoiceNumber}\n`;
    receipt += `Date: ${formatDate(consultingData.invoiceDate)}\n`;
    receipt += `Consultant: ${data.salespersonName}\n`;
    receipt += line() + '\n';

    // Client info
    receipt += 'Client:\n';
    receipt += `  ${consultingData.clientName}\n`;
    receipt += `  ${consultingData.clientContact}\n`;
    receipt += `\nProject: ${consultingData.projectName}\n`;
    receipt += line() + '\n';

    // Service hours breakdown
    if (consultingData.serviceHours && consultingData.serviceHours.length > 0) {
      receipt += 'Hours Breakdown:\n';
      consultingData.serviceHours.forEach(entry => {
        receipt += `${formatDate(entry.date)}:\n`;
        receipt += `  ${entry.hours}hrs @ $${entry.hourlyRate}/hr\n`;
        receipt += `  ${entry.description}\n`;
        receipt += formatTotal('  Total', entry.hours * entry.hourlyRate);
        receipt += '\n';
      });
      receipt += line() + '\n';
    }
  }

  // Line items
  data.items.forEach(item => {
    receipt += formatLineItem(item.name, item.quantity, item.unitPrice, item.totalPrice);
  });

  receipt += line() + '\n';

  // Totals
  receipt += formatTotal('Subtotal', data.subtotal);
  receipt += formatTotal('Tax', data.tax);
  receipt += line() + '\n';
  receipt += formatTotal('TOTAL', data.total, true);
  receipt += line() + '\n';

  // Payment terms
  if (consultingData?.paymentTerms) {
    receipt += `Payment Terms: ${consultingData.paymentTerms}\n`;
  }
  receipt += `Payment: ${data.paymentMethod.toUpperCase()}\n`;

  // Footer
  receipt += '\n';
  receipt += centerText('Thank you for your business!') + '\n';

  return receipt;
}

/**
 * 8. Retail Receipt Template
 */
function generateRetailReceipt(data: ReceiptData): string {
  const retailData = data.businessSpecificData as RetailReceiptData;

  let receipt = '';

  // Header
  receipt += centerText(data.businessName) + '\n';
  if (data.businessAddress) receipt += centerText(data.businessAddress) + '\n';
  if (data.businessPhone) receipt += centerText(data.businessPhone) + '\n';
  receipt += line() + '\n';

  // Receipt info
  receipt += `Receipt: ${data.receiptNumber.formattedNumber}\n`;
  receipt += `Date: ${formatDate(data.transactionDate)}\n`;
  receipt += `Associate: ${data.salespersonName}\n`;
  receipt += line() + '\n';

  // Items
  data.items.forEach(item => {
    receipt += formatLineItem(item.name, item.quantity, item.unitPrice, item.totalPrice);
  });

  receipt += line() + '\n';

  // Totals
  receipt += formatTotal('Subtotal', data.subtotal);
  receipt += formatTotal('Tax', data.tax);
  if (data.discount) {
    receipt += formatTotal('Discount', -data.discount);
  }
  receipt += line() + '\n';
  receipt += formatTotal('TOTAL', data.total, true);
  receipt += line() + '\n';

  // Payment
  receipt += `Payment: ${data.paymentMethod.toUpperCase()}\n`;

  // Loyalty points
  if (retailData?.loyaltyPoints) {
    receipt += '\n';
    receipt += `Points Earned: ${retailData.loyaltyPoints}\n`;
    receipt += `Points Balance: ${retailData.loyaltyBalance || 0}\n`;
  }

  // Promotions
  if (retailData?.promotions && retailData.promotions.length > 0) {
    receipt += '\n';
    receipt += 'Active Promotions:\n';
    retailData.promotions.forEach(promo => {
      receipt += `  • ${promo}\n`;
    });
  }

  // Footer
  receipt += '\n';
  if (retailData?.surveyQRCode) {
    receipt += centerText('Scan for Survey & Save 10%!') + '\n';
    receipt += centerText('[QR CODE]') + '\n';
    receipt += '\n';
  }
  receipt += centerText('Thank you for shopping!') + '\n';

  return receipt;
}

/**
 * 9. Services Receipt Template
 */
function generateServicesReceipt(data: ReceiptData): string {
  const servicesData = data.businessSpecificData as ServicesReceiptData;

  let receipt = '';

  // Header
  receipt += centerText(data.businessName) + '\n';
  if (data.businessAddress) receipt += centerText(data.businessAddress) + '\n';
  if (data.businessPhone) receipt += centerText(data.businessPhone) + '\n';
  receipt += line() + '\n';
  receipt += centerText('SERVICE RECEIPT') + '\n';
  receipt += line() + '\n';

  // Receipt info
  receipt += `Receipt: ${data.receiptNumber.formattedNumber}\n`;
  receipt += `Date: ${formatDate(data.transactionDate)}\n`;
  receipt += `Technician: ${servicesData?.technicianName || data.salespersonName}\n`;
  if (servicesData?.technicianId) {
    receipt += `Tech ID: ${servicesData.technicianId}\n`;
  }
  receipt += line() + '\n';

  // Service description
  if (servicesData?.serviceDescription) {
    receipt += 'Service:\n';
    receipt += wrapText(servicesData.serviceDescription) + '\n';
    receipt += line() + '\n';
  }

  // Labor
  if (servicesData?.laborHours && servicesData?.hourlyRate) {
    receipt += formatTotal(`Labor (${servicesData.laborHours}hrs @ $${servicesData.hourlyRate}/hr)`,
      servicesData.laborHours * servicesData.hourlyRate);
    receipt += '\n';
  }

  // Parts
  if (servicesData?.partsUsed && servicesData.partsUsed.length > 0) {
    receipt += 'Parts:\n';
    servicesData.partsUsed.forEach(part => {
      receipt += formatLineItem(part.name, part.quantity, part.price, part.price * part.quantity);
    });
    receipt += '\n';
  }

  receipt += line() + '\n';

  // Totals
  receipt += formatTotal('Subtotal', data.subtotal);
  receipt += formatTotal('Tax', data.tax);
  receipt += line() + '\n';
  receipt += formatTotal('TOTAL', data.total, true);
  receipt += line() + '\n';

  // Payment
  receipt += `Payment: ${data.paymentMethod.toUpperCase()}\n`;

  // Warranty
  if (servicesData?.warranty) {
    receipt += '\n';
    receipt += `Warranty: ${servicesData.warranty}\n`;
  }

  // Follow-up
  if (servicesData?.followUpDate) {
    receipt += `Follow-up: ${formatDate(servicesData.followUpDate)}\n`;
  }

  // Footer
  receipt += '\n';
  receipt += centerText('Thank you for your business!') + '\n';

  return receipt;
}

/**
 * 10. Generic Receipt Template (fallback)
 */
function generateGenericReceipt(data: ReceiptData): string {
  // ESC/POS commands
  const ESC = '\x1B'; // ESC
  const LF = '\x0A'; // Line feed
  const CUT = ESC + 'd' + String.fromCharCode(3); // Cut paper

  let receipt = '';

  // Initialize printer and reset margins
  receipt += ESC + '@';  // Initialize printer (reset all settings)
  receipt += ESC + 'l' + String.fromCharCode(0);  // Set left margin to 0

  // Header - center align
  receipt += ESC + 'a' + String.fromCharCode(1);
  receipt += '='.repeat(RECEIPT_WIDTH) + LF;
  receipt += centerText(data.businessName) + LF;
  if (data.businessAddress) receipt += centerText(data.businessAddress) + LF;
  if (data.businessPhone) receipt += centerText(data.businessPhone) + LF;
  receipt += '='.repeat(RECEIPT_WIDTH) + LF;

  // Left align for content
  receipt += ESC + 'a' + String.fromCharCode(0);

  // Receipt info
  receipt += `Receipt: ${data.receiptNumber.formattedNumber}` + LF;
  receipt += `Date: ${formatDate(data.transactionDate)}` + LF;
  receipt += `Transaction: ${data.transactionId}` + LF;
  receipt += `Salesperson: ${data.salespersonName}` + LF;
  receipt += '='.repeat(RECEIPT_WIDTH) + LF;

  // Items
  data.items.forEach(item => {
    receipt += formatLineItem(item.name, item.quantity, item.unitPrice, item.totalPrice);
    if (item.notes) {
      receipt += `  ${item.notes}` + LF;
    }
  });

  receipt += '='.repeat(RECEIPT_WIDTH) + LF;

  // Totals
  receipt += formatTotal('Subtotal', data.subtotal);
  receipt += formatTotal('Tax', data.tax);
  if (data.discount) {
    receipt += formatTotal('Discount', -data.discount);
  }
  receipt += '='.repeat(RECEIPT_WIDTH) + LF;
  receipt += formatTotal('TOTAL', data.total, true);
  receipt += '='.repeat(RECEIPT_WIDTH) + LF;

  // Payment
  receipt += `Payment: ${data.paymentMethod.toUpperCase()}` + LF;
  if (data.amountPaid) {
    receipt += formatTotal('Paid', data.amountPaid);
  }
  if (data.changeDue) {
    receipt += formatTotal('Change', data.changeDue);
  }

  // Footer - center align
  receipt += ESC + 'a' + String.fromCharCode(1);
  receipt += LF;
  receipt += centerText(data.footerMessage || 'Thank you!') + LF + LF;

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

function formatDate(date: Date): string {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatMoney(amount: number | undefined | null): string {
  const safeAmount = typeof amount === 'number' ? amount : 0;
  return `$${safeAmount.toFixed(2)}`;
}

function formatLineItem(name: string, qty: number, unitPrice: number, total: number): string {
  const qtyStr = qty > 1 ? `${qty}x ` : '';
  const nameWithQty = `${qtyStr}${name}`;
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
