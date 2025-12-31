'use client';

import { useState } from 'react';
import { AlertTriangle, Package, Barcode, X, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface ConflictingProduct {
  id: string;
  name: string;
  sku: string;
  businessId: string;
  businessName: string;
  businessType?: string;
  existingBarcode: {
    id: string;
    code: string;
    type: string;
    isPrimary: boolean;
  };
}

interface BarcodeConflictDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (action: 'add-secondary' | 'replace-primary' | 'cancel') => void;
  barcodeValue: string;
  symbology: string;
  conflictingProduct: ConflictingProduct;
  currentProductName?: string;
}

export default function BarcodeConflictDialog({
  isOpen,
  onClose,
  onConfirm,
  barcodeValue,
  symbology,
  conflictingProduct,
  currentProductName,
}: BarcodeConflictDialogProps) {
  const [selectedAction, setSelectedAction] = useState<'add-secondary' | 'replace-primary' | null>(null);

  const handleConfirm = () => {
    if (!selectedAction) {
      return;
    }
    onConfirm(selectedAction);
    handleClose();
  };

  const handleClose = () => {
    setSelectedAction(null);
    onClose();
  };

  const handleCancel = () => {
    onConfirm('cancel');
    handleClose();
  };

  if (!isOpen) return null;

  const isSameSymbology = conflictingProduct.existingBarcode.type === symbology;
  const isPrimaryConflict = conflictingProduct.existingBarcode.isPrimary;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Barcode Conflict Detected
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
          {/* Barcode Info */}
          <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
            <div className="flex items-start gap-3">
              <Barcode className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                  Barcode Already Exists
                </p>
                <p className="mt-1 text-sm text-yellow-800 dark:text-yellow-200">
                  The barcode <code className="px-1.5 py-0.5 bg-yellow-100 dark:bg-yellow-800 rounded font-mono text-xs">
                    {barcodeValue}
                  </code> ({symbology}) is already assigned to another product.
                </p>
              </div>
            </div>
          </div>

          {/* Conflicting Product Info */}
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                  Existing Product
                </h3>
              </div>
              <Link
                href={`/${conflictingProduct.businessType || 'universal'}/products/${conflictingProduct.id}`}
                target="_blank"
                className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
              >
                View Product
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>

            <div className="space-y-2">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Product Name</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {conflictingProduct.name}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">SKU</p>
                <p className="text-sm text-gray-900 dark:text-white font-mono">
                  {conflictingProduct.sku}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Business</p>
                <p className="text-sm text-gray-900 dark:text-white">
                  {conflictingProduct.businessName}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Barcode Status</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    isPrimaryConflict
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                  }`}>
                    {isPrimaryConflict ? 'Primary Barcode' : 'Secondary Barcode'}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                    {conflictingProduct.existingBarcode.type}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Current Product (if provided) */}
          {currentProductName && (
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                <strong>Adding barcode to:</strong> {currentProductName}
              </p>
            </div>
          )}

          {/* Action Options */}
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              What would you like to do?
            </p>

            <div className="space-y-3">
              {/* Add as Secondary Barcode */}
              <label className="flex items-start p-4 border-2 rounded-lg cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
                style={{
                  borderColor: selectedAction === 'add-secondary'
                    ? 'rgb(59, 130, 246)'
                    : 'rgb(229, 231, 235)'
                }}
              >
                <input
                  type="radio"
                  name="action"
                  value="add-secondary"
                  checked={selectedAction === 'add-secondary'}
                  onChange={(e) => setSelectedAction('add-secondary')}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Add as Secondary Barcode
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {currentProductName
                      ? `Keep the barcode on "${conflictingProduct.name}" and also add it to "${currentProductName}". Both products will share this barcode.`
                      : `Add this barcode to the new product. The barcode will be associated with multiple products.`
                    }
                  </p>
                  {!isSameSymbology && (
                    <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                      ⚠️ Note: Different symbology ({symbology} vs {conflictingProduct.existingBarcode.type})
                    </p>
                  )}
                </div>
              </label>

              {/* Replace Primary Barcode */}
              <label className="flex items-start p-4 border-2 rounded-lg cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
                style={{
                  borderColor: selectedAction === 'replace-primary'
                    ? 'rgb(59, 130, 246)'
                    : 'rgb(229, 231, 235)'
                }}
              >
                <input
                  type="radio"
                  name="action"
                  value="replace-primary"
                  checked={selectedAction === 'replace-primary'}
                  onChange={(e) => setSelectedAction('replace-primary')}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Remove from Existing Product & Add Here
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {currentProductName
                      ? `Remove this barcode from "${conflictingProduct.name}" and add it to "${currentProductName}" as the primary barcode.`
                      : `Remove this barcode from "${conflictingProduct.name}" and use it for the new product.`
                    }
                  </p>
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                    ⚠️ This will affect the existing product's barcode configuration
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Warning Message */}
          {selectedAction === 'add-secondary' && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>
                  Multiple products sharing the same barcode can work, but POS systems will need to prompt users to select the correct product when scanning.
                </span>
              </p>
            </div>
          )}

          {selectedAction === 'replace-primary' && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
              <p className="text-sm text-red-800 dark:text-red-200 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>
                  Removing this barcode from "{conflictingProduct.name}" may affect existing labels and POS scanning.
                </span>
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3 sticky bottom-0 bg-white dark:bg-gray-800">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedAction}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Barcode className="w-4 h-4" />
            {selectedAction === 'add-secondary' && 'Add as Secondary'}
            {selectedAction === 'replace-primary' && 'Remove & Replace'}
            {!selectedAction && 'Select an Option'}
          </button>
        </div>
      </div>
    </div>
  );
}
