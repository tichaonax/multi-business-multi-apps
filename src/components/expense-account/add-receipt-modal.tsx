'use client'

import { useState, useEffect, useRef } from 'react'
import { CreateIndividualPayeeModal } from './create-individual-payee-modal'
import { CreateContractorPayeeModal } from './create-contractor-payee-modal'

interface PayeeRef {
  type: string
  id: string
  name: string
}

interface PayeeSearchResult {
  id: string
  type: string
  name: string
  identifier?: string
}

interface EditReceiptData {
  id: string
  receiptDate: string
  amount: number
  description: string | null
  receiptNumber: string | null
  notes: string | null
  imageId: string | null
  payeeType: string | null
  payeeName: string | null
  payeePersonId: string | null
  payeeBusinessId: string | null
  payeeSupplierId: string | null
}

interface AddReceiptModalProps {
  paymentId: string
  paymentPayee?: PayeeRef | null
  onClose: () => void
  onSuccess: (result?: { updatedPayment?: PayeeRef }) => void
  // When provided, the modal edits this receipt (PUT) instead of creating a
  // new one (POST) — same payee picker (search/create/one-time) either way.
  editReceipt?: EditReceiptData | null
}

function payeeRefFromReceipt(r: EditReceiptData): PayeeRef | null {
  if (r.payeeType === 'PERSON' && r.payeePersonId) return { type: 'PERSON', id: r.payeePersonId, name: r.payeeName ?? '' }
  if (r.payeeType === 'BUSINESS' && r.payeeBusinessId) return { type: 'BUSINESS', id: r.payeeBusinessId, name: r.payeeName ?? '' }
  if (r.payeeType === 'SUPPLIER' && r.payeeSupplierId) return { type: 'SUPPLIER', id: r.payeeSupplierId, name: r.payeeName ?? '' }
  if (r.payeeType === 'FREEFORM') return { type: 'FREEFORM', id: '', name: r.payeeName ?? '' }
  return null
}

function typeBadge(type: string) {
  const labels: Record<string, string> = {
    PERSON: 'Individual', BUSINESS: 'Business', SUPPLIER: 'Supplier',
    CONTRACTOR: 'Contractor', EMPLOYEE: 'Employee', USER: 'User',
    FREEFORM: 'One-time',
  }
  return labels[type] ?? type
}

// Remembers whichever real (non-FREEFORM) payee was used last, on this device,
// so the next receipt — often for the same vendor — is one click instead of a
// re-search. Deliberately client-only (localStorage), not synced anywhere.
const LAST_PAYEE_KEY = 'mbm:lastReceiptPayee'

function getLastPayee(): PayeeRef | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(LAST_PAYEE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveLastPayee(p: PayeeRef) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(LAST_PAYEE_KEY, JSON.stringify(p))
  } catch {}
}

