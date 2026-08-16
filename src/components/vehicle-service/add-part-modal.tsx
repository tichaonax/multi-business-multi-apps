'use client'

import { useState, useEffect } from 'react'
import { SearchableSelect } from '@/components/ui/searchable-select'

interface CompatRow {
  vehicleMake: string
  vehicleModel: string
  yearFrom: string
  yearTo: string
  engineSpec: string
  transmissionType: string
}

const EMPTY_COMPAT: CompatRow = { vehicleMake: '', vehicleModel: '', yearFrom: '', yearTo: '', engineSpec: '', transmissionType: '' }

interface CategoryOption { id: string; name: string; emoji: string | null; inventory_subcategories: Array<{ id: string; name: string; emoji: string | null }> }
interface DomainOption { id: string; name: string; emoji: string; business_categories: CategoryOption[] }

export function AddPartModal({ businessId, onClose, onCreated }: {
  businessId: string
  onClose: () => void
  onCreated: (partId: string) => void
}) {
  const [domains, setDomains] = useState<DomainOption[]>([])
  const [brands, setBrands] = useState<Array<{ id: string; name: string }>>([])
  const [suppliers, setSuppliers] = useState<Array<{ id: string; name: string }>>([])
  const [locations, setLocations] = useState<Array<{ id: string; name: string; locationCode: string }>>([])

  const [form, setForm] = useState({
    name: '', sku: '', barcode: '', categoryId: '', subcategoryId: '',
    basePrice: '', costPrice: '', brandId: '', supplierId: '', locationId: '',
    condition: 'NEW', partType: '', reorderLevel: '', initialQuantity: '', description: '',
  })
  const [compatibility, setCompatibility] = useState<CompatRow[]>([{ ...EMPTY_COMPAT }])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [duplicates, setDuplicates] = useState<any[] | null>(null)
  const [canOverride, setCanOverride] = useState(false)

  useEffect(() => {
    fetch('/api/vehicle-service/parts/categories').then(r => r.ok ? r.json() : { domains: [] }).then(d => setDomains(d.domains || [])).catch(() => {})
    fetch(`/api/universal/brands?businessId=${businessId}`).then(r => r.ok ? r.json() : { data: [] }).then(d => setBrands(d.data || [])).catch(() => {})
    fetch(`/api/suppliers?businessId=${businessId}&businessType=vehicle_service`).then(r => r.ok ? r.json() : { suppliers: [] }).then(d => setSuppliers(d.suppliers || [])).catch(() => {})
    fetch(`/api/business/${businessId}/locations`).then(r => r.ok ? r.json() : { locations: [] }).then(d => setLocations(d.locations || [])).catch(() => {})
  }, [businessId])

  const categoryOptions = domains.flatMap(d => d.business_categories.map(c => ({ value: c.id, name: `${d.emoji} ${c.emoji || ''} ${c.name}`.trim() })))
  const selectedCategory = domains.flatMap(d => d.business_categories).find(c => c.id === form.categoryId)
  const subcategoryOptions = (selectedCategory?.inventory_subcategories || []).map(s => ({ value: s.id, name: `${s.emoji || ''} ${s.name}`.trim() }))

  const updateCompatRow = (i: number, patch: Partial<CompatRow>) => {
    setCompatibility(rows => rows.map((r, idx) => idx === i ? { ...r, ...patch } : r))
  }

  const buildPayload = (confirmCreateAnyway: boolean) => ({
    businessId,
    name: form.name,
    sku: form.sku,
    barcode: form.barcode || undefined,
    categoryId: form.categoryId,
    subcategoryId: form.subcategoryId || undefined,
    basePrice: parseFloat(form.basePrice),
    costPrice: form.costPrice ? parseFloat(form.costPrice) : undefined,
    brandId: form.brandId || undefined,
    supplierId: form.supplierId || undefined,
    locationId: form.locationId || undefined,
    condition: form.condition,
    partType: form.partType || undefined,
    reorderLevel: form.reorderLevel ? parseInt(form.reorderLevel) : undefined,
    initialQuantity: form.initialQuantity ? parseInt(form.initialQuantity) : undefined,
    description: form.description || undefined,
    compatibility: compatibility.filter(c => c.vehicleMake.trim()).map(c => ({
      vehicleMake: c.vehicleMake.trim(),
      vehicleModel: c.vehicleModel.trim() || undefined,
      yearFrom: c.yearFrom ? parseInt(c.yearFrom) : undefined,
      yearTo: c.yearTo ? parseInt(c.yearTo) : undefined,
      engineSpec: c.engineSpec.trim() || undefined,
      transmissionType: c.transmissionType.trim() || undefined,
    })),
    confirmCreateAnyway,
  })

  const handleSubmit = async (confirmCreateAnyway = false) => {
    if (!form.name.trim()) { setError('Name is required'); return }
    if (!form.sku.trim()) { setError('SKU is required'); return }
    if (!form.categoryId) { setError('Category is required'); return }
    if (!form.basePrice || isNaN(Number(form.basePrice))) { setError('Selling price is required'); return }

    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/vehicle-service/parts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload(confirmCreateAnyway)),
      })
      const data = await res.json()
      if (res.status === 409) {
        if (data.possibleDuplicates) {
          setDuplicates(data.possibleDuplicates)
          setCanOverride(!!data.canOverride)
        } else if (data.existingPart) {
          setError(`${data.error}: ${data.existingPart.name}`)
        }
        return
      }
      if (!res.ok) { setError(data.error || 'Failed to create part'); return }
      onCreated(data.part.id)
    } catch {
      setError('Connection error — please try again')
    } finally {
      setSubmitting(false)
    }
  }

  if (duplicates) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-75" onClick={onClose} />
          <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">A similar inventory item already exists</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Review the closest matches before creating a new part.</p>
            <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
              {duplicates.map(d => (
                <div key={d.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{d.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {d.business_brands?.name ? `${d.business_brands.name} · ` : ''}Stock: {d.product_variants?.[0]?.stockQuantity ?? 0}
                    </p>
                  </div>
                  <a href={`/vehicle-service/parts/${d.id}`} target="_blank" rel="noreferrer" className="text-xs text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap">
                    👁️ View existing
                  </a>
                </div>
              ))}
            </div>
            {error && <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>}
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDuplicates(null)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700">
                Go back
              </button>
              {canOverride && (
                <button onClick={() => { setDuplicates(null); handleSubmit(true) }} disabled={submitting} className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium">
                  🆕 Create new anyway
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-75" onClick={submitting ? undefined : onClose} />
        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Add Part</h3>
          </div>
          <div className="px-6 py-4 space-y-3 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Item Name *</label>
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">SKU / Part Number *</label>
                <input type="text" value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })}
                  className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Barcode</label>
                <input type="text" value={form.barcode} onChange={e => setForm({ ...form, barcode: e.target.value })}
                  className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Category *</label>
                <SearchableSelect options={categoryOptions} value={form.categoryId} onChange={v => setForm({ ...form, categoryId: v, subcategoryId: '' })} placeholder="Select category..." required />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Subcategory</label>
                <SearchableSelect options={subcategoryOptions} value={form.subcategoryId} onChange={v => setForm({ ...form, subcategoryId: v })} placeholder={form.categoryId ? 'Select subcategory...' : 'Pick a category first'} disabled={!form.categoryId} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Brand</label>
                <SearchableSelect options={brands.map(b => ({ value: b.id, name: b.name }))} value={form.brandId} onChange={v => setForm({ ...form, brandId: v })} placeholder="Select brand..." allLabel="No brand" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Condition</label>
                <select value={form.condition} onChange={e => setForm({ ...form, condition: e.target.value })}
                  className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                  {['NEW', 'USED', 'REFURBISHED', 'DAMAGED', 'EXPIRED'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Part Type</label>
                <select value={form.partType} onChange={e => setForm({ ...form, partType: e.target.value })}
                  className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                  <option value="">—</option>
                  <option value="OEM">OEM</option>
                  <option value="AFTERMARKET">Aftermarket</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Cost Price</label>
                <input type="number" min="0" step="0.01" value={form.costPrice} onChange={e => setForm({ ...form, costPrice: e.target.value })}
                  className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Selling Price *</label>
                <input type="number" min="0" step="0.01" value={form.basePrice} onChange={e => setForm({ ...form, basePrice: e.target.value })}
                  className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Supplier</label>
                <SearchableSelect options={suppliers.map(s => ({ value: s.id, name: s.name }))} value={form.supplierId} onChange={v => setForm({ ...form, supplierId: v })} placeholder="Select supplier..." allLabel="No supplier" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Storage Location</label>
                <SearchableSelect options={locations.map(l => ({ value: l.id, name: `${l.name} (${l.locationCode})` }))} value={form.locationId} onChange={v => setForm({ ...form, locationId: v })} placeholder="Select location..." allLabel="No location" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Reorder Level</label>
                <input type="number" min="0" value={form.reorderLevel} onChange={e => setForm({ ...form, reorderLevel: e.target.value })}
                  className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Initial Quantity</label>
                <input type="number" min="0" value={form.initialQuantity} onChange={e => setForm({ ...form, initialQuantity: e.target.value })}
                  className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Notes</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2}
                  className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Vehicle Compatibility</label>
                <button type="button" onClick={() => setCompatibility([...compatibility, { ...EMPTY_COMPAT }])} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                  + Add vehicle
                </button>
              </div>
              {compatibility.map((row, i) => (
                <div key={i} className="grid grid-cols-6 gap-1.5 mb-1.5">
                  <input placeholder="Make" value={row.vehicleMake} onChange={e => updateCompatRow(i, { vehicleMake: e.target.value })} className="col-span-1 text-xs px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                  <input placeholder="Model" value={row.vehicleModel} onChange={e => updateCompatRow(i, { vehicleModel: e.target.value })} className="col-span-1 text-xs px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                  <input placeholder="Yr from" type="number" value={row.yearFrom} onChange={e => updateCompatRow(i, { yearFrom: e.target.value })} className="text-xs px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                  <input placeholder="Yr to" type="number" value={row.yearTo} onChange={e => updateCompatRow(i, { yearTo: e.target.value })} className="text-xs px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                  <input placeholder="Engine" value={row.engineSpec} onChange={e => updateCompatRow(i, { engineSpec: e.target.value })} className="text-xs px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                  <div className="flex gap-1">
                    <input placeholder="Transmission" value={row.transmissionType} onChange={e => updateCompatRow(i, { transmissionType: e.target.value })} className="flex-1 text-xs px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                    {compatibility.length > 1 && (
                      <button type="button" onClick={() => setCompatibility(compatibility.filter((_, idx) => idx !== i))} className="text-red-500 text-xs px-1">✕</button>
                    )}
                  </div>
                </div>
              ))}
              <p className="text-[10px] text-gray-400">Leave the vehicle rows blank if this part isn't vehicle-specific (e.g. workshop tools/consumables).</p>
            </div>

            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
            <button onClick={onClose} disabled={submitting} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50">
              Cancel
            </button>
            <button onClick={() => handleSubmit(false)} disabled={submitting} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-md text-sm font-medium">
              {submitting ? 'Creating...' : 'Create Part'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
