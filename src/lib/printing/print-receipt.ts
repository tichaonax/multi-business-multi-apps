import type { ReceiptData } from '@/types/printing'

interface PrintReceiptOptions {
  printerId?: string
  copies?: number
  autoPrint?: boolean
}

interface PrintReceiptResult {
  success: boolean
  jobId?: string
  error?: string
}

/**
 * Print a receipt to a configured printer
 * @param receiptData - The receipt data to print
 * @param options - Printing options (printer ID, copies, etc.)
 * @returns Print job result
 */
export async function printReceipt(
  receiptData: ReceiptData,
  options: PrintReceiptOptions = {}
): Promise<PrintReceiptResult> {
  try {
    const { printerId, copies = 1, autoPrint = true } = options

    // Extract businessId and businessType from receiptData
    const businessId = receiptData.businessId
    const businessType = receiptData.businessType

    if (!businessId) {
      return {
        success: false,
        error: 'Missing businessId in receipt data'
      }
    }

    if (!printerId) {
      return {
        success: false,
        error: 'Missing printerId in options'
      }
    }

    // Send print job to the API
    const response = await fetch('/api/print/receipt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        printerId,
        businessId,
        businessType,
        receiptNumber: receiptData.receiptNumber,
        transactionId: receiptData.transactionId,
        transactionDate: receiptData.transactionDate,
        salespersonName: receiptData.salespersonName,
        salespersonId: receiptData.salespersonId,
        businessName: receiptData.businessName,
        businessAddress: receiptData.businessAddress,
        businessPhone: receiptData.businessPhone,
        businessEmail: receiptData.businessEmail,
        items: receiptData.items,
        subtotal: receiptData.subtotal,
        tax: receiptData.tax,
        discount: receiptData.discount,
        total: receiptData.total,
        paymentMethod: receiptData.paymentMethod,
        amountPaid: receiptData.amountPaid,
        changeDue: receiptData.changeDue,
        wifiTokens: receiptData.wifiTokens, // ← WiFi token details for receipt
        businessSpecificData: receiptData.businessSpecificData,
        footerMessage: receiptData.footerMessage,
        returnPolicy: receiptData.returnPolicy,
        copies,
        autoPrint,
        jobType: 'RECEIPT'
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Print request failed' }))
      return {
        success: false,
        error: errorData.error || `Print failed with status ${response.status}`
      }
    }

    const result = await response.json()

    return {
      success: true,
      jobId: result.jobId
    }
  } catch (error) {
    console.error('Print receipt error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Print a receipt using browser print dialog (fallback)
 * @param receiptData - The receipt data to print
 */
export function printReceiptBrowser(receiptData: ReceiptData): void {
  const printWindow = window.open('', '_blank', 'width=350,height=600')

  if (!printWindow) {
    console.error('Failed to open print window. Pop-up blocker may be active.')
    return
  }

  // Generate HTML for browser printing using the correct ReceiptData fields
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Receipt - ${receiptData.receiptNumber.formattedNumber}</title>
      <style>
        @media print {
          @page { margin: 0; }
          body { margin: 10px; }
        }
        body {
          font-family: 'Courier New', monospace;
          font-size: 12px;
          max-width: 300px;
          margin: 0 auto;
          padding: 10px;
        }
        .header {
          text-align: center;
          margin-bottom: 15px;
          border-bottom: 2px dashed #000;
          padding-bottom: 10px;
        }
        .business-name {
          font-size: 16px;
          font-weight: bold;
          margin-bottom: 5px;
        }
        .info-line {
          display: flex;
          justify-content: space-between;
          margin-bottom: 3px;
        }
        .items-section {
          border-top: 2px dashed #000;
          border-bottom: 2px dashed #000;
          padding: 10px 0;
          margin-bottom: 10px;
        }
        .item {
          margin-bottom: 8px;
        }
        .item-name {
          font-weight: bold;
          margin-bottom: 2px;
        }
        .item-details {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
        }
        .totals-section {
          margin-bottom: 15px;
        }
        .total-line {
          font-weight: bold;
          font-size: 14px;
          border-top: 1px solid #000;
          padding-top: 5px;
          margin-top: 5px;
        }
        .footer {
          text-align: center;
          font-size: 10px;
          border-top: 2px dashed #000;
          padding-top: 10px;
          margin-top: 15px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="business-name">${receiptData.businessName}</div>
        ${receiptData.businessAddress ? `<div style="font-size: 10px;">${receiptData.businessAddress}</div>` : ''}
        ${receiptData.businessPhone ? `<div style="font-size: 10px;">Tel: ${receiptData.businessPhone}</div>` : ''}
      </div>

      <div>
        <div class="info-line">
          <span>Receipt #:</span>
          <span style="font-weight: bold;">${receiptData.receiptNumber.formattedNumber}</span>
        </div>
        <div class="info-line">
          <span>Date:</span>
          <span>${receiptData.transactionDate.toLocaleString()}</span>
        </div>
        <div class="info-line">
          <span>Transaction:</span>
          <span>${receiptData.transactionId}</span>
        </div>
        <div class="info-line">
          <span>Salesperson:</span>
          <span>${receiptData.salespersonName}</span>
        </div>
      </div>

      <div class="items-section">
        <div class="info-line" style="font-weight: bold; margin-bottom: 8px;">
          <span style="flex: 2;">Item</span>
          <span style="text-align: center;">Qty</span>
          <span style="text-align: right;">Price</span>
          <span style="text-align: right;">Total</span>
        </div>
        ${(receiptData.items || []).map(item => `
          <div class="item">
            <div class="item-name">${item.name}</div>
            <div class="item-details">
              <span style="flex: 2;"></span>
              <span style="text-align: center;">${item.quantity}</span>
              <span style="text-align: right;">$${item.unitPrice.toFixed(2)}</span>
              <span style="text-align: right;">$${item.totalPrice.toFixed(2)}</span>
            </div>
          </div>
        `).join('')}
      </div>

      <div class="totals-section">
        <div class="info-line">
          <span>Subtotal:</span>
          <span>$${receiptData.subtotal.toFixed(2)}</span>
        </div>
        ${receiptData.discount && receiptData.discount > 0 ? `
        <div class="info-line" style="color: #d00;">
          <span>Discount:</span>
          <span>-$${receiptData.discount.toFixed(2)}</span>
        </div>` : ''}
        <div class="info-line">
          <span>Tax:</span>
          <span>$${receiptData.tax.toFixed(2)}</span>
        </div>
        <div class="info-line total-line">
          <span>TOTAL:</span>
          <span>$${receiptData.total.toFixed(2)}</span>
        </div>
      </div>

      <div style="font-size: 11px;">
        <div class="info-line">
          <span>Payment Method:</span>
          <span style="font-weight: bold;">${receiptData.paymentMethod}</span>
        </div>
        ${receiptData.amountPaid ? `
        <div class="info-line">
          <span>Amount Paid:</span>
          <span>$${receiptData.amountPaid.toFixed(2)}</span>
        </div>` : ''}
        ${receiptData.changeDue ? `
        <div class="info-line">
          <span>Change Due:</span>
          <span>$${receiptData.changeDue.toFixed(2)}</span>
        </div>` : ''}
      </div>

      <div class="footer">
        <div style="margin-bottom: 5px;">${receiptData.footerMessage || 'Thank you for your business!'}</div>
        <div>Please come again</div>
      </div>

      <script>
        window.onload = function() {
          window.print();
        };
      </script>
    </body>
    </html>
  `

  printWindow.document.write(html)
  printWindow.document.close()

  // Wait for content to load before printing
  printWindow.onload = () => {
    printWindow.print()
  }
}
