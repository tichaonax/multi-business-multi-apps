'use client'

import { formatCurrency } from '@/lib/format-currency'

interface TokenReceiptProps {
  token: {
    id: string
    token: string
    status: string
    expiresAt: string
    createdAt: string
    tokenConfig: {
      name: string
      durationMinutes: number
      bandwidthDownMb: number
      bandwidthUpMb: number
    }
  }
  business: {
    name: string
    type: string
  }
  sale: {
    saleAmount: number
    paymentMethod: string
    soldAt: string
  }
}

export function TokenReceipt({ token, business, sale }: TokenReceiptProps) {
  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes} minutes`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (mins === 0) return `${hours} hour${hours > 1 ? 's' : ''}`
    return `${hours}h ${mins}m`
  }

  const formatDateTime = (dateStr: string): string => {
    const date = new Date(dateStr)
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="bg-white p-8 max-w-md mx-auto font-mono text-sm print:p-4">
      {/* Header */}
      <div className="text-center border-b-2 border-dashed border-gray-400 pb-4 mb-4">
        <h1 className="text-2xl font-bold mb-2">{business.name}</h1>
        <p className="text-gray-600 uppercase text-xs">{business.type}</p>
      </div>

      {/* Receipt Title */}
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold">WiFi ACCESS TOKEN</h2>
        <p className="text-xs text-gray-600 mt-1">Keep this receipt for your records</p>
      </div>

      {/* Token Details */}
      <div className="mb-6 bg-gray-50 border-2 border-gray-300 p-4 rounded">
        <div className="text-center mb-3">
          <p className="text-xs text-gray-600 mb-1">Your WiFi Access Code</p>
          <p className="text-2xl font-bold tracking-wider bg-yellow-100 py-2 px-3 rounded border-2 border-yellow-400">
            {token.token}
          </p>
        </div>
      </div>

      {/* Package Details */}
      <div className="mb-6 space-y-2">
        <h3 className="font-bold text-center border-b border-gray-300 pb-1 mb-3">PACKAGE DETAILS</h3>

        <div className="flex justify-between">
          <span className="text-gray-600">Package:</span>
          <span className="font-medium">{token.tokenConfig.name}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-600">Duration:</span>
          <span className="font-medium">{formatDuration(token.tokenConfig.durationMinutes)}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-600">Download Limit:</span>
          <span className="font-medium">{token.tokenConfig.bandwidthDownMb} MB</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-600">Upload Limit:</span>
          <span className="font-medium">{token.tokenConfig.bandwidthUpMb} MB</span>
        </div>

        <div className="flex justify-between border-t border-gray-300 pt-2 mt-2">
          <span className="text-gray-600">Expires:</span>
          <span className="font-medium text-red-600">{formatDateTime(token.expiresAt)}</span>
        </div>
      </div>

      {/* Payment Details */}
      <div className="mb-6 space-y-2">
        <h3 className="font-bold text-center border-b border-gray-300 pb-1 mb-3">PAYMENT DETAILS</h3>

        <div className="flex justify-between">
          <span className="text-gray-600">Amount Paid:</span>
          <span className="font-bold text-lg">{formatCurrency(sale.saleAmount)}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-600">Payment Method:</span>
          <span className="font-medium capitalize">{sale.paymentMethod.toLowerCase()}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-600">Date/Time:</span>
          <span className="font-medium">{formatDateTime(sale.soldAt)}</span>
        </div>
      </div>

      {/* Connection Instructions */}
      <div className="mb-6 bg-blue-50 border-2 border-blue-300 p-4 rounded">
        <h3 className="font-bold text-center mb-3">📶 HOW TO CONNECT</h3>
        <ol className="text-xs space-y-2 list-decimal list-inside">
          <li>Connect to WiFi network: <strong>&quot;{business.name} Guest&quot;</strong></li>
          <li>Open your web browser</li>
          <li>Enter the access code shown above</li>
          <li>Click &quot;Connect&quot; to start browsing</li>
        </ol>
        <p className="text-xs text-center mt-3 text-blue-800 font-medium">
          ⚠️ Code is valid until expiration time
        </p>
      </div>

      {/* Terms & Conditions */}
      <div className="mb-6 text-xs text-gray-600 border-t border-gray-300 pt-3">
        <p className="font-bold mb-1">Terms & Conditions:</p>
        <ul className="space-y-1 ml-4">
          <li>• One-time use only</li>
          <li>• No refunds after activation</li>
          <li>• Speed may vary based on network traffic</li>
          <li>• Illegal activities strictly prohibited</li>
        </ul>
      </div>

      {/* Footer */}
      <div className="text-center border-t-2 border-dashed border-gray-400 pt-4 text-xs text-gray-600">
        <p>Thank you for your purchase!</p>
        <p className="mt-2">Token ID: {token.id.slice(0, 8)}</p>
        <p className="mt-1">{formatDateTime(token.createdAt)}</p>
      </div>

      {/* Print Styles */}
      <style jsx>{`
        @media print {
          @page {
            size: 80mm auto;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 0;
          }
          .print\\:p-4 {
            padding: 1rem;
          }
        }
      `}</style>
    </div>
  )
}
