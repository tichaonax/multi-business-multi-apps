/**
 * Notification Templates for Layby Management
 *
 * This file contains templates for SMS and email notifications
 * related to layby payments, reminders, and status changes.
 */

import { CustomerLayby, LaybyStatus } from '@prisma/client'
import { formatDateByFormat } from '@/lib/country-codes'

export type NotificationType =
  | 'PAYMENT_REMINDER'
  | 'PAYMENT_OVERDUE'
  | 'PAYMENT_RECEIVED'
  | 'LAYBY_CREATED'
  | 'LAYBY_COMPLETED'
  | 'LAYBY_CANCELLED'
  | 'LAYBY_ON_HOLD'
  | 'LAYBY_DEFAULTED'
  | 'LATE_FEE_APPLIED'

export interface NotificationData {
  layby: Partial<CustomerLayby> & {
    laybyNumber: string
    status: LaybyStatus
    balanceRemaining: number
    totalAmount: number
    totalPaid: number
  }
  customer: {
    name: string
    phone?: string | null
    email?: string | null
  }
  business: {
    name: string
    phone?: string
    email?: string
  }
  additionalData?: Record<string, any>
}

export interface NotificationTemplate {
  sms: string
  emailSubject: string
  emailBody: string
}

/**
 * Format currency for display
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount)
}

/**
 * Format date for display
 */
function formatDate(date: Date | string | null, format = 'MM/dd/yyyy'): string {
  if (!date) return 'N/A'
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return formatDateByFormat(dateObj.toISOString(), format)
}

/**
 * Calculate days until due date
 */