export function AddReceiptModal({ paymentId, paymentPayee, onClose, onSuccess, editReceipt }: AddReceiptModalProps) {
  const today = new Date().toISOString().slice(0, 10)
  const isEditing = !!editReceipt
  const initialPayee = editReceipt ? payeeRefFromReceipt(editReceipt) : (paymentPayee ?? null)

  const [selectedPayee, setSelectedPayee] = useState<PayeeRef | null>(initialPayee)
  const [changing, setChanging] = useState(!initialPayee) // open search immediately if no payee
  const [lastPayee] = useState<PayeeRef | null>(() => getLastPayee())

  // Search state
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<PayeeSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Mismatch detection — also fires when paymentPayee is null (no registered payee on payment).
  // FREEFORM is a one-time, receipt-only payee with no equivalent on the payment
  // record itself, so it never triggers the "update payment payee?" prompt.
  const payeeMismatch = selectedPayee && selectedPayee.type !== 'FREEFORM' && (
    !paymentPayee ||
    selectedPayee.id !== paymentPayee.id ||
    selectedPayee.type !== paymentPayee.type
  )
  const [updatePaymentPayee, setUpdatePaymentPayee] = useState<boolean | null>(null)

  // Create-payee sub-modals
  const [createIndividualOpen, setCreateIndividualOpen] = useState(false)
  const [createContractorOpen, setCreateContractorOpen] = useState(false)
  const [initialPayeeName, setInitialPayeeName] = useState<string | undefined>()

  const [receiptDate, setReceiptDate] = useState(editReceipt ? editReceipt.receiptDate.slice(0, 10) : today)
  const [amount, setAmount] = useState(editReceipt ? String(editReceipt.amount) : '')
  const [description, setDescription] = useState(editReceipt?.description ?? '')
  const [notes, setNotes] = useState(editReceipt?.notes ?? '')
  const [receiptNumber, setReceiptNumber] = useState(editReceipt?.receiptNumber ?? '')
  const [imageId, setImageId] = useState<string | null>(editReceipt?.imageId ?? null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAttachmentSelected(file: File | undefined) {
    if (!file) return
    setImageError(null)
    setUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append('files', file)
      const res = await fetch('/api/universal/images', { method: 'POST', body: formData, credentials: 'include' })
      const json = await res.json()
      if (res.ok && json.success && json.data?.[0]) {
        setImageId(json.data[0].filename)
      } else {
        setImageError(json.error || 'Failed to upload attachment')
      }
    } catch {
      setImageError('Failed to upload attachment')
    } finally {
      setUploadingImage(false)
    }
  }

  // Debounced search
  useEffect(() => {
    if (!changing) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) {
      setSearchResults([])
      setSearching(false)
      return
    }
    setSearching(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/expense-account/payees?search=${encodeURIComponent(query.trim())}`, { credentials: 'include' })
        const json = await res.json()
        if (json.success && json.data) {
          const d = json.data
          const flat: PayeeSearchResult[] = [
            ...(d.users ?? []).map((p: any) => ({ id: p.id, type: 'USER', name: p.name, identifier: p.identifier })),
            ...(d.employees ?? []).map((p: any) => ({ id: p.id, type: 'EMPLOYEE', name: p.name, identifier: p.identifier })),
            ...(d.persons ?? []).map((p: any) => ({ id: p.id, type: 'PERSON', name: p.name, identifier: p.identifier })),
            ...(d.businesses ?? []).map((p: any) => ({ id: p.id, type: 'BUSINESS', name: p.name, identifier: p.identifier })),
            ...(d.suppliers ?? []).map((p: any) => ({ id: p.id, type: 'SUPPLIER', name: p.name, identifier: p.identifier })),
            ...(d.contractors ?? []).map((p: any) => ({ id: p.id, type: 'CONTRACTOR', name: p.name, identifier: p.identifier })),
          ]
          setSearchResults(flat)
        } else {
          setSearchResults([])
        }
      } catch {
        setSearchResults([])
      } finally {
        setSearching(false)
      }
    }, 350)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, changing])

  function selectPayee(p: PayeeSearchResult) {
    setSelectedPayee({ type: p.type, id: p.id, name: p.name })
    setChanging(false)
    setQuery('')
    setSearchResults([])
    setUpdatePaymentPayee(null)
  }

  // One-time payee, referenced by name only — no Person/Business/Supplier record
  // created. For an unknown or one-off vendor that isn't worth saving permanently.
  function selectFreeformPayee(name: string) {
    setSelectedPayee({ type: 'FREEFORM', id: '', name })
    setChanging(false)
    setQuery('')
    setSearchResults([])
    setUpdatePaymentPayee(null)
  }

  function cancelChange() {
    setChanging(false)
    setQuery('')
    setSearchResults([])
  }

  function payeeTypeToApiFields(p: PayeeRef) {
    if (p.type === 'FREEFORM') {
      return { payeeType: 'FREEFORM', payeeName: p.name }
    }
    const apiType = p.type === 'PERSON' ? 'PERSON' : p.type === 'BUSINESS' ? 'BUSINESS' : 'SUPPLIER'
    return {
      payeeType: apiType,
      payeePersonId: p.type === 'PERSON' ? p.id : undefined,
      payeeBusinessId: p.type === 'BUSINESS' ? p.id : undefined,
      payeeSupplierId: (p.type === 'SUPPLIER' || p.type === 'CONTRACTOR') ? p.id : undefined,
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!amount || isNaN(parseFloat(amount))) { setError('Amount is required'); return }
    if (payeeMismatch && updatePaymentPayee === null) {
      setError('Please confirm whether to update the payment payee')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const body: Record<string, unknown> = {
        receiptDate,
        amount: parseFloat(amount),
        description: description || undefined,
        notes: notes || undefined,
        receiptNumber: receiptNumber || undefined,
        imageId: imageId || undefined,
        updatePaymentPayee: payeeMismatch ? updatePaymentPayee : false,
      }
      if (selectedPayee) Object.assign(body, payeeTypeToApiFields(selectedPayee))
      else if (isEditing) Object.assign(body, { payeeType: null })

      const res = await fetch(
        isEditing ? `/api/expense-account/receipts/${editReceipt!.id}` : `/api/expense-account/payments/${paymentId}/receipts`,
        {
          method: isEditing ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(body),
        }
      )
      if (res.ok) {
        const data = await res.json();
        if (selectedPayee && selectedPayee.type !== 'FREEFORM') saveLastPayee(selectedPayee)
        // Pass the updated payment object (payee info) to onSuccess. The PUT
        // (edit) response doesn't re-resolve a payee name, so in edit mode
        // compute it client-side from what's already selected.
        const updatedPayment = isEditing
          ? (payeeMismatch && updatePaymentPayee && selectedPayee && selectedPayee.type !== 'FREEFORM' ? selectedPayee : undefined)
          : data.data?.updatedPayment
        onSuccess({ updatedPayment });
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to save receipt')
      }
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-lg">
          <div className="p-6">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-semibold">{isEditing ? 'Edit Receipt' : 'Add Receipt'}</h2>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600" disabled={submitting}>✕</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300 rounded text-sm">
                  {error}
                </div>
              )}

              {/* Payee section */}
              <div>
                <label className="block text-sm font-medium mb-1">Payee</label>

                {lastPayee && (!selectedPayee || selectedPayee.id !== lastPayee.id || selectedPayee.type !== lastPayee.type) && (
                  <button
                    type="button"
                    onClick={() => selectPayee({ id: lastPayee.id, type: lastPayee.type, name: lastPayee.name })}
                    className="mb-2 text-xs px-2 py-1 rounded border border-teal-300 dark:border-teal-700 text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20"
                    disabled={submitting}
                  >
                    ↻ Use last payee: {lastPayee.name}
                  </button>
                )}

                {/* Static read-only display */}
                {!changing && (
                  <div className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                    {selectedPayee ? (
                      <>
                        <span className="text-xs px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 font-medium shrink-0">
                          {typeBadge(selectedPayee.type)}
                        </span>
                        <span className="flex-1 text-sm text-gray-900 dark:text-gray-100 truncate">{selectedPayee.name}</span>
                      </>
                    ) : (
                      <span className="flex-1 text-sm text-gray-400 dark:text-gray-500">No payee</span>
                    )}
                    <button
                      type="button"
                      onClick={() => setChanging(true)}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline shrink-0"
                      disabled={submitting}
                    >
                      {selectedPayee ? 'Change' : 'Select'}
                    </button>
                  </div>
                )}

                {/* Search-as-you-type */}
                {changing && (
                  <div className="relative">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        autoFocus
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        className="input flex-1 px-3 py-2 text-sm"
                        placeholder="Type to search payees..."
                        disabled={submitting}
                      />
                      {selectedPayee && (
                        <button
                          type="button"
                          onClick={cancelChange}
                          className="btn-secondary text-sm px-3"
                        >
                          Cancel
                        </button>
                      )}
                    </div>

                    {/* Results dropdown */}
                    {(searching || searchResults.length > 0 || query.trim()) && (
                      <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                        {searching && (
                          <div className="px-3 py-2 text-sm text-gray-400 dark:text-gray-500">Searching...</div>
                        )}
                        {!searching && query.trim() && searchResults.length === 0 && (
                          <div className="px-3 py-2 space-y-1">
                            <p className="text-sm text-gray-400 dark:text-gray-500">No results for &ldquo;{query}&rdquo;</p>
                            <div className="flex flex-wrap gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => { setInitialPayeeName(query); setCreateIndividualOpen(true) }}
                                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                + Create individual
                              </button>
                              <button
                                type="button"
                                onClick={() => { setInitialPayeeName(query); setCreateContractorOpen(true) }}
                                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                + Create supplier
                              </button>
                              <button
                                type="button"
                                onClick={() => selectFreeformPayee(query.trim())}
                                className="text-xs text-teal-600 dark:text-teal-400 hover:underline"
                                title="Reference this name on the receipt only — no payee record is created"
                              >
                                Use &ldquo;{query.trim()}&rdquo; as one-time payee
                              </button>
                            </div>
                          </div>
                        )}
                        {!searching && searchResults.map(r => (
                          <button
                            key={`${r.type}-${r.id}`}
                            type="button"
                            onClick={() => selectPayee(r)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
                          >
                            <span className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 font-medium shrink-0">
                              {typeBadge(r.type)}
                            </span>
                            <span className="flex-1 truncate text-gray-900 dark:text-gray-100">{r.name}</span>
                            {r.identifier && (
                              <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">{r.identifier}</span>
                            )}
                          </button>
                        ))}
                        {!searching && query.trim() && searchResults.length > 0 && (
                          <div className="border-t border-gray-100 dark:border-gray-700 px-3 py-2 flex flex-wrap gap-3">
                            <button
                              type="button"
                              onClick={() => selectFreeformPayee(query.trim())}
                              className="text-xs text-teal-600 dark:text-teal-400 hover:underline"
                              title="Reference this name on the receipt only — no payee record is created"
                            >
                              Use &ldquo;{query.trim()}&rdquo; as one-time payee
                            </button>
                            <button
                              type="button"
                              onClick={() => { setInitialPayeeName(query); setCreateIndividualOpen(true) }}
                              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              + Create individual
                            </button>
                            <button
                              type="button"
                              onClick={() => { setInitialPayeeName(query); setCreateContractorOpen(true) }}
                              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              + Create supplier
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Payee mismatch — ask once, then collapse to confirmation */}
              {payeeMismatch && updatePaymentPayee === null && (
                <div className="p-3 bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-700 rounded text-sm">
                  <p className="text-amber-800 dark:text-amber-300 font-medium mb-2">
                    {paymentPayee
                      ? <>⚠️ Payment was recorded under <strong>{paymentPayee.name}</strong>. Update it to <strong>{selectedPayee!.name}</strong>?</>
                      : <>⚠️ No payee is linked to this payment. Link it to <strong>{selectedPayee!.name}</strong>?</>}
                  </p>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setUpdatePaymentPayee(true)}
                      className="text-xs px-3 py-1.5 rounded font-medium border bg-amber-600 text-white border-amber-600">
                      Yes, update payment
                    </button>
                    <button type="button" onClick={() => setUpdatePaymentPayee(false)}
                      className="text-xs px-3 py-1.5 rounded font-medium border bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50">
                      No, keep original
                    </button>
                  </div>
                </div>
              )}
              {payeeMismatch && updatePaymentPayee !== null && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {updatePaymentPayee
                    ? `✓ Payment payee will be linked to ${selectedPayee!.name}`
                    : paymentPayee
                      ? `✓ Payment payee will remain as ${paymentPayee.name}`
                      : `✓ Payment payee will not be updated`}
                  {' · '}
                  <button type="button" onClick={() => setUpdatePaymentPayee(null)} className="text-blue-500 hover:underline">
                    Change
                  </button>
                </p>
              )}

              {/* Receipt date + Amount */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Receipt Date <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    value={receiptDate}
                    onChange={e => setReceiptDate(e.target.value)}
                    className="input w-full px-3 py-2"
                    required
                    disabled={submitting}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Amount <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="input w-full px-3 py-2"
                    placeholder="0.00"
                    required
                    disabled={submitting}
                  />
                </div>
              </div>

              {/* Receipt number */}
              <div>
                <label className="block text-sm font-medium mb-1">Receipt Number</label>
                <input
                  type="text"
                  value={receiptNumber}
                  onChange={e => setReceiptNumber(e.target.value)}
                  className="input w-full px-3 py-2"
                  placeholder="Optional — as printed on the receipt"
                  disabled={submitting}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="input w-full px-3 py-2"
                  placeholder="What was purchased"
                  disabled={submitting}
                />
              </div>

              {/* Attachment */}
              <div>
                <label className="block text-sm font-medium mb-1">Attachment</label>
                {imageId ? (
                  <div className="flex items-center gap-2">
                    <a href={`/api/images/${imageId}`} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                      View attached image
                    </a>
                    <button type="button" onClick={() => setImageId(null)} className="text-xs text-gray-400 hover:text-red-500" disabled={submitting}>
                      Remove
                    </button>
                  </div>
                ) : (
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => handleAttachmentSelected(e.target.files?.[0])}
                    className="input w-full text-sm"
                    disabled={submitting || uploadingImage}
                  />
                )}
                {uploadingImage && <p className="text-xs text-gray-400 mt-1">Uploading…</p>}
                {imageError && <p className="text-xs text-red-500 mt-1">{imageError}</p>}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="input w-full px-3 py-2"
                  rows={2}
                  placeholder="Internal memo"
                  disabled={submitting}
                />
              </div>

              <div className="flex justify-end gap-3 pt-1">
                <button type="button" onClick={onClose} className="btn-secondary" disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Save Receipt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {createIndividualOpen && (
        <CreateIndividualPayeeModal
          isOpen={createIndividualOpen}
          initialName={initialPayeeName}
          onClose={() => setCreateIndividualOpen(false)}
          onSuccess={(payload) => {
            setCreateIndividualOpen(false)
            if (payload.payee) {
              selectPayee({ type: 'PERSON', id: payload.payee.id, name: payload.payee.fullName })
            }
          }}
        />
      )}

      {createContractorOpen && (
        <CreateContractorPayeeModal
          isOpen={createContractorOpen}
          initialName={initialPayeeName}
          onClose={() => setCreateContractorOpen(false)}
          onSuccess={(payload) => {
            setCreateContractorOpen(false)
            if (payload.payee) {
              selectPayee({ type: 'SUPPLIER', id: payload.payee.id, name: payload.payee.supplierName ?? payload.payee.fullName })
            }
          }}
        />
      )}
    </>
  )
}
