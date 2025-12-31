'use client';

import { useState } from 'react';
import { AlertTriangle, DollarSign, X } from 'lucide-react';

interface PriceOverrideDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (updateProduct: boolean, reason?: string, notes?: string) => void;
  productName: string;
  variantName?: string;
  oldPrice: string | number;
  newPrice: string | number;
  isVariant: boolean;
}

export default function PriceOverrideDialog({
  isOpen,
  onClose,
  onConfirm,
  productName,
  variantName,
  oldPrice,
  newPrice,
  isVariant,
}: PriceOverrideDialogProps) {
  const [updateProduct, setUpdateProduct] = useState(true);
  const [reason, setReason] = useState('BARCODE_LABEL_PRINT');
  const [notes, setNotes] = useState('');

  const handleConfirm = () => {
    onConfirm(updateProduct, reason, notes);
    handleClose();
  };

  const handleClose = () => {
    setUpdateProduct(true);
    setReason('BARCODE_LABEL_PRINT');
    setNotes('');
    onClose();
  };

  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(num);
  };

  const oldPriceNum = typeof oldPrice === 'string' ? parseFloat(oldPrice) : oldPrice;
  const newPriceNum = typeof newPrice === 'string' ? parseFloat(newPrice) : newPrice;
  const priceDifference = newPriceNum - oldPriceNum;
  const isIncrease = priceDifference > 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Price Override Detected
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          {/* Product Info */}
          <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Product: <span className="text-gray-900 dark:text-white">{productName}</span>
            </p>
            {variantName && (
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-1">
                Variant: <span className="text-gray-900 dark:text-white">{variantName}</span>
              </p>
            )}
          </div>

          {/* Price Comparison */}
          <div className="mb-6">
            <div className="flex items-center justify-center gap-8">
              <div className="text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Current Price</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(oldPrice)}
                </p>
              </div>

              <div className="text-center">
                <div className={`text-3xl ${isIncrease ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  →
                </div>
              </div>

              <div className="text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">New Price</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {formatCurrency(newPrice)}
                </p>
              </div>
            </div>

            <div className="mt-3 text-center">
              <p className={`text-sm font-medium ${isIncrease ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {isIncrease ? '↑' : '↓'} {formatCurrency(Math.abs(priceDifference))} ({isIncrease ? 'increase' : 'decrease'})
              </p>
            </div>
          </div>

          {/* Update Product Checkbox */}
          <div className="mb-4 p-4 border-2 border-blue-200 dark:border-blue-700 rounded-lg bg-blue-50 dark:bg-blue-900/20">
            <label className="flex items-start cursor-pointer">
              <input
                type="checkbox"
                checked={updateProduct}
                onChange={(e) => setUpdateProduct(e.target.checked)}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Update {isVariant ? 'variant' : 'product'} price in inventory
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {updateProduct ? (
                    <>
                      The {isVariant ? 'variant' : 'product'} price will be updated to {formatCurrency(newPrice)} in your inventory.
                      {isVariant && ' Only this variant will be updated.'}
                      This change will be reflected immediately in the POS system.
                    </>
                  ) : (
                    <>Price will be used for this label only. The {isVariant ? 'variant' : 'product'} price in inventory will not change.</>
                  )}
                </p>
              </div>
            </label>
          </div>

          {/* Reason and Notes (only if updating product) */}
          {updateProduct && (
            <>
              <div className="mb-4">
                <label htmlFor="reason" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Reason for Price Change
                </label>
                <select
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white py-2 px-3"
                >
                  <option value="BARCODE_LABEL_PRINT">Barcode Label Print</option>
                  <option value="PROMOTIONAL">Promotional Pricing</option>
                  <option value="SUPPLIER_UPDATE">Supplier Cost Change</option>
                  <option value="MANUAL_EDIT">Manual Price Adjustment</option>
                  <option value="BULK_UPDATE">Bulk Price Update</option>
                </select>
              </div>

              <div className="mb-4">
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white py-2 px-3"
                  placeholder="Optional explanation for this price change..."
                />
              </div>
            </>
          )}

          {/* Warning Message */}
          {updateProduct && (
            <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>
                  This price change will be logged in the audit trail and will take effect immediately in your inventory and POS system.
                </span>
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <DollarSign className="w-4 h-4" />
            {updateProduct ? 'Update Price & Continue' : 'Continue Without Update'}
          </button>
        </div>
      </div>
    </div>
  );
}
