'use client'

import { useState, useEffect, useRef } from 'react'
import { PhoneNumberInput } from '@/components/ui/phone-number-input'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { UniversalSupplier, UniversalSupplierFormProps, BusinessType, SupplierStatus, PaymentTerms, ReliabilityRating } from '@/types/supplier'

const paymentTermsOptions = [
  { value: 'cod', label: 'Cash on Delivery' },
  { value: 'net_15', label: 'Net 15 Days' },
  { value: 'net_30', label: 'Net 30 Days' },
  { value: 'net_45', label: 'Net 45 Days' },
  { value: 'net_60', label: 'Net 60 Days' },
  { value: 'prepaid', label: 'Prepaid' },
  { value: 'custom', label: 'Custom Terms' }
]

const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'pending', label: 'Pending' },
  { value: 'suspended', label: 'Suspended' }
]

const reliabilityOptions = [
  { value: 'excellent', label: 'Excellent' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' }
]

// Fallback categories when API returns nothing yet
const fallbackCategoryOptions: Record<string, { name: string; emoji: string }[]> = {
  hardware: [
    { name: 'Lumber & Building Materials', emoji: '🪵' },
    { name: 'Fasteners & Hardware', emoji: '🔩' },
    { name: 'Paint & Finishing', emoji: '🎨' },
    { name: 'Tools & Equipment', emoji: '🔧' },
    { name: 'Electrical Supplies', emoji: '💡' },
    { name: 'Plumbing Supplies', emoji: '🚿' },
    { name: 'Safety Equipment', emoji: '🦺' },
  ],
  grocery: [
    { name: 'Fresh Produce', emoji: '🥬' },
    { name: 'Dairy & Eggs', emoji: '🥛' },
    { name: 'Meat & Seafood', emoji: '🥩' },
    { name: 'Frozen Foods', emoji: '🧊' },
    { name: 'Bakery Goods', emoji: '🍞' },
    { name: 'Beverages', emoji: '🥤' },
    { name: 'Packaged Foods', emoji: '📦' },
    { name: 'Health & Beauty', emoji: '💊' },
  ],
  restaurant: [
    { name: 'Fresh Produce', emoji: '🥬' },
    { name: 'Proteins & Meat', emoji: '🥩' },
    { name: 'Dairy Products', emoji: '🥛' },
    { name: 'Beverages', emoji: '🥤' },
    { name: 'Bakery & Bread', emoji: '🍞' },
    { name: 'Spices & Seasonings', emoji: '🌿' },
    { name: 'Kitchen Equipment', emoji: '🍳' },
    { name: 'Disposables', emoji: '📦' },
  ],
  clothing: [
    { name: 'Fabrics & Materials', emoji: '🧵' },
    { name: 'Finished Garments', emoji: '👗' },
    { name: 'Accessories', emoji: '👜' },
    { name: 'Footwear', emoji: '👟' },
    { name: 'Jewelry', emoji: '💍' },
    { name: 'Bags & Luggage', emoji: '🧳' },
    { name: 'Seasonal Items', emoji: '🎄' },
    { name: 'Designer Collections', emoji: '✨' },
  ],
  construction: [
    { name: 'Heavy Equipment', emoji: '🏗️' },
    { name: 'Construction Materials', emoji: '🧱' },
    { name: 'Concrete & Masonry', emoji: '🪨' },
    { name: 'Steel & Metal', emoji: '⚙️' },
    { name: 'Roofing Materials', emoji: '🏠' },
    { name: 'Specialty Tools', emoji: '🔨' },
  ],
}

export function UniversalSupplierForm({
  businessId,
  businessType,
  supplier,
  onSubmit,
  onCancel,
  loading = false,
  customFields = []
}: UniversalSupplierFormProps) {
  const [formData, setFormData] = useState<Partial<UniversalSupplier>>({
    businessId,
    businessType,
    name: '',
    code: '',
    category: '',
    contact: {
      primaryContact: '',
      phone: '',
      email: '',
      website: '',
      address: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'USA'
      },
      alternateContacts: []
    },
    terms: {
      paymentTerms: 'net_30' as PaymentTerms,
      customPaymentTerms: '',
      minimumOrder: 0,
      currency: 'USD',
      leadTimeDays: 7,
      shippingTerms: '',
      warrantyDays: 0,
      returnPolicy: ''
    },
    performance: {
      onTimeDeliveryPercent: 95,
      qualityScore: 8.5,
      totalOrders: 0,
      totalSpent: 0,
      reliability: 'good' as ReliabilityRating,
      averageLeadTime: 7,
      issueCount: 0,
      responseTimeHours: 24
    },
    certifications: [],
    attributes: {},
    status: 'active' as SupplierStatus,
    tags: [],
    notes: ''
  })

  const [activeTab, setActiveTab] = useState('basic')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [categories, setCategories] = useState<{ id: string; name: string; emoji: string }[]>([])
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [newCatEmoji, setNewCatEmoji] = useState('')
  const [addingCat, setAddingCat] = useState(false)
  const newCatInputRef = useRef<HTMLInputElement>(null)

  // Fetch live categories from the inventory categories API
  const fetchCategories = async () => {
    try {
      const res = await fetch(`/api/inventory/categories?businessType=${businessType}&businessId=${businessId}`)
      const data = await res.json()
      if (data.categories && data.categories.length > 0) {
        // Deduplicate by name — many business types have the same category name under multiple domains
        const seen = new Set<string>()
        const unique = data.categories
          .filter((c: any) => {
            const key = c.name.toLowerCase()
            if (seen.has(key)) return false
            seen.add(key)
            return true
          })
          .map((c: any) => ({ id: c.id, name: c.name, emoji: c.emoji || '' }))
        setCategories(unique)
      } else {
        // Fall back to static list with emojis
        const fallback = fallbackCategoryOptions[businessType] ?? []
        setCategories(fallback.map((c, i) => ({ id: `fallback_${i}`, name: c.name, emoji: c.emoji })))
      }
    } catch {
      const fallback = fallbackCategoryOptions[businessType] ?? []
      setCategories(fallback.map((c, i) => ({ id: `fallback_${i}`, name: c.name, emoji: c.emoji })))
    }
  }

  const handleAddCategory = async () => {
    if (!newCatName.trim() || !newCatEmoji.trim()) return
    setAddingCat(true)
    try {
      const res = await fetch('/api/inventory/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          businessType,
          name: newCatName.trim(),
          emoji: newCatEmoji.trim(),
          color: '#3B82F6',
        }),
      })
      const data = await res.json()
      if (res.ok && data.category) {
        const created = { id: data.category.id, name: data.category.name, emoji: data.category.emoji || newCatEmoji }
        setCategories(prev => [...prev, created])
        handleInputChange('category', created.name)
        setShowAddCategory(false)
        setNewCatName('')
        setNewCatEmoji('')
      }
    } catch {
      // silently fail — category list still usable
    } finally {
      setAddingCat(false)
    }
  }

  useEffect(() => {
    if (supplier) {
      setFormData(supplier)
    }
  }, [supplier])

  useEffect(() => {
    fetchCategories()
  }, [businessType, businessId])

  useEffect(() => {
    if (showAddCategory) {
      setTimeout(() => newCatInputRef.current?.focus(), 50)
    }
  }, [showAddCategory])

  const generateSupplierCode = (name: string, businessType: BusinessType) => {
    const prefix = businessType.substring(0, 3).toUpperCase()
    const nameCode = name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 6).toUpperCase()
    const timestamp = Date.now().toString().slice(-4)
    return `${prefix}-${nameCode}-${timestamp}`
  }

  const handleInputChange = (path: string, value: any) => {
    setFormData(prev => {
      const newData = { ...prev }
      const keys = path.split('.')
      let current: any = newData

      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {}
        }
        current = current[keys[i]]
      }

      current[keys[keys.length - 1]] = value

      // Auto-generate code when name changes
      if (path === 'name' && value && !supplier) {
        const newCode = generateSupplierCode(value, businessType)
        const codeKeys = 'code'.split('.')
        let codeTarget: any = newData
        for (let i = 0; i < codeKeys.length - 1; i++) {
          codeTarget = codeTarget[codeKeys[i]]
        }
        codeTarget[codeKeys[codeKeys.length - 1]] = newCode
      }

      return newData
    })

    // Clear error when field is updated
    if (errors[path]) {
      setErrors(prev => ({ ...prev, [path]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name?.trim()) {
      newErrors['name'] = 'Supplier name is required'
    }

    if (!formData.category) {
      newErrors['category'] = 'Category is required'
    }

    if (!formData.contact?.primaryContact?.trim()) {
      newErrors['contact.primaryContact'] = 'Primary contact is required'
    }

    if (formData.contact?.email?.trim() && !/\S+@\S+\.\S+/.test(formData.contact.email)) {
      newErrors['contact.email'] = 'Invalid email format'
    }

    if (!formData.contact?.phone?.trim()) {
      newErrors['contact.phone'] = 'Phone is required'
    }

    if (formData.terms?.minimumOrder !== undefined && formData.terms.minimumOrder < 0) {
      newErrors['terms.minimumOrder'] = 'Minimum order must be 0 or greater'
    }

    if (!formData.terms?.leadTimeDays || formData.terms.leadTimeDays < 1) {
      newErrors['terms.leadTimeDays'] = 'Lead time must be at least 1 day'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    const submitData = {
      ...formData,
      createdAt: supplier?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: supplier?.createdBy || 'current-user',
      lastUpdatedBy: 'current-user'
    }

    onSubmit(submitData)
  }

  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: '📋' },
    { id: 'contact', label: 'Contact', icon: '📞' },
    { id: 'terms', label: 'Terms', icon: '📄' },
    { id: 'performance', label: 'Performance', icon: '📊' },
    { id: 'additional', label: 'Additional', icon: '⚙️' }
  ]

  // Which error keys belong to each tab — used to show the red dot indicator
  const tabErrorKeys: Record<string, string[]> = {
    basic:   ['name', 'category'],
    contact: ['contact.primaryContact', 'contact.email', 'contact.phone'],
    terms:   ['terms.minimumOrder', 'terms.leadTimeDays'],
  }

  const tabHasError = (tabId: string) =>
    (tabErrorKeys[tabId] ?? []).some(key => !!errors[key])

  const getBusinessIcon = (businessType: BusinessType) => {
    const icons = {
      hardware: '🔧',
      grocery: '🛒',
      restaurant: '🍽️',
      clothing: '👕',
      construction: '🏗️'
    }
    return icons[businessType] || '🏢'
  }

  const renderError = (path: string) => {
    if (errors[path]) {
      return <span className="text-red-500 text-xs mt-1">{errors[path]}</span>
    }
    return null
  }

  return (
    <div className="card rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{getBusinessIcon(businessType)}</span>
            <div>
              <h3 className="text-lg font-semibold">
                {supplier ? 'Edit' : 'Add'} {businessType.charAt(0).toUpperCase() + businessType.slice(1)} Supplier
              </h3>
              {/* Use clothing modal description styling for clothing and grocery to keep them visually consistent */}
              <p className={
                `text-sm ${businessType === 'clothing' || businessType === 'grocery' ? 'text-purple-600' : 'text-gray-600 dark:text-gray-400'}`
              }>
                {supplier ? 'Update supplier information' : 'Add a new supplier to your directory'}
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8 px-6" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
              {tabHasError(tab.id) && (
                <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" title="This tab has required fields that need attention" />
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Form Content */}
      <div className="flex-1 overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-6">
          {/* Basic Info Tab */}
          {activeTab === 'basic' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Supplier Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Enter supplier name"
                  />
                  {renderError('name')}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Supplier Code
                  </label>
                  <input
                    type="text"
                    value={formData.code || ''}
                    onChange={(e) => handleInputChange('code', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Auto-generated or enter custom code"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Category *
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowAddCategory(v => !v)}
                      className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                    >
                      {showAddCategory ? 'Cancel' : '+ New'}
                    </button>
                  </div>

                  {showAddCategory && (
                    <div className="mb-2 p-3 rounded-lg border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 space-y-2">
                      <div className="flex gap-2">
                        <input
                          ref={newCatInputRef}
                          type="text"
                          value={newCatEmoji}
                          onChange={e => setNewCatEmoji(e.target.value)}
                          placeholder="😀"
                          className="w-14 text-center px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          maxLength={4}
                        />
                        <input
                          type="text"
                          value={newCatName}
                          onChange={e => setNewCatName(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCategory() } }}
                          placeholder="Category name"
                          className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          type="button"
                          onClick={handleAddCategory}
                          disabled={addingCat || !newCatName.trim() || !newCatEmoji.trim()}
                          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                        >
                          {addingCat ? '…' : 'Add'}
                        </button>
                      </div>
                      <p className="text-xs text-blue-600 dark:text-blue-400">Enter an emoji and a name, then press Add or Enter</p>
                    </div>
                  )}

                  <SearchableSelect
                    options={categories.map(c => ({ id: c.name, name: c.name, emoji: c.emoji }))}
                    value={formData.category || ''}
                    onChange={val => handleInputChange('category', val)}
                    placeholder="Select category"
                    required
                    error={errors['category']}
                  />
                  {renderError('category')}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status || 'active'}
                    onChange={(e) => handleInputChange('status', e.target.value as SupplierStatus)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    {statusOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Additional notes about this supplier"
                />
              </div>
            </div>
          )}

          {/* Contact Tab */}
          {activeTab === 'contact' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Primary Contact *
                  </label>
                  <input
                    type="text"
                    value={formData.contact?.primaryContact || ''}
                    onChange={(e) => handleInputChange('contact.primaryContact', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Contact person name"
                  />
                  {renderError('contact.primaryContact')}
                </div>

                <div>
                  <PhoneNumberInput
                    value={formData.contact?.phone || ''}
                    onChange={(fullPhone) => handleInputChange('contact.phone', fullPhone)}
                    label="Phone"
                    placeholder="(555) 123-4567"
                    required={true}
                    error={errors['contact.phone']}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email <span className="text-gray-400 font-normal text-xs">(optional)</span>
                  </label>
                  <input
                    type="email"
                    value={formData.contact?.email || ''}
                    onChange={(e) => handleInputChange('contact.email', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="contact@supplier.com"
                  />
                  {renderError('contact.email')}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Website
                  </label>
                  <input
                    type="url"
                    value={formData.contact?.website || ''}
                    onChange={(e) => handleInputChange('contact.website', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="https://supplier.com"
                  />
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Address</h4>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <input
                      type="text"
                      value={formData.contact?.address?.street || ''}
                      onChange={(e) => handleInputChange('contact.address.street', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Street address"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <input
                        type="text"
                        value={formData.contact?.address?.city || ''}
                        onChange={(e) => handleInputChange('contact.address.city', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder="City"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        value={formData.contact?.address?.state || ''}
                        onChange={(e) => handleInputChange('contact.address.state', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder="State"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        value={formData.contact?.address?.zipCode || ''}
                        onChange={(e) => handleInputChange('contact.address.zipCode', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder="ZIP Code"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Terms Tab */}
          {activeTab === 'terms' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Payment Terms
                  </label>
                  <select
                    value={formData.terms?.paymentTerms || 'net_30'}
                    onChange={(e) => handleInputChange('terms.paymentTerms', e.target.value as PaymentTerms)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    {paymentTermsOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Currency
                  </label>
                  <select
                    value={formData.terms?.currency || 'USD'}
                    onChange={(e) => handleInputChange('terms.currency', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="USD">USD - US Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - British Pound</option>
                    <option value="CAD">CAD - Canadian Dollar</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Minimum Order Amount <span className="text-gray-400 font-normal text-xs">(optional)</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.10"
                    value={formData.terms?.minimumOrder || 0}
                    onChange={(e) => handleInputChange('terms.minimumOrder', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="0.00"
                  />
                  {renderError('terms.minimumOrder')}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Lead Time (Days) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.terms?.leadTimeDays || 7}
                    onChange={(e) => handleInputChange('terms.leadTimeDays', parseInt(e.target.value) || 7)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="7"
                  />
                  {renderError('terms.leadTimeDays')}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Shipping Terms
                  </label>
                  <input
                    type="text"
                    value={formData.terms?.shippingTerms || ''}
                    onChange={(e) => handleInputChange('terms.shippingTerms', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="FOB Origin, CIF, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Warranty (Days)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.terms?.warrantyDays || 0}
                    onChange={(e) => handleInputChange('terms.warrantyDays', e.target.value === '' ? 0 : parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Return Policy
                </label>
                <textarea
                  value={formData.terms?.returnPolicy || ''}
                  onChange={(e) => handleInputChange('terms.returnPolicy', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Describe the return policy..."
                />
              </div>
            </div>
          )}

          {/* Performance Tab */}
          {activeTab === 'performance' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    On-Time Delivery (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData.performance?.onTimeDeliveryPercent || 95}
                    onChange={(e) => handleInputChange('performance.onTimeDeliveryPercent', parseFloat(e.target.value) || 95)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Quality Score (1-10)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    step="0.1"
                    value={formData.performance?.qualityScore || 8.5}
                    onChange={(e) => handleInputChange('performance.qualityScore', parseFloat(e.target.value) || 8.5)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Total Orders
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.performance?.totalOrders || 0}
                    onChange={(e) => handleInputChange('performance.totalOrders', e.target.value === '' ? 0 : parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Total Spent
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.10"
                    value={formData.performance?.totalSpent || 0}
                    onChange={(e) => handleInputChange('performance.totalSpent', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Reliability Rating
                  </label>
                  <select
                    value={formData.performance?.reliability || 'good'}
                    onChange={(e) => handleInputChange('performance.reliability', e.target.value as ReliabilityRating)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    {reliabilityOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Response Time (Hours)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.performance?.responseTimeHours || 24}
                    onChange={(e) => handleInputChange('performance.responseTimeHours', parseInt(e.target.value) || 24)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Additional Tab */}
          {activeTab === 'additional' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.tags?.join(', ') || ''}
                  onChange={(e) => handleInputChange('tags', e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="reliable, fast-delivery, local"
                />
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Business-Specific Information</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Additional business-specific fields and configurations can be added here based on the {businessType} business type.
                </p>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Footer */}
      <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : (supplier ? 'Update Supplier' : 'Add Supplier')}
          </button>
        </div>
      </div>
    </div>
  )
}