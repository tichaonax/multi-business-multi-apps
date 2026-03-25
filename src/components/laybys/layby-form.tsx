'use client'

import { useState } from 'react'
import { CreateLaybyPayload, InstallmentFrequency } from '@/types/layby'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, CheckCircle, XCircle, User, Phone, Mail, ShoppingBag, Barcode } from 'lucide-react'
import { useAlert } from '@/components/ui/confirm-modal'

interface LaybyFormProps {
  businessId: string
  onSubmit: (data: CreateLaybyPayload) => Promise<void>
  onCancel: () => void
  loading?: boolean
}

interface CustomerDetails {
  id: string
  customerNumber: string
  name: string
  email: string | null
  phone: string | null
  attributes: any
}

interface ProductDetails {
  id: string
  name: string
  sku: string
  price: number
  stock: number
  imageUrl?: string
}

export function LaybyForm({ businessId, onSubmit, onCancel, loading }: LaybyFormProps) {
  const [formData, setFormData] = useState({
    customerId: '',
    depositPercent: 20,
    installmentAmount: 0,
    installmentFrequency: 'FORTNIGHTLY' as InstallmentFrequency,
    laybyDurationMonths: 1,
    paymentDueDate: '',
    completionDueDate: '',
    serviceFee: 0,
    administrationFee: 0,
    notes: ''
  })

  const [items, setItems] = useState([
    { productVariantId: '', quantity: 1, unitPrice: 0, totalPrice: 0, productDetails: null as ProductDetails | null }
  ])

  const [customer, setCustomer] = useState<CustomerDetails | null>(null)
  const [loadingCustomer, setLoadingCustomer] = useState(false)
  const [customerError, setCustomerError] = useState('')
  const customAlert = useAlert()

  // Customer lookup function
  const lookupCustomer = async (customerId: string) => {
    if (!customerId.trim()) {
      setCustomer(null)
      setCustomerError('')
      return
    }

    setLoadingCustomer(true)
    setCustomerError('')

    try {
      // Try searching by customer number first, then by ID
      const searchResponse = await fetch(`/api/customers?search=${encodeURIComponent(customerId)}&limit=1`)

      let customerData = null

      if (searchResponse.ok) {
        const searchData = await searchResponse.json()
        if (searchData.customers && searchData.customers.length > 0) {
          customerData = searchData.customers[0]
        }
      }

      // If not found by search, try direct ID lookup
      if (!customerData) {
        const response = await fetch(`/api/customers/${customerId}`)
        if (response.ok) {
          const data = await response.json()
          customerData = data.customer
        }
      }

      if (!customerData) {
        setCustomerError('Customer not found')
        setCustomer(null)
        return
      }

      // Check if customer is allowed layby
      const attributes = customerData.attributes || {}
      if (!attributes.allowLayby) {
        setCustomerError('This customer is not enabled for layby purchases')
        setCustomer(null)
        return
      }

      setCustomer(customerData)
      setCustomerError('')
      // Update form with the actual database ID
      setFormData({ ...formData, customerId: customerData.id })
    } catch (error) {
      console.error('Error fetching customer:', error)
      setCustomerError('Failed to load customer details')
      setCustomer(null)
    } finally {
      setLoadingCustomer(false)
    }
  }

  // Product lookup by barcode
  const lookupProduct = async (barcode: string, itemIndex: number) => {
    if (!barcode.trim()) return

    try {
  const response = await fetch(`/api/products/by-barcode/${encodeURIComponent(businessId)}/${encodeURIComponent(barcode)}`)

      if (!response.ok) {
        await customAlert({ title: 'Not found', description: 'Product not found' })
        return
      }

      const data = await response.json()
      const product = data.product

      // Update item with product details
      const newItems = [...items]
      newItems[itemIndex] = {
        ...newItems[itemIndex],
        productVariantId: product.id,
        unitPrice: product.price,
        totalPrice: newItems[itemIndex].quantity * product.price,
        productDetails: {
          id: product.id,
          name: product.name,
          sku: product.sku,
          price: product.price,
          stock: product.stock || 0,
          imageUrl: product.imageUrl
        }
      }
      setItems(newItems)
    } catch (error) {
      console.error('Error fetching product:', error)
      await customAlert({ title: 'Lookup failed', description: 'Failed to lookup product' })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const payload: CreateLaybyPayload = {
      businessId,
      customerId: formData.customerId,
      items: items.map(item => ({
        ...item,
        totalPrice: item.quantity * item.unitPrice
      })),
      depositPercent: formData.depositPercent,
      installmentAmount: formData.installmentAmount || undefined,
      installmentFrequency: formData.installmentFrequency,
      paymentDueDate: formData.paymentDueDate || undefined,
      completionDueDate: formData.completionDueDate || undefined,
      serviceFee: formData.serviceFee,
      administrationFee: formData.administrationFee,
      notes: formData.notes || undefined
    }

    await onSubmit(payload)
  }

  const addItem = () => {
    setItems([...items, { productVariantId: '', quantity: 1, unitPrice: 0, totalPrice: 0, productDetails: null }])
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    newItems[index].totalPrice = newItems[index].quantity * newItems[index].unitPrice
    setItems(newItems)
  }

  const clearCustomer = () => {
    setCustomer(null)
    setCustomerError('')
    setFormData({ ...formData, customerId: '' })
  }

  // Auto-calculate completion date based on payment due date and duration
  const calculateCompletionDate = (startDate: string, durationMonths: number): string => {
    if (!startDate) return ''

    const date = new Date(startDate)
    date.setMonth(date.getMonth() + durationMonths)

    return date.toISOString().split('T')[0]
  }

  const handlePaymentDueDateChange = (date: string) => {
    const completionDate = calculateCompletionDate(date, formData.laybyDurationMonths)
    setFormData({
      ...formData,
      paymentDueDate: date,
      completionDueDate: completionDate
    })
  }

  const handleDurationChange = (months: number) => {
    const completionDate = formData.paymentDueDate
      ? calculateCompletionDate(formData.paymentDueDate, months)
      : ''
    setFormData({
      ...formData,
      laybyDurationMonths: months,
      completionDueDate: completionDate
    })
  }

  const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
  const depositAmount = (totalAmount * formData.depositPercent) / 100
  const balanceRemaining = totalAmount - depositAmount + formData.serviceFee + formData.administrationFee

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Customer Selection */}
      <div className="space-y-3">
        <Label htmlFor="customerId">Customer *</Label>
        <div className="flex gap-2">
          <Input
            id="customerId"
            value={formData.customerId}
            onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
            onBlur={(e) => lookupCustomer(e.target.value)}
            placeholder="Enter customer number, name, or phone"
            required
            disabled={!!customer}
          />
          <Button
            type="button"
            onClick={() => lookupCustomer(formData.customerId)}
            disabled={loadingCustomer || !formData.customerId.trim() || !!customer}
            variant="outline"
          >
            {loadingCustomer ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify'}
          </Button>
        </div>

        {/* Customer Verification Card */}
        {customer && (
          <div className="border-2 border-green-500 bg-green-50 dark:bg-green-950 rounded-lg p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <h3 className="font-semibold text-green-900 dark:text-green-100">Customer Verified</h3>
              </div>
              <Button
                type="button"
                onClick={clearCustomer}
                size="sm"
                variant="ghost"
              >
                Clear
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-600" />
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Customer Number</p>
                  <p className="font-medium text-gray-900 dark:text-white">{customer.customerNumber}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-600" />
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Full Name</p>
                  <p className="font-medium text-gray-900 dark:text-white">{customer.name}</p>
                </div>
              </div>

              {customer.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-600" />
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Phone</p>
                    <p className="font-medium text-gray-900 dark:text-white">{customer.phone}</p>
                  </div>
                </div>
              )}

              {customer.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-600" />
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Email</p>
                    <p className="font-medium text-gray-900 dark:text-white">{customer.email}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 col-span-2">
                <ShoppingBag className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Layby Status</p>
                  <p className="font-medium text-green-600">✓ Enabled</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Customer Error */}
        {customerError && (
          <div className="border-2 border-red-500 bg-red-50 dark:bg-red-950 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <p className="text-red-900 dark:text-red-100 font-medium">{customerError}</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loadingCustomer && (
          <div className="flex items-center gap-2 text-gray-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            <p className="text-sm">Looking up customer...</p>
          </div>
        )}
      </div>

      {/* Items Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Items *</Label>
          <Button type="button" onClick={addItem} size="sm" variant="outline">
            + Add Item
          </Button>
        </div>

        {items.map((item, index) => (
          <div key={index} className="card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Item {index + 1}</span>
              {items.length > 1 && (
                <Button
                  type="button"
                  onClick={() => removeItem(index)}
                  size="sm"
                  variant="destructive"
                >
                  Remove
                </Button>
              )}
            </div>

            {/* Barcode Scanner Input */}
            <div>
              <Label>Scan or Enter Barcode/SKU</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Scan barcode or enter SKU"
                    className="pl-10"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        lookupProduct(e.currentTarget.value, index)
                        e.currentTarget.value = ''
                      }
                    }}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const input = document.querySelector(`input[placeholder="Scan barcode or enter SKU"]`) as HTMLInputElement
                    if (input?.value) {
                      lookupProduct(input.value, index)
                      input.value = ''
                    }
                  }}
                >
                  Lookup
                </Button>
              </div>
            </div>

            {/* Product Details Display */}
            {item.productDetails && (
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 rounded-lg p-3">
                <div className="flex items-start gap-3">
                  {item.productDetails.imageUrl && (
                    <img
                      src={item.productDetails.imageUrl}
                      alt={item.productDetails.name}
                      className="w-16 h-16 object-cover rounded"
                    />
                  )}
                  <div className="flex-1">
                    <p className="font-semibold text-blue-900 dark:text-blue-100">{item.productDetails.name}</p>
                    <p className="text-sm text-blue-700 dark:text-blue-300">SKU: {item.productDetails.sku}</p>
                    <div className="flex gap-4 mt-1">
                      <p className="text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Price:</span>{' '}
                        <span className="font-semibold">${item.productDetails.price.toFixed(2)}</span>
                      </p>
                      <p className="text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Stock:</span>{' '}
                        <span className={`font-semibold ${item.productDetails.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {item.productDetails.stock} available
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Manual Entry Fallback */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label>Product ID (Manual)</Label>
                <Input
                  value={item.productVariantId}
                  onChange={(e) => updateItem(index, 'productVariantId', e.target.value)}
                  placeholder="Or enter Product ID manually"
                  required={!item.productDetails}
                  disabled={!!item.productDetails}
                />
              </div>
              <div>
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  max={item.productDetails?.stock || 999999}
                  value={item.quantity}
                  onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                  required
                />
              </div>
              <div>
                <Label>Unit Price</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.unitPrice}
                  onChange={(e) => updateItem(index, 'unitPrice', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                  required
                  disabled={!!item.productDetails}
                />
              </div>
            </div>
            <div className="text-sm text-secondary">
              Total: ${(item.quantity * item.unitPrice).toFixed(2)}
            </div>
          </div>
        ))}
      </div>

      {/* Payment Terms */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="depositPercent">Deposit % *</Label>
          <Input
            id="depositPercent"
            type="number"
            min="0"
            max="100"
            value={formData.depositPercent}
            onChange={(e) => setFormData({ ...formData, depositPercent: e.target.value === '' ? 0 : parseInt(e.target.value) })}
            required
          />
        </div>

        <div>
          <Label htmlFor="installmentFrequency">Frequency</Label>
          <select
            id="installmentFrequency"
            value={formData.installmentFrequency}
            onChange={(e) => setFormData({ ...formData, installmentFrequency: e.target.value as InstallmentFrequency })}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="WEEKLY">Weekly</option>
            <option value="FORTNIGHTLY">Fortnightly</option>
            <option value="MONTHLY">Monthly</option>
            <option value="CUSTOM">Custom</option>
          </select>
        </div>

        <div>
          <Label htmlFor="laybyDuration">Layby Duration *</Label>
          <select
            id="laybyDuration"
            value={formData.laybyDurationMonths}
            onChange={(e) => handleDurationChange(parseInt(e.target.value))}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            required
          >
            <option value="1">1 Month</option>
            <option value="2">2 Months</option>
            <option value="3">3 Months</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">How long the customer has to complete payments</p>
        </div>

        <div>
          <Label htmlFor="paymentDueDate">First Payment Due Date (After Deposit) *</Label>
          <Input
            id="paymentDueDate"
            type="date"
            value={formData.paymentDueDate}
            onChange={(e) => handlePaymentDueDateChange(e.target.value)}
            required
          />
          <p className="text-xs text-gray-500 mt-1">When the first installment payment is due</p>
        </div>

        <div>
          <Label htmlFor="completionDueDate">Completion Due Date (Auto-calculated)</Label>
          <Input
            id="completionDueDate"
            type="date"
            value={formData.completionDueDate}
            onChange={(e) => setFormData({ ...formData, completionDueDate: e.target.value })}
          />
          <p className="text-xs text-gray-500 mt-1">
            {formData.paymentDueDate && formData.completionDueDate
              ? `Auto-calculated: ${formData.laybyDurationMonths} month(s) from first payment. You can adjust if needed.`
              : 'Set payment due date to auto-calculate'}
          </p>
        </div>
      </div>

      {/* Fees */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="serviceFee">Service Fee</Label>
          <Input
            id="serviceFee"
            type="number"
            min="0"
            step="0.01"
            value={formData.serviceFee}
            onChange={(e) => setFormData({ ...formData, serviceFee: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
          />
        </div>

        <div>
          <Label htmlFor="administrationFee">Admin Fee</Label>
          <Input
            id="administrationFee"
            type="number"
            min="0"
            step="0.01"
            value={formData.administrationFee}
            onChange={(e) => setFormData({ ...formData, administrationFee: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Add any additional notes..."
          rows={3}
        />
      </div>

      {/* Summary */}
      <div className="card p-4 bg-blue-50 dark:bg-blue-950">
        <h4 className="font-semibold mb-2">Summary</h4>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Total Amount:</span>
            <span className="font-semibold">${totalAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Deposit ({formData.depositPercent}%):</span>
            <span className="font-semibold">${depositAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Fees:</span>
            <span className="font-semibold">${(formData.serviceFee + formData.administrationFee).toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold border-t pt-1">
            <span>Balance to Pay:</span>
            <span>${balanceRemaining.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create Layby'}
        </Button>
      </div>
    </form>
  )
}
