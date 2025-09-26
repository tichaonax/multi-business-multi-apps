'use client'

import { useState, useEffect } from 'react'
import { useBusinessContext } from '@/components/universal'

interface BulkPricingRule {
  id: string
  productId: string
  productName: string
  sku: string
  basePrice: number
  tiers: Array<{
    minQuantity: number
    price: number
    discountPercent: number
    description: string
  }>
  customerTypes: Array<'retail' | 'contractor' | 'electrician' | 'plumber' | 'carpenter'>
  isActive: boolean
}

interface HardwareBulkPricingProps {
  businessId: string
}

export function HardwareBulkPricing({ businessId }: HardwareBulkPricingProps) {
  const { formatCurrency } = useBusinessContext()
  const [pricingRules, setPricingRules] = useState<BulkPricingRule[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Sample bulk pricing rules for hardware
    const sampleRules: BulkPricingRule[] = [
      {
        id: 'bulk1',
        productId: 'hw1',
        productName: 'Milwaukee M18 Cordless Drill',
        sku: 'MIL-M18-DRILL-001',
        basePrice: 179.99,
        tiers: [
          { minQuantity: 1, price: 179.99, discountPercent: 0, description: 'Retail Price' },
          { minQuantity: 5, price: 165.00, discountPercent: 8.3, description: 'Contractor 5+ discount' },
          { minQuantity: 10, price: 155.00, discountPercent: 13.9, description: 'Volume 10+ discount' },
          { minQuantity: 25, price: 145.00, discountPercent: 19.4, description: 'Distributor 25+ discount' }
        ],
        customerTypes: ['contractor', 'electrician'],
        isActive: true
      },
      {
        id: 'bulk2',
        productId: 'hw3',
        productName: '2x4x8 Pressure Treated Lumber',
        sku: 'LUM-PT-2X4X8',
        basePrice: 8.47,
        tiers: [
          { minQuantity: 1, price: 8.47, discountPercent: 0, description: 'Single piece' },
          { minQuantity: 50, price: 7.99, discountPercent: 5.7, description: 'Bundle 50+ pieces' },
          { minQuantity: 100, price: 7.49, discountPercent: 11.6, description: 'Pallet 100+ pieces' },
          { minQuantity: 500, price: 6.99, discountPercent: 17.5, description: 'Truckload 500+ pieces' }
        ],
        customerTypes: ['contractor', 'carpenter'],
        isActive: true
      }
    ]

    setPricingRules(sampleRules)
    setLoading(false)
  }, [businessId])

  const getCustomerTypeIcon = (type: string) => {
    const icons = {
      retail: '🛒',
      contractor: '👷',
      electrician: '⚡',
      plumber: '🚰',
      carpenter: '🪚'
    }
    return icons[type as keyof typeof icons] || '👤'
  }

  if (loading) {
    return <div className="animate-pulse">Loading bulk pricing...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Bulk Pricing Management</h2>
          <p className="text-sm text-gray-600 mt-1">Contractor and volume discount tiers</p>
        </div>
        <button className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">
          Add Pricing Rule
        </button>
      </div>

      <div className="space-y-4">
        {pricingRules.map((rule) => (
          <div key={rule.id} className="bg-white border rounded-lg p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{rule.productName}</h3>
                <p className="text-sm text-gray-600">SKU: {rule.sku}</p>
              </div>
              <div className="flex items-center gap-2">
                {rule.customerTypes.map((type) => (
                  <span key={type} className="inline-flex items-center px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                    {getCustomerTypeIcon(type)} {type}
                  </span>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Quantity</th>
                    <th className="text-left py-2">Price per Unit</th>
                    <th className="text-left py-2">Discount</th>
                    <th className="text-left py-2">Description</th>
                    <th className="text-left py-2">Total Savings</th>
                  </tr>
                </thead>
                <tbody>
                  {rule.tiers.map((tier, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="py-2 font-medium">{tier.minQuantity}+</td>
                      <td className="py-2">{formatCurrency(tier.price)}</td>
                      <td className="py-2">
                        <span className={`font-medium ${tier.discountPercent > 0 ? 'text-green-600' : 'text-gray-600'}`}>
                          {tier.discountPercent > 0 ? `-${tier.discountPercent.toFixed(1)}%` : 'Base Price'}
                        </span>
                      </td>
                      <td className="py-2 text-gray-600">{tier.description}</td>
                      <td className="py-2 text-green-600 font-medium">
                        {tier.discountPercent > 0
                          ? `${formatCurrency((rule.basePrice - tier.price) * tier.minQuantity)} @ ${tier.minQuantity}`
                          : '—'
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center mt-4 pt-4 border-t">
              <div className="text-sm text-gray-600">
                Maximum volume discount: <span className="font-semibold text-green-600">
                  {Math.max(...rule.tiers.map(t => t.discountPercent)).toFixed(1)}%
                </span>
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50">
                  Edit Rules
                </button>
                <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
                  Generate Quote
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <h3 className="font-semibold text-amber-900 mb-2">💡 Hardware Store Pricing Strategy</h3>
        <div className="text-sm text-amber-800 space-y-1">
          <p>• <strong>Contractor Pricing:</strong> 8-15% discount for verified contractors</p>
          <p>• <strong>Volume Discounts:</strong> Automatic tiers based on quantity purchased</p>
          <p>• <strong>Trade-Specific:</strong> Special pricing for electricians, plumbers, carpenters</p>
          <p>• <strong>Project Pricing:</strong> Custom quotes for large construction projects</p>
        </div>
      </div>
    </div>
  )
}