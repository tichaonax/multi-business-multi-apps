'use client'

import React from 'react'

interface ReceiptItem {
  name: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

interface ReceiptData {
  businessName: string
  businessAddress?: string
  businessPhone?: string
  orderNumber: string
  orderDate: string
  orderType: string
  paymentMethod: string
  items: ReceiptItem[]
  subtotal: number
  taxAmount: number
  discountAmount?: number
  totalAmount: number
  customerName?: string
  employeeName?: string  // Salesperson/cashier name
  notes?: string
}

interface ReceiptTemplateProps {
  data: ReceiptData
  showHeader?: boolean
  showFooter?: boolean
}

export function ReceiptTemplate({ data, showHeader = true, showFooter = true }: ReceiptTemplateProps) {
  return (
    <div className="receipt-template font-mono text-xs max-w-[300px] p-2.5 bg-white dark:bg-gray-800 text-black dark:text-gray-100">
      {showHeader && (
        <div className="text-center mb-4 border-b-2 border-dashed border-gray-400 dark:border-gray-600 pb-2.5">
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
              Tel: {data.businessPhone}
            </div>
          )}
        </div>
      )}

      <div style={{ marginBottom: '15px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
          <span>Order #:</span>
          <span style={{ fontWeight: 'bold' }}>{data.orderNumber}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
          <span>Date:</span>
          <span>{new Date(data.orderDate).toLocaleString()}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
          <span>Type:</span>
          <span>{data.orderType}</span>
        </div>
        {data.customerName && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
            <span>Customer:</span>
            <span>{data.customerName}</span>
          </div>
        )}
        {data.employeeName && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
            <span>Cashier:</span>
            <span>{data.employeeName}</span>
          </div>
        )}
      </div>

      <div style={{ borderTop: '2px dashed #000', borderBottom: '2px dashed #000', padding: '10px 0', marginBottom: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', marginBottom: '8px' }}>
          <span style={{ flex: '2' }}>Item</span>
          <span style={{ flex: '1', textAlign: 'center' }}>Qty</span>
          <span style={{ flex: '1', textAlign: 'right' }}>Price</span>
          <span style={{ flex: '1', textAlign: 'right' }}>Total</span>
        </div>
        {data.items.map((item, index) => (
          <div key={index} style={{ marginBottom: '8px' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>
              {item.name}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
              <span style={{ flex: '2' }}></span>
              <span style={{ flex: '1', textAlign: 'center' }}>{item.quantity}</span>
              <span style={{ flex: '1', textAlign: 'right' }}>${Number(item.unitPrice).toFixed(2)}</span>
              <span style={{ flex: '1', textAlign: 'right' }}>${Number(item.totalPrice).toFixed(2)}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: '15px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
          <span>Subtotal:</span>
          <span>${Number(data.subtotal).toFixed(2)}</span>
        </div>
        {data.discountAmount && data.discountAmount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', color: '#d00' }}>
            <span>Discount:</span>
            <span>-${Number(data.discountAmount).toFixed(2)}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
          <span>Tax:</span>
          <span>${Number(data.taxAmount).toFixed(2)}</span>
        </div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontWeight: 'bold',
          fontSize: '14px',
          borderTop: '1px solid #000',
          paddingTop: '5px',
          marginTop: '5px'
        }}>
          <span>TOTAL:</span>
          <span>${Number(data.totalAmount).toFixed(2)}</span>
        </div>
      </div>

      <div style={{ marginBottom: '15px', fontSize: '11px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Payment Method:</span>
          <span style={{ fontWeight: 'bold' }}>{data.paymentMethod}</span>
        </div>
      </div>

      {data.notes && (
        <div style={{ marginBottom: '15px', fontSize: '10px', fontStyle: 'italic' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '3px' }}>Notes:</div>
          <div>{data.notes}</div>
        </div>
      )}

      {showFooter && (
        <div style={{
          textAlign: 'center',
          fontSize: '10px',
          borderTop: '2px dashed #000',
          paddingTop: '10px',
          marginTop: '15px'
        }}>
          <div style={{ marginBottom: '5px' }}>Thank you for your business!</div>
          <div>Please come again</div>
        </div>
      )}
    </div>
  )
}

export type { ReceiptData, ReceiptItem }
