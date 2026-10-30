'use client'

/**
 * MBM-329 — Free menu samples with customer-specific return offers.
 * Modals used by the restaurant POS: give a sample, verify + redeem a sample
 * receipt, and pick a customer-accepted substitute.
 */
import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { CustomerLookup } from '@/components/pos/customer-lookup'
import { CustomerQuickRegister } from '@/components/pos/customer-quick-register'

export interface SampleProductOption {
  id: string
  name: string
  price: number
  category?: string
  isAvailable?: boolean
}

export interface PendingSample {
  customerId: string
  productId: string
  productName: string
  promoItems: Array<{ productId: string; name: string; quantity: number }>
  validityDays: number
}

export interface ValidatedSampleOffer {
  id: string
  offerCode: string
  issuedAt: string
  expiresAt: string
  customer: { id: string; name: string; customerNumber: string; phone: string | null; email?: string | null; customerType: string }
  promoted: { productId: string; name: string; price: number; available: boolean }
  promoItems: Array<{ promoItemId: string; productId: string; name: string; price: number; available: boolean; quantity: number }>
}

const inputCls = 'w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:ring-2 focus:ring-teal-500 focus:border-teal-500'

function fmtDate(d: string | Date) {
  return new Date(d).toLocaleString(undefined, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function ModalShell({ title, onClose, children, footer }: { title: string; onClose: () => void; children: React.ReactNode; footer: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[90vh] flex flex-col rounded-lg bg-white dark:bg-gray-800 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-4 py-3">
          <h2 className="text-lg font-semibold text-primary">{title}</h2>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">{children}</div>
        <div className="flex justify-end gap-2 border-t border-gray-200 dark:border-gray-700 px-4 py-3">{footer}</div>
      </div>
    </div>
  )
}

function ProductSearchList({ products, onPick, disabledIds, disabledLabel, showPrice, selectedId }: {
  products: SampleProductOption[]
  onPick: (p: SampleProductOption) => void
  disabledIds?: Map<string, string>
  disabledLabel?: (id: string) => string
  showPrice?: 'price' | 'free'
  selectedId?: string | null
}) {
  const [q, setQ] = useState('')
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    return products.filter(p => !term || p.name.toLowerCase().includes(term)).slice(0, 80)
  }, [products, q])
  return (
    <div className="space-y-2">
      <input className={inputCls} placeholder="Search menu items…" value={q} onChange={e => setQ(e.target.value)} />
      <div className="max-h-56 overflow-y-auto rounded-md border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
        {filtered.length === 0 && <div className="p-3 text-sm text-secondary">No matching items.</div>}
        {filtered.map(p => {
          const disabled = disabledIds?.has(p.id)
          return (
            <button
              key={p.id}
              type="button"
              disabled={disabled}
              onClick={() => onPick(p)}
              className={`w-full flex items-center justify-between px-3 py-2 text-left text-sm ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-teal-50 dark:hover:bg-teal-900/20'} ${selectedId === p.id ? 'bg-teal-100 dark:bg-teal-900/40' : ''}`}
            >
              <span className="text-primary">
                {p.name}
                {disabled && disabledLabel && <span className="ml-2 text-xs text-secondary">{disabledLabel(p.id)}</span>}
                {p.isAvailable === false && <span className="ml-2 text-xs text-red-600">unavailable</span>}
              </span>
              {showPrice === 'price' && <span className="text-secondary">${Number(p.price).toFixed(2)}</span>}
              {showPrice === 'free' && <span className="text-green-600 font-medium">FREE</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export function GiveSampleModal({ businessId, customer, products, onConfirm, onClose, onCustomerSelected, businessName, businessPhone }: {
  businessId: string
  customer: { id: string; name: string; phone?: string } | null
  products: SampleProductOption[]
  onConfirm: (sample: PendingSample) => void
  onClose: () => void
  /** Selects the customer on the POS (existing search or quick-register) */
  onCustomerSelected: (customer: any) => void
  businessName?: string
  businessPhone?: string
}) {
  const [registering, setRegistering] = useState(false)
  const [changingCustomer, setChangingCustomer] = useState(!customer)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [already, setAlready] = useState<Map<string, string>>(new Map())
  const [validityDays, setValidityDays] = useState(7)
  const [sample, setSample] = useState<SampleProductOption | null>(null)
  const [includePromo, setIncludePromo] = useState(false)
  const [promo, setPromo] = useState<Array<{ productId: string; name: string; quantity: number }>>([])

  useEffect(() => {
    if (!customer) return
    let cancelled = false
    setLoading(true); setError(null); setSample(null)
    fetch(`/api/restaurant/sample-offers/eligibility?businessId=${businessId}&customerId=${customer.id}`)
      .then(r => r.json())
      .then(d => {
        if (cancelled) return
        if (!d.success) { setError(d.error || 'Could not load sample history'); return }
        if (!d.hasPhone) setError('This customer has no phone number. Add their phone number before giving a sample.')
        setValidityDays(d.validityDays || 7)
        setAlready(new Map(d.alreadySampled.map((a: any) => [a.productId, new Date(a.issuedAt).toLocaleDateString()])))
      })
      .catch(() => !cancelled && setError('Could not load sample history'))
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [businessId, customer?.id])

  const expiry = new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000)
  const pickingCustomer = !customer || changingCustomer
  const canConfirm = !pickingCustomer && !loading && !error && !!sample && (!includePromo || promo.length > 0)
  const selectCustomer = (c: any) => {
    if (!c) return
    onCustomerSelected(c)
    setRegistering(false)
    setChangingCustomer(false)
  }

  return (
    <ModalShell
      title="🎁 Give Free Sample"
      onClose={onClose}
      footer={<>
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 text-primary">Cancel</button>
        <button
          type="button"
          disabled={!canConfirm}
          onClick={() => sample && customer && onConfirm({ customerId: customer.id, productId: sample.id, productName: sample.name, promoItems: includePromo ? promo : [], validityDays })}
          className="px-4 py-2 text-sm rounded-md bg-teal-600 text-white disabled:opacity-50"
        >Add sample</button>
      </>}
    >
      {pickingCustomer ? (
        <div className="space-y-2">
          <div className="text-sm font-medium text-primary">Who is the sample for?</div>
          <p className="text-xs text-secondary">Search for an existing customer by name or phone, or register a new customer with their phone number.</p>
          {registering ? (
            <CustomerQuickRegister
              businessId={businessId}
              businessName={businessName}
              businessPhone={businessPhone}
              onCreated={selectCustomer}
              onCancel={() => setRegistering(false)}
            />
          ) : (
            <CustomerLookup
              businessId={businessId}
              selectedCustomer={null}
              onSelectCustomer={selectCustomer}
              onCreateCustomer={() => setRegistering(true)}
              allowWalkIn={false}
              businessName={businessName}
              businessPhone={businessPhone}
            />
          )}
          {customer && (
            <button type="button" onClick={() => setChangingCustomer(false)} className="text-xs text-teal-700 dark:text-teal-300 underline">
              Keep {customer.name}
            </button>
          )}
        </div>
      ) : customer && (
        <div className="flex items-center justify-between text-sm text-secondary">
          <span>Customer: <span className="font-medium text-primary">{customer.name}</span>{customer.phone ? ` · ${customer.phone}` : ''}</span>
          <button type="button" onClick={() => setChangingCustomer(true)} className="text-xs text-teal-700 dark:text-teal-300 underline">Change customer</button>
        </div>
      )}
      {!pickingCustomer && loading && <div className="text-sm text-secondary">Loading…</div>}
      {!pickingCustomer && error && <div className="rounded-md border border-red-300 bg-red-50 dark:bg-red-900/20 p-2 text-sm text-red-700 dark:text-red-300">{error}</div>}
      {!pickingCustomer && !loading && !error && (
        <>
          <div>
            <div className="mb-1 text-sm font-medium text-primary">Sample item {sample && <span className="text-teal-700 dark:text-teal-300">— {sample.name}</span>}</div>
            <ProductSearchList
              products={products}
              selectedId={sample?.id}
              onPick={setSample}
              disabledIds={already}
              disabledLabel={id => `already sampled ${already.get(id)}`}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-primary">
            <input type="checkbox" checked={includePromo} onChange={e => setIncludePromo(e.target.checked)} />
            Include free items with their next purchase
          </label>
          {includePromo && (
            <div className="space-y-2 rounded-md border border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-900/10 p-2">
              {promo.map((p, idx) => (
                <div key={p.productId} className="flex items-center gap-2 text-sm">
                  <span className="flex-1 text-primary">FREE {p.name}</span>
                  <input
                    type="number" min={1} value={p.quantity}
                    onChange={e => setPromo(prev => prev.map((x, i) => i === idx ? { ...x, quantity: Math.max(1, parseInt(e.target.value) || 1) } : x))}
                    className="w-16 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-primary"
                  />
                  <button type="button" onClick={() => setPromo(prev => prev.filter((_, i) => i !== idx))} className="text-red-600 text-xs">Remove</button>
                </div>
              ))}
              <ProductSearchList
                products={products.filter(p => !promo.some(x => x.productId === p.id))}
                onPick={p => setPromo(prev => [...prev, { productId: p.id, name: p.name, quantity: 1 }])}
                showPrice="free"
              />
            </div>
          )}
          <div className="text-xs text-secondary">
            The sample is free with today&apos;s purchase. A sample receipt prints after payment. Offer valid {validityDays} day{validityDays === 1 ? '' : 's'} (until {fmtDate(expiry)}).
          </div>
        </>
      )}
    </ModalShell>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export function RedeemSampleModal({ businessId, initialCode, onValidated, onClose }: {
  businessId: string
  initialCode?: string
  onValidated: (offer: ValidatedSampleOffer, phone: string) => void
  onClose: () => void
}) {
  const [code, setCode] = useState(initialCode || '')
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    setBusy(true); setError(null)
    try {
      const res = await fetch('/api/restaurant/sample-offers/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, offerCode: code.trim().toUpperCase(), phone }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) { setError(data.error || 'This sample offer cannot be redeemed.'); return }
      onValidated(data.offer, phone)
    } catch {
      setError('Could not check the sample offer. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <ModalShell
      title="Redeem sample receipt"
      onClose={onClose}
      footer={<>
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 text-primary">Cancel</button>
        <button type="button" disabled={busy || !code.trim() || !phone.trim()} onClick={submit} className="px-4 py-2 text-sm rounded-md bg-teal-600 text-white disabled:opacity-50">
          {busy ? 'Checking…' : 'Verify & add items'}
        </button>
      </>}
    >
      <div>
        <label className="mb-1 block text-sm font-medium text-primary">Sample receipt code</label>
        <input className={inputCls} placeholder="SMP-XXXXXXXX" value={code} onChange={e => setCode(e.target.value)} autoFocus={!initialCode} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-primary">Customer&apos;s registered phone number</label>
        <input className={inputCls} placeholder="Ask the customer for their phone number" value={phone} onChange={e => setPhone(e.target.value)} autoFocus={!!initialCode}
          onKeyDown={e => { if (e.key === 'Enter' && code.trim() && phone.trim()) submit() }} />
        <p className="mt-1 text-xs text-secondary">The receipt alone is not enough. The phone number must match the customer the offer was issued to.</p>
      </div>
      {error && <div className="rounded-md border border-red-300 bg-red-50 dark:bg-red-900/20 p-2 text-sm text-red-700 dark:text-red-300">{error}</div>}
    </ModalShell>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export function SampleSubstituteModal({ lineRole, originalName, products, onApply, onClose }: {
  lineRole: 'PAID' | 'FREE'
  originalName: string
  products: SampleProductOption[]
  onApply: (p: SampleProductOption) => void
  onClose: () => void
}) {
  const [picked, setPicked] = useState<SampleProductOption | null>(null)
  const [accepted, setAccepted] = useState(false)
  return (
    <ModalShell
      title={`Substitute ${originalName}`}
      onClose={onClose}
      footer={<>
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 text-primary">Back</button>
        <button type="button" disabled={!picked || !accepted} onClick={() => picked && onApply(picked)} className="px-4 py-2 text-sm rounded-md bg-teal-600 text-white disabled:opacity-50">Apply substitution</button>
      </>}
    >
      <p className="text-sm text-secondary">
        {lineRole === 'PAID'
          ? 'The substitute is a paid item, charged at its normal price.'
          : 'The substitute replaces a promised free item and stays free.'}
      </p>
      <ProductSearchList products={products} selectedId={picked?.id} onPick={setPicked} showPrice={lineRole === 'PAID' ? 'price' : 'free'} />
      {picked && (
        <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-900/10 p-2 text-sm text-primary">
          {originalName} → <span className="font-medium">{picked.name}</span>{' '}
          {lineRole === 'PAID' ? `($${Number(picked.price).toFixed(2)})` : '(FREE)'}
        </div>
      )}
      <label className="flex items-center gap-2 text-sm text-primary">
        <input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} />
        The customer accepted this substitution
      </label>
      <p className="text-xs text-secondary">If the customer doesn&apos;t accept, go back and cancel the redemption. The offer stays valid until it expires.</p>
    </ModalShell>
  )
}
