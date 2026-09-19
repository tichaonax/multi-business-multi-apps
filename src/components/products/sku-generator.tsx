'use client';

import { useState, useEffect } from 'react';
import { Sparkles, Edit2, RotateCw, Check, X } from 'lucide-react';

interface SKUGeneratorProps {
  businessId: string;
  categoryName?: string;
  departmentName?: string;
  value: string;
  onChange: (sku: string) => void;
  onModeChange?: (isManual: boolean) => void;
  disabled?: boolean;
}

export default function SKUGenerator({
  businessId,
  categoryName,
  departmentName,
  value,
  onChange,
  onModeChange,
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
      onModeChange?.(false);
      if (previewSku) {
        onChange(previewSku);
      }
    } else {
      // Switching to manual
      setIsManual(true);
      onModeChange?.(true);
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

        {/* Hidden on mobile — this hint has no room next to the item photo
            block in the same grid row there and just overlaps it; it isn't
            needed to use the field anyway (the ⓘ tooltip still explains it
            on desktop where there's space and hover works). */}
        <p className="hidden sm:flex mt-1.5 text-xs text-gray-500 dark:text-gray-400 items-center gap-1">
          {isManual ? (
            <>
              Enter a custom SKU. Must be unique within this business.
              <span
                className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 text-[10px] font-bold cursor-help shrink-0"
                title={'Manual SKU Entry — you are entering a custom SKU. Make sure it is unique within your business to avoid conflicts. Click "Auto" to switch back to auto-generated SKUs.'}
              >
                i
              </span>
            </>
          ) : loading ? (
            'Loading next SKU...'
          ) : previewSku ? (
            <>
              Next available SKU based on format: <span className="font-medium">{format}</span>
              <span
                className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 text-[10px] font-bold cursor-help shrink-0"
                title="Auto-Generated SKU — this SKU is automatically generated based on your business configuration. The sequence will increment with each new product."
              >
                i
              </span>
            </>
          ) : (
            'SKU will be auto-generated when you create the product'
          )}
        </p>
      </div>
    </div>
  );
}
