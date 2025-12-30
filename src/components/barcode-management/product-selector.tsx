'use client';

import { useState, useEffect } from 'react';

interface Product {
  id: string;
  name: string;
  sku: string | null;
  category?: string;
  type?: string;
}

interface ProductSelectorProps {
  businessId: string;
  onSelect: (product: {
    name: string;
    sku: string;
    category: string;
    type: string;
  }) => void;
}

export default function ProductSelector({ businessId, onSelect }: ProductSelectorProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  useEffect(() => {
    if (businessId) {
      fetchProducts();
    }
  }, [businessId, search]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: '50',
      });

      if (search) {
        params.append('search', search);
      }

      const response = await fetch(`/api/business/${businessId}/products?${params}`);
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);

    // Extract type from business or default to 'custom'
    const productType = product.type || 'custom';

    onSelect({
      name: product.name,
      sku: product.sku || product.id,
      category: product.category || '',
      type: productType,
    });
  };

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div>
        <label htmlFor="product-search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Search Products
        </label>
        <input
          id="product-search"
          type="text"
          placeholder="Search by product name or SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white py-2.5 px-3"
        />
      </div>

      {/* Product List */}
      <div className="border border-gray-300 dark:border-gray-600 rounded-lg max-h-96 overflow-y-auto">
        {loading ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            Loading products...
          </div>
        ) : products.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            {search ? 'No products found matching your search' : 'No products available'}
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {products.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => handleSelectProduct(product)}
                className={`w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                  selectedProduct?.id === product.id
                    ? 'bg-blue-50 dark:bg-blue-900 border-l-4 border-blue-600'
                    : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {product.name}
                    </div>
                    {product.sku && (
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        SKU: <code className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">{product.sku}</code>
                      </div>
                    )}
                    {product.category && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Category: {product.category}
                      </div>
                    )}
                  </div>
                  {selectedProduct?.id === product.id && (
                    <div className="ml-4">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                        ✓ Selected
                      </span>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedProduct && (
        <div className="p-4 bg-green-50 dark:bg-green-900 rounded-lg">
          <p className="text-sm text-green-800 dark:text-green-200">
            ✓ Selected: <strong>{selectedProduct.name}</strong>
            {selectedProduct.sku && ` (SKU: ${selectedProduct.sku})`}
          </p>
          <p className="text-xs text-green-700 dark:text-green-300 mt-1">
            Template fields will be auto-populated from this product
          </p>
        </div>
      )}
    </div>
  );
}
