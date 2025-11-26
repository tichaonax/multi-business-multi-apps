'use client'

import { useRef } from 'react'

interface VoucherData {
  voucherNumber: string
  employeeNumber: string
  employeeName: string
  employeeNationalId: string
  amount: number
  paymentDate: string
  issuedAt: string
  paymentType: string
  adjustmentNote?: string
  regenerationCount: number
  lastRegeneratedAt?: string
  signedAt?: string
  signatureData?: string
}

interface PaymentVoucherProps {
  data: VoucherData
  showPrintButton?: boolean
  companyName?: string
  companyLogo?: string
}

export function PaymentVoucher({
  data,
  showPrintButton = true,
  companyName = 'Multi-Business Manager',
  companyLogo,
}: PaymentVoucherProps) {
  const voucherRef = useRef<HTMLDivElement>(null)

  const handlePrint = () => {
    window.print()
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getPaymentTypeLabel = (type: string) => {
    switch (type) {
      case 'REGULAR_SALARY':
        return 'Regular Salary Payment'
      case 'ADVANCE':
        return 'Salary Advance Payment'
      case 'BONUS':
        return 'Bonus Payment'
      case 'COMMISSION':
        return 'Commission Payment'
      default:
        return type
    }
  }

  return (
    <div className="bg-white">
      {/* Print Button */}
      {showPrintButton && (
        <div className="mb-4 print:hidden">
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <span>🖨️</span>
            <span>Print Voucher</span>
          </button>
        </div>
      )}

      {/* Voucher Document */}
      <div
        ref={voucherRef}
        className="max-w-4xl mx-auto bg-white border-2 border-gray-300 rounded-lg p-8 print:border-0 print:p-0"
        style={{
          fontFamily: 'Arial, sans-serif',
        }}
      >
        {/* Header with Company Logo/Name */}
        <div className="text-center mb-6 pb-4 border-b-2 border-gray-300">
          {companyLogo ? (
            <img src={companyLogo} alt={companyName} className="h-16 mx-auto mb-2" />
          ) : (
            <div className="text-3xl font-bold text-gray-800 mb-2">{companyName}</div>
          )}
          <h1 className="text-2xl font-bold text-gray-900 mb-1">PAYMENT VOUCHER</h1>
          <p className="text-sm text-gray-600">{getPaymentTypeLabel(data.paymentType)}</p>
        </div>

        {/* Voucher Number and Date */}
        <div className="grid grid-cols-2 gap-4 mb-6 bg-gray-50 p-4 rounded">
          <div>
            <p className="text-xs text-gray-600 uppercase mb-1">Voucher Number</p>
            <p className="text-lg font-bold text-gray-900">{data.voucherNumber}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-600 uppercase mb-1">Issue Date</p>
            <p className="text-lg font-semibold text-gray-900">{formatDate(data.issuedAt)}</p>
          </div>
        </div>

        {/* Employee Information */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-700 uppercase mb-3 pb-2 border-b">
            Employee Information
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-600 mb-1">Full Name</p>
              <p className="text-base font-semibold text-gray-900">{data.employeeName}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Employee Number</p>
              <p className="text-base font-semibold text-gray-900">{data.employeeNumber}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">National ID</p>
              <p className="text-base font-semibold text-gray-900">{data.employeeNationalId}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Payment Date</p>
              <p className="text-base font-semibold text-gray-900">{formatDate(data.paymentDate)}</p>
            </div>
          </div>
        </div>

        {/* Payment Amount */}
        <div className="mb-6 bg-green-50 border-2 border-green-300 rounded-lg p-6 text-center">
          <p className="text-sm text-gray-700 mb-2">PAYMENT AMOUNT</p>
          <p className="text-4xl font-bold text-green-700">{formatCurrency(data.amount)}</p>
        </div>

        {/* Adjustment Note (if exists) */}
        {data.adjustmentNote && (
          <div className="mb-6 bg-yellow-50 border border-yellow-300 rounded-lg p-4">
            <p className="text-xs font-semibold text-gray-700 uppercase mb-2">Note</p>
            <p className="text-sm text-gray-900">{data.adjustmentNote}</p>
          </div>
        )}

        {/* Signature Section */}
        <div className="mb-6 pt-6 border-t-2 border-gray-300">
          <h2 className="text-sm font-semibold text-gray-700 uppercase mb-4">
            Employee Acknowledgment
          </h2>

          <div className="grid grid-cols-2 gap-8">
            {/* Employee Signature */}
            <div>
              <p className="text-xs text-gray-600 mb-8">Employee Signature</p>
              {data.signatureData ? (
                <div className="border-b-2 border-gray-900 pb-2 mb-2">
                  {/* If signature is an image */}
                  {data.signatureData.startsWith('data:image') ? (
                    <img src={data.signatureData} alt="Signature" className="h-12" />
                  ) : (
                    <p className="font-signature text-2xl">{data.signatureData}</p>
                  )}
                </div>
              ) : (
                <div className="border-b-2 border-gray-900 h-12 mb-2"></div>
              )}
              <p className="text-xs text-gray-600">
                Date: {data.signedAt ? formatDate(data.signedAt) : '_________________'}
              </p>
            </div>

            {/* Authorized By */}
            <div>
              <p className="text-xs text-gray-600 mb-8">Authorized By (Payroll Manager)</p>
              <div className="border-b-2 border-gray-900 h-12 mb-2"></div>
              <p className="text-xs text-gray-600">Date: _________________</p>
            </div>
          </div>

          <div className="mt-6 text-xs text-gray-600 italic">
            <p>
              I hereby acknowledge receipt of the above payment amount. This voucher serves as proof of
              payment.
            </p>
          </div>
        </div>

        {/* Voucher Metadata */}
        <div className="text-xs text-gray-500 space-y-1 pt-4 border-t border-gray-200">
          <p>
            <span className="font-semibold">Issued:</span> {formatDateTime(data.issuedAt)}
          </p>
          {data.regenerationCount > 0 && (
            <>
              <p>
                <span className="font-semibold">Regenerations:</span> {data.regenerationCount}
              </p>
              {data.lastRegeneratedAt && (
                <p>
                  <span className="font-semibold">Last Regenerated:</span>{' '}
                  {formatDateTime(data.lastRegeneratedAt)}
                </p>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-xs text-gray-500 border-t border-gray-200 pt-4">
          <p>This is a computer-generated document. No signature is required for validity.</p>
          <p className="mt-1">For questions or concerns, please contact the Payroll Department.</p>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx>{`
        @media print {
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          @page {
            size: A4;
            margin: 20mm;
          }

          .print\\:hidden {
            display: none !important;
          }

          .print\\:border-0 {
            border: 0 !important;
          }

          .print\\:p-0 {
            padding: 0 !important;
          }
        }

        .font-signature {
          font-family: 'Brush Script MT', cursive;
        }
      `}</style>
    </div>
  )
}