function getDaysUntil(date: Date | string | null): number {
  if (!date) return 0
  const dueDate = typeof date === 'string' ? new Date(date) : date
  const today = new Date()
  const diff = dueDate.getTime() - today.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

/**
 * Generate notification template based on type
 */
export function generateNotificationTemplate(
  type: NotificationType,
  data: NotificationData
): NotificationTemplate {
  const { layby, customer, business, additionalData } = data

  switch (type) {
    case 'PAYMENT_REMINDER':
      return generatePaymentReminderTemplate(data)

    case 'PAYMENT_OVERDUE':
      return generatePaymentOverdueTemplate(data)

    case 'PAYMENT_RECEIVED':
      return generatePaymentReceivedTemplate(data)

    case 'LAYBY_CREATED':
      return generateLaybyCreatedTemplate(data)

    case 'LAYBY_COMPLETED':
      return generateLaybyCompletedTemplate(data)

    case 'LAYBY_CANCELLED':
      return generateLaybyCancelledTemplate(data)

    case 'LAYBY_ON_HOLD':
      return generateLaybyOnHoldTemplate(data)

    case 'LAYBY_DEFAULTED':
      return generateLaybyDefaultedTemplate(data)

    case 'LATE_FEE_APPLIED':
      return generateLateFeeAppliedTemplate(data)

    default:
      throw new Error(`Unknown notification type: ${type}`)
  }
}

/**
 * Payment Reminder Template
 */
function generatePaymentReminderTemplate(data: NotificationData): NotificationTemplate {
  const { layby, customer, business, additionalData } = data
  const daysUntil = additionalData?.daysUntilDue || 0
  const dueDate = additionalData?.paymentDueDate
  const installmentAmount = additionalData?.installmentAmount || layby.balanceRemaining

  const sms = `Hi ${customer.name}, reminder: Your layby payment of ${formatCurrency(installmentAmount)} is due ${daysUntil > 0 ? `in ${daysUntil} day(s)` : 'today'} for ${layby.laybyNumber}. Balance: ${formatCurrency(layby.balanceRemaining)}. Call ${business.phone || 'us'} to pay.`

  const emailSubject = `Payment Reminder - Layby ${layby.laybyNumber}`

  const emailBody = `
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #2563eb;">Payment Reminder</h2>

    <p>Dear ${customer.name},</p>

    <p>This is a friendly reminder that your layby payment is ${daysUntil > 0 ? `due in ${daysUntil} day(s)` : 'due today'}.</p>

    <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin-top: 0;">Layby Details</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0;"><strong>Layby Number:</strong></td>
          <td style="padding: 8px 0;">${layby.laybyNumber}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0;"><strong>Payment Due:</strong></td>
          <td style="padding: 8px 0;">${dueDate ? formatDate(dueDate) : 'N/A'}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0;"><strong>Installment Amount:</strong></td>
          <td style="padding: 8px 0; color: #2563eb; font-size: 18px;"><strong>${formatCurrency(installmentAmount)}</strong></td>
        </tr>
        <tr>
          <td style="padding: 8px 0;"><strong>Total Paid:</strong></td>
          <td style="padding: 8px 0;">${formatCurrency(layby.totalPaid)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0;"><strong>Balance Remaining:</strong></td>
          <td style="padding: 8px 0;">${formatCurrency(layby.balanceRemaining)}</td>
        </tr>
      </table>
    </div>

    <p>Please ensure your payment is made on time to avoid any late fees.</p>

    <div style="background-color: #eff6ff; padding: 15px; border-left: 4px solid #2563eb; margin: 20px 0;">
      <strong>Contact Us:</strong><br>
      ${business.name}<br>
      ${business.phone ? `Phone: ${business.phone}<br>` : ''}
      ${business.email ? `Email: ${business.email}` : ''}
    </div>

    <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
      This is an automated notification from ${business.name}. Please do not reply to this email.
    </p>
  </div>
</body>
</html>
  `.trim()

  return { sms, emailSubject, emailBody }
}

/**
 * Payment Overdue Template
 */
function generatePaymentOverdueTemplate(data: NotificationData): NotificationTemplate {
  const { layby, customer, business, additionalData } = data
  const daysOverdue = additionalData?.daysOverdue || 0
  const lateFee = additionalData?.lateFee || 0

  const sms = `OVERDUE: ${customer.name}, your layby payment for ${layby.laybyNumber} is ${daysOverdue} day(s) overdue. Balance: ${formatCurrency(layby.balanceRemaining)}${lateFee > 0 ? `. Late fee of ${formatCurrency(lateFee)} may apply` : ''}. Call ${business.phone || 'us'} urgently.`

  const emailSubject = `⚠️ OVERDUE Payment - Layby ${layby.laybyNumber}`

  const emailBody = `
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; margin-bottom: 20px;">
      <h2 style="color: #dc2626; margin-top: 0;">⚠️ PAYMENT OVERDUE</h2>
    </div>

    <p>Dear ${customer.name},</p>

    <p>Your layby payment is now <strong>${daysOverdue} day(s) overdue</strong>. Immediate action is required to avoid additional fees and potential cancellation.</p>

    <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #fecaca;">
      <h3 style="margin-top: 0; color: #dc2626;">Overdue Layby Details</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0;"><strong>Layby Number:</strong></td>
          <td style="padding: 8px 0;">${layby.laybyNumber}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0;"><strong>Days Overdue:</strong></td>
          <td style="padding: 8px 0; color: #dc2626;"><strong>${daysOverdue} day(s)</strong></td>
        </tr>
        <tr>
          <td style="padding: 8px 0;"><strong>Balance Due:</strong></td>
          <td style="padding: 8px 0; color: #dc2626; font-size: 18px;"><strong>${formatCurrency(layby.balanceRemaining)}</strong></td>
        </tr>
        ${lateFee > 0 ? `
        <tr>
          <td style="padding: 8px 0;"><strong>Late Fee:</strong></td>
          <td style="padding: 8px 0;">${formatCurrency(lateFee)}</td>
        </tr>
        ` : ''}
      </table>
    </div>

    <p><strong>Please contact us immediately to make your payment and discuss your options.</strong></p>

    <div style="background-color: #eff6ff; padding: 15px; border-left: 4px solid #2563eb; margin: 20px 0;">
      <strong>Contact Us Urgently:</strong><br>
      ${business.name}<br>
      ${business.phone ? `Phone: ${business.phone}<br>` : ''}
      ${business.email ? `Email: ${business.email}` : ''}
    </div>

    <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
      This is an automated notification from ${business.name}. Please do not reply to this email.
    </p>
  </div>
</body>
</html>
  `.trim()

  return { sms, emailSubject, emailBody }
}

/**
 * Payment Received Template
 */
function generatePaymentReceivedTemplate(data: NotificationData): NotificationTemplate {
  const { layby, customer, business, additionalData } = data
  const paymentAmount = additionalData?.paymentAmount || 0
  const receiptNumber = additionalData?.receiptNumber || 'N/A'
  const isFullyPaid = layby.balanceRemaining === 0

  const sms = `Payment received! ${formatCurrency(paymentAmount)} paid for ${layby.laybyNumber}. ${isFullyPaid ? 'Layby FULLY PAID! Items ready for collection.' : `Balance: ${formatCurrency(layby.balanceRemaining)}.`} Receipt: ${receiptNumber}. Thank you!`

  const emailSubject = `Payment Received - ${receiptNumber}`

  const emailBody = `
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin-bottom: 20px;">
      <h2 style="color: #059669; margin-top: 0;">✓ Payment Received</h2>
    </div>

    <p>Dear ${customer.name},</p>

    <p>Thank you! We have received your payment.</p>

    <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #bbf7d0;">
      <h3 style="margin-top: 0;">Payment Details</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0;"><strong>Receipt Number:</strong></td>
          <td style="padding: 8px 0;">${receiptNumber}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0;"><strong>Payment Amount:</strong></td>
          <td style="padding: 8px 0; color: #059669; font-size: 18px;"><strong>${formatCurrency(paymentAmount)}</strong></td>
        </tr>
        <tr>
          <td style="padding: 8px 0;"><strong>Layby Number:</strong></td>
          <td style="padding: 8px 0;">${layby.laybyNumber}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0;"><strong>Balance Remaining:</strong></td>
          <td style="padding: 8px 0; ${isFullyPaid ? 'color: #059669;' : ''}"><strong>${formatCurrency(layby.balanceRemaining)}</strong></td>
        </tr>
      </table>
    </div>

    ${isFullyPaid ? `
    <div style="background-color: #fef3c7; padding: 15px; border-left: 4px solid #f59e0b; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #d97706;">🎉 Congratulations!</h3>
      <p style="margin-bottom: 0;">Your layby is now <strong>fully paid</strong>! Your items are ready for collection. Please contact us to arrange pickup.</p>
    </div>
    ` : ''}

    <div style="background-color: #eff6ff; padding: 15px; border-left: 4px solid #2563eb; margin: 20px 0;">
      <strong>Contact Us:</strong><br>
      ${business.name}<br>
      ${business.phone ? `Phone: ${business.phone}<br>` : ''}
      ${business.email ? `Email: ${business.email}` : ''}
    </div>

    <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
      This is an automated notification from ${business.name}. Please do not reply to this email.
    </p>
  </div>
</body>
</html>
  `.trim()

  return { sms, emailSubject, emailBody }
}

/**
 * Layby Created Template
 */
function generateLaybyCreatedTemplate(data: NotificationData): NotificationTemplate {
  const { layby, customer, business, additionalData } = data
  const depositAmount = additionalData?.depositAmount || 0

  const sms = `Layby ${layby.laybyNumber} created! Deposit: ${formatCurrency(depositAmount)}, Balance: ${formatCurrency(layby.balanceRemaining)}. Thank you for choosing ${business.name}!`

  const emailSubject = `Layby Created - ${layby.laybyNumber}`

  const emailBody = `
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #2563eb;">Layby Agreement Created</h2>

    <p>Dear ${customer.name},</p>

    <p>Your layby agreement has been successfully created. Thank you for choosing ${business.name}!</p>

    <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin-top: 0;">Layby Summary</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0;"><strong>Layby Number:</strong></td>
          <td style="padding: 8px 0;">${layby.laybyNumber}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0;"><strong>Total Amount:</strong></td>
          <td style="padding: 8px 0;">${formatCurrency(layby.totalAmount)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0;"><strong>Deposit Paid:</strong></td>
          <td style="padding: 8px 0;">${formatCurrency(depositAmount)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0;"><strong>Balance Remaining:</strong></td>
          <td style="padding: 8px 0; color: #2563eb; font-size: 18px;"><strong>${formatCurrency(layby.balanceRemaining)}</strong></td>
        </tr>
      </table>
    </div>

    <p>Please make your scheduled payments on time. We will send you reminders before each payment is due.</p>

    <div style="background-color: #eff6ff; padding: 15px; border-left: 4px solid #2563eb; margin: 20px 0;">
      <strong>Contact Us:</strong><br>
      ${business.name}<br>
      ${business.phone ? `Phone: ${business.phone}<br>` : ''}
      ${business.email ? `Email: ${business.email}` : ''}
    </div>

    <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
      This is an automated notification from ${business.name}. Please do not reply to this email.
    </p>
  </div>
</body>
</html>
  `.trim()

  return { sms, emailSubject, emailBody }
}

/**
 * Layby Completed Template
 */
function generateLaybyCompletedTemplate(data: NotificationData): NotificationTemplate {
  const { layby, customer, business } = data

  const sms = `Congratulations! Your layby ${layby.laybyNumber} is complete! Items ready for collection at ${business.name}. Call ${business.phone || 'us'} to arrange pickup.`

  const emailSubject = `🎉 Layby Complete - ${layby.laybyNumber}`

  const emailBody = `
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin-bottom: 20px;">
      <h2 style="color: #059669; margin-top: 0;">🎉 Layby Complete!</h2>
    </div>

    <p>Dear ${customer.name},</p>

    <p>Congratulations! Your layby <strong>${layby.laybyNumber}</strong> is now complete and fully paid.</p>

    <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin-top: 0;">Your Items Are Ready!</h3>
      <p>Please contact us to arrange collection of your items at your earliest convenience.</p>
      <p style="margin-bottom: 0;"><strong>Total Paid:</strong> ${formatCurrency(layby.totalPaid)}</p>
    </div>

    <div style="background-color: #eff6ff; padding: 15px; border-left: 4px solid #2563eb; margin: 20px 0;">
      <strong>Contact Us to Arrange Collection:</strong><br>
      ${business.name}<br>
      ${business.phone ? `Phone: ${business.phone}<br>` : ''}
      ${business.email ? `Email: ${business.email}` : ''}
    </div>

    <p>Thank you for your business!</p>

    <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
      This is an automated notification from ${business.name}. Please do not reply to this email.
    </p>
  </div>
</body>
</html>
  `.trim()

  return { sms, emailSubject, emailBody }
}

/**
 * Layby Cancelled Template
 */
function generateLaybyCancelledTemplate(data: NotificationData): NotificationTemplate {
  const { layby, customer, business, additionalData } = data
  const refundAmount = additionalData?.refundAmount || 0
  const reason = additionalData?.reason || 'Not specified'

  const sms = `Layby ${layby.laybyNumber} has been cancelled. ${refundAmount > 0 ? `Refund of ${formatCurrency(refundAmount)} will be processed.` : 'No refund applicable.'} Contact ${business.phone || 'us'} for details.`

  const emailSubject = `Layby Cancelled - ${layby.laybyNumber}`

  const emailBody = `
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; margin-bottom: 20px;">
      <h2 style="color: #dc2626; margin-top: 0;">Layby Cancelled</h2>
    </div>

    <p>Dear ${customer.name},</p>

    <p>Your layby agreement <strong>${layby.laybyNumber}</strong> has been cancelled.</p>

    <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin-top: 0;">Cancellation Details</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0;"><strong>Layby Number:</strong></td>
          <td style="padding: 8px 0;">${layby.laybyNumber}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0;"><strong>Total Paid:</strong></td>
          <td style="padding: 8px 0;">${formatCurrency(layby.totalPaid)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0;"><strong>Refund Amount:</strong></td>
          <td style="padding: 8px 0; color: ${refundAmount > 0 ? '#059669' : '#6b7280'}; font-size: 18px;"><strong>${formatCurrency(refundAmount)}</strong></td>
        </tr>
        <tr>
          <td style="padding: 8px 0;"><strong>Reason:</strong></td>
          <td style="padding: 8px 0;">${reason}</td>
        </tr>
      </table>
    </div>

    ${refundAmount > 0 ? `
    <p>Your refund of <strong>${formatCurrency(refundAmount)}</strong> will be processed according to our refund policy.</p>
    ` : `
    <p>Per our refund policy, no refund is applicable for this cancellation.</p>
    `}

    <div style="background-color: #eff6ff; padding: 15px; border-left: 4px solid #2563eb; margin: 20px 0;">
      <strong>Contact Us:</strong><br>
      ${business.name}<br>
      ${business.phone ? `Phone: ${business.phone}<br>` : ''}
      ${business.email ? `Email: ${business.email}` : ''}
    </div>

    <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
      This is an automated notification from ${business.name}. Please do not reply to this email.
    </p>
  </div>
</body>
</html>
  `.trim()

  return { sms, emailSubject, emailBody }
}

/**
 * Layby On Hold Template
 */
function generateLaybyOnHoldTemplate(data: NotificationData): NotificationTemplate {
  const { layby, customer, business, additionalData } = data
  const reason = additionalData?.reason || 'Not specified'

  const sms = `Your layby ${layby.laybyNumber} has been put on hold. No payments are required while on hold. Reason: ${reason}. Contact ${business.phone || 'us'} for more info.`

  const emailSubject = `Layby On Hold - ${layby.laybyNumber}`

  const emailBody = `
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 20px;">
      <h2 style="color: #d97706; margin-top: 0;">Layby On Hold</h2>
    </div>

    <p>Dear ${customer.name},</p>

    <p>Your layby agreement <strong>${layby.laybyNumber}</strong> has been temporarily put on hold.</p>

    <div style="background-color: #fffbeb; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin-top: 0;">What This Means</h3>
      <ul style="margin: 10px 0; padding-left: 20px;">
        <li>No payments are required while your layby is on hold</li>
        <li>Your items remain reserved</li>
        <li>Contact us when you're ready to resume payments</li>
      </ul>
      <p><strong>Reason:</strong> ${reason}</p>
    </div>

    <p>Please contact us to discuss reactivating your layby when you're ready.</p>

    <div style="background-color: #eff6ff; padding: 15px; border-left: 4px solid #2563eb; margin: 20px 0;">
      <strong>Contact Us:</strong><br>
      ${business.name}<br>
      ${business.phone ? `Phone: ${business.phone}<br>` : ''}
      ${business.email ? `Email: ${business.email}` : ''}
    </div>

    <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
      This is an automated notification from ${business.name}. Please do not reply to this email.
    </p>
  </div>
</body>
</html>
  `.trim()

  return { sms, emailSubject, emailBody }
}

/**
 * Layby Defaulted Template
 */
function generateLaybyDefaultedTemplate(data: NotificationData): NotificationTemplate {
  const { layby, customer, business } = data

  const sms = `IMPORTANT: Layby ${layby.laybyNumber} has been marked as DEFAULTED due to missed payments. Please contact ${business.phone || 'us'} urgently to resolve.`

  const emailSubject = `⚠️ URGENT: Layby Defaulted - ${layby.laybyNumber}`

  const emailBody = `
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; margin-bottom: 20px;">
      <h2 style="color: #dc2626; margin-top: 0;">⚠️ Layby Defaulted</h2>
    </div>

    <p>Dear ${customer.name},</p>

    <p>Your layby agreement <strong>${layby.laybyNumber}</strong> has been marked as <strong>DEFAULTED</strong> due to missed payments.</p>

    <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #fecaca;">
      <h3 style="margin-top: 0; color: #dc2626;">Action Required</h3>
      <p>Please contact us immediately to discuss your options:</p>
      <ul style="margin: 10px 0; padding-left: 20px;">
        <li>Bring payments up to date</li>
        <li>Arrange a new payment plan</li>
        <li>Discuss cancellation and refund options</li>
      </ul>
      <p style="margin-bottom: 0;"><strong>Balance Due:</strong> ${formatCurrency(layby.balanceRemaining)}</p>
    </div>

    <div style="background-color: #eff6ff; padding: 15px; border-left: 4px solid #2563eb; margin: 20px 0;">
      <strong>Contact Us Urgently:</strong><br>
      ${business.name}<br>
      ${business.phone ? `Phone: ${business.phone}<br>` : ''}
      ${business.email ? `Email: ${business.email}` : ''}
    </div>

    <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
      This is an automated notification from ${business.name}. Please do not reply to this email.
    </p>
  </div>
</body>
</html>
  `.trim()

  return { sms, emailSubject, emailBody }
}

/**
 * Late Fee Applied Template
 */
function generateLateFeeAppliedTemplate(data: NotificationData): NotificationTemplate {
  const { layby, customer, business, additionalData } = data
  const lateFeeAmount = additionalData?.lateFeeAmount || 0

  const sms = `A late fee of ${formatCurrency(lateFeeAmount)} has been applied to layby ${layby.laybyNumber}. New balance: ${formatCurrency(layby.balanceRemaining)}. Contact ${business.phone || 'us'}.`

  const emailSubject = `Late Fee Applied - ${layby.laybyNumber}`

  const emailBody = `
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 20px;">
      <h2 style="color: #d97706; margin-top: 0;">Late Fee Applied</h2>
    </div>

    <p>Dear ${customer.name},</p>

    <p>A late fee has been applied to your layby <strong>${layby.laybyNumber}</strong> due to an overdue payment.</p>

    <div style="background-color: #fffbeb; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin-top: 0;">Updated Balance</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0;"><strong>Late Fee Charged:</strong></td>
          <td style="padding: 8px 0; color: #d97706; font-size: 18px;"><strong>${formatCurrency(lateFeeAmount)}</strong></td>
        </tr>
        <tr>
          <td style="padding: 8px 0;"><strong>New Balance:</strong></td>
          <td style="padding: 8px 0; font-size: 18px;"><strong>${formatCurrency(layby.balanceRemaining)}</strong></td>
        </tr>
      </table>
    </div>

    <p>To avoid additional late fees, please bring your payments up to date as soon as possible.</p>

    <div style="background-color: #eff6ff; padding: 15px; border-left: 4px solid #2563eb; margin: 20px 0;">
      <strong>Contact Us:</strong><br>
      ${business.name}<br>
      ${business.phone ? `Phone: ${business.phone}<br>` : ''}
      ${business.email ? `Email: ${business.email}` : ''}
    </div>

    <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
      This is an automated notification from ${business.name}. Please do not reply to this email.
    </p>
  </div>
</body>
</html>
  `.trim()

  return { sms, emailSubject, emailBody }
}

/**
 * Send notification (stub - to be implemented with actual SMS/email services)
 */
export async function sendNotification(
  type: NotificationType,
  data: NotificationData,
  channels: { sms?: boolean; email?: boolean } = { sms: true, email: true }
): Promise<{ success: boolean; sent: string[]; errors: string[] }> {
  const template = generateNotificationTemplate(type, data)
  const sent: string[] = []
  const errors: string[] = []

  // Send SMS
  if (channels.sms && data.customer.phone) {
    try {
      // TODO: Integrate with SMS service (Twilio, AWS SNS, etc.)
      console.log(`[SMS] To: ${data.customer.phone}`)
      console.log(`[SMS] Message: ${template.sms}`)
      sent.push('sms')
    } catch (error) {
      console.error('SMS send error:', error)
      errors.push(`SMS: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Send Email
  if (channels.email && data.customer.email) {
    try {
      // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
      console.log(`[Email] To: ${data.customer.email}`)
      console.log(`[Email] Subject: ${template.emailSubject}`)
      console.log(`[Email] Body: ${template.emailBody.substring(0, 100)}...`)
      sent.push('email')
    } catch (error) {
      console.error('Email send error:', error)
      errors.push(`Email: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  return {
    success: sent.length > 0,
    sent,
    errors
  }
}
