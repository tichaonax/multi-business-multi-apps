'use client';

import { useState, useEffect } from 'react';
import { Sparkles, Edit2, RotateCw, Check, X } from 'lucide-react';

interface SKUGeneratorProps {
  businessId: string;
  categoryName?: string;
  departmentName?: string;
  value: string;
  onChange: (sku: string) => void;
  disabled?: boolean;
}

export default function SKUGenerator({
  businessId,
  categoryName,
  departmentName,
  value,
  onChange,
  disabled = false,
}: SKUGeneratorProps) {
  const [isManual, setIsManual] = useState(false);
  const [manualValue, setManualValue] = useState(value);
  const [previewSku, setPreviewSku] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [format, setFormat] = useState<string>('');

  // Load preview SKU when component mounts or dependencies change
  useEffect(() => {
    if (!isManual && businessId) {
      loadPreviewSKU();
    }
  }, [businessId, categoryName, departmentName, isManual]);

  // Set the value to preview SKU when it loads
  useEffect(() => {
    if (previewSku && !isManual && !value) {
      onChange(previewSku);
    }
  }, [previewSku, isManual]);

  const loadPreviewSKU = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        businessId,
        ...(categoryName && { categoryName }),
        ...(departmentName && { departmentName }),
      });

      const response = await fetch(`/api/products/generate-sku?${params}`);

      if (response.ok) {
        const data = await response.json();
        setPreviewSku(data.previewSku);
        setFormat(data.format);
      }
    } catch (error) {
      console.error('Error loading preview SKU:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/products/generate-sku', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          categoryName,
          departmentName,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        onChange(data.sku);
        setPreviewSku(data.sku);
      }
    } catch (error) {
      console.error('Error generating SKU:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleManual = () => {
    if (isManual) {
      // Switching back to auto-generated
      setIsManual(false);
      if (previewSku) {
        onChange(previewSku);
      }
    } else {
      // Switching to manual
      setIsManual(true);
      setManualValue(value);
    }
  };

  const handleManualChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.toUpperCase();
    setManualValue(newValue);
    onChange(newValue);
  };

  return (
    <div className="space-y-3">
      {/* SKU Input Field */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          SKU (Stock Keeping Unit) *
        </label>

        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={isManual ? manualValue : (value || previewSku || '')}
              onChange={isManual ? handleManualChange : undefined}
              disabled={disabled || (!isManual && loading)}
              readOnly={!isManual}
              placeholder={isManual ? 'Enter custom SKU' : 'Auto-generating...'}
              className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white py-2.5 px-3 pr-10 font-mono ${
                !isManual ? 'bg-gray-50 dark:bg-gray-800' : ''
              }`}
            />
            {!isManual && !loading && previewSku && (
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <Sparkles className="w-4 h-4 text-blue-500" />
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleToggleManual}
            disabled={disabled}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
              isManual
                ? 'bg-gray-600 hover:bg-gray-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
            title={isManual ? 'Switch to auto-generate' : 'Enter manually'}
          >
            {isManual ? (
              <>
                <Sparkles className="w-4 h-4" />
                <span className="hidden sm:inline">Auto</span>
              </>
            ) : (
              <>
                <Edit2 className="w-4 h-4" />
                <span className="hidden sm:inline">Manual</span>
              </>
            )}
          </button>
        </div>

        <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
          {isManual ? (
            'Enter a custom SKU. Must be unique within this business.'
          ) : loading ? (
            'Loading next SKU...'
          ) : previewSku ? (
            <>
              Next available SKU based on format: <span className="font-medium">{format}</span>
            </>
          ) : (
            'SKU will be auto-generated when you create the product'
          )}
        </p>
      </div>

      {/* Auto-Generation Info Panel */}
      {!isManual && previewSku && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Auto-Generated SKU
              </p>
              <p className="mt-1 text-xs text-blue-800 dark:text-blue-200">
                This SKU is automatically generated based on your business configuration.
                The sequence will increment with each new product.
              </p>
              <div className="mt-2 flex items-center gap-2">
                <code className="px-2 py-1 text-sm font-mono bg-blue-100 dark:bg-blue-800 text-blue-900 dark:text-blue-100 rounded">
                  Format: {format}
                </code>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Entry Info Panel */}
      {isManual && (
        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
          <div className="flex items-start gap-3">
            <Edit2 className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                Manual SKU Entry
              </p>
              <p className="mt-1 text-xs text-yellow-800 dark:text-yellow-200">
                You are entering a custom SKU. Make sure it is unique within your business to avoid conflicts.
                Click "Auto" to switch back to auto-generated SKUs.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
