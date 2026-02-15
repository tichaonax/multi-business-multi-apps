'use client'

import React from 'react'

import type { ReceiptData } from '@/types/printing'
import { formatDuration, formatDataAmount } from '@/lib/printing/format-utils'
import { formatPhoneNumberForDisplay } from '@/lib/country-codes'
import { formatDateTime } from '@/lib/date-format'

interface ReceiptTemplateProps {
  data: ReceiptData
  showHeader?: boolean
  showFooter?: boolean
}

export function ReceiptTemplate({ data, showHeader = true, showFooter = true }: ReceiptTemplateProps) {
  return (
    <div className="receipt-template font-mono text-xs max-w-[300px] p-2.5 bg-white text-black">
      {showHeader && (
        <div className="text-center mb-4 border-b-2 border-dashed border-black pb-2.5">
          <div className="text-base font-bold mb-1">
            {data.businessName}
          </div>
          {data.businessAddress && (
            <div className="text-[10px] mb-0.5">
              {data.businessAddress}
            </div>
          )}
          {data.businessPhone && (
            <div className="text-[10px]">
              Tel: {formatPhoneNumberForDisplay(data.businessPhone)}
            </div>
          )}
        </div>
      )}

      <div className="mb-4">
        <div className="flex justify-between mb-0.5">
          <span>Receipt #:</span>
          <span className="font-bold">{data.receiptNumber.formattedNumber}</span>
        </div>
        <div className="flex justify-between mb-0.5">
          <span>Date:</span>
          <span>{formatDateTime(data.transactionDate)}</span>
        </div>
        <div className="flex justify-between mb-0.5">
          <span>Transaction:</span>
          <span>{data.transactionId}</span>
        </div>
        <div className="flex justify-between mb-0.5">
          <span>Salesperson:</span>
          <span>{data.salespersonName}</span>
        </div>
      </div>

      <div className="border-t-2 border-b-2 border-dashed border-black py-2.5 mb-2.5">
        <div className="flex justify-between font-bold mb-2">
          <span className="flex-[2]">Item</span>
          <span className="flex-1 text-center">Qty</span>
          <span className="flex-1 text-right">Price</span>
          <span className="flex-1 text-right">Total</span>
        </div>
        {data.items.map((item, index) => (
          <div key={index} className="mb-2">
            <div className="font-bold mb-0.5">
              {item.name}
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="flex-[2]"></span>
              <span className="flex-1 text-center">{item.quantity}</span>
              <span className="flex-1 text-right">${Number(item.unitPrice).toFixed(2)}</span>
              <span className="flex-1 text-right">${Number(item.totalPrice).toFixed(2)}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-4">
        <div className="flex justify-between mb-1">
          <span>Subtotal:</span>
          <span>${Number(data.subtotal).toFixed(2)}</span>
        </div>
        {data.discount && data.discount > 0 && (
          <div className="flex justify-between mb-1">
            <span>{data.discountLabel || 'Discount'}:</span>
            <span>-${Number(data.discount).toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between mb-1">
          <span>Tax:</span>
          <span>${Number(data.tax).toFixed(2)}</span>
        </div>
        <div className="flex justify-between font-bold text-sm border-t border-black pt-1 mt-1">
          <span>TOTAL:</span>
          <span>${Number(data.total).toFixed(2)}</span>
        </div>
      </div>

      <div className="text-[11px]">
        <div className="flex justify-between">
          <span>Payment Method:</span>
          <span className="font-bold">{data.paymentMethod}</span>
        </div>
        {data.amountPaid && (
          <div className="flex justify-between">
            <span>Amount Paid:</span>
            <span>${data.amountPaid.toFixed(2)}</span>
          </div>
        )}
        {data.changeDue && (
          <div className="flex justify-between">
            <span>Change Due:</span>
            <span>${data.changeDue.toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* WiFi Tokens Section (ESP32) */}
      {data.wifiTokens && data.wifiTokens.length > 0 && (
        <div className="border-t-2 border-dashed border-gray-400 dark:border-gray-600 pt-2 mt-2 mb-2">
          <div className="text-center font-bold text-xs mb-1.5">📶 WiFi ACCESS TOKENS</div>
          {data.wifiTokens.map((token, index) => (
            <div key={index} className="mb-2 p-1.5 border border-gray-300 dark:border-gray-600 rounded">
              {token.success ? (
                <>
                  <div className="text-[11px] font-bold mb-0.5">{token.packageName}</div>
                  <div className="text-center my-1">
                    <div className="p-1.5 font-mono text-base font-bold">
                      {token.tokenCode}
                    </div>
                  </div>
                  {data.receiptType === 'customer' && (
                    <div className="text-[10px] text-center">
                      <div>Duration: {formatDuration(token.duration)}</div>
                      {(token.bandwidthDownMb || token.bandwidthUpMb) && (
                        <div className="mt-1">
                          Data Limits: ↓{formatDataAmount(token.bandwidthDownMb || 0)} / ↑{formatDataAmount(token.bandwidthUpMb || 0)}
                        </div>
                      )}
                      <div className="mt-1 text-gray-600 dark:text-gray-400">
                        1. Connect to WiFi "{token.ssid || 'Guest WiFi'}"<br/>
                        2. Visit http://192.168.4.1<br/>
                        3. Enter code above to activate
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-[10px] text-red-600 dark:text-red-400 text-center">
                  ❌ Token unavailable: {token.error || 'Please request more tokens'}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* R710 WiFi Tokens Section */}
      {data.r710Tokens && data.r710Tokens.length > 0 && (
        <div className="border-t-2 border-dashed border-gray-400 dark:border-gray-600 pt-2 mt-2 mb-2">
          <div className="text-center font-bold text-xs mb-1.5">📶 R710 WiFi ACCESS</div>
          {data.r710Tokens.map((token, index) => (
            <div key={index} className="mb-2 p-1.5 border border-gray-300 dark:border-gray-600 rounded">
              {token.success ? (
                <>
                  <div className="text-[11px] font-bold mb-0.5">{token.packageName}</div>
                  <div className="text-center my-1">
                    <div className="p-1.5 font-mono text-base font-bold">
                      {token.password}
                    </div>
                  </div>
                  {data.receiptType === 'customer' && (
                    <div className="text-[10px] text-center">
                      <div>Duration: {token.durationValue} {token.durationUnit.split('_')[1]?.toLowerCase() || token.durationUnit}</div>
                      {token.expiresAt && (
                        <div className="mt-1">
                          Expires: {formatDateTime(new Date(token.expiresAt))}
                        </div>
                      )}
                      {token.ssid && (
                        <div className="mt-2 text-gray-600 dark:text-gray-400">
                          1. Connect to WiFi "{token.ssid}"<br/>
                          2. Use password above to log in
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-[10px] text-red-600 dark:text-red-400 text-center">
                  ❌ Token unavailable: {token.error || 'Please request more tokens'}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showFooter && (
        <div className="text-center text-[10px] border-t-2 border-dashed border-gray-400 dark:border-gray-600 pt-2 mt-2">
          <div className="mb-1">Thank you for your business!</div>
          <div>Please come again</div>
        </div>
      )}
    </div>
  )
}


