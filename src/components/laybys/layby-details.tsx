'use client'

import { CustomerLayby } from '@/types/layby'
import { LaybyStatusBadge } from './layby-status-badge'
import { formatDateByFormat } from '@/lib/country-codes'
import { useDateFormat } from '@/contexts/settings-context'
import { User, Package, Calendar, DollarSign, FileText, CreditCard, Clock, CheckCircle2 } from 'lucide-react'

interface LaybyDetailsProps {
  layby: CustomerLayby
}

export function LaybyDetails({ layby }: LaybyDetailsProps) {
  const { format: globalDateFormat } = useDateFormat()

  const formatCurrency = (amount: number | any) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(Number(amount))
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return formatDateByFormat(dateString, globalDateFormat)
  }

  const items = layby.items as any[]
  const paymentProgress = (Number(layby.totalPaid) / Number(layby.totalAmount)) * 100

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-primary">{layby.laybyNumber}</h2>
          <p className="text-sm text-secondary mt-1">
            Created {formatDate(layby.createdAt)}
          </p>
        </div>
        <LaybyStatusBadge status={layby.status} />
      </div>

      {/* Customer Information */}
      {layby.customer && (
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <User className="h-5 w-5 text-secondary" />
            <h3 className="font-semibold">Customer Information</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-secondary">Name:</p>
              <p className="font-medium">{layby.customer.name}</p>
            </div>
            <div>
              <p className="text-secondary">Customer Number:</p>
              <p className="font-medium font-mono">{layby.customer.customerNumber}</p>
            </div>
            {layby.customer.phone && (
              <div>
                <p className="text-secondary">Phone:</p>
                <p className="font-medium">{layby.customer.phone}</p>
              </div>
            )}
            {layby.customer.email && (
              <div>
                <p className="text-secondary">Email:</p>
                <p className="font-medium">{layby.customer.email}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Financial Summary */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="h-5 w-5 text-secondary" />
          <h3 className="font-semibold">Financial Summary</h3>
        </div>
        <div className="space-y-4">
          {/* Progress Bar */}
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-secondary">Payment Progress</span>
              <span className="font-semibold">{paymentProgress.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div
                className="bg-blue-600 dark:bg-blue-500 h-3 rounded-full transition-all"
                style={{ width: `${Math.min(paymentProgress, 100)}%` }}
              />
            </div>
          </div>

          {/* Amounts */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-secondary mb-1">Total Amount</p>
              <p className="text-lg font-bold">{formatCurrency(layby.totalAmount)}</p>
            </div>
            <div>
              <p className="text-xs text-secondary mb-1">Deposit</p>
              <p className="text-lg font-bold text-blue-600">{formatCurrency(layby.depositAmount)}</p>
              <p className="text-xs text-secondary">{layby.depositPercent}%</p>
            </div>
            <div>
              <p className="text-xs text-secondary mb-1">Total Paid</p>
              <p className="text-lg font-bold text-green-600">{formatCurrency(layby.totalPaid)}</p>
            </div>
            <div>
              <p className="text-xs text-secondary mb-1">Balance</p>
              <p className="text-lg font-bold text-orange-600">{formatCurrency(layby.balanceRemaining)}</p>
            </div>
          </div>

          {/* Fees */}
          {Number(layby.totalFees) > 0 && (
            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-2">Fees</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                {Number(layby.serviceFee) > 0 && (
                  <div>
                    <p className="text-secondary">Service Fee:</p>
                    <p className="font-medium">{formatCurrency(layby.serviceFee)}</p>
                  </div>
                )}
                {Number(layby.lateFee) > 0 && (
                  <div>
                    <p className="text-secondary">Late Fee:</p>
                    <p className="font-medium">{formatCurrency(layby.lateFee)}</p>
                  </div>
                )}
                {Number(layby.administrationFee) > 0 && (
                  <div>
                    <p className="text-secondary">Admin Fee:</p>
                    <p className="font-medium">{formatCurrency(layby.administrationFee)}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Payment Schedule */}
      {(layby.installmentFrequency || layby.paymentDueDate) && (
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="h-5 w-5 text-secondary" />
            <h3 className="font-semibold">Payment Schedule</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            {layby.installmentFrequency && (
              <div>
                <p className="text-secondary">Frequency:</p>
                <p className="font-medium">{layby.installmentFrequency}</p>
              </div>
            )}
            {layby.installmentAmount && (
              <div>
                <p className="text-secondary">Installment Amount:</p>
                <p className="font-medium">{formatCurrency(layby.installmentAmount)}</p>
              </div>
            )}
            {layby.paymentDueDate && (
              <div>
                <p className="text-secondary">Next Payment Due:</p>
                <p className="font-medium">{formatDate(layby.paymentDueDate)}</p>
              </div>
            )}
            {layby.completionDueDate && (
              <div>
                <p className="text-secondary">Completion Due:</p>
                <p className="font-medium">{formatDate(layby.completionDueDate)}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Items */}
      {items && items.length > 0 && (
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Package className="h-5 w-5 text-secondary" />
            <h3 className="font-semibold">Items ({items.length})</h3>
            {layby.itemsReleased && (
              <span className="ml-auto text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300 px-2 py-1 rounded-full flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Released
              </span>
            )}
          </div>
          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded">
                <div className="flex-1">
                  <p className="font-medium">{item.productName || `Product ${index + 1}`}</p>
                  <p className="text-sm text-secondary">
                    Quantity: {item.quantity} × {formatCurrency(item.unitPrice)}
                  </p>
                </div>
                <p className="font-semibold">{formatCurrency(item.totalPrice)}</p>
              </div>
            ))}
          </div>
          {layby.itemsReleased && layby.itemsReleasedAt && (
            <div className="mt-4 pt-4 border-t text-sm text-secondary">
              Released on {formatDate(layby.itemsReleasedAt)}
            </div>
          )}
        </div>
      )}

      {/* Payment History */}
      {layby.payments && layby.payments.length > 0 && (
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="h-5 w-5 text-secondary" />
            <h3 className="font-semibold">Payment History ({layby.payments.length})</h3>
          </div>
          <div className="space-y-3">
            {layby.payments.map((payment) => (
              <div
                key={payment.id}
                className={`p-4 rounded border ${
                  payment.isRefund
                    ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950'
                    : 'border-border'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium font-mono">{payment.receiptNumber}</p>
                      {payment.isRefund && (
                        <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded">
                          REFUND
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-secondary">
                      {payment.paymentMethod} • {formatDate(payment.paymentDate)}
                    </p>
                    {payment.processor && (
                      <p className="text-xs text-secondary mt-1">
                        Processed by {payment.processor.name}
                      </p>
                    )}
                    {payment.notes && (
                      <p className="text-sm mt-2 text-secondary italic">{payment.notes}</p>
                    )}
                  </div>
                  <p className={`text-lg font-bold ${payment.isRefund ? 'text-red-600' : 'text-green-600'}`}>
                    {payment.isRefund ? '-' : '+'}{formatCurrency(payment.amount)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {layby.notes && (
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-5 w-5 text-secondary" />
            <h3 className="font-semibold">Notes</h3>
          </div>
          <p className="text-sm text-secondary whitespace-pre-wrap">{layby.notes}</p>
        </div>
      )}

      {/* Timeline */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-5 w-5 text-secondary" />
          <h3 className="font-semibold">Timeline</h3>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-secondary">Created:</span>
            <span>{formatDate(layby.createdAt)}</span>
          </div>
          {layby.updatedAt !== layby.createdAt && (
            <div className="flex justify-between">
              <span className="text-secondary">Last Updated:</span>
              <span>{formatDate(layby.updatedAt)}</span>
            </div>
          )}
          {layby.completedAt && (
            <div className="flex justify-between">
              <span className="text-secondary">Completed:</span>
              <span className="text-green-600">{formatDate(layby.completedAt)}</span>
            </div>
          )}
          {layby.cancelledAt && (
            <div className="flex justify-between">
              <span className="text-secondary">Cancelled:</span>
              <span className="text-red-600">{formatDate(layby.cancelledAt)}</span>
            </div>
          )}
        </div>
        {layby.cancellationReason && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs text-secondary mb-1">Cancellation Reason:</p>
            <p className="text-sm">{layby.cancellationReason}</p>
            {layby.cancellationRefund && (
              <p className="text-sm mt-2 text-secondary">
                Refund: {formatCurrency(layby.cancellationRefund)}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
