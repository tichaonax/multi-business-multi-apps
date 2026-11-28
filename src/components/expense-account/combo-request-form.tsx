'use client'

import { useState, useEffect } from 'react'
import { VEHICLE_DOMAIN_ID } from '@/components/vehicles/vehicle-cost-picker'
import { useRouter } from 'next/navigation'
import { useToastContext } from '@/components/ui/toast'
import { ComboRequestSection, ComboSection, SectionType } from './combo-request-section'
import { ComboItem, Domain, ComboPayeeCreate } from './combo-request-item-row'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { CreateIndividualPayeeModal } from './create-individual-payee-modal'
import { CreateContractorPayeeModal } from './create-contractor-payee-modal'
import { SupplierEditor } from '@/components/suppliers/supplier-editor'
import { RecordedExpensesPanel } from '@/components/restaurant/expenses/recorded-expenses-panel'
import { ReturnHistory, ReturnEntry } from './combo-request-return-history'

interface ComboRequestFormProps {
  accountId: string
  requestId?: string
}

function newItem(): ComboItem {
  return {
    _id: crypto.randomUUID(),
    description: '',
    quantity: '',
    unit: '',
    unitPrice: '',
    estimatedAmount: '',
    domainId: '',
    categoryId: '',
    subcategoryId: '',
    payee: null,
    notes: '',
  }
}

function getPayeeId(record: {
  payeeType?: string | null
  payeePersonId?: string | null
  payeeUserId?: string | null
  payeeEmployeeId?: string | null
  payeeBusinessId?: string | null
  payeeSupplierId?: string | null
}): string | null {
  switch (record.payeeType) {
    case 'PERSON':   return record.payeePersonId ?? null
    case 'USER':     return record.payeeUserId ?? null
    case 'EMPLOYEE': return record.payeeEmployeeId ?? null
    case 'BUSINESS': return record.payeeBusinessId ?? null
    case 'SUPPLIER': return record.payeeSupplierId ?? null
    default:         return null
  }
}

function resolvePayeeName(record: {
  payeeType?: string | null
  payeePerson?: { fullName: string } | null
  payeeUser?: { name: string } | null
  payeeEmployee?: { fullName: string } | null
  payeeBusiness?: { name: string } | null
  payeeSupplier?: { name: string } | null
}): string | null {
  switch (record.payeeType) {
    case 'PERSON':   return record.payeePerson?.fullName ?? null
    case 'USER':     return record.payeeUser?.name ?? null
    case 'EMPLOYEE': return record.payeeEmployee?.fullName ?? null
    case 'BUSINESS': return record.payeeBusiness?.name ?? null
    case 'SUPPLIER': return record.payeeSupplier?.name ?? null
    default:         return null
  }
}

function newSection(type: SectionType = 'GROCERY'): ComboSection {
  return {
    _id: crypto.randomUUID(),
    sectionType: type,
    sectionName: '',
    payee: null,
    notes: '',
    items: [newItem()],
  }
}

interface LoanTarget { id: string; name: string; accounts: Array<{ id: string; accountName: string; accountNumber: string }> }

function serializeSections(sections: ComboSection[]) {
  return sections.map((s, sIdx) => ({
    sectionType: s.sectionType,
    sectionName: s.sectionName.trim() || null,
    payeeType: s.payee?.type || null,
    payeePersonId: s.payee?.type === 'PERSON' ? s.payee.id : null,
    payeeUserId: s.payee?.type === 'USER' ? s.payee.id : null,
    payeeEmployeeId: s.payee?.type === 'EMPLOYEE' ? s.payee.id : null,
    payeeBusinessId: s.payee?.type === 'BUSINESS' ? s.payee.id : null,
    payeeSupplierId: s.payee?.type === 'SUPPLIER' ? s.payee.id : null,
    notes: s.notes.trim() || null,
    sortOrder: sIdx,
    items: s.items
      .filter(i => i.description.trim())
      .map((item, iIdx) => ({
        description: item.description.trim(),
        quantity: item.quantity ? Number(item.quantity) : null,
        unit: item.unit.trim() || null,
        estimatedAmount: item.estimatedAmount ? Number(item.estimatedAmount) : null,
        categoryId: item.categoryId || null,
        subcategoryId: item.subcategoryId || null,
        payeeType: item.payee?.type || null,
        payeePersonId: item.payee?.type === 'PERSON' ? item.payee.id : null,
        payeeUserId: item.payee?.type === 'USER' ? item.payee.id : null,
        payeeEmployeeId: item.payee?.type === 'EMPLOYEE' ? item.payee.id : null,
        payeeBusinessId: item.payee?.type === 'BUSINESS' ? item.payee.id : null,
        payeeSupplierId: item.payee?.type === 'SUPPLIER' ? item.payee.id : null,
        notes: item.notes.trim() || null,
        sortOrder: iIdx,
        vehicleId: item.vehicleId || null, // MBM-344
        vehicleExpenseType: item.vehicleId ? item.vehicleExpenseType || null : null,
        vehicleLicenseType: item.vehicleId ? item.vehicleLicenseType || null : null,
        vehicleLicenseExpiry: item.vehicleId ? item.vehicleLicenseExpiry || null : null,
        vehicleLicenseIncludes: item.vehicleId ? item.vehicleLicenseIncludes || null : null, // MBM-354
        expenseLineId: item.expenseLineId || null,
        // MBM-335: keeps the cashier's flag; the requester only answers it
        id: item.id || null,
        flagResolved: !!item.flagResolved,
        flagResponse: item.flagResponse?.trim() || null,
      })),
  }))
}

