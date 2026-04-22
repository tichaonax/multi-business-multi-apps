'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { BusinessTypeRoute } from '@/components/auth/business-type-route'
import { ContentLayout } from '@/components/layout/content-layout'
import { useToastContext } from '@/components/ui/toast'
import { formatPhoneNumberForDisplay } from '@/lib/country-codes'

type MenuItem = {
  id: string
  name: string
  basePrice: number
  category?: { name: string } | null
  isActive?: boolean
}

export default function DeliveryMarketingPage() {
  const { currentBusinessId, currentBusiness, hasPermission, isSystemAdmin } = useBusinessPermissionsContext()
  const toast = useToastContext()
  const router = useRouter()
  const printRef = useRef<HTMLDivElement>(null)

  const canPrint = isSystemAdmin || hasPermission('canPrintDeliveryMarketing')

  useEffect(() => {
    if (!canPrint) router.replace('/restaurant/delivery')
  }, [canPrint, router])

  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [loadingMenu, setLoadingMenu] = useState(false)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [activeTemplate, setActiveTemplate] = useState<'flyer' | 'card'>('flyer')
  const [search, setSearch] = useState('')
  const [showPrintModal, setShowPrintModal] = useState(false)
  const [showSelectedOnly, setShowSelectedOnly] = useState(false)

  const businessName = currentBusiness?.businessName || 'Our Restaurant'
  const businessPhone = currentBusiness?.phone ? formatPhoneNumberForDisplay(currentBusiness.phone) : ''
  const businessAddress = currentBusiness?.address || ''

  const loadMenu = useCallback(async () => {
    if (!currentBusinessId) return
    setLoadingMenu(true)
    try {
      const res = await fetch(`/api/universal/products?businessId=${currentBusinessId}&limit=100`)
      const data = await res.json()
      if (data.success && data.data) {
        const items: MenuItem[] = data.data.filter((p: any) => p.isActive !== false)
        setMenuItems(items)
        const featured = items
          .filter((i: MenuItem) => !i.category?.name?.toUpperCase().includes('WIFI'))
          .slice(0, 6)
          .map((i: MenuItem) => i.id)
        setSelectedItems(new Set(featured))
      }
    } catch {
      toast.error('Failed to load menu items')
    } finally {
      setLoadingMenu(false)
    }
  }, [currentBusinessId, toast])

  useEffect(() => {
    if (currentBusinessId) loadMenu()
  }, [loadMenu, currentBusinessId])

  const toggleItem = (id: string) => {
    setSelectedItems(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const featuredItems = menuItems.filter(i => selectedItems.has(i.id))

  const handlePrint = () => {
    if (!printRef.current) return
    const content = printRef.current.innerHTML
    const win = window.open('', '_blank', 'width=900,height=700')
    if (!win) { toast.error('Pop-up blocked — allow pop-ups and try again'); return }
    const isFlyer = activeTemplate === 'flyer'
    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>${businessName} — ${isFlyer ? 'Delivery Flyer' : 'Business Cards'}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #fff; font-family: Georgia, serif; }
    @media print {
      @page { size: ${isFlyer ? 'A5' : 'A4'}; margin: 0; }
      body { margin: 0; }
    }
  </style>
</head>
<body>${content}</body>
</html>`)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print() }, 400)
  }

  return (
    <BusinessTypeRoute requiredBusinessType="restaurant">
      <ContentLayout title="Delivery Marketing Materials">
        <>
          <div className="space-y-6">
            {/* Template selector */}
            <div className="flex gap-3">
              <button
                onClick={() => setActiveTemplate('flyer')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTemplate === 'flyer' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
              >
                A5 Flyer
              </button>
              <button
                onClick={() => setActiveTemplate('card')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTemplate === 'card' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
              >
                Business Cards (4-up)
              </button>
            </div>

            {/* Flyer — item selector */}
            {activeTemplate === 'flyer' && (
              <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Select featured items (shown on flyer)
                    {selectedItems.size > 0 && <span className="ml-2 text-xs font-normal text-gray-400">({selectedItems.size} selected)</span>}
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setShowSelectedOnly(v => !v); setSearch('') }}
                      className={`px-3 py-1 text-xs rounded-md border transition-colors ${showSelectedOnly ? 'bg-primary text-white border-primary' : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                    >
                      {showSelectedOnly ? 'Show all' : 'Show selected'}
                    </button>
                    <button
                      onClick={() => { setSelectedItems(new Set()); setShowSelectedOnly(false) }}
                      className="px-3 py-1 text-xs rounded-md border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-300 hover:text-red-600 transition-colors"
                    >
                      Deselect all
                    </button>
                  </div>
                </div>
                {loadingMenu ? (
                  <p className="text-sm text-gray-400">Loading menu...</p>
                ) : (
                  <>
                    <input
                      type="text"
                      placeholder="Search items..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="w-full mb-2 px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-56 overflow-y-auto">
                      {menuItems
                        .filter(i => !i.category?.name?.toUpperCase().includes('WIFI'))
                        .filter(i => !showSelectedOnly || selectedItems.has(i.id))
                        .filter(i => !search || i.name.toLowerCase().includes(search.toLowerCase()))
                        .map(item => (
                          <label key={item.id} className="flex items-center gap-2 cursor-pointer text-sm p-1 rounded hover:bg-gray-50 dark:hover:bg-gray-800">
                            <input
                              type="checkbox"
                              checked={selectedItems.has(item.id)}
                              onChange={() => toggleItem(item.id)}
                              className="rounded"
                            />
                            <span className="text-gray-700 dark:text-gray-300 truncate">{item.name}</span>
                            <span className="text-gray-400 text-xs ml-auto">${Number(item.basePrice).toFixed(2)}</span>
                          </label>
                        ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Print button */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowPrintModal(true)}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg hover:opacity-90 text-sm font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print / Save PDF
              </button>
            </div>

            {/* Preview label */}
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Preview</p>

            {/* Preview */}
            <div ref={printRef}>
              {activeTemplate === 'flyer' ? (
                <FlyerTemplate
                  businessName={businessName}
                  phone={businessPhone}
                  address={businessAddress}
                  featuredItems={featuredItems}
                />
              ) : (
                <BusinessCardsTemplate
                  businessName={businessName}
                  phone={businessPhone}
                />
              )}
            </div>
          </div>

          {/* Print modal */}
          {showPrintModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/60" onClick={() => setShowPrintModal(false)} />
              <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-sm p-6">
                <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Print / Save as PDF
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
                  Opens the browser print dialog. Choose your printer or select <strong>Save as PDF</strong> to save a file.
                  Use {activeTemplate === 'flyer' ? 'A5' : 'A4'} paper and disable headers/footers in print settings.
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowPrintModal(false)}
                    className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => { setShowPrintModal(false); handlePrint() }}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:opacity-90"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    Open Print Dialog
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      </ContentLayout>
    </BusinessTypeRoute>
  )
}

// ─── A5 Flyer (toner-friendly: outline style, no solid fills) ─────────────────

function FlyerTemplate({
  businessName,
  phone,
  address,
  featuredItems,
}: {
  businessName: string
  phone: string
  address: string
  featuredItems: MenuItem[]
}) {
  return (
    <div
      className="bg-white text-gray-900 mx-auto"
      style={{
        width: '148mm',
        minHeight: '210mm',
        padding: '12mm',
        fontFamily: 'Georgia, serif',
        boxSizing: 'border-box',
        border: '1px solid #ccc',
      }}
    >
      {/* Header — outline style, no fill */}
      <div
        style={{
          border: '2px solid #111',
          padding: '8mm',
          marginBottom: '6mm',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '24pt', fontWeight: 'bold', letterSpacing: '0.05em', color: '#111', marginBottom: '2mm' }}>
          {businessName}
        </div>
        <div style={{ fontSize: '12pt', letterSpacing: '0.15em', color: '#333', fontStyle: 'italic' }}>
          ✦ NOW DELIVERING ✦
        </div>
      </div>

      {/* Delivery hours */}
      <div
        style={{
          border: '1px solid #999',
          padding: '4mm 6mm',
          marginBottom: '6mm',
          display: 'flex',
          alignItems: 'center',
          gap: '4mm',
        }}
      >
        <div style={{ fontSize: '20pt' }}>🕛</div>
        <div>
          <div style={{ fontSize: '12pt', fontWeight: 'bold', color: '#111' }}>Delivery Hours</div>
          <div style={{ fontSize: '11pt', color: '#444' }}>Monday – Friday &nbsp;|&nbsp; 12:00 PM – 2:00 PM</div>
        </div>
      </div>

      {/* Featured meals */}
      {featuredItems.length > 0 && (
        <div style={{ marginBottom: '6mm' }}>
          <div style={{ fontSize: '10pt', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#111', borderBottom: '1.5px solid #111', paddingBottom: '1.5mm', marginBottom: '3mm' }}>
            Featured Meals
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2.5mm 6mm' }}>
            {featuredItems.map(item => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '1px dotted #ddd', paddingBottom: '1.5mm' }}>
                <span style={{ fontSize: '10.5pt', color: '#222' }}>{item.name}</span>
                <span style={{ fontSize: '10.5pt', fontWeight: 'bold', color: '#111', marginLeft: '3mm' }}>
                  ${Number(item.basePrice).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* How to order */}
      <div
        style={{
          border: '1px solid #ccc',
          padding: '4mm 6mm',
          marginBottom: '6mm',
        }}
      >
        <div style={{ fontSize: '11pt', fontWeight: 'bold', color: '#111', marginBottom: '2mm' }}>How to Order</div>
        <div style={{ fontSize: '10pt', lineHeight: '1.7', color: '#333' }}>
          1. Call us before 12:00 PM<br />
          2. Place your order over the phone<br />
          3. We deliver to your door between 12 – 2 PM
        </div>
      </div>

      {/* Contact */}
      <div style={{ textAlign: 'center', paddingTop: '4mm', borderTop: '1.5px solid #111' }}>
        {phone && (
          <div style={{ fontSize: '16pt', fontWeight: 'bold', letterSpacing: '0.05em', color: '#111', marginBottom: '2mm' }}>
            📞 {phone}
          </div>
        )}
        {address && (
          <div style={{ fontSize: '9.5pt', color: '#555' }}>{address}</div>
        )}
        <div style={{ fontSize: '9pt', color: '#888', marginTop: '2mm', fontStyle: 'italic' }}>
          Delivery within our usual service area. Call for details.
        </div>
      </div>
    </div>
  )
}

// ─── Business Cards (4-up on A4, toner-friendly outline style) ────────────────

function BusinessCardsTemplate({
  businessName,
  phone,
}: {
  businessName: string
  phone: string
}) {
  const card = (
    <div
      style={{
        width: '88mm',
        height: '53mm',
        background: '#fff',
        color: '#111',
        border: '1.5px solid #111',
        padding: '5mm 7mm',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <div>
        <div style={{ fontSize: '13pt', fontWeight: 'bold', letterSpacing: '0.04em', color: '#111', marginBottom: '1.5mm' }}>
          {businessName}
        </div>
        <div style={{ fontSize: '8.5pt', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#555' }}>
          Phone-in Delivery Service
        </div>
      </div>

      <div style={{ textAlign: 'center', lineHeight: '1.4', borderTop: '1px solid #ddd', borderBottom: '1px solid #ddd', padding: '2mm 0' }}>
        <div style={{ fontSize: '8pt', color: '#666', marginBottom: '1mm' }}>Order by phone &amp; get it delivered</div>
        <div style={{ fontSize: '9pt', color: '#111', fontWeight: 'bold' }}>12:00 PM – 2:00 PM daily</div>
      </div>

      <div>
        {phone && (
          <div style={{ fontSize: '13pt', fontWeight: 'bold', letterSpacing: '0.06em', color: '#111' }}>
            📞 {phone}
          </div>
        )}
        <div style={{ fontSize: '7.5pt', color: '#888', marginTop: '1mm' }}>
          Call before noon to place your order
        </div>
      </div>
    </div>
  )

  return (
    <div
      style={{
        width: '210mm',
        minHeight: '297mm',
        background: '#fff',
        padding: '10mm',
        boxSizing: 'border-box',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <div style={{ marginBottom: '4mm', fontSize: '9pt', color: '#aaa', textAlign: 'center' }}>
        Cut along the dotted lines · 4 cards per sheet
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '5mm',
          width: 'fit-content',
          margin: '0 auto',
          border: '1px dashed #ccc',
          padding: '3mm',
        }}
      >
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{ border: '1px dashed #ccc' }}>
            {card}
          </div>
        ))}
      </div>
    </div>
  )
}
