'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import ProductSelector from '@/components/barcode-management/product-selector';
import { useToastContext } from '@/components/ui/toast';

interface SKUPattern {
  prefix: string;
  separator: string;
  numberLength: number;
  sample: string;
}

export default function NewTemplatePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToastContext();

  const [businesses, setBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [creationMode, setCreationMode] = useState<'product' | 'custom'>('product');

  const [formData, setFormData] = useState({
    name: '',
    barcodeValue: '',
    type: 'custom',
    description: '',
    symbology: 'code128',
    width: 200,
    height: 100,
    margin: 10,
    displayValue: true,
    fontSize: 20,
    backgroundColor: '#FFFFFF',
    lineColor: '#000000',
    dpi: 300,
    quietZone: 10,
    paperSize: 'A6',
    orientation: 'portrait',
    businessId: '',
  });

  const [barcodeGeneration, setBarcodeGeneration] = useState({
    mode: 'auto', // 'auto' | 'manual'
    loading: false,
    pattern: null as SKUPattern | null,
  });

  useEffect(() => {
    fetchBusinesses();
  }, []);

  useEffect(() => {
    // Auto-detect business from URL or auto-select if only one
    if (businesses.length > 0 && !formData.businessId) {
      const businessIdFromUrl = searchParams.get('businessId');

      if (businessIdFromUrl && businesses.find(b => b.id === businessIdFromUrl)) {
        setFormData(prev => ({ ...prev, businessId: businessIdFromUrl }));
      } else if (businesses.length === 1) {
        // Only one business - auto-select it
        setFormData(prev => ({ ...prev, businessId: businesses[0].id }));
      } else if (businesses.length > 0) {
        // Multiple businesses - select first one
        setFormData(prev => ({ ...prev, businessId: businesses[0].id }));
      }
    }
  }, [businesses, searchParams]);

  useEffect(() => {
    // Auto-generate barcode when name changes (debounced)
    if (creationMode === 'custom' && barcodeGeneration.mode === 'auto' && formData.name && formData.businessId) {
      const timer = setTimeout(() => {
        generateBarcodeValue();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [formData.name, formData.businessId, barcodeGeneration.mode, creationMode]);

  const fetchBusinesses = async () => {
    try {
      const response = await fetch('/api/user/business-memberships');
      if (response.ok) {
        const memberships = await response.json();
        // Transform memberships to business format
        const businessList = memberships.map((m: any) => ({
          id: m.businessId,
          name: m.businessName,
          type: m.businessType,
        }));
        setBusinesses(businessList);
      }
    } catch (error) {
      console.error('Error fetching businesses:', error);
    }
  };

  const generateBarcodeValue = async () => {
    if (!formData.name || !formData.businessId) return;

    setBarcodeGeneration(prev => ({ ...prev, loading: true }));

    try {
      const response = await fetch(`/api/inventory/${formData.businessId}/generate-sku`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: formData.name,
          category: formData.type
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setFormData(prev => ({ ...prev, barcodeValue: data.sku }));
        setBarcodeGeneration(prev => ({
          ...prev,
          loading: false,
          pattern: data.pattern
        }));
      } else {
        setBarcodeGeneration(prev => ({ ...prev, loading: false }));
      }
    } catch (error) {
      console.error('Error generating barcode:', error);
      setBarcodeGeneration(prev => ({ ...prev, loading: false }));
    }
  };

  const handleProductSelect = (product: { name: string; sku: string; category: string; type: string }) => {
    setFormData(prev => ({
      ...prev,
      name: product.name,
      barcodeValue: product.sku,
      type: product.type || 'custom',
      description: `Barcode template for ${product.name}`,
    }));

    // Disable auto-generation when selecting from product
    setBarcodeGeneration(prev => ({ ...prev, mode: 'manual' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      const response = await fetch('/api/universal/barcode-management/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();

        // Check if template already existed
        if (data.isExisting) {
          toast.success(data.message || 'Template already exists. Redirecting...');
          // Redirect to the existing template
          router.push(`/universal/barcode-management/templates/${data.template.id}`);
        } else {
          toast.success('Barcode template created successfully');
          router.push('/universal/barcode-management/templates');
        }
      } else {
        const data = await response.json();
        if (data.details) {
          const fieldErrors: Record<string, string> = {};
          data.details.forEach((detail: any) => {
            fieldErrors[detail.field] = detail.message;
          });
          setErrors(fieldErrors);
          toast.error('Please correct the validation errors');
        } else {
          toast.error(data.error || 'Failed to create template');
        }
      }
    } catch (error) {
      console.error('Error creating template:', error);
      toast.error('Failed to create template. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : type === 'number' ? Number(value) : value,
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/universal/barcode-management/templates"
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 mb-4 inline-block"
          >
            ← Back to Templates
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Create Barcode Template
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Configure a new barcode template for your business
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Business Selection (Auto-detected) */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Business Context
            </h2>
            <div>
              <label htmlFor="businessId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Business {formData.businessId && businesses.length === 1 && <span className="text-green-600 text-xs">(Auto-selected)</span>}
              </label>
              <select
                id="businessId"
                name="businessId"
                required
                value={formData.businessId}
                onChange={handleChange}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white py-2.5 px-3"
              >
                {businesses.map((business) => (
                  <option key={business.id} value={business.id}>
                    {business.name}
                  </option>
                ))}
              </select>
              {errors.businessId && <p className="mt-1 text-sm text-red-600">{errors.businessId}</p>}
            </div>
          </div>

          {/* Creation Mode Toggle */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Creation Mode
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => {
                  setCreationMode('product');
                  setBarcodeGeneration(prev => ({ ...prev, mode: 'manual' }));
                }}
                className={`p-6 rounded-lg border-2 transition-all ${
                  creationMode === 'product'
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900 shadow-lg'
                    : 'border-gray-300 dark:border-gray-700 hover:border-blue-400'
                }`}
              >
                <div className="text-4xl mb-3">📦</div>
                <div className="font-semibold text-lg text-gray-900 dark:text-white">From Existing Product</div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Recommended - Auto-fills all fields</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCreationMode('custom');
                  setBarcodeGeneration(prev => ({ ...prev, mode: 'auto' }));
                }}
                className={`p-6 rounded-lg border-2 transition-all ${
                  creationMode === 'custom'
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900 shadow-lg'
                    : 'border-gray-300 dark:border-gray-700 hover:border-blue-400'
                }`}
              >
                <div className="text-4xl mb-3">✏️</div>
                <div className="font-semibold text-lg text-gray-900 dark:text-white">Custom Template</div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">For future products</div>
              </button>
            </div>
          </div>

          {/* Product Selector Mode */}
          {creationMode === 'product' && formData.businessId && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Select Product
              </h2>
              <ProductSelector
                businessId={formData.businessId}
                onSelect={handleProductSelect}
              />
            </div>
          )}

          {/* Custom Mode - Basic Information */}
          {(creationMode === 'custom' || formData.name) && (
            <>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Basic Information
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Template Name *
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white py-2.5 px-3"
                    />
                    {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label htmlFor="barcodeValue" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Barcode Value *
                      </label>
                      {creationMode === 'custom' && (
                        <div className="flex items-center space-x-3">
                          <label className="flex items-center text-xs text-gray-600 dark:text-gray-400">
                            <input
                              type="checkbox"
                              checked={barcodeGeneration.mode === 'auto'}
                              onChange={(e) => setBarcodeGeneration(prev => ({
                                ...prev,
                                mode: e.target.checked ? 'auto' : 'manual'
                              }))}
                              className="mr-1.5 rounded"
                            />
                            Auto-generate
                          </label>
                          {barcodeGeneration.mode === 'auto' && (
                            <button
                              type="button"
                              onClick={generateBarcodeValue}
                              disabled={barcodeGeneration.loading}
                              className="text-blue-600 dark:text-blue-400 text-xs hover:underline disabled:opacity-50"
                            >
                              {barcodeGeneration.loading ? '⏳ Generating...' : '🔄 Regenerate'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    <input
                      id="barcodeValue"
                      name="barcodeValue"
                      type="text"
                      required
                      value={formData.barcodeValue}
                      onChange={handleChange}
                      disabled={creationMode === 'custom' && barcodeGeneration.mode === 'auto' && barcodeGeneration.loading}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:opacity-50 py-2.5 px-3"
                    />
                    {barcodeGeneration.pattern && creationMode === 'custom' && (
                      <p className="mt-1 text-xs text-green-600 dark:text-green-400">
                        ✓ Following pattern: {barcodeGeneration.pattern.sample}
                      </p>
                    )}
                    {errors.barcodeValue && <p className="mt-1 text-sm text-red-600">{errors.barcodeValue}</p>}
                  </div>

                  <div>
                    <label htmlFor="type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Type *
                    </label>
                    <select
                      id="type"
                      name="type"
                      required
                      value={formData.type}
                      onChange={handleChange}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white py-2.5 px-3"
                    >
                      <option value="grocery">Grocery</option>
                      <option value="hardware">Hardware</option>
                      <option value="clothing">Clothing</option>
                      <option value="restaurant">Restaurant</option>
                      <option value="custom">Custom</option>
                    </select>
                    {errors.type && <p className="mt-1 text-sm text-red-600">{errors.type}</p>}
                  </div>

                  <div className="md:col-span-2">
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Description *
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      required
                      rows={3}
                      value={formData.description}
                      onChange={handleChange}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white py-2.5 px-3"
                    />
                    {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
                  </div>
                </div>
              </div>

              {/* Barcode Settings */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Barcode Settings
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="symbology" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Symbology
                    </label>
                    <select
                      id="symbology"
                      name="symbology"
                      value={formData.symbology}
                      onChange={handleChange}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white py-2.5 px-3"
                    >
                      <option value="code128">CODE128</option>
                      <option value="ean13">EAN13</option>
                      <option value="ean8">EAN8</option>
                      <option value="code39">CODE39</option>
                      <option value="upca">UPC</option>
                      <option value="itf14">ITF</option>
                      <option value="msi">MSI</option>
                      <option value="pharmacode">Pharmacode</option>
                      <option value="codabar">Codabar</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="displayValue" className="flex items-center space-x-2 pt-6">
                      <input
                        id="displayValue"
                        name="displayValue"
                        type="checkbox"
                        checked={formData.displayValue}
                        onChange={handleChange}
                        className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Display Value Below Barcode
                      </span>
                    </label>
                  </div>

                  <div>
                    <label htmlFor="width" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Width (px)
                    </label>
                    <input
                      id="width"
                      name="width"
                      type="number"
                      min="1"
                      max="500"
                      value={formData.width}
                      onChange={handleChange}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white py-2.5 px-3"
                    />
                  </div>

                  <div>
                    <label htmlFor="height" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Height (px)
                    </label>
                    <input
                      id="height"
                      name="height"
                      type="number"
                      min="1"
                      max="500"
                      value={formData.height}
                      onChange={handleChange}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white py-2.5 px-3"
                    />
                  </div>

                  <div>
                    <label htmlFor="margin" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Margin (px)
                    </label>
                    <input
                      id="margin"
                      name="margin"
                      type="number"
                      min="0"
                      max="50"
                      value={formData.margin}
                      onChange={handleChange}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white py-2.5 px-3"
                    />
                  </div>

                  <div>
                    <label htmlFor="fontSize" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Font Size (px)
                    </label>
                    <input
                      id="fontSize"
                      name="fontSize"
                      type="number"
                      min="8"
                      max="72"
                      value={formData.fontSize}
                      onChange={handleChange}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white py-2.5 px-3"
                    />
                  </div>

                  <div>
                    <label htmlFor="backgroundColor" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Background Color
                    </label>
                    <input
                      id="backgroundColor"
                      name="backgroundColor"
                      type="color"
                      value={formData.backgroundColor}
                      onChange={handleChange}
                      className="block w-full h-10 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="lineColor" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Line Color
                    </label>
                    <input
                      id="lineColor"
                      name="lineColor"
                      type="color"
                      value={formData.lineColor}
                      onChange={handleChange}
                      className="block w-full h-10 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Print Settings */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Print Settings
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label htmlFor="dpi" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      DPI
                    </label>
                    <input
                      id="dpi"
                      name="dpi"
                      type="number"
                      min="72"
                      max="600"
                      value={formData.dpi}
                      onChange={handleChange}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white py-2.5 px-3"
                    />
                  </div>

                  <div>
                    <label htmlFor="quietZone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Quiet Zone (px)
                    </label>
                    <input
                      id="quietZone"
                      name="quietZone"
                      type="number"
                      min="0"
                      max="50"
                      value={formData.quietZone}
                      onChange={handleChange}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white py-2.5 px-3"
                    />
                  </div>

                  <div>
                    <label htmlFor="paperSize" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Paper Size
                    </label>
                    <select
                      id="paperSize"
                      name="paperSize"
                      value={formData.paperSize}
                      onChange={handleChange}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white py-2.5 px-3"
                    >
                      <option value="A4">A4</option>
                      <option value="A6">A6</option>
                      <option value="CR80">CR80</option>
                      <option value="receipt">Receipt</option>
                      <option value="label_2x1">Label 2x1</option>
                      <option value="label_4x2">Label 4x2</option>
                    </select>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Submit Buttons */}
          <div className="flex items-center justify-end space-x-4">
            <Link
              href="/universal/barcode-management/templates"
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition-colors dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading || !formData.name || !formData.barcodeValue}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