export function ComboRequestForm({ accountId, requestId }: ComboRequestFormProps) {
  const router = useRouter()
  const toast = useToastContext()
  const { hasPermission, isSystemAdmin, isBusinessOwner, currentBusiness, businesses } = useBusinessPermissionsContext()

  // MBM-335: one item open at a time; create payees on the fly
  const [activeItemId, setActiveItemId] = useState<string | null>(null)
  // MBM-336: the cashier is correcting someone else's submitted request
  const [cashierCorrecting, setCashierCorrecting] = useState<{ requester: string } | null>(null)
  const [payeeRefresh, setPayeeRefresh] = useState(0)
  const [createPayee, setCreatePayee] = useState<{ kind: 'individual' | 'contractor' | 'supplier'; query?: string; target: { sectionId: string; itemId?: string } } | null>(null)
  const [accountBusinessId, setAccountBusinessId] = useState<string | null>(null)
  // The session only carries the role, so use the business permissions
  // context — same rule as the expense account page (owners, managers,
  // admins) plus anyone granted canCreateIndividualPayees
  const canCreatePayees = isSystemAdmin || isBusinessOwner ||
    currentBusiness?.role === 'business-manager' ||
    hasPermission('canCreateIndividualPayees')

  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [sections, setSections] = useState<ComboSection[]>([newSection()])
  const [domains, setDomains] = useState<Domain[]>([])
  const [loadingDomains, setLoadingDomains] = useState(true)
  const [loadingPayees, setLoadingPayees] = useState(true)
  const [loadingDraft, setLoadingDraft] = useState(!!requestId)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [draftId, setDraftId] = useState<string | null>(requestId ?? null)
  const [draftStatus, setDraftStatus] = useState<string>('DRAFT')
  const [showConfirmPanel, setShowConfirmPanel] = useState(false)
  const [confirmOverride, setConfirmOverride] = useState('')
  const [confirming, setConfirming] = useState(false)
  // MBM-333: cashier's return-for-changes history, shown while editing
  const [returns, setReturns] = useState<ReturnEntry[]>([])
  // MBM-333: business-loan combo
  const [isBusinessLoan, setIsBusinessLoan] = useState(false)
  const [loanBusinessId, setLoanBusinessId] = useState('')
  const [loanExpenseAccountId, setLoanExpenseAccountId] = useState('')
  const [loanTargets, setLoanTargets] = useState<LoanTarget[] | null>(null)

  useEffect(() => {
    if (!isBusinessLoan || loanTargets) return
    fetch(`/api/expense-account/${accountId}/combo-requests/loan-targets`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => setLoanTargets(d?.data ?? []))
      .catch(() => setLoanTargets([]))
  }, [isBusinessLoan, loanTargets, accountId])

  const loanBusiness = loanTargets?.find(b => b.id === loanBusinessId) ?? null
  const loanAccount = loanBusiness?.accounts.find(a => a.id === loanExpenseAccountId) ?? null
  const loanPayload = isBusinessLoan
    ? { isBusinessLoan: true, loanBusinessId: loanBusinessId || null, loanExpenseAccountId: loanExpenseAccountId || null }
    : { isBusinessLoan: false }

  useEffect(() => {
    fetch('/api/expense-account/payees', { credentials: 'include' })
      .catch(() => {})
      .finally(() => setLoadingPayees(false))
  }, [])

  useEffect(() => {
    fetch('/api/expense-categories/hierarchical', { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        // API returns one wrapper: { domains: [{ expense_categories: [...] }] }
        // Domain-level entries are flagged with isDomainCategory: true
        const flat: any[] = data.domains?.[0]?.expense_categories ?? []
        const parsed: Domain[] = flat
          .filter((c: any) => c.isDomainCategory)
          .map((c: any) => ({
            id: c.id,
            label: `${c.emoji || ''} ${c.name}`.trim(),
          }))
        setDomains(parsed)
      })
      .catch(() => {})
      .finally(() => setLoadingDomains(false))
  }, [])

  useEffect(() => {
    fetch(`/api/expense-account/${accountId}`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => setAccountBusinessId(d?.data?.businessId ?? d?.businessId ?? null))
      .catch(() => {})
  }, [accountId])

  useEffect(() => {
    if (!requestId) return
    setLoadingDraft(true)
    fetch(`/api/expense-account/${accountId}/combo-requests/${requestId}`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        const req = data?.data
        if (!req) return
        setDraftStatus(req.status || 'DRAFT')
        setTitle(req.title || '')
        setNotes(req.notes || '')
        setReturns(req.returns ?? [])
        setCashierCorrecting(req.canCashierCorrect ? { requester: req.creator?.name ?? 'the requester' } : null)
        setIsBusinessLoan(!!req.isBusinessLoan)
        setLoanBusinessId(req.loanBusinessId || '')
        setLoanExpenseAccountId(req.loanExpenseAccountId || '')
        setSections(req.sections.map((s: any) => {
          const sPayeeId = getPayeeId(s)
          const sPayeeName = resolvePayeeName(s)
          return {
            _id: crypto.randomUUID(),
            sectionType: s.sectionType,
            sectionName: s.sectionName || '',
            payee: s.payeeType && sPayeeId && sPayeeName
              ? { type: s.payeeType, id: sPayeeId, name: sPayeeName }
              : null,
            notes: s.notes || '',
            items: s.items.map((i: any) => {
              const iPayeeId = getPayeeId(i)
              const iPayeeName = resolvePayeeName(i)
              return {
                _id: crypto.randomUUID(),
                description: i.description || '',
                quantity: i.quantity !== null && i.quantity !== undefined ? String(i.quantity) : '',
                unit: i.unit || '',
                unitPrice: '',
                estimatedAmount: i.estimatedAmount !== null && i.estimatedAmount !== undefined ? String(i.estimatedAmount) : '',
                domainId: i.category?.domainId || '',
                categoryId: i.categoryId || '',
                subcategoryId: i.subcategoryId || '',
                payee: i.payeeType && iPayeeId && iPayeeName
                  ? { type: i.payeeType, id: iPayeeId, name: iPayeeName }
                  : null,
                notes: i.notes || '',
                vehicleId: i.vehicleId || null, // MBM-344
                vehicleExpenseType: i.vehicleExpenseType || null,
                vehicleLicenseType: i.vehicleLicenseType || null,
                vehicleLicenseExpiry: i.vehicleLicenseExpiry ? String(i.vehicleLicenseExpiry).slice(0, 10) : null,
                vehicleLicenseIncludes: i.vehicleLicenseIncludes || null, // MBM-354
                // MBM-335
                id: i.id,
                classificationLabel: i.category
                  ? [
                      i.category.domain ? `${i.category.domain.emoji ?? ''} ${i.category.domain.name}`.trim() : null,
                      `${i.category.emoji ?? ''} ${i.category.name}`.trim(),
                      i.subcategory ? `${i.subcategory.emoji ?? ''} ${i.subcategory.name}`.trim() : null,
                    ].filter(Boolean).join(' › ')
                  : '',
                flagNote: i.flagNote ?? null,
                flaggedByName: i.flaggedByUser?.name ?? null,
                flagResolved: !!i.flagResolvedAt,
                flagResponse: i.flagResponse ?? '',
                expenseLineId: i.restaurant_expense_line?.id,
                lockedInfo: i.restaurant_expense_line
                  ? `${i.restaurant_expense_line.transaction.reference} · ${new Date(i.restaurant_expense_line.transaction.purchasedAt).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}`
                  : undefined,
              }
            }),
          }
        }))
      })
      .catch(() => toast.error('Failed to load draft'))
      .finally(() => setLoadingDraft(false))
  }, [requestId, accountId]) // eslint-disable-line react-hooks/exhaustive-deps

  // MBM-335: put a newly created payee where the user asked for it
  function applyNewPayee(payee: { type: string; id: string; name: string }) {
    const target = createPayee?.target
    setCreatePayee(null)
    setPayeeRefresh(n => n + 1)
    if (!target) return
    setSections(prev => prev.map(s => {
      if (s._id !== target.sectionId) return s
      if (!target.itemId) return { ...s, payee }
      return { ...s, items: s.items.map(i => i._id === target.itemId ? { ...i, payee } : i) }
    }))
    toast.push(`Payee "${payee.name}" created and selected`)
  }

  // Suppliers are saved through a business: this account's business, else
  // the business receiving the loan, else the user's current business
  // (never the umbrella "All" business — suppliers take its business type)
  const ownBusiness = (currentBusiness && !(currentBusiness as any).isUmbrellaBusiness)
    ? currentBusiness
    : (businesses ?? []).find((b: any) => !b.isUmbrellaBusiness)
  const supplierBusinessId = accountBusinessId || (isBusinessLoan ? loanBusinessId : '') || ownBusiness?.businessId || null

  const payeeCreateProps: ComboPayeeCreate = {
    refresh: payeeRefresh,
    canSupplier: !!supplierBusinessId,
    onCreate: canCreatePayees ? (kind, query, target) => setCreatePayee({ kind, query, target }) : undefined,
  }

  const grandTotal = sections.reduce((sum, s) => {
    return sum + s.items.reduce((sSum, item) => {
      const amt = parseFloat(item.estimatedAmount)
      return sSum + (isNaN(amt) ? 0 : amt)
    }, 0)
  }, 0)

  // MBM-333: everything Submit needs (Save Draft stays allowed while incomplete).
  // Blank rows are ignored; quantity, unit, category, notes and (for an
  // ordinary request) payees are optional.
  const submitProblems: string[] = []
  if (!title.trim()) submitProblems.push('Add a request title')
  if (isBusinessLoan && (!loanBusinessId || !loanExpenseAccountId)) submitProblems.push('Choose the business receiving the loan and its account')
  let filledItems = 0
  sections.forEach((s, sIdx) => {
    const where = `Section ${sIdx + 1}${s.sectionName.trim() ? ` (${s.sectionName.trim()})` : ''}`
    const rows = s.items.filter(i => i.description.trim() || i.estimatedAmount.trim())
    if (s.sectionType === 'CUSTOM' && rows.length > 0 && !s.sectionName.trim()) submitProblems.push(`${where}: give the custom section a name`)
    rows.forEach((i, iIdx) => {
      filledItems++
      const label = i.description.trim() ? `"${i.description.trim()}"` : `${where}, item ${iIdx + 1}`
      if (!i.description.trim()) submitProblems.push(`${label}: add a description`)
      const amt = parseFloat(i.estimatedAmount)
      if (isNaN(amt) || amt <= 0) submitProblems.push(`${label}: add an amount`)
      // MBM-347: a Vehicle expense must say which vehicle and what kind of cost
      if (i.domainId === VEHICLE_DOMAIN_ID && (!i.vehicleId || !i.vehicleExpenseType)) submitProblems.push(`${label}: choose the vehicle and the kind of cost`)
      if (isBusinessLoan && !i.payee && !s.payee) submitProblems.push(`${label}: add a payee (needed for a loan)`)
      if (isBusinessLoan && i.expenseLineId) submitProblems.push(`${label}: recorded restaurant expenses can't go in a loan`)
      if (i.flagNote && !i.flagResolved) submitProblems.push(`${label}: 🚩 fix what the cashier flagged, then tick "Mark as fixed"`)
    })
  })
  if (filledItems === 0) submitProblems.push('Add at least one item')

  function validate(): string | null {
    if (!title.trim()) return 'Title is required'
    const hasItems = sections.some(s => s.items.some(i => i.description.trim()))
    if (!hasItems) return 'At least one item with a description is required'
    if (isBusinessLoan && (!loanBusinessId || !loanExpenseAccountId)) return 'Choose the business the loan goes to and its receiving account'
    return null
  }

  async function handleSaveDraft() {
    const error = validate()
    if (error) { toast.error(error); return }

    setSaving(true)
    try {
      const payload = {
        title: title.trim(),
        notes: notes.trim() || null,
        sections: serializeSections(sections),
        ...loanPayload,
        ...(draftStatus !== 'SUBMITTED' ? { status: 'DRAFT' } : {}),
      }

      let res: Response
      if (draftId) {
        res = await fetch(`/api/expense-account/${accountId}/combo-requests/${draftId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        })
      } else {
        res = await fetch(`/api/expense-account/${accountId}/combo-requests`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        })
      }

      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Failed to save'); return }

      setDraftId(data.data.id)
      toast.push(draftStatus === 'SUBMITTED' ? 'Changes saved' : 'Draft saved')
      if (draftStatus === 'SUBMITTED') {
        router.push(`/expense-accounts/${accountId}/combo-requests/${data.data.id}`)
      }
    } catch {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveAndShowConfirm() {
    const error = validate()
    if (error) { toast.error(error); return }

    if (submitProblems.length > 0) { toast.error(submitProblems[0]); return }

    setSubmitting(true)
    try {
      const payload = {
        title: title.trim(),
        notes: notes.trim() || null,
        sections: serializeSections(sections),
        ...loanPayload,
        status: 'DRAFT',
      }

      let savedId = draftId
      if (!savedId) {
        const createRes = await fetch(`/api/expense-account/${accountId}/combo-requests`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        })
        const createData = await createRes.json()
        if (!createRes.ok) { toast.error(createData.error || 'Failed to create request'); return }
        savedId = createData.data.id
        setDraftId(savedId)
      } else {
        const updateRes = await fetch(`/api/expense-account/${accountId}/combo-requests/${savedId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        })
        if (!updateRes.ok) {
          const d = await updateRes.json()
          toast.error(d.error || 'Failed to save request')
          return
        }
      }

      setConfirmOverride(grandTotal.toFixed(2))
      setShowConfirmPanel(true)
    } catch {
      toast.error('Failed to save request')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleConfirmSubmit() {
    if (!draftId) return
    setConfirming(true)
    try {
      const override = parseFloat(confirmOverride)
      const body: Record<string, unknown> = {}
      if (!isBusinessLoan && !isNaN(override) && override > 0 && Math.abs(override - grandTotal) > 0.001) {
        body.overrideAmount = override
      }

      const res = await fetch(`/api/expense-account/${accountId}/combo-requests/${draftId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Failed to submit request'); return }

      toast.push('Request submitted successfully')
      router.push(`/expense-accounts/${accountId}`)
    } catch {
      toast.error('Failed to submit request')
    } finally {
      setConfirming(false)
    }
  }

  function updateSection(index: number, updated: ComboSection) {
    setSections(prev => prev.map((s, i) => i === index ? updated : s))
  }

  function removeSection(index: number) {
    setSections(prev => {
      const next = prev.filter((_, i) => i !== index)
      return next.length > 0 ? next : [newSection()]
    })
  }

  function addSection() {
    setSections(prev => [...prev, newSection()])
  }

  // MBM-319: recorded restaurant expenses already on the form
  const usedLineIds = new Set(sections.flatMap(s => s.items.map(i => i.expenseLineId).filter(Boolean) as string[]))

  // MBM-319: add picked recorded expenses as locked items — appended to the
  // section for that payee, else a new section per payee. Blank starter
  // sections are dropped.
  function addRecordedExpenses(groups: Parameters<React.ComponentProps<typeof RecordedExpensesPanel>['onAdd']>[0]) {
    setSections(prev => {
      const next = prev.filter(s => s.payee || s.items.some(i => i.description.trim()))
      for (const g of groups) {
        const items: ComboItem[] = g.lines.map(l => ({
          ...newItem(),
          description: l.description,
          estimatedAmount: l.amount.toFixed(2),
          categoryId: l.categoryId,
          subcategoryId: l.subcategoryId ?? '',
          expenseLineId: l.lineId,
          lockedInfo: l.lockedInfo,
        }))
        const idx = next.findIndex(s => s.payee?.type === g.payee.type && s.payee?.id === g.payee.id)
        if (idx >= 0) {
          next[idx] = { ...next[idx], items: [...next[idx].items.filter(i => i.description.trim()), ...items] }
        } else {
          next.push({ ...newSection(), payee: g.payee, items })
        }
      }
      return next.length > 0 ? next : [newSection()]
    })
    if (!title.trim()) setTitle(`Restaurant expenses — ${new Date().toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}`)
  }

  if (loadingDraft) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-gray-400 text-sm">Loading draft...</div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {requestId ? 'Edit Combo Payment Request' : 'New Combo Payment Request'}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Bundle multiple expense items into a single payment request.</p>
      </div>

      {/* MBM-336: a cashier is correcting the requester's submitted request */}
      {cashierCorrecting && (
        <div className="rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
          <p className="font-semibold">✏️ You&apos;re correcting {cashierCorrecting.requester}&apos;s request</p>
          <p className="mt-0.5 text-xs">Your changes are recorded and shown to {cashierCorrecting.requester}. When you approve, you&apos;ll need to add a note explaining what you changed and why.</p>
        </div>
      )}

      {/* MBM-333: what the cashier asked to change */}
      {returns.length > 0 && <ReturnHistory returns={returns} />}

      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Request Title *</label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="e.g. Monthly household expenses — May 2026"
          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* MBM-333: business loan */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-800 dark:text-gray-200 cursor-pointer">
          <input
            type="checkbox"
            checked={isBusinessLoan}
            onChange={e => setIsBusinessLoan(e.target.checked)}
            className="h-4 w-4"
          />
          🤝 This is a business loan
        </label>
        {isBusinessLoan && (
          <>
            {loanTargets === null ? (
              <p className="text-xs text-gray-500 dark:text-gray-400">Loading businesses…</p>
            ) : loanTargets.length === 0 ? (
              <p className="text-xs text-red-600 dark:text-red-400">No other business with an active expense account to lend to.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Business receiving the loan *</label>
                  <SearchableSelect
                    options={loanTargets.map(b => ({ id: b.id, label: b.name }))}
                    value={loanBusinessId}
                    onChange={id => {
                      const b = loanTargets.find(t => t.id === id)
                      setLoanBusinessId(id)
                      setLoanExpenseAccountId(b?.accounts[0]?.id ?? '')
                    }}
                    placeholder="Choose a business…"
                    searchPlaceholder="Search businesses…"
                    emptyMessage="No matching business"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Its expense account that receives the money *</label>
                  <SearchableSelect
                    options={(loanBusiness?.accounts ?? []).map(a => ({ id: a.id, label: `${a.accountName} (${a.accountNumber})` }))}
                    value={loanExpenseAccountId}
                    onChange={id => setLoanExpenseAccountId(id)}
                    disabled={!loanBusiness}
                    placeholder={loanBusiness ? 'Choose an account…' : 'Choose the business first'}
                    searchPlaceholder="Search accounts…"
                    emptyMessage="No matching account"
                  />
                </div>
              </div>
            )}
            <p className="text-xs text-gray-600 dark:text-gray-400">
              When approved, the full total is lent to <strong>{loanBusiness?.name ?? 'the business'}</strong>: deposited into{' '}
              <strong>{loanAccount?.accountName ?? 'its account'}</strong>, then set up there as one approved payment per item below
              (same amount and payee). {loanBusiness?.name ?? 'The business'} owes the loan back to this account.
              Every item needs an amount and a payee.
            </p>
          </>
        )}
      </div>

      {/* Sections */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Sections</h2>
          {loadingDomains && (
            <span className="text-xs text-gray-400">Loading categories...</span>
          )}
        </div>

        <RecordedExpensesPanel accountId={accountId} domains={domains} usedLineIds={usedLineIds} onAdd={addRecordedExpenses} />

        {sections.map((section, idx) => (
          <ComboRequestSection
            key={section._id}
            section={section}
            sectionIndex={idx}
            domains={domains}
            onChange={updated => updateSection(idx, updated)}
            onRemove={() => removeSection(idx)}
            activeItemId={activeItemId}
            onActivateItem={setActiveItemId}
            payeeCreate={payeeCreateProps}
          />
        ))}

        <button
          type="button"
          onClick={addSection}
          className="w-full py-3 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 border-2 border-dashed border-blue-200 dark:border-blue-800 hover:border-blue-400 dark:hover:border-blue-600 rounded-xl transition-colors"
        >
          + Add Section
        </button>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Request Notes (optional)</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Any additional context for the cashier..."
          rows={3}
          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      {/* Total + Actions */}
      <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 -mx-4 px-4 py-4 shadow-lg">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Estimated Total</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">${grandTotal.toFixed(2)}</div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.push(requestId
                ? `/expense-accounts/${accountId}/combo-requests/${requestId}`
                : `/expense-accounts/${accountId}`
              )}
              className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={saving || submitting || loadingDomains || loadingPayees}
              className="px-4 py-2 text-sm text-blue-700 dark:text-blue-400 border border-blue-300 dark:border-blue-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : draftStatus === 'SUBMITTED' ? 'Save Changes' : draftId ? 'Update Draft' : 'Save Draft'}
            </button>
            {draftStatus !== 'SUBMITTED' && (
              <button
                type="button"
                onClick={handleSaveAndShowConfirm}
                disabled={saving || submitting || confirming || loadingDomains || loadingPayees || submitProblems.length > 0}
                title={(loadingDomains || loadingPayees) ? 'Waiting for data to load...' : submitProblems.length > 0 ? submitProblems.join('\n') : undefined}
                className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? 'Saving...' : (loadingDomains || loadingPayees) ? 'Loading...' : 'Submit Request'}
              </button>
            )}
          </div>
        </div>

        {/* MBM-333: why Submit is disabled */}
        {draftStatus !== 'SUBMITTED' && submitProblems.length > 0 && (
          <div className="mt-2 text-xs text-amber-700 dark:text-amber-400">
            <span className="font-medium">To submit:</span>{' '}
            {submitProblems.slice(0, 3).join(' · ')}
            {submitProblems.length > 3 && ` · and ${submitProblems.length - 3} more`}
          </div>
        )}

        {/* Confirm submit panel */}
        {showConfirmPanel && (
          <div className="mt-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg space-y-3">
            <p className="text-sm text-blue-800 dark:text-blue-300 font-medium">Ready to submit</p>
            <p className="text-xs text-blue-700 dark:text-blue-400">
              Estimated total: <strong>${grandTotal.toFixed(2)}</strong>. Adjust the amount below if exact costs aren&apos;t fully known yet.
            </p>
            {isBusinessLoan ? (
              <p className="text-xs text-blue-700 dark:text-blue-400">🤝 Business loan to {loanBusiness?.name ?? 'the business'} — lent in full, so the amount can&apos;t be overridden.</p>
            ) : (
            <div>
              <label className="block text-xs font-medium text-blue-700 dark:text-blue-400 mb-1">Requested amount (optional override)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={confirmOverride}
                onChange={e => setConfirmOverride(e.target.value)}
                className="w-48 border border-blue-300 dark:border-blue-700 rounded-md px-3 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleConfirmSubmit}
                disabled={confirming || parseFloat(confirmOverride) <= 0 || isNaN(parseFloat(confirmOverride))}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {confirming ? 'Submitting...' : 'Confirm Submit'}
              </button>
              <button
                type="button"
                onClick={() => setShowConfirmPanel(false)}
                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Back to Editing
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MBM-335: create a payee on the fly */}
      <CreateIndividualPayeeModal
        isOpen={createPayee?.kind === 'individual'}
        initialName={createPayee?.query}
        onClose={() => setCreatePayee(null)}
        onSuccess={(payload: any) => { if (payload?.payee) applyNewPayee({ type: 'PERSON', id: payload.payee.id, name: payload.payee.fullName }) }}
        onError={err => toast.error(err)}
      />
      <CreateContractorPayeeModal
        isOpen={createPayee?.kind === 'contractor'}
        initialName={createPayee?.query}
        onClose={() => setCreatePayee(null)}
        onSuccess={(payload: any) => { if (payload?.payee) applyNewPayee({ type: 'PERSON', id: payload.payee.id, name: payload.payee.fullName }) }}
        onError={err => toast.error(err)}
      />
      {createPayee?.kind === 'supplier' && supplierBusinessId && (
        <SupplierEditor
          businessId={supplierBusinessId}
          initialName={createPayee.query}
          onCancel={() => setCreatePayee(null)}
          onSave={async (supplierId?: string) => {
            if (!supplierId) { setCreatePayee(null); setPayeeRefresh(n => n + 1); return }
            let name = createPayee.query || 'New supplier'
            try {
              const res = await fetch(`/api/business/${supplierBusinessId}/suppliers`, { credentials: 'include' })
              const data = res.ok ? await res.json() : null
              const found = (data?.data ?? []).find((s: any) => s.id === supplierId)
              if (found?.name) name = found.name
            } catch { /* keep the typed name */ }
            applyNewPayee({ type: 'SUPPLIER', id: supplierId, name })
          }}
        />
      )}
    </div>
  )
}
