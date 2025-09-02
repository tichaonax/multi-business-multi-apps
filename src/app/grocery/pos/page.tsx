'use client'

import { ProtectedRoute } from '@/components/auth/protected-route'
import { useState, useEffect } from 'react'

interface Product {
  id: string
  name: string
  price: number
  barcode: string
  category: string
  stock: number
}

interface CartItem extends Product {
  quantity: number
}

export default function GroceryPOS() {
  const [products, setProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [barcode, setBarcode] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    setProducts([
      { id: '1', name: 'Milk 1L', price: 4.99, barcode: '1234567890123', category: 'dairy', stock: 50 },
      { id: '2', name: 'Bread Loaf', price: 2.99, barcode: '2345678901234', category: 'bakery', stock: 25 },
      { id: '3', name: 'Bananas 1kg', price: 3.49, barcode: '3456789012345', category: 'produce', stock: 100 },
      { id: '4', name: 'Chicken Breast 1kg', price: 12.99, barcode: '4567890123456', category: 'meat', stock: 15 },
    ])
  }, [])

  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
      alert('Product out of stock')
      return
    }

    setCart(prev => {
      const existing = prev.find(i => i.id === product.id)
      if (existing) {
        if (existing.quantity >= product.stock) {
          alert('Not enough stock available')
          return prev
        }
        return prev.map(i => 
          i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      }
      return [...prev, { ...product, quantity: 1 }]
    })
  }

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const product = products.find(p => p.barcode === barcode)
    if (product) {
      addToCart(product)
      setBarcode('')
    } else {
      alert('Product not found')
    }
  }

  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.barcode.includes(searchTerm)
  )

  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)

  return (
    <ProtectedRoute module="grocery" permission="pos">
      <div className="min-h-screen bg-gray-100">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-4">
          <div className="lg:col-span-2 space-y-4">
            <h1 className="text-2xl font-bold">Grocery POS</h1>
            
            <div className="space-y-4">
              <form onSubmit={handleBarcodeSubmit} className="flex space-x-2">
                <input
                  type="text"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="Scan or enter barcode..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Add
                </button>
              </form>
              
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search products..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredProducts.map(product => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  disabled={product.stock <= 0}
                  className="bg-white p-4 rounded-lg shadow hover:shadow-lg transition-shadow text-left disabled:opacity-50"
                >
                  <h3 className="font-semibold text-sm">{product.name}</h3>
                  <p className="text-lg font-bold text-green-600">${product.price}</p>
                  <p className="text-xs text-gray-500">Stock: {product.stock}</p>
                  <p className="text-xs text-gray-400">{product.barcode}</p>
                </button>
              ))}
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">Cart</h2>
            
            <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
              {cart.map(item => (
                <div key={item.id} className="flex justify-between items-center text-sm">
                  <div className="flex-1">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-green-600">${item.price}</div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="w-8 text-center">{item.quantity}</span>
                    <span className="text-gray-600">${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-4">
                <span className="font-bold text-lg">Total:</span>
                <span className="font-bold text-xl text-green-600">${total.toFixed(2)}</span>
              </div>
              
              <button
                disabled={cart.length === 0}
                className="w-full py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                Complete Sale
              </button>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}