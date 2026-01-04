'use client';


// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic';
import { useState, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useToastContext } from '@/components/ui/toast';
import ProductSearchModal from '@/components/barcode-management/product-search-modal';
import PriceOverrideDialog from '@/components/barcode-management/price-override-dialog';
import BarcodePreview from '@/components/barcode-management/barcode-preview';
import CompleteLabelPreview from '@/components/barcode-management/complete-label-preview';
import { Package } from 'lucide-react';

function NewPrintJobPageContent() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToastContext();
  const templateId = searchParams.get('templateId');

  const [template, setTemplate] = useState<any>(null);
  const [printers, setPrinters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [printToPdf, setPrintToPdf] = useState(false);
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedProductVariant, setSelectedProductVariant] = useState<any>(null);
  const [showPriceOverride, setShowPriceOverride] = useState(false);
  const [originalPrice, setOriginalPrice] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    templateId: templateId || '',
    printerId: '',
    requestedQuantity: 1,
    itemName: '',
    barcodeData: '',
    batchId: '', // Batch ID from template
    userNotes: '',
    // Label field data
    productName: '',
    description: '',
    price: '',
    size: '',
    color: '',
  });

  useEffect(() => {
    if (templateId) {
      fetchTemplate();
    }
    fetchPrinters();

    // Load "Print to PDF" preference from localStorage
    const savedPrintToPdf = localStorage.getItem('barcodePrintToPdf');
    if (savedPrintToPdf === 'true') {
      setPrintToPdf(true);
    }
  }, [templateId]);

  const fetchTemplate = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/universal/barcode-management/templates/${templateId}`);
      if (response.ok) {
        const data = await response.json();
        setTemplate(data);
        setFormData(prev => ({
          ...prev,
          itemName: data.name,
          barcodeData: data.barcodeValue,
          // Pre-fill all default fields from template (can be overridden)
          batchId: data.batchId || '',
          productName: data.productName || '',
          description: data.description || '',
          price: data.defaultPrice ? parseFloat(data.defaultPrice).toFixed(2) : '',
          size: data.defaultSize || '',
          color: data.defaultColor || '',
        }));
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

  const fetchPrinters = async () => {
    try {
      // Fetch all available printers (label, receipt, and document)
      // Users can choose which printer works best for their barcode labels
      const response = await fetch('/api/network-printers?onlineOnly=true');

      if (response.ok) {
        const data = await response.json();
        setPrinters(data.printers || []);

        // Check for saved default printer in localStorage
        const savedPrinterId = localStorage.getItem('defaultBarcodePrinterId');

        if (data.printers && data.printers.length > 0) {
          let selectedPrinterId = '';

          // First priority: saved printer if it exists and is still available
          if (savedPrinterId && data.printers.find((p: any) => p.id === savedPrinterId)) {
            selectedPrinterId = savedPrinterId;
          } else {
            // Second priority: first available label printer
            const labelPrinter = data.printers.find((p: any) => p.type === 'label');
            selectedPrinterId = labelPrinter ? labelPrinter.id : data.printers[0].id;
          }

          setFormData(prev => ({
            ...prev,
            printerId: selectedPrinterId,
          }));
        }
      } else if (response.status === 404) {
        // API endpoint doesn't exist - printer management not yet implemented
        console.log('Printer API not available - jobs will be queued for manual processing');
        setPrinters([]);
      } else {
        setPrinters([]);
      }
    } catch (error) {
      console.error('Error fetching printers:', error);
      setPrinters([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Check for price changes if a product was selected
    if (selectedProduct && originalPrice !== null && formData.price) {
      // Parse the current price from the form
      const currentPrice = parseFloat(formData.price);

      // If price has changed, show override dialog
      if (!isNaN(currentPrice) && currentPrice !== originalPrice) {
        setShowPriceOverride(true);
        return; // Don't proceed with submission yet
      }
    }

    // If no price change or no product selected, proceed with normal submission
    await submitPrintJob();
  };

  const submitPrintJob = async () => {
    setSubmitting(true);

    if (!formData.templateId) {
      toast.push('Please select a template', { type: 'error' });
      setSubmitting(false);
      return;
    }

    try {
      // If Print to PDF is enabled, generate and download PDF instead
      if (printToPdf) {
        // Get printer type from selected printer
        const selectedPrinter = printers.find(p => p.id === formData.printerId);
        const printerType = selectedPrinter?.type || 'document';

        const response = await fetch('/api/universal/barcode-management/print-jobs/generate-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            templateId: formData.templateId,
            quantity: formData.requestedQuantity,
            printerType, // Pass printer type for correct layout
            customData: {
              name: formData.itemName,
              barcodeValue: formData.barcodeData,
              productName: formData.productName,
              description: formData.description, // Phase 7: Description field
              price: formData.price,
              size: formData.size,
              color: formData.color,
            },
          }),
        });

        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `barcode-labels-${Date.now()}.png`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);

          toast.push('PDF generated and downloaded successfully', { type: 'success' });
          router.push('/universal/barcode-management/print-jobs');
        } else {
          const data = await response.json();
          toast.push(data.error || 'Failed to generate PDF', { type: 'error' });
        }
        setSubmitting(false);
        return;
      }

      // Normal print job creation
      const response = await fetch('/api/universal/barcode-management/print-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: formData.templateId,
          printerId: formData.printerId || undefined,
          quantity: formData.requestedQuantity,
          itemType: 'CUSTOM',
          customData: {
            name: formData.itemName,
            barcodeValue: formData.barcodeData,
            // Label field data
            productName: formData.productName,
            description: formData.description, // Phase 7: Description field
            price: formData.price,
            size: formData.size,
            color: formData.color,
            // Phase 4: Multi-Barcode Support - Link barcode to product
            selectedProductId: selectedProduct?.id || null,
            selectedVariantId: selectedProductVariant?.id || null,
          },
          userNotes: formData.userNotes,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.push('Print job created successfully', { type: 'success' });
        router.push('/universal/barcode-management/print-jobs');
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
          toast.push(data.error || 'Failed to create print job', { type: 'error' });
        }
      }
    } catch (error) {
      console.error('Error creating print job:', error);
      toast.push('Failed to create print job. Please try again.', { type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value,
    }));

    // Save printer selection to localStorage for future use
    if (name === 'printerId' && value) {
      localStorage.setItem('defaultBarcodePrinterId', value);
    }
  };

  const handleProductSelect = (product: any, variant?: any) => {
    setSelectedProduct(product);
    setSelectedProductVariant(variant || null);

    // Auto-populate form fields from product
    const price = variant ? variant.price : product.sellPrice;
    const sku = variant ? variant.sku : product.sku;
    const variantName = variant ? variant.name : '';

    // Store original price for comparison when submitting
    setOriginalPrice(parseFloat(price));

    setFormData((prev) => ({
      ...prev,
      itemName: product.suggestedTemplateName || product.name,
      barcodeData: product.primaryBarcode?.code || sku,
      productName: product.name,
      price: parseFloat(price).toFixed(2), // No $ symbol for number input
      size: variantName,
      // Description from domain or product
      color: product.description || '',
    }));

    toast.push(`Product loaded: ${product.name}${variant ? ` - ${variant.name}` : ''}`, { type: 'success' });
  };

  const handlePriceOverrideConfirm = async (updateProduct: boolean, reason?: string, notes?: string) => {
    setShowPriceOverride(false);

    // If user chose to update the product price, call the API
    if (updateProduct && selectedProduct) {
      try {
        const currentPrice = parseFloat(formData.price);

        const response = await fetch(`/api/products/${selectedProduct.id}/price`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            newPrice: currentPrice,
            variantId: selectedProductVariant?.id || null,
            reason: reason || 'BARCODE_LABEL_PRINT',
            notes: notes || null,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          toast.push(data.message || 'Price updated successfully', { type: 'success' });
          // Update the original price to the new price so we don't show the dialog again
          setOriginalPrice(currentPrice);
        } else {
          const errorData = await response.json();
          toast.push(errorData.error || 'Failed to update price', { type: 'error' });
        }
      } catch (error) {
        console.error('Error updating price:', error);
        toast.push('Failed to update price. Continuing with print job creation.', { type: 'warning' });
      }
    }

    // Proceed with print job creation
    await submitPrintJob();
  };

  if (loading && templateId) {
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
            href="/universal/barcode-management/print-jobs"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 mb-4"
          >
            ← Back to Print Jobs
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Create Print Job
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Configure and submit a new barcode printing job
          </p>
          {template && (
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Template:</strong> {template.name} |
                <strong className="ml-2">Symbology:</strong> {template.symbology} |
                <strong className="ml-2">Business:</strong> {template.business?.name}
                {template.batchId && (
                  <>
                    {' | '}
                    <strong className="ml-2">Batch ID:</strong> {template.batchId}
                  </>
                )}
                {template.defaultPrice && (
                  <>
                    {' | '}
                    <strong className="ml-2">Default Price:</strong> ${parseFloat(template.defaultPrice).toFixed(2)}
                  </>
                )}
              </p>
            </div>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Template Selection */}
          {!templateId && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Select Template
              </h2>
              <div>
                <label htmlFor="templateId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Template *
                </label>
                <select
                  id="templateId"
                  name="templateId"
                  required
                  value={formData.templateId}
                  onChange={handleChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white py-2.5 px-3"
                >
                  <option value="">Select a template...</option>
                </select>
                {errors.templateId && <p className="mt-1 text-sm text-red-600">{errors.templateId}</p>}
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Or <Link href="/universal/barcode-management/templates" className="text-blue-600 hover:underline">create a new template</Link>
                </p>
              </div>
            </div>
          )}

          {/* Print Configuration */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Print Configuration
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="requestedQuantity" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Quantity *
                </label>
                <input
                  id="requestedQuantity"
                  name="requestedQuantity"
                  type="number"
                  min="1"
                  max="1000"
                  required
                  value={formData.requestedQuantity}
                  onChange={handleChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white py-2.5 px-3"
                />
                {errors.requestedQuantity && <p className="mt-1 text-sm text-red-600">{errors.requestedQuantity}</p>}
              </div>

              <div>
                <label htmlFor="printerId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Printer
                </label>
                <select
                  id="printerId"
                  name="printerId"
                  value={formData.printerId}
                  onChange={handleChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white py-2.5 px-3"
                >
                  <option value="">Default printer</option>
                  {printers.map((printer) => (
                    <option key={printer.id} value={printer.id}>
                      {printer.name} - {printer.type === 'label' ? '🏷️ Label' : printer.type === 'receipt' ? '🧾 Receipt' : '📄 Document'} {printer.type === 'label' ? '(Recommended)' : ''} {printer.location ? `- ${printer.location}` : ''}
                    </option>
                  ))}
                </select>
                {printers.length === 0 ? (
                  <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900 rounded-lg">
                    <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                      ℹ️ No printers registered yet. Print jobs will be queued for manual processing.
                    </p>
                    <Link
                      href="/admin/printers"
                      className="text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
                    >
                      → Go to Printer Management to register your printers
                    </Link>
                  </div>
                ) : (
                  <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      <strong>Printer Types:</strong>
                    </p>
                    <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 mb-2">
                      <li>🏷️ <strong>Label printers</strong> (Recommended) - Best for barcode labels</li>
                      <li>🧾 <strong>Receipt printers</strong> - Works for small barcode labels</li>
                      <li>📄 <strong>Document printers</strong> - Print labels on regular paper and cut them out</li>
                    </ul>
                    <Link
                      href="/admin/printers"
                      className="text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
                    >
                      Manage printers
                    </Link>
                  </div>
                )}
                {errors.printerId && <p className="mt-1 text-sm text-red-600">{errors.printerId}</p>}
              </div>
            </div>

            {/* Print to PDF Option */}
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <input
                  id="printToPdf"
                  type="checkbox"
                  checked={printToPdf}
                  onChange={(e) => {
                    const newValue = e.target.checked;
                    setPrintToPdf(newValue);
                    localStorage.setItem('barcodePrintToPdf', newValue.toString());
                  }}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="printToPdf" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                  📄 Save as PNG file instead of printing (for sending to someone else to print)
                </label>
              </div>
              <p className="mt-2 ml-6 text-xs text-gray-500 dark:text-gray-400">
                When enabled, this will generate a downloadable PNG image file with all your labels on A4 paper format.
                Perfect for development/testing or sending labels to someone else to print.
              </p>
            </div>
          </div>

          {/* Label Data */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Label Data
            </h2>

            {/* Product Search Button */}
            <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    💡 Quick Fill from Inventory
                  </h3>
                  <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
                    Search your product inventory to automatically populate label fields
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowProductSearch(true)}
                  disabled={!template?.business?.id}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  <Package className="w-4 h-4" />
                  Search Products
                </button>
              </div>

              {selectedProduct && (
                <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded border border-blue-200 dark:border-blue-700">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        ✓ Loaded: {selectedProduct.name}
                        {selectedProductVariant && ` - ${selectedProductVariant.name}`}
                      </p>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        SKU: {selectedProductVariant?.sku || selectedProduct.sku} |
                        Price: ${parseFloat(selectedProductVariant?.price || selectedProduct.sellPrice).toFixed(2)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedProduct(null);
                        setSelectedProductVariant(null);
                      }}
                      className="text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )}

              {!template?.business?.id && (
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Please select a template first to enable product search
                </p>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="itemName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Item Name *
                </label>
                <input
                  id="itemName"
                  name="itemName"
                  type="text"
                  required
                  value={formData.itemName}
                  onChange={handleChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white py-2.5 px-3"
                  placeholder="e.g., Product ABC"
                />
                {errors.itemName && <p className="mt-1 text-sm text-red-600">{errors.itemName}</p>}
              </div>

              <div>
                <label htmlFor="barcodeData" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Barcode Data *
                </label>
                <input
                  id="barcodeData"
                  name="barcodeData"
                  type="text"
                  required
                  value={formData.barcodeData}
                  onChange={handleChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white py-2.5 px-3"
                  placeholder="e.g., SKU-12345"
                />
                {errors.barcodeData && <p className="mt-1 text-sm text-red-600">{errors.barcodeData}</p>}
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  This value will be encoded in the barcode
                </p>
              </div>

              {/* Batch ID */}
              <div>
                <label htmlFor="batchId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Batch ID
                </label>
                <input
                  id="batchId"
                  name="batchId"
                  type="text"
                  maxLength={10}
                  value={formData.batchId}
                  onChange={handleChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white py-2.5 px-3"
                  placeholder="e.g., A01"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {template?.batchId
                    ? `Pre-filled from template (${template.batchId}). Can be overridden.`
                    : 'Enter batch identifier (optional)'}
                </p>
              </div>

              {/* Product Name - always show */}
              <div>
                <label htmlFor="productName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Product Name
                </label>
                <input
                  id="productName"
                  name="productName"
                  type="text"
                  maxLength={50}
                  value={formData.productName}
                  onChange={handleChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white py-2.5 px-3"
                  placeholder="e.g., Premium Cotton T-Shirt"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {template?.productName
                    ? `Pre-filled from template (${template.productName}). Can be overridden.`
                    : 'Product name that appears on the label (optional)'}
                </p>
              </div>

              {/* Conditional fields based on template configuration */}
              {template?.layoutTemplate && (
                <>

                  {/* Description field - always show */}
                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Description
                    </label>
                    <input
                      id="description"
                      name="description"
                      type="text"
                      maxLength={100}
                      value={formData.description}
                      onChange={handleChange}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white py-2.5 px-3"
                      placeholder="e.g., 100% Cotton, Machine Washable"
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {template?.description
                        ? `Pre-filled from template (${template.description}). Can be overridden.`
                        : 'Additional product details (optional)'}
                    </p>
                  </div>

                  {/* Price field - always show (pre-filled from template's defaultPrice) */}
                  <div>
                    <label htmlFor="price" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Price
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 dark:text-gray-400">$</span>
                      </div>
                      <input
                        id="price"
                        name="price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.price}
                        onChange={handleChange}
                        className="block w-full pl-7 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white py-2.5 px-3"
                        placeholder="0.00"
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {template?.defaultPrice
                        ? `Pre-filled from template default (${parseFloat(template.defaultPrice).toFixed(2)}). Can be overridden.`
                        : 'Enter the price for this label (optional)'}
                    </p>
                  </div>

                  {/* Size field - always show */}
                  <div>
                    <label htmlFor="size" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Size / Variant
                    </label>
                    <input
                      id="size"
                      name="size"
                      type="text"
                      maxLength={20}
                      value={formData.size}
                      onChange={handleChange}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white py-2.5 px-3"
                      placeholder="e.g., Large, XL, 500ml"
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {template?.defaultSize
                        ? `Pre-filled from template (${template.defaultSize}). Can be overridden.`
                        : 'Size or variant that appears on the label (optional)'}
                    </p>
                  </div>

                  {/* Color field - always show for all templates */}
                  <div>
                    <label htmlFor="color" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Color / Descriptor
                    </label>
                    <input
                      id="color"
                      name="color"
                      type="text"
                      maxLength={30}
                      value={formData.color}
                      onChange={handleChange}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white py-2.5 px-3"
                      placeholder="e.g., Green, Red, Blue"
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {template?.defaultColor
                        ? `Pre-filled from template (${template.defaultColor}). Can be overridden.`
                        : 'Color or descriptor that appears on the label (optional)'}
                    </p>
                  </div>
                </>
              )}

              <div>
                <label htmlFor="userNotes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  id="userNotes"
                  name="userNotes"
                  rows={3}
                  value={formData.userNotes}
                  onChange={handleChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white py-2.5 px-3"
                  placeholder="Add any special instructions or notes..."
                />
                {errors.userNotes && <p className="mt-1 text-sm text-red-600">{errors.userNotes}</p>}
              </div>
            </div>
          </div>

          {/* Preview Section */}
          {template && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Preview
              </h2>
              <div className="bg-gray-50 dark:bg-gray-900 p-6 rounded-lg text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {formData.requestedQuantity} label{formData.requestedQuantity > 1 ? 's' : ''} will be printed
                </p>
                <div className="inline-block bg-white dark:bg-gray-800 p-4 rounded border border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Complete Label Preview</p>
                  <CompleteLabelPreview
                    barcodeValue={formData.barcodeData || 'SAMPLE123'}
                    symbology={template.symbology || 'code128'}
                    displayValue={template.displayValue !== false}
                    fontSize={template.fontSize || 20}
                    lineColor={template.lineColor || '#000000'}
                    backgroundColor={template.backgroundColor || '#FFFFFF'}
                    businessName={template.business?.name || ''}
                    productName={formData.productName || ''}
                    description={formData.description || ''}
                    size={formData.size || ''}
                    price={formData.price || ''}
                    color={formData.color || ''}
                    sku={template.sku || ''}
                    templateName={template.name || ''}
                    showDate={true}
                    batchNumber={formData.batchId || 'XXX'}
                    quantity={formData.requestedQuantity}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    This shows exactly how the label will print
                    {formData.batchId && formData.requestedQuantity > 0 && (
                      <>
                        {' '}with quantity-batch format (e.g., {formData.requestedQuantity}-{formData.batchId})
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between">
            <Link
              href="/universal/barcode-management/print-jobs"
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting || !formData.templateId}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Creating Print Job...' : '🖨️ Create Print Job'}
            </button>
          </div>
        </form>

        {/* Product Search Modal */}
        {template?.business?.id && (
          <ProductSearchModal
            isOpen={showProductSearch}
            onClose={() => setShowProductSearch(false)}
            businessId={template.business.id}
            onSelectProduct={handleProductSelect}
            scope="current"
          />
        )}

        {/* Price Override Dialog */}
        {selectedProduct && originalPrice !== null && formData.price && (
          <PriceOverrideDialog
            isOpen={showPriceOverride}
            onClose={() => setShowPriceOverride(false)}
            onConfirm={handlePriceOverrideConfirm}
            productName={selectedProduct.name}
            variantName={selectedProductVariant?.name}
            oldPrice={originalPrice}
            newPrice={parseFloat(formData.price)}
            isVariant={!!selectedProductVariant}
          />
        )}
      </div>
    </div>
  );
}

// Wrapper component with Suspense boundary
export default function NewPrintJobPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">
      <div className="text-gray-600 dark:text-gray-400">Loading...</div>
    </div>}>
      <NewPrintJobPageContent />
    </Suspense>
  );
}
