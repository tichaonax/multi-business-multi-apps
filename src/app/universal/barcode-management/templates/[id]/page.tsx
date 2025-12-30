'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useToastContext } from '@/components/ui/toast';

export default function EditTemplatePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const toast = useToastContext();
  const templateId = params.id as string;
  const isPreviewMode = searchParams.get('preview') === 'true';

  const [businesses, setBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [template, setTemplate] = useState<any>(null);

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
    // Label fields configuration
    showProductName: false,
    showPrice: false,
    showSize: false,
    customLine1: '',
    customLine2: '',
    fieldFontSize: 12,
  });

  useEffect(() => {
    fetchTemplate();
    fetchBusinesses();
  }, [templateId]);

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

  const fetchTemplate = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/universal/barcode-management/templates/${templateId}`);
      if (response.ok) {
        const data = await response.json();
        setTemplate(data);

        // Parse layoutTemplate if it exists
        const layout = data.layoutTemplate || {};

        setFormData({
          name: data.name || '',
          barcodeValue: data.barcodeValue || '',
          type: data.type || 'custom',
          description: data.description || '',
          symbology: data.symbology || 'code128',
          width: data.width || 200,
          height: data.height || 100,
          margin: data.margin || 10,
          displayValue: data.displayValue !== false,
          fontSize: data.fontSize || 20,
          backgroundColor: data.backgroundColor || '#FFFFFF',
          lineColor: data.lineColor || '#000000',
          dpi: data.dpi || 300,
          quietZone: data.quietZone || 10,
          paperSize: data.paperSize || 'A6',
          orientation: data.orientation || 'portrait',
          // Label fields from layoutTemplate
          showProductName: layout.showProductName || false,
          showPrice: layout.showPrice || false,
          showSize: layout.showSize || false,
          customLine1: layout.customLine1 || '',
          customLine2: layout.customLine2 || '',
          fieldFontSize: layout.fieldFontSize || 12,
        });
      } else {
        toast.push('Template not found', { type: 'error' });
        router.push('/universal/barcode-management/templates');
      }
    } catch (error) {
      console.error('Error fetching template:', error);
      toast.push('Failed to load template', { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});

    try {
      // Build layoutTemplate from form data
      const layoutTemplate = {
        showProductName: formData.showProductName,
        showPrice: formData.showPrice,
        showSize: formData.showSize,
        customLine1: formData.customLine1,
        customLine2: formData.customLine2,
        fieldFontSize: formData.fieldFontSize,
      };

      const payload = {
        ...formData,
        layoutTemplate,
      };

      const response = await fetch(`/api/universal/barcode-management/templates/${templateId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.push('Template updated successfully', { type: 'success' });
        router.push('/universal/barcode-management/templates');
      } else {
        const data = await response.json();
        if (data.details) {
          const fieldErrors: Record<string, string> = {};
          data.details.forEach((detail: any) => {
            fieldErrors[detail.field] = detail.message;
          });
          setErrors(fieldErrors);
          toast.push('Please correct the validation errors', { type: 'error' });
        } else {
          toast.push(data.error || 'Failed to update template', { type: 'error' });
        }
      }
    } catch (error) {
      console.error('Error updating template:', error);
      toast.push('Failed to update template. Please try again.', { type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : type === 'number' ? Number(value) : value,
    }));
  };

  // Calculate auto-layout for preview
  const getLabelFields = () => {
    const fields = [];
    const layout = formData;

    if (layout.showProductName) fields.push({ label: 'Product Name', value: formData.name || 'Product Name' });
    if (layout.showPrice) fields.push({ label: 'Price', value: '$19.99' });
    if (layout.showSize) fields.push({ label: 'Size', value: 'Large' });
    if (layout.customLine1) fields.push({ label: '', value: layout.customLine1 });
    if (layout.customLine2) fields.push({ label: '', value: layout.customLine2 });

    return fields;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">Loading template...</p>
      </div>
    );
  }

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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {isPreviewMode ? 'Template Preview' : 'Edit Template'}
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                {isPreviewMode ? 'View barcode preview' : 'Update template settings and configuration'}
              </p>
            </div>
            {!isPreviewMode && template && (
              <div className="flex items-center space-x-3">
                <Link
                  href={`/universal/barcode-management/templates/${templateId}?preview=true`}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow transition-colors"
                >
                  👁️ Preview
                </Link>
                <Link
                  href={`/universal/barcode-management/print-jobs/new?templateId=${templateId}`}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow transition-colors"
                >
                  🖨️ Print Labels
                </Link>
              </div>
            )}
          </div>
          {template && (
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Business:</strong> {template.business?.name} |
                <strong className="ml-2">Print Jobs:</strong> {template._count?.printJobs || 0} |
                <strong className="ml-2">Inventory Items:</strong> {template._count?.inventoryItems || 0}
              </p>
            </div>
          )}
        </div>

        {/* Preview Mode */}
        {isPreviewMode && template && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 mb-8">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
                {template.name}
              </h2>
              <div className="bg-gray-50 dark:bg-gray-900 p-8 rounded-lg mb-6">
                <div className="flex justify-center items-center" style={{ minHeight: '250px' }}>
                  <div className="text-center">
                    <p className="text-gray-500 dark:text-gray-400 mb-4">📊 Barcode Preview</p>
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg inline-block">
                      {(() => {
                        const layout = template.layoutTemplate || {};
                        const fields = [];

                        if (layout.showProductName) fields.push(template.name);
                        if (layout.showPrice) fields.push('$19.99');
                        if (layout.showSize) fields.push('Size: Large');
                        if (layout.customLine1) fields.push(layout.customLine1);
                        if (layout.customLine2) fields.push(layout.customLine2);

                        const fieldHeight = (layout.fieldFontSize || 12) + 4;
                        const topFieldsHeight = fields.length * fieldHeight;
                        const barcodeHeight = template.height || 100;
                        const totalHeight = topFieldsHeight + barcodeHeight + (template.displayValue !== false ? 20 : 0);

                        return (
                          <svg
                            width={template.width || 200}
                            height={totalHeight}
                            viewBox={`0 0 ${template.width || 200} ${totalHeight}`}
                            className="mx-auto"
                          >
                            <rect
                              width={template.width || 200}
                              height={totalHeight}
                              fill={template.backgroundColor || '#FFFFFF'}
                            />

                            {/* Top fields */}
                            {fields.map((field, index) => (
                              <text
                                key={index}
                                x={(template.width || 200) / 2}
                                y={index * fieldHeight + (layout.fieldFontSize || 12)}
                                fontSize={layout.fieldFontSize || 12}
                                textAnchor="middle"
                                fill={template.lineColor || '#000000'}
                                fontWeight="500"
                              >
                                {field}
                              </text>
                            ))}

                            {/* Barcode stripes */}
                            <g transform={`translate(10, ${topFieldsHeight})`}>
                              {[...Array(20)].map((_, i) => (
                                <rect
                                  key={i}
                                  x={i * 9}
                                  y="0"
                                  width={i % 2 === 0 ? 3 : 5}
                                  height={barcodeHeight - 40}
                                  fill={template.lineColor || '#000000'}
                                />
                              ))}
                            </g>

                            {/* Barcode value */}
                            {template.displayValue !== false && (
                              <text
                                x={(template.width || 200) / 2}
                                y={topFieldsHeight + barcodeHeight - 15}
                                fontSize={template.fontSize || 12}
                                textAnchor="middle"
                                fill={template.lineColor || '#000000'}
                              >
                                {template.barcodeValue}
                              </text>
                            )}
                          </svg>
                        );
                      })()}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-4">
                      Symbology: <strong>{template.symbology}</strong>
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Size: <strong>{template.width || 200}x{template.height || 100}px</strong> at {template.dpi}dpi
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex justify-center space-x-4">
                <Link
                  href={`/universal/barcode-management/templates/${templateId}`}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow transition-colors"
                >
                  ✏️ Edit Template
                </Link>
                <Link
                  href={`/universal/barcode-management/print-jobs/new?templateId=${templateId}`}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow transition-colors"
                >
                  🖨️ Print Labels
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        {!isPreviewMode && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Live Preview - Sticky Sidebar */}
          <div className="lg:col-span-1 order-first lg:order-last">
            <div className="lg:sticky lg:top-8">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Live Preview
                </h3>
                <div className="bg-gray-50 dark:bg-gray-900 p-6 rounded-lg">
                  <div className="flex justify-center items-center" style={{ minHeight: '250px' }}>
                    <div className="text-center">
                      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg inline-block mb-4">
                        {(() => {
                          const fields = getLabelFields();
                          const fieldHeight = formData.fieldFontSize + 4;
                          const topFieldsHeight = fields.length * fieldHeight;
                          const barcodeHeight = formData.height || 100;
                          const totalHeight = topFieldsHeight + barcodeHeight + (formData.displayValue ? 20 : 0);

                          return (
                            <svg
                              width={formData.width || 200}
                              height={totalHeight}
                              viewBox={`0 0 ${formData.width || 200} ${totalHeight}`}
                              className="mx-auto"
                            >
                              <rect
                                width={formData.width || 200}
                                height={totalHeight}
                                fill={formData.backgroundColor || '#FFFFFF'}
                              />

                              {/* Top fields (Product Name, Price, Size, etc.) */}
                              {fields.map((field, index) => (
                                <text
                                  key={index}
                                  x={(formData.width || 200) / 2}
                                  y={index * fieldHeight + formData.fieldFontSize}
                                  fontSize={formData.fieldFontSize}
                                  textAnchor="middle"
                                  fill={formData.lineColor || '#000000'}
                                  fontWeight="500"
                                >
                                  {field.value}
                                </text>
                              ))}

                              {/* Barcode stripes */}
                              <g transform={`translate(10, ${topFieldsHeight})`}>
                                {[...Array(20)].map((_, i) => (
                                  <rect
                                    key={i}
                                    x={i * 9}
                                    y="0"
                                    width={i % 2 === 0 ? 3 : 5}
                                    height={barcodeHeight - 40}
                                    fill={formData.lineColor || '#000000'}
                                  />
                                ))}
                              </g>

                              {/* Barcode value */}
                              {formData.displayValue && (
                                <text
                                  x={(formData.width || 200) / 2}
                                  y={topFieldsHeight + barcodeHeight - 15}
                                  fontSize={formData.fontSize || 12}
                                  textAnchor="middle"
                                  fill={formData.lineColor || '#000000'}
                                >
                                  {formData.barcodeValue || 'BARCODE'}
                                </text>
                              )}
                            </svg>
                          );
                        })()}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                        <p><strong>Symbology:</strong> {formData.symbology}</p>
                        <p><strong>Size:</strong> {formData.width}x{formData.height}px</p>
                        <p><strong>DPI:</strong> {formData.dpi}</p>
                        <p><strong>Margin:</strong> {formData.margin}px</p>
                        {formData.displayValue && (
                          <p><strong>Font Size:</strong> {formData.fontSize}px</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Form Content */}
          <div className="lg:col-span-2">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
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
                <label htmlFor="barcodeValue" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Barcode Value *
                </label>
                <input
                  id="barcodeValue"
                  name="barcodeValue"
                  type="text"
                  required
                  value={formData.barcodeValue}
                  onChange={handleChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white py-2.5 px-3"
                />
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
                  className="block w-full h-12 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-2"
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
                  className="block w-full h-12 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-2"
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

          {/* Label Fields */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Label Fields
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Add additional information to your barcode labels (product name, price, size, etc.)
            </p>

            <div className="space-y-4">
              {/* Field Toggles */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <label className="flex items-center space-x-3 p-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    name="showProductName"
                    checked={formData.showProductName}
                    onChange={handleChange}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 h-5 w-5"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">Product Name</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Show product name on label</div>
                  </div>
                </label>

                <label className="flex items-center space-x-3 p-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    name="showPrice"
                    checked={formData.showPrice}
                    onChange={handleChange}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 h-5 w-5"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">Price</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Show price on label</div>
                  </div>
                </label>

                <label className="flex items-center space-x-3 p-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    name="showSize"
                    checked={formData.showSize}
                    onChange={handleChange}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 h-5 w-5"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">Size/Variant</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Show size or variant info</div>
                  </div>
                </label>
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 italic">
                Note: The barcode value (SKU) always appears at the bottom of the label
              </p>

              {/* Custom Text Lines */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Custom Text Lines</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="customLine1" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Custom Line 1 (Optional)
                    </label>
                    <input
                      id="customLine1"
                      name="customLine1"
                      type="text"
                      value={formData.customLine1}
                      onChange={handleChange}
                      placeholder="e.g., Store Location, Batch Number"
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white py-2.5 px-3"
                    />
                  </div>

                  <div>
                    <label htmlFor="customLine2" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Custom Line 2 (Optional)
                    </label>
                    <input
                      id="customLine2"
                      name="customLine2"
                      type="text"
                      value={formData.customLine2}
                      onChange={handleChange}
                      placeholder="e.g., Expiry Date, Serial Number"
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white py-2.5 px-3"
                    />
                  </div>
                </div>
              </div>

              {/* Field Font Size */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                <label htmlFor="fieldFontSize" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Field Font Size (px)
                </label>
                <input
                  id="fieldFontSize"
                  name="fieldFontSize"
                  type="number"
                  min="8"
                  max="36"
                  value={formData.fieldFontSize}
                  onChange={handleChange}
                  className="block w-full md:w-48 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white py-2.5 px-3"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Font size for product name, price, size, and custom text
                </p>
              </div>
            </div>
          </div>

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
              disabled={saving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
