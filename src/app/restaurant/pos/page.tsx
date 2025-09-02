'use client'

import { ProtectedRoute } from '@/components/auth/protected-route'
import { useState, useEffect } from 'react'

interface MenuItem {
  id: string
  name: string
  price: number
  category: string
}

interface CartItem extends MenuItem {
  quantity: number
}

export default function RestaurantPOS() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedCategory, setSelectedCategory] = useState('all')

  const categories = ['all', 'appetizers', 'mains', 'desserts', 'beverages']

  useEffect(() => {
    setMenuItems([
      { id: '1', name: 'Caesar Salad', price: 12.99, category: 'appetizers' },
      { id: '2', name: 'Grilled Chicken', price: 18.99, category: 'mains' },
      { id: '3', name: 'Chocolate Cake', price: 8.99, category: 'desserts' },
      { id: '4', name: 'Coffee', price: 3.99, category: 'beverages' },
    ])
  }, [])

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id)
      if (existing) {
        return prev.map(i => 
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      }
      return [...prev, { ...item, quantity: 1 }]
    })
  }

  const removeFromCart = (itemId: string) => {
    setCart(prev => prev.filter(i => i.id !== itemId))
  }

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId)
      return
    }
    setCart(prev => 
      prev.map(i => i.id === itemId ? { ...i, quantity } : i)
    )
  }

  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)

  const filteredItems = selectedCategory === 'all' 
    ? menuItems 
    : menuItems.filter(item => item.category === selectedCategory)

  const processOrder = async () => {
    if (cart.length === 0) return
    
    try {
      const response = await fetch('/api/restaurant/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart,
          total,
        }),
      })

      if (response.ok) {
        setCart([])
        alert('Order processed successfully!')
      }
    } catch (error) {
      alert('Failed to process order')
    }
  }

  return (
    <ProtectedRoute module="restaurant" permission="pos">
      <div className="min-h-screen bg-gray-100">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 p-2 lg:p-4">
          <div className="lg:col-span-2 space-y-4">
            <h1 className="text-2xl font-bold">Point of Sale</h1>
            
            <div className="flex space-x-2 overflow-x-auto pb-2">
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-lg whitespace-nowrap ${
                    selectedCategory === category
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </button>
              ))}
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-2 sm:gap-4">
              {filteredItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => addToCart(item)}
                  className="bg-white p-3 sm:p-4 rounded-lg shadow hover:shadow-lg transition-shadow text-left min-h-[80px] touch-manipulation"
                >
                  <h3 className="font-semibold text-xs sm:text-sm line-clamp-2">{item.name}</h3>
                  <p className="text-base sm:text-lg font-bold text-green-600">${item.price}</p>
                </button>
              ))}
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">Order Summary</h2>
            
            <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
              {cart.map(item => (
                <div key={item.id} className="flex justify-between items-center">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{item.name}</div>
                    <div className="text-green-600">${item.price}</div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="w-10 h-10 sm:w-8 sm:h-8 bg-gray-200 rounded text-center hover:bg-gray-300 touch-manipulation"
                    >
                      -
                    </button>
                    <span className="w-8 text-center font-medium">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="w-10 h-10 sm:w-8 sm:h-8 bg-gray-200 rounded text-center hover:bg-gray-300 touch-manipulation"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            {cart.length === 0 && (
              <p className="text-gray-500 text-center py-8">No items in cart</p>
            )}
            
            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-4">
                <span className="font-bold text-lg">Total:</span>
                <span className="font-bold text-xl text-green-600">${total.toFixed(2)}</span>
              </div>
              
              <button
                onClick={processOrder}
                disabled={cart.length === 0}
                className="w-full py-4 sm:py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation text-lg sm:text-base"
              >
                Process Order
              </button>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}