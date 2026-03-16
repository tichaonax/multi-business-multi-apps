'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Loader2, Mail, Phone, MapPin, Building2, ShoppingBag, Calendar, Camera, Trash2, User, Printer } from 'lucide-react'
import { formatDateByFormat } from '@/lib/country-codes'
import { useDateFormat } from '@/contexts/settings-context'

interface CustomerDetailModalProps {
  customerId: string
  onClose: () => void
  onUpdate: () => void
}

const typeColor: Record<string, string> = {
  INDIVIDUAL: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  BUSINESS:   'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  EMPLOYEE:   'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  USER:       'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  GOVERNMENT: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  NGO:        'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
}

export function CustomerDetailModal({ customerId, onClose, onUpdate }: CustomerDetailModalProps) {
  const [customer, setCustomer] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const photoCameraRef = useRef<HTMLInputElement>(null)
  const { format: globalDateFormat } = useDateFormat()

  useEffect(() => {
    setIsMobile(/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1)
  }, [])

  useEffect(() => { fetchCustomer() }, [customerId])

  const fetchCustomer = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/customers/${customerId}`)
      if (response.ok) {
        const data = await response.json()
        setCustomer(data.customer)
      }
    } catch (error) {
      console.error('Error fetching customer:', error)
    } finally {
      setLoading(false)
    }
  }

  const fmt = (d: string) => formatDateByFormat(d, globalDateFormat)

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingPhoto(true)
    setPhotoError(null)
    try {
      const formData = new FormData()
      formData.append('files', file)
      const uploadRes = await fetch('/api/universal/images', { method: 'POST', body: formData })
      const uploadData = await uploadRes.json()
      if (!uploadRes.ok || !uploadData.data?.[0]?.url) throw new Error('Image upload failed')
      const photoUrl = uploadData.data[0].url
      const saveRes = await fetch(`/api/customers/${customerId}/photo`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoUrl }),
      })
      if (!saveRes.ok) throw new Error('Failed to save photo')
      setCustomer((prev: any) => ({ ...prev, photoUrl }))
      onUpdate()
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploadingPhoto(false)
      if (photoInputRef.current) photoInputRef.current.value = ''
    }
  }

  const handleRemovePhoto = async () => {
    setUploadingPhoto(true)
    setPhotoError(null)
    try {
      const res = await fetch(`/api/customers/${customerId}/photo`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to remove photo')
      setCustomer((prev: any) => ({ ...prev, photoUrl: null }))
      onUpdate()
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'Remove failed')
    } finally {
      setUploadingPhoto(false)
    }
  }

  const printCard = async () => {
    const fmtPhone = (p: string | null | undefined) => {
      if (!p) return ''
      const clean = p.replace(/\s+/g, '')
      if (clean.startsWith('+263') && clean.length === 13) return `+263 ${clean.slice(4, 6)} ${clean.slice(6, 9)} ${clean.slice(9)}`
      if (clean.startsWith('0') && clean.length === 10) return `${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6)}`
      if (clean.length === 9 && /^[67]/.test(clean)) return `0${clean.slice(0, 2)} ${clean.slice(2, 5)} ${clean.slice(5)}`
      return p
    }

    let umbrellaBusinessName: string | null = null
    try {
      const res = await fetch('/api/admin/umbrella-business')
      if (res.ok) { const d = await res.json(); umbrellaBusinessName = d?.umbrellaBusinessName ?? null }
    } catch { /* ignore */ }

    const JsBarcode = (await import('jsbarcode')).default
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    document.body.appendChild(svg)
    try { JsBarcode(svg, customer.customerNumber, { format: 'CODE128', width: 1.2, height: 30, displayValue: false, margin: 8 }) } catch { /* ignore */ }
    const barcodeSvg = svg.outerHTML
    document.body.removeChild(svg)

    const businessName = customer.businesses?.name || ''
    const businessPhone = customer.businesses?.phone || ''

    const cardHtml = `
      <div style="display:inline-block;background:#fff;border:2px solid #1f2937;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.12);width:314px;font-family:sans-serif;vertical-align:top;">
        <div style="background:#fff;padding:5px 12px;border-bottom:1px solid #d1d5db;display:flex;align-items:center;justify-content:space-between;">
          <span style="font-weight:700;font-size:11px;letter-spacing:.08em;color:#111;">LOYALTY CARD</span>
          ${businessPhone ? `<span style="font-size:11px;font-weight:600;color:#111;">${fmtPhone(businessPhone)}</span>` : ''}
        </div>
        <div style="padding:8px 12px;display:flex;gap:10px;align-items:center;">
          <div style="flex-shrink:0;width:48px;height:48px;border-radius:8px;background:#f3f4f6;border:1px solid #d1d5db;display:flex;align-items:center;justify-content:center;font-size:22px;">🛍️</div>
          <div style="flex:1;min-width:0;">
            <div style="font-weight:700;font-size:13px;color:#111;word-break:break-word;">${customer.name}</div>
            <div style="display:flex;align-items:center;justify-content:space-between;gap:4px;margin-top:2px;">
              <span style="font-size:11px;font-family:monospace;font-weight:600;color:#111;">${customer.customerNumber}</span>
              ${customer.phone ? `<span style="font-size:11px;font-family:monospace;font-weight:600;color:#111;white-space:nowrap;">${fmtPhone(customer.phone)}</span>` : ''}
            </div>
            ${(businessName || umbrellaBusinessName) ? `
            <div style="display:flex;align-items:center;justify-content:space-between;gap:4px;margin-top:2px;">
              ${businessName ? `<span style="font-size:11px;font-weight:600;color:#1f2937;">${businessName}</span>` : '<span></span>'}
              ${umbrellaBusinessName ? `<span style="font-size:12px;font-weight:700;color:#111;">${umbrellaBusinessName}</span>` : ''}
            </div>` : ''}
          </div>
        </div>
        <div style="padding:0 12px 8px;display:flex;flex-direction:column;align-items:center;">
          ${barcodeSvg}
        </div>
      </div>`

    const printWindow = window.open('', '_blank', 'width=960,height=600')
    if (!printWindow) return
    printWindow.document.write(`<!DOCTYPE html><html><head><title>Loyalty Card — ${customer.name}</title>
      <style>
        html,body{margin:0;padding:0;}body{padding:16px;}
        .print-toolbar{position:sticky;top:0;background:#f8fafc;border-bottom:1px solid #e2e8f0;padding:10px 16px;display:flex;align-items:center;gap:12px;z-index:100;}
        .print-btn{background:#1f2937;color:#fff;border:none;border-radius:6px;padding:8px 20px;font-size:14px;font-weight:600;cursor:pointer;}
        .card-row{display:flex;align-items:flex-start;justify-content:center;margin-bottom:24px;}
        .fold{width:0;align-self:stretch;border-left:2px dashed #aaa;}
        @media print{.print-toolbar{display:none;}.fold{border-left-color:#ccc;}body{padding:0;}}
      </style>
      </head><body>
      <div class="print-toolbar">
        <button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
        <span style="font-size:13px;color:#64748b;font-family:sans-serif;">Loyalty Card — ${customer.name}</span>
      </div>
      <div class="card-row">${cardHtml}<div class="fold"></div>${cardHtml}</div>
      </body></html>`)
    printWindow.document.close()
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        </div>
      </div>
    )
  }

  if (!customer) return null

  // API returns BusinessCustomers fields directly
  const attrs = (customer.attributes as any) || {}
  const orderCount = customer._count?.business_orders ?? customer.business_orders?.length ?? 0
  const orders = customer.business_orders ?? []

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6">
          <div className="flex justify-between items-start">
            <div className="flex items-start gap-4">
              {/* Photo avatar with upload */}
              <div className="flex-shrink-0">
                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-2">
                  {customer.photoUrl
                    ? <img src={customer.photoUrl} alt={customer.name} className="w-full h-full object-cover" />
                    : <User className="h-8 w-8 text-gray-400" />}
                </div>
                <div className="flex gap-1 justify-center">
                  <button
                    onClick={() => photoCameraRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-teal-600 hover:bg-teal-700 text-white rounded transition-colors disabled:opacity-50"
                    title="Take photo with camera"
                  >
                    {uploadingPhoto ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
                  </button>
                  <button
                    onClick={() => photoInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="flex items-center gap-1 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 rounded transition-colors disabled:opacity-50"
                    title="Upload from gallery"
                  >
                    🖼
                  </button>
                </div>
                <input ref={photoCameraRef} type="file" accept="image/*" {...(isMobile ? { capture: 'environment' } : {})} className="hidden" onChange={handlePhotoUpload} />
                <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </div>
              <div>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-xl font-semibold text-primary">{customer.name}</h2>
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${typeColor[customer.customerType] ?? 'bg-gray-100 text-gray-700'}`}>
                  {customer.customerType}
                </span>
                {!customer.isActive && (
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">Inactive</span>
                )}
              </div>
              <p className="text-sm text-secondary font-mono">{customer.customerNumber}</p>
              {customer.businesses?.name && (
                <p className="text-sm text-secondary mt-0.5">{customer.businesses.name}</p>
              )}
              {photoError && <p className="text-xs text-red-500 mt-1">{photoError}</p>}
              {customer.photoUrl && (
                <button
                  onClick={handleRemovePhoto}
                  disabled={uploadingPhoto}
                  className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 mt-1 disabled:opacity-50"
                >
                  <Trash2 className="h-3 w-3" /> Remove photo
                </button>
              )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={printCard}
                title="Print loyalty card"
                className="text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300 transition-colors"
              >
                <Printer className="h-5 w-5" />
              </button>
              <button onClick={onClose} className="text-secondary hover:text-primary transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 px-6">
          <div className="flex gap-6">
            {['overview', 'orders'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-3 text-sm font-medium border-b-2 capitalize transition-colors ${activeTab === tab ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-secondary hover:text-primary'}`}
              >
                {tab === 'orders' ? `Orders (${orderCount})` : 'Overview'}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* Contact */}
              <div className="card p-4">
                <h3 className="font-semibold text-primary mb-3">Contact Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {customer.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-secondary flex-shrink-0" />
                      <span className="text-primary truncate">{customer.email}</span>
                    </div>
                  )}
                  {customer.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-secondary flex-shrink-0" />
                      <span className="text-primary">{customer.phone}</span>
                    </div>
                  )}
                  {attrs.alternatePhone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-secondary flex-shrink-0" />
                      <span className="text-primary">{attrs.alternatePhone} (alt)</span>
                    </div>
                  )}
                  {(customer.address || customer.city) && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-secondary flex-shrink-0" />
                      <span className="text-primary">{[customer.address, customer.city].filter(Boolean).join(', ')}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Personal details */}
              {(customer.dateOfBirth || attrs.gender || attrs.nationalId || attrs.taxNumber) && (
                <div className="card p-4">
                  <h3 className="font-semibold text-primary mb-3">Personal Details</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {customer.dateOfBirth && (
                      <div>
                        <p className="text-secondary">Date of Birth</p>
                        <p className="text-primary">{fmt(customer.dateOfBirth)}</p>
                      </div>
                    )}
                    {attrs.gender && (
                      <div>
                        <p className="text-secondary">Gender</p>
                        <p className="text-primary capitalize">{attrs.gender}</p>
                      </div>
                    )}
                    {attrs.nationalId && (
                      <div>
                        <p className="text-secondary">National ID</p>
                        <p className="text-primary">{attrs.nationalId}</p>
                      </div>
                    )}
                    {attrs.taxNumber && (
                      <div>
                        <p className="text-secondary">Tax Number</p>
                        <p className="text-primary">{attrs.taxNumber}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Business */}
              {customer.businesses && (
                <div className="card p-4">
                  <h3 className="font-semibold text-primary mb-3">Business</h3>
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-secondary" />
                    <span className="text-primary">{customer.businesses.name}</span>
                    <span className="text-xs text-secondary capitalize">({customer.businesses.type})</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="space-y-3">
              {orders.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingBag className="h-10 w-10 text-secondary mx-auto mb-3" />
                  <p className="text-secondary">No orders yet</p>
                </div>
              ) : (
                orders.map((order: any) => (
                  <div key={order.id} className="card p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-primary font-mono text-sm">{order.orderNumber}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="h-3 w-3 text-secondary" />
                        <span className="text-xs text-secondary">{fmt(order.createdAt)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-primary">${Number(order.totalAmount).toFixed(2)}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                        order.status === 'COMPLETED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        order.status === 'CANCELLED' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                        'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                      }`}>
                        {order.status.toLowerCase()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
