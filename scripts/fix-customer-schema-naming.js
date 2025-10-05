/**
 * Fix Customer Management Schema Naming Conventions
 *
 * This script adds @map() directives to convert camelCase field names
 * to snake_case database column names, following the project standards.
 */

const fs = require('fs')
const path = require('path')

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma')
let schema = fs.readFileSync(schemaPath, 'utf8')

// Field mappings: camelCase -> snake_case
const fieldMappings = {
  // Customer fields
  'customerNumber': 'customer_number',
  'firstName': 'first_name',
  'lastName': 'last_name',
  'fullName': 'full_name',
  'companyName': 'company_name',
  'dateOfBirth': 'date_of_birth',
  'primaryEmail': 'primary_email',
  'primaryPhone': 'primary_phone',
  'alternatePhone': 'alternate_phone',
  'postalCode': 'postal_code',
  'nationalId': 'national_id',
  'passportNumber': 'passport_number',
  'taxNumber': 'tax_number',
  'linkedUserId': 'linked_user_id',
  'linkedEmployeeId': 'linked_employee_id',
  'referredBy': 'referred_by',
  'isActive': 'is_active',
  'isBlacklisted': 'is_blacklisted',
  'blacklistReason': 'blacklist_reason',
  'createdAt': 'created_at',
  'updatedAt': 'updated_at',
  'createdBy': 'created_by',

  // Division account fields
  'universalCustomerId': 'universal_customer_id',
  'businessId': 'business_id',
  'divisionCustomerNumber': 'division_customer_number',
  'accountType': 'account_type',
  'creditLimit': 'credit_limit',
  'currentBalance': 'current_balance',
  'availableCredit': 'available_credit',
  'totalSpent': 'total_spent',
  'loyaltyPoints': 'loyalty_points',
  'loyaltyTier': 'loyalty_tier',
  'paymentTermsDays': 'payment_terms_days',
  'allowLayby': 'allow_layby',
  'allowCredit': 'allow_credit',
  'preferredPaymentMethod': 'preferred_payment_method',
  'preferredLanguage': 'preferred_language',
  'marketingConsent': 'marketing_consent',
  'smsConsent': 'sms_consent',
  'emailConsent': 'email_consent',
  'customFields': 'custom_fields',
  'firstPurchaseDate': 'first_purchase_date',
  'lastPurchaseDate': 'last_purchase_date',
  'lastContactDate': 'last_contact_date',
  'inactivatedAt': 'inactivated_at',
  'inactivatedBy': 'inactivated_by',
  'inactivationReason': 'inactivation_reason',

  // Layby fields
  'laybyNumber': 'layby_number',
  'divisionAccountId': 'division_account_id',
  'totalAmount': 'total_amount',
  'depositAmount': 'deposit_amount',
  'depositPercent': 'deposit_percent',
  'balanceRemaining': 'balance_remaining',
  'totalPaid': 'total_paid',
  'installmentAmount': 'installment_amount',
  'installmentFrequency': 'installment_frequency',
  'paymentDueDate': 'payment_due_date',
  'completionDueDate': 'completion_due_date',
  'serviceFee': 'service_fee',
  'lateFee': 'late_fee',
  'administrationFee': 'administration_fee',
  'totalFees': 'total_fees',
  'itemsReleased': 'items_released',
  'itemsReleasedAt': 'items_released_at',
  'itemsReleasedBy': 'items_released_by',
  'cancellationReason': 'cancellation_reason',
  'cancellationRefund': 'cancellation_refund',
  'completedAt': 'completed_at',
  'cancelledAt': 'cancelled_at',

  // Payment fields
  'laybyId': 'layby_id',
  'receiptNumber': 'receipt_number',
  'paymentMethod': 'payment_method',
  'paymentReference': 'payment_reference',
  'paymentDate': 'payment_date',
  'processedBy': 'processed_by',
  'isRefund': 'is_refund',
  'refundedPaymentId': 'refunded_payment_id',

  // Credit fields
  'applicationNumber': 'application_number',
  'requestedAmount': 'requested_amount',
  'approvedAmount': 'approved_amount',
  'interestRate': 'interest_rate',
  'creditLimitDuration': 'credit_limit_duration',
  'employerName': 'employer_name',
  'employerContact': 'employer_contact',
  'reference1Name': 'reference1_name',
  'reference1Contact': 'reference1_contact',
  'reference2Name': 'reference2_name',
  'reference2Contact': 'reference2_contact',
  'monthlyIncome': 'monthly_income',
  'otherIncome': 'other_income',
  'reviewedBy': 'reviewed_by',
  'reviewedAt': 'reviewed_at',
  'reviewNotes': 'review_notes',
  'rejectionReason': 'rejection_reason',
  'appliedBy': 'applied_by',

  // Statement fields
  'statementNumber': 'statement_number',
  'statementDate': 'statement_date',
  'periodStartDate': 'period_start_date',
  'periodEndDate': 'period_end_date',
  'openingBalance': 'opening_balance',
  'closingBalance': 'closing_balance',
  'totalCharges': 'total_charges',
  'totalPayments': 'total_payments',
  'totalInterest': 'total_interest',
  'dueDate': 'due_date',
  'isPaid': 'is_paid',
  'paidAt': 'paid_at',
  'generatedAt': 'generated_at',
  'sentToCustomer': 'sent_to_customer',
  'sentAt': 'sent_at',

  // Payment allocation fields
  'appliedToOrders': 'applied_to_orders',
  'appliedToLaybys': 'applied_to_laybys',
  'appliedToBalance': 'applied_to_balance',

  // Communication fields
  'relatedOrderId': 'related_order_id',
  'relatedLaybyId': 'related_layby_id',
  'deliveredAt': 'delivered_at',
  'readAt': 'read_at',

  // Note fields
  'noteType': 'note_type',
  'isPrivate': 'is_private',
  'isAlert': 'is_alert'
}

// Function to add @map directive if not present
function addMapDirective(line, fieldName, mappedName) {
  // Skip if already has @map
  if (line.includes('@map(')) return line

  // Find the field declaration pattern
  const fieldPattern = new RegExp(`(\\s+${fieldName}\\s+\\S+(?:\\s+\\S+)*?)(\\s*(?:@|$))`)
  const match = line.match(fieldPattern)

  if (match) {
    // Insert @map before any other directives or end of line
    return line.replace(fieldPattern, `$1 @map("${mappedName}")$2`)
  }

  return line
}

// Process the schema line by line
const lines = schema.split('\n')
let inCustomerSection = false

for (let i = 0; i < lines.length; i++) {
  const line = lines[i]

  // Detect customer management section
  if (line.includes('CUSTOMER MANAGEMENT SYSTEM')) {
    inCustomerSection = true
    continue
  }

  // Only process lines in customer section
  if (!inCustomerSection) continue

  // Stop at the end of file or next major section
  if (line.trim() === '' && i > 2500) break

  // Apply mappings to this line
  for (const [camelCase, snakeCase] of Object.entries(fieldMappings)) {
    if (line.includes(camelCase) && !line.includes('//') && !line.includes('model ') && !line.includes('enum ')) {
      lines[i] = addMapDirective(lines[i], camelCase, snakeCase)
    }
  }
}

// Write the updated schema
const updatedSchema = lines.join('\n')
fs.writeFileSync(schemaPath, updatedSchema, 'utf8')

console.log('✅ Customer management schema naming conventions fixed!')
console.log('   - Added @map() directives for snake_case database columns')
console.log('   - Maintained camelCase field names in Prisma models')
