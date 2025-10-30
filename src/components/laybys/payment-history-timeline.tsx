'use client'

import { DollarSign, CreditCard, Smartphone, Building2, Printer, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAlert } from '@/components/ui/confirm-modal'

interface Payment {
  id: string
  amount: number
  paymentMethod: string
  referenceNumber?: string
  notes?: string
  createdAt: string
  createdBy?: string
  receiptNumber?: string
}

interface PaymentHistoryTimelineProps {
  payments: Payment[]
  balanceRemaining: number
}

export function PaymentHistoryTimeline({ payments, balanceRemaining }: PaymentHistoryTimelineProps) {
  const customAlert = useAlert()
  const getPaymentIcon = (method: string) => {
    switch (method) {
      case 'CASH':
        return <DollarSign className="h-4 w-4" />
      case 'CARD':
        return <CreditCard className="h-4 w-4" />
      case 'MOBILE_MONEY':
        return <Smartphone className="h-4 w-4" />
      case 'BANK_TRANSFER':
        return <Building2 className="h-4 w-4" />
      default:
        return <DollarSign className="h-4 w-4" />
    }
  }

  const getPaymentMethodLabel = (method: string) => {
    return method.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  }

  const handlePrintReceipt = (paymentId: string) => {
    // TODO: Implement receipt printing
    console.log('Print receipt for payment:', paymentId)
    void customAlert({ title: 'Coming soon', description: 'Receipt printing will be implemented soon' })
  }

  if (payments.length === 0) {
    return (
      <div className="text-center py-12">
        <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400">No payments recorded yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Timeline */}
      <div className="relative">
        {payments.map((payment, index) => {
          const { date, time } = formatDate(payment.createdAt)
          const isFirst = index === 0
          const isLast = index === payments.length - 1

          return (
            <div key={payment.id} className="relative pb-8">
              {/* Vertical Line */}
              {!isLast && (
                <div className="absolute left-6 top-8 bottom-0 w-0.5 bg-gray-300 dark:bg-gray-700" />
              )}

              {/* Timeline Item */}
              <div className="flex gap-4">
                {/* Icon Circle */}
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-300">
                    {getPaymentIcon(payment.paymentMethod)}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {isFirst ? 'Initial Deposit' : `Payment ${index + 1}`}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {date} at {time}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-600">${payment.amount.toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Payment Method</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {getPaymentMethodLabel(payment.paymentMethod)}
                      </p>
                    </div>

                    {payment.referenceNumber && (
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Reference</p>
                        <p className="font-medium text-gray-900 dark:text-white font-mono">
                          {payment.referenceNumber}
                        </p>
                      </div>
                    )}

                    {payment.receiptNumber && (
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Receipt Number</p>
                        <p className="font-medium text-gray-900 dark:text-white font-mono">
                          {payment.receiptNumber}
                        </p>
                      </div>
                    )}

                    {payment.createdBy && (
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Processed By</p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {payment.createdBy}
                        </p>
                      </div>
                    )}
                  </div>

                  {payment.notes && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Notes</p>
                      <p className="text-sm text-gray-900 dark:text-white mt-1">{payment.notes}</p>
                    </div>
                  )}

                  {/* Print Receipt Button */}
                  {payment.receiptNumber && (
                    <div className="mt-3 flex justify-end">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handlePrintReceipt(payment.id)}
                      >
                        <Printer className="h-3 w-3 mr-1" />
                        Print Receipt
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}

        {/* Completion Status */}
        {balanceRemaining === 0 && (
          <div className="relative">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center text-green-600 dark:text-green-300">
                  <CheckCircle className="h-6 w-6" />
                </div>
              </div>
              <div className="flex-1 bg-green-50 dark:bg-green-950 border-2 border-green-500 rounded-lg p-4">
                <h4 className="font-semibold text-green-900 dark:text-green-100 text-lg">
                  Layby Completed
                </h4>
                <p className="text-green-700 dark:text-green-300 text-sm mt-1">
                  Full payment received - Balance: $0.00
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
