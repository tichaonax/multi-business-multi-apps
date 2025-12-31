'use client';

import { useState, useEffect } from 'react';
import { Barcode, Plus, Star, Trash2, Edit2, Check, X } from 'lucide-react';
import BarcodeConflictDialog from '@/components/barcode-management/barcode-conflict-dialog';

interface ProductBarcode {
  id: string;
  code: string;
  type: string;
  isPrimary: boolean;
  source: string;
  label?: string | null;
  createdAt: string;
  createdBy: {
    id: string;
    name: string;
    email: string;
  } | null;
}

interface BarcodeListProps {
  productId: string;
  productName: string;
  onBarcodeChange?: () => void;
}

export default function BarcodeList({ productId, productName, onBarcodeChange }: BarcodeListProps) {
  const [barcodes, setBarcodes] = useState<ProductBarcode[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [conflict, setConflict] = useState<any>(null);

  const [newBarcode, setNewBarcode] = useState({
    code: '',
    type: 'CODE128',
    label: '',
  });

  useEffect(() => {
    fetchBarcodes();
  }, [productId]);

  const fetchBarcodes = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/products/${productId}/barcodes`);
      if (response.ok) {
        const data = await response.json();
        setBarcodes(data.barcodes || []);
      }
    } catch (error) {
      console.error('Error fetching barcodes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddBarcode = async () => {
    if (!newBarcode.code || !newBarcode.type) {
      return;
    }

    try {
      const response = await fetch(`/api/products/${productId}/barcodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: newBarcode.code,
          type: newBarcode.type,
          label: newBarcode.label || null,
          isPrimary: barcodes.length === 0, // First barcode is primary
        }),
      });

      const data = await response.json();

      if (data.conflict) {
        setConflict(data.conflictingProduct);
        return;
      }

      if (response.ok) {
        setNewBarcode({ code: '', type: 'CODE128', label: '' });
        setAdding(false);
        fetchBarcodes();
        if (onBarcodeChange) onBarcodeChange();
      }
    } catch (error) {
      console.error('Error adding barcode:', error);
    }
  };

  const handleConflictResolution = async (action: 'add-secondary' | 'replace-primary' | 'cancel') => {
    if (action === 'cancel') {
      setConflict(null);
      return;
    }

    try {
      const response = await fetch(`/api/products/${productId}/barcodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: newBarcode.code,
          type: newBarcode.type,
          label: newBarcode.label || null,
          isPrimary: barcodes.length === 0,
          replaceConflict: action === 'replace-primary',
        }),
      });

      if (response.ok) {
        setNewBarcode({ code: '', type: 'CODE128', label: '' });
        setAdding(false);
        setConflict(null);
        fetchBarcodes();
        if (onBarcodeChange) onBarcodeChange();
      }
    } catch (error) {
      console.error('Error resolving conflict:', error);
    }
  };

  const handleSetPrimary = async (barcodeId: string) => {
    try {
      const response = await fetch(`/api/products/${productId}/barcodes/${barcodeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPrimary: true }),
      });

      if (response.ok) {
        fetchBarcodes();
        if (onBarcodeChange) onBarcodeChange();
      }
    } catch (error) {
      console.error('Error setting primary barcode:', error);
    }
  };

  const handleDeleteBarcode = async (barcodeId: string) => {
    if (!confirm('Are you sure you want to delete this barcode?')) {
      return;
    }

    try {
      const response = await fetch(`/api/products/${productId}/barcodes/${barcodeId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchBarcodes();
        if (onBarcodeChange) onBarcodeChange();
      }
    } catch (error) {
      console.error('Error deleting barcode:', error);
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
        Loading barcodes...
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Barcode className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Product Barcodes
          </h3>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            ({barcodes.length})
          </span>
        </div>
        <button
          onClick={() => setAdding(!adding)}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Barcode
        </button>
      </div>

      <div className="p-6">
        {/* Add New Barcode Form */}
        {adding && (
          <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-3">
              Add New Barcode
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-700 dark:text-gray-300 mb-1">
                  Barcode Value *
                </label>
                <input
                  type="text"
                  value={newBarcode.code}
                  onChange={(e) => setNewBarcode({ ...newBarcode, code: e.target.value })}
                  placeholder="e.g., 1234567890123"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-700 dark:text-gray-300 mb-1">
                  Symbology *
                </label>
                <select
                  value={newBarcode.type}
                  onChange={(e) => setNewBarcode({ ...newBarcode, type: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="CODE128">CODE128</option>
                  <option value="UPC">UPC</option>
                  <option value="EAN13">EAN-13</option>
                  <option value="EAN8">EAN-8</option>
                  <option value="CODE39">CODE39</option>
                  <option value="QR">QR Code</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-700 dark:text-gray-300 mb-1">
                  Label (Optional)
                </label>
                <input
                  type="text"
                  value={newBarcode.label}
                  onChange={(e) => setNewBarcode({ ...newBarcode, label: e.target.value })}
                  placeholder="e.g., Supplier barcode"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={handleAddBarcode}
                disabled={!newBarcode.code || !newBarcode.type}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check className="w-4 h-4" />
                Add Barcode
              </button>
              <button
                onClick={() => {
                  setAdding(false);
                  setNewBarcode({ code: '', type: 'CODE128', label: '' });
                }}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Barcodes List */}
        {barcodes.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Barcode className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No barcodes added yet</p>
            <p className="text-xs mt-1">Click "Add Barcode" to create your first barcode</p>
          </div>
        ) : (
          <div className="space-y-3">
            {barcodes.map((barcode) => (
              <div
                key={barcode.id}
                className={`p-4 border rounded-lg ${
                  barcode.isPrimary
                    ? 'border-blue-300 bg-blue-50 dark:border-blue-600 dark:bg-blue-900/20'
                    : 'border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-700/50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {barcode.isPrimary && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-600 text-white text-xs font-medium rounded">
                          <Star className="w-3 h-3" />
                          Primary
                        </span>
                      )}
                      <span className="inline-flex items-center px-2 py-0.5 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs font-medium rounded">
                        {barcode.type}
                      </span>
                      {barcode.source && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {barcode.source}
                        </span>
                      )}
                    </div>
                    <p className="text-lg font-mono font-medium text-gray-900 dark:text-white mb-1">
                      {barcode.code}
                    </p>
                    {barcode.label && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {barcode.label}
                      </p>
                    )}
                    {barcode.createdBy && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Added by {barcode.createdBy.name} on{' '}
                        {new Date(barcode.createdAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {!barcode.isPrimary && (
                      <button
                        onClick={() => handleSetPrimary(barcode.id)}
                        className="p-2 text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
                        title="Set as primary"
                      >
                        <Star className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteBarcode(barcode.id)}
                      className="p-2 text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                      title="Delete barcode"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Conflict Dialog */}
      {conflict && (
        <BarcodeConflictDialog
          isOpen={true}
          onClose={() => setConflict(null)}
          onConfirm={handleConflictResolution}
          barcodeValue={newBarcode.code}
          symbology={newBarcode.type}
          conflictingProduct={conflict}
          currentProductName={productName}
        />
      )}
    </div>
  );
}
