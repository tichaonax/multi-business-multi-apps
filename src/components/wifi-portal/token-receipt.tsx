'use client'

import { formatCurrency } from '@/lib/format-currency'
import { formatDataAmount, formatDuration } from '@/lib/printing/format-utils'

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
  ap_ssid?: string
}

export function TokenReceipt({ token, business, sale, ap_ssid }: TokenReceiptProps) {
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
    <div className="p-8 max-w-md mx-auto font-mono text-sm print:p-4">
      {/* Header */}
      <div className="text-center border-b-2 border-black pb-4 mb-4">
        <h1 className="text-2xl font-bold mb-2">{business.name}</h1>
        <p className="uppercase text-xs">{business.type}</p>
      </div>

      {/* Receipt Title */}
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold">WiFi ACCESS TOKEN</h2>
        <p className="text-xs mt-1">Keep this receipt for your records</p>
      </div>

      {/* Token Details */}
      <div className="mb-6 border-2 border-black p-4">
        <div className="text-center mb-3">
          <p className="text-xs mb-1">Your WiFi Access Code</p>
          <p className="text-2xl font-bold tracking-wider border-2 border-black py-2 px-3">
            {token.token}
          </p>
        </div>
      </div>

      {/* Package Details */}
      <div className="mb-6 space-y-2">
        <h3 className="font-bold text-center border-b border-black pb-1 mb-3">PACKAGE DETAILS</h3>

        <div className="flex justify-between">
          <span>Package:</span>
          <span className="font-medium">{token.tokenConfig.name}</span>
        </div>

        <div className="flex justify-between">
          <span>Duration:</span>
          <span className="font-medium">{formatDuration(token.tokenConfig.durationMinutes)}</span>
        </div>

        <div className="flex justify-between">
          <span>Download Limit:</span>
          <span className="font-medium">{formatDataAmount(token.tokenConfig.bandwidthDownMb)}</span>
        </div>

        <div className="flex justify-between">
          <span>Upload Limit:</span>
          <span className="font-medium">{formatDataAmount(token.tokenConfig.bandwidthUpMb)}</span>
        </div>

        <div className="flex justify-between border-t border-black pt-2 mt-2">
          <span>Expires:</span>
          <span className="font-medium">{formatDateTime(token.expiresAt)}</span>
        </div>
      </div>

      {/* Payment Details */}
      <div className="mb-6 space-y-2">
        <h3 className="font-bold text-center border-b border-black pb-1 mb-3">PAYMENT DETAILS</h3>

        <div className="flex justify-between">
          <span>Amount Paid:</span>
          <span className="font-bold text-lg">{formatCurrency(sale.saleAmount)}</span>
        </div>

        <div className="flex justify-between">
          <span>Payment Method:</span>
          <span className="font-medium capitalize">{sale.paymentMethod.toLowerCase()}</span>
        </div>

        <div className="flex justify-between">
          <span>Date/Time:</span>
          <span className="font-medium">{formatDateTime(sale.soldAt)}</span>
        </div>
      </div>

      {/* Connection Instructions */}
      <div className="mb-6 border-2 border-black p-4">
        <h3 className="font-bold text-center mb-3">HOW TO CONNECT</h3>
        <ol className="text-xs space-y-2 list-decimal list-inside">
          <li>Connect to WiFi network: &quot;{ap_ssid || `${business.name} Guest`}&quot;</li>
          <li>Open your web browser</li>
          <li>Enter the access code shown above</li>
          <li>Click &quot;Connect&quot; to start browsing</li>
        </ol>
        <p className="text-xs text-center mt-3 font-medium">
          Code is valid until expiration time
        </p>
      </div>

      {/* Terms & Conditions */}
      <div className="mb-6 text-xs border-t border-black pt-3">
        <p className="font-bold mb-1">Terms & Conditions:</p>
        <ul className="space-y-1 ml-4">
          <li>• One-time use only</li>
          <li>• No refunds after activation</li>
          <li>• Speed may vary based on network traffic</li>
          <li>• Illegal activities strictly prohibited</li>
        </ul>
      </div>

      {/* Footer */}
      <div className="text-center border-t-2 border-black pt-4 text-xs">
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
          * {
            color: black !important;
            background: white !important;
          }
          .print\\:p-4 {
            padding: 1rem;
          }
        }
      `}</style>
    </div>
  )
}
