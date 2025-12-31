'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Package, Barcode, DollarSign, Tag, X, Layers } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';

interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  price: string;
  stockQuantity: number;
  attributes: any;
}

interface ProductSearchResult {
  id: string;
  sku: string;
  name: string;
  description: string;
  sellPrice: string;
  costPrice: string;
  stockQuantity: number;
  unit: string | null;
  imageUrl: string | null;
  business: {
    id: string;
    name: string;
    type: string;
  };
  category: {
    id: string;
    name: string;
    emoji: string | null;
  } | null;
  department: {
    id: string;
    name: string;
    emoji: string | null;
  } | null;
  domain: {
    id: string;
    name: string;
    emoji: string | null;
  } | null;
  brand: {
    id: string;
    name: string;
  } | null;
  variants: ProductVariant[];
  hasVariants: boolean;
  barcodes: Array<{
    id: string;
    code: string;
    type: string;
    isPrimary: boolean;
    label: string | null;
  }>;
  primaryBarcode: {
    id: string;
    code: string;
    type: string;
  } | null;
  suggestedTemplateName: string;
  templateNameParts: {
    department: string | null;
    domain: string | null;
    brand: string | null;
    category: string | null;
    productName: string;
  };
}

interface ProductSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessId: string;
  onSelectProduct: (product: ProductSearchResult, variant?: ProductVariant) => void;
  scope?: 'current' | 'global';
}

export default function ProductSearchModal({
  isOpen,
  onClose,
  businessId,
  onSelectProduct,
  scope = 'current',
}: ProductSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchScope, setSearchScope] = useState<'current' | 'global'>(scope);
  const [results, setResults] = useState<ProductSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  const debouncedQuery = useDebounce(searchQuery, 500);

  const searchProducts = useCallback(async (query: string) => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        q: query,
        businessId: businessId,
        scope: searchScope,
        limit: '20',
      });

      const response = await fetch(
        `/api/universal/barcode-management/product-lookup?${params}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to search products');
      }

      const data = await response.json();
      setResults(data.results || []);
    } catch (err) {
      console.error('Product search error:', err);
      setError(err instanceof Error ? err.message : 'Failed to search products');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [businessId, searchScope]);

  useEffect(() => {
    if (debouncedQuery) {
      searchProducts(debouncedQuery);
    } else {
      setResults([]);
    }
  }, [debouncedQuery, searchProducts]);

  const handleSelectProduct = (product: ProductSearchResult, variant?: ProductVariant) => {
    onSelectProduct(product, variant);
    onClose();
    setSearchQuery('');
    setResults([]);
  };

  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(num);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Package className="w-5 h-5" />
            Search Products
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by SKU, product name, or barcode..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
            </div>

            {/* Scope Selector */}
            <select
              value={searchScope}
              onChange={(e) => setSearchScope(e.target.value as 'current' | 'global')}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="current">Current Business</option>
              <option value="global">All Businesses</option>
            </select>
          </div>

          {searchQuery && (
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Searching in: <span className="font-medium">{searchScope === 'current' ? 'Current Business' : 'All Businesses'}</span>
            </p>
          )}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {!isLoading && !error && results.length === 0 && searchQuery && (
            <div className="text-center py-8">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">
                No products found matching "{searchQuery}"
              </p>
            </div>
          )}

          {!isLoading && !error && results.length === 0 && !searchQuery && (
            <div className="text-center py-8">
              <Search className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">
                Start typing to search for products
              </p>
            </div>
          )}

          {!isLoading && !error && results.length > 0 && (
            <div className="space-y-3">
              {results.map((product) => (
                <div
                  key={product.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                >
                  {/* Product without variants */}
                  {!product.hasVariants && (
                    <div
                      onClick={() => handleSelectProduct(product)}
                      className="flex gap-4"
                    >
                      {/* Product Image */}
                      <div className="w-16 h-16 flex-shrink-0 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <Package className="w-8 h-8 text-gray-400" />
                        )}
                      </div>

                      {/* Product Details */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 dark:text-white truncate">
                          {product.name}
                        </h3>

                        <div className="mt-1 flex flex-wrap gap-2 text-sm text-gray-500 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <Tag className="w-3 h-3" />
                            {product.sku}
                          </span>

                          {product.primaryBarcode && (
                            <span className="flex items-center gap-1">
                              <Barcode className="w-3 h-3" />
                              {product.primaryBarcode.code}
                            </span>
                          )}

                          <span className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            {formatCurrency(product.sellPrice)}
                          </span>

                          {searchScope === 'global' && (
                            <span className="text-blue-600 dark:text-blue-400">
                              {product.business.name}
                            </span>
                          )}
                        </div>

                        {product.description && (
                          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 truncate">
                            {product.description}
                          </p>
                        )}

                        {(product.category || product.department || product.domain) && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {product.department && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                                {product.department.emoji} {product.department.name}
                              </span>
                            )}
                            {product.domain && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                {product.domain.emoji} {product.domain.name}
                              </span>
                            )}
                            {product.category && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                {product.category.emoji} {product.category.name}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Product with variants */}
                  {product.hasVariants && (
                    <div>
                      <div className="flex gap-4 mb-3">
                        <div className="w-16 h-16 flex-shrink-0 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <Package className="w-8 h-8 text-gray-400" />
                          )}
                        </div>

                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                            {product.name}
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                              <Layers className="w-3 h-3 mr-1" />
                              {product.variants.length} variants
                            </span>
                          </h3>

                          {product.description && (
                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                              {product.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Variants List */}
                      <div className="ml-20 space-y-2">
                        {product.variants.map((variant) => (
                          <button
                            key={variant.id}
                            onClick={() => handleSelectProduct(product, variant)}
                            className="w-full text-left px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="font-medium text-gray-900 dark:text-white">
                                  {variant.name}
                                </span>
                                <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                                  {variant.sku}
                                </span>
                              </div>
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {formatCurrency(variant.price)}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
