'use client'

export const dynamic = 'force-dynamic'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ContentLayout } from '@/components/layout/content-layout'
import { useToastContext } from '@/components/ui/toast'
import { useConfirm } from '@/components/ui/confirm-modal'
import { PayeeSelector } from '@/components/expense-account/payee-selector'
import { CreateIndividualPayeeModal } from '@/components/expense-account/create-individual-payee-modal'
import { CreateContractorPayeeModal } from '@/components/expense-account/create-contractor-payee-modal'
import { SupplierEditor } from '@/components/suppliers/supplier-editor'
import { formatDateTimeZim } from '@/lib/date-utils'
import { generatePettyCashVoucher } from '@/lib/pdf-utils'

const STATUS_STYLES: Record<string, string> = {
  PENDING:   'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  APPROVED:  'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  SETTLED:   'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  CANCELLED: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
function todayISO() {
  return new Date().toISOString().split('T')[0]
}

function getDefaultDomainName(businessType: string): string {
  const map: Record<string, string> = {
    restaurant: 'Restaurant', grocery: 'Groceries', clothing: 'Clothing',
    hardware: 'Hardware', construction: 'Construction', vehicles: 'Vehicle',
  }
  return map[businessType] || 'Business'
}

function QuickCreateModal({ isOpen, title, placeholder, onClose, onSubmit, loading }: {
  isOpen: boolean; title: string; placeholder: string
  onClose: () => void; onSubmit: (name: string, emoji: string) => void; loading: boolean
}) {
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('📂')
  if (!isOpen) return null
  const handleSubmit = () => { if (name.trim()) { onSubmit(name.trim(), emoji.trim() || '📂'); setName(''); setEmoji('📂') } }
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg p-5 w-full max-w-sm shadow-2xl border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3">{title}</h3>
        <div className="space-y-3">
          <div className="flex gap-2">
            <input type="text" value={emoji} onChange={e => setEmoji(e.target.value)}
              className="w-14 px-2 py-2 text-xl text-center border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800" maxLength={2} />
            <input type="text" value={name} onChange={e => setName(e.target.value)} autoFocus
              onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
              placeholder={placeholder} maxLength={50} />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => { onClose(); setName(''); setEmoji('📂') }} disabled={loading}
              className="px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
            <button type="button" onClick={handleSubmit} disabled={loading || !name.trim()}
              className="px-3 py-1.5 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function SearchableSelectInline({
  value, options, onChange, placeholder = 'Select...', disabled = false, loading = false,
}: {
  value: string
  options: { id: string; label: string }[]
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  loading?: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = options.find(o => o.id === value)
  const filtered = search ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase())) : options

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false); setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (id: string) => { onChange(id); setIsOpen(false); setSearch('') }

  if (loading) return <div className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400">Loading...</div>
  if (disabled) return <div className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed">{placeholder}</div>

  return (
    <div ref={containerRef} className="relative">
      <button type="button" onClick={() => { setIsOpen(!isOpen); if (!isOpen) setTimeout(() => inputRef.current?.focus(), 0) }}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-left flex items-center justify-between bg-white dark:bg-gray-800">
        <span className={selected ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}>{selected ? selected.label : placeholder}</span>
        <svg className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-hidden">
          <div className="p-2 border-b border-gray-200 dark:border-gray-700">
            <input ref={inputRef} type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Type to search..."
              className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
          </div>
          <div className="overflow-y-auto max-h-48">
            {value && <button type="button" onClick={() => handleSelect('')} className="w-full px-3 py-2 text-left text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">Clear selection</button>}
            {filtered.length === 0 ? <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">No matches found</div> :
              filtered.map(option => (
                <button key={option.id} type="button" onClick={() => handleSelect(option.id)}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 ${option.id === value ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium' : 'text-gray-900 dark:text-gray-100'}`}>
                  {option.label}
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function PettyCashDetailPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const returnUrl = searchParams.get('returnUrl')
  const requestId = params.requestId as string
  const toast = useToastContext()
  const confirm = useConfirm()

  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [reversedExpanded, setReversedExpanded] = useState(false)
  const [canRequest, setCanRequest] = useState(false)
  const [canApprove, setCanApprove] = useState(false)

  // Approve modal state
  const [showApprove, setShowApprove] = useState(false)
  const [approvedAmount, setApprovedAmount] = useState('')
  const [approving, setApproving] = useState(false)

  // Settle modal state
  const [showSettle, setShowSettle] = useState(false)
  const [returnAmount, setReturnAmount] = useState('')
  const [settleNotes, setSettleNotes] = useState('')
  const [settling, setSettling] = useState(false)
  const [showReturnConfirm, setShowReturnConfirm] = useState(false)
  // Simple settle confirmation for requesters (no cash-return form)
  const [showRequesterSettle, setShowRequesterSettle] = useState(false)
  const [requesterSettling, setRequesterSettling] = useState(false)

  // EcoCash Mark as Sent state
  const [showMarkSent, setShowMarkSent] = useState(false)
  const [markSentTxCode, setMarkSentTxCode] = useState('')
  const [markingSent, setMarkingSent] = useState(false)

  // Transactions state
  const [transactions, setTransactions] = useState<any[]>([])
  const [txSummary, setTxSummary] = useState<{ approvedAmount: number; spentAmount: number; remainingBalance: number } | null>(null)
  const [loadingTx, setLoadingTx] = useState(false)

  // Bucket balances for the request's business (cash + ecocash separate)
  const [bucketBalance, setBucketBalance] = useState<number | null>(null)
  const [ecocashBucketBalance, setEcocashBucketBalance] = useState<number | null>(null)

  // Record Spend modal state
  const [showSpend, setShowSpend] = useState(false)
  const [spendAmount, setSpendAmount] = useState('')
  const [spendDesc, setSpendDesc] = useState('')
  const [spendDate, setSpendDate] = useState(todayISO())
  const [spendDomainId, setSpendDomainId] = useState('')
  const [spendCategoryId, setSpendCategoryId] = useState('')
  const [spendPayee, setSpendPayee] = useState<{ type: string; id: string; name: string } | null>(null)
  const [submittingSpend, setSubmittingSpend] = useState(false)
  const [categoryDomains, setCategoryDomains] = useState<{ id: string; name: string; emoji: string }[]>([])
  const [spendSubcategories, setSpendSubcategories] = useState<{ id: string; name: string; emoji: string }[]>([])
  const [loadingSpendSubcats, setLoadingSpendSubcats] = useState(false)
  const [spendSubSubcategoryId, setSpendSubSubcategoryId] = useState('')
  const [spendSubSubcategories, setSpendSubSubcategories] = useState<{ id: string; name: string; emoji: string }[]>([])
  const [loadingSpendSubSubcats, setLoadingSpendSubSubcats] = useState(false)
  const [payeeRefreshTrigger, setPayeeRefreshTrigger] = useState(0)
  const [showIndividualModal, setShowIndividualModal] = useState(false)
  const [individualInitialName, setIndividualInitialName] = useState('')
  const [showSupplierModal, setShowSupplierModal] = useState(false)
  const [supplierInitialName, setSupplierInitialName] = useState('')
  const [showContractorModal, setShowContractorModal] = useState(false)
  const [contractorInitialName, setContractorInitialName] = useState('')
  const [showCreateSubcat, setShowCreateSubcat] = useState(false)
  const [showCreateSubSubcat, setShowCreateSubSubcat] = useState(false)
  const [creatingSubItem, setCreatingSubItem] = useState(false)
  const [spendPaymentChannel, setSpendPaymentChannel] = useState<'CASH' | 'ECOCASH'>('CASH')
  const [spendEcocashCode, setSpendEcocashCode] = useState('')

  // Signature pad state (approve modal)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawing = useRef(false)
  const hasDrawn = useRef(false)

  function getCanvasPos(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if ('touches' in e) {
      return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY }
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY }
  }

  function startDraw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault()
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    isDrawing.current = true
    hasDrawn.current = true
    const { x, y } = getCanvasPos(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  function draw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault()
    if (!isDrawing.current) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const { x, y } = getCanvasPos(e)
    ctx.lineTo(x, y)
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
  }

  function stopDraw() { isDrawing.current = false }

  function clearSignature() {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
    hasDrawn.current = false
  }

  function getSignatureDataURL(): string | null {
    if (!hasDrawn.current) return null
    return canvasRef.current?.toDataURL('image/png') ?? null
  }

  const fetchTransactions = useCallback(async () => {
    setLoadingTx(true)
    try {
      const res = await fetch(`/api/petty-cash/requests/${requestId}/transactions`, { credentials: 'include' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load transactions')
      setTransactions(json.data.transactions)
      setTxSummary(json.data.summary)
      // Pre-fill settle returnAmount from remaining balance
      setReturnAmount(String(json.data.summary.remainingBalance.toFixed(2)))
    } catch {
      // Non-fatal — transactions panel just stays empty
    } finally {
      setLoadingTx(false)
    }
  }, [requestId])

  const fetchDetail = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/petty-cash/requests/${requestId}`, { credentials: 'include' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load')
      setData(json.data)
      if (json.data.request?.requestedAmount) {
        setApprovedAmount(String(json.data.request.requestedAmount))
      }
      // Fetch bucket balance for this business
      if (json.data.request?.businessId) {
        try {
          const bucketRes = await fetch(`/api/cash-bucket?businessId=${json.data.request.businessId}`, { credentials: 'include' })
          const bucketJson = await bucketRes.json()
          const biz = bucketJson.data?.balances?.find((b: any) => b.businessId === json.data.request.businessId)
          setBucketBalance(biz ? biz.cashBalance : 0)
          setEcocashBucketBalance(biz ? biz.ecocashBalance : 0)
        } catch {
          // non-fatal
        }
      }
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }, [requestId, toast])

  useEffect(() => {
    if (status === 'loading') return
    if (!session) { router.push('/auth/signin'); return }
    fetchDetail()
    fetch('/api/petty-cash/my-permissions', { credentials: 'include' })
      .then(r => r.json())
      .then(j => { setCanRequest(j.canRequest ?? false); setCanApprove(j.canApprove ?? false) })
      .catch(() => {})
    // Load category domains for Record Spend modal
    fetch('/api/expense-categories/hierarchical', { credentials: 'include' })
      .then(r => r.json())
      .then(j => {
        const domains: { id: string; name: string; emoji: string }[] = []
        ;(j.domains || []).forEach((d: any) => {
          ;(d.expense_categories || []).forEach((c: any) => {
            if (c.isDomainCategory) domains.push({ id: c.id, name: c.name, emoji: c.emoji || '💰' })
          })
        })
        setCategoryDomains(domains)
      })
      .catch(() => {})
  }, [status, session, router, fetchDetail])

  // Fetch transactions whenever the request is APPROVED or SETTLED
  useEffect(() => {
    if (data?.request?.status === 'APPROVED' || data?.request?.status === 'SETTLED') {
      fetchTransactions()
    }
  }, [data?.request?.status, fetchTransactions])

  // Silent background refresh — updates balance/transactions without triggering loading states
  const refreshSilent = useCallback(async () => {
    try {
      const res = await fetch(`/api/petty-cash/requests/${requestId}/transactions`, { credentials: 'include' })
      if (!res.ok) return
      const json = await res.json()
      setTransactions(json.data.transactions)
      setTxSummary(json.data.summary)
      setReturnAmount(String(json.data.summary.remainingBalance.toFixed(2)))
    } catch { /* non-fatal */ }
  }, [requestId])

  // Auto-refresh when tab regains focus — ensures approvers see requester's latest spends
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && data?.request?.status === 'APPROVED') {
        refreshSilent()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('focus', handleVisibility)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('focus', handleVisibility)
    }
  }, [refreshSilent, data?.request?.status])

  // Poll every 30 seconds while request is APPROVED — silently updates balance data only
  useEffect(() => {
    if (data?.request?.status !== 'APPROVED') return
    const interval = setInterval(refreshSilent, 30000)
    return () => clearInterval(interval)
  }, [data?.request?.status, refreshSilent])

  const loadSpendSubcategories = useCallback(async (domainId: string) => {
    if (!domainId) { setSpendSubcategories([]); return }
    setLoadingSpendSubcats(true)
    try {
      const r = await fetch(`/api/expense-categories/${domainId}/subcategories`, { credentials: 'include' })
      const j = await r.json()
      const subs = (j.subcategories || []).sort((a: any, b: any) => a.name.localeCompare(b.name))
      setSpendSubcategories(subs)
    } catch { setSpendSubcategories([]) }
    finally { setLoadingSpendSubcats(false) }
  }, [])

  async function handleCreateSupplierSuccess(supplierId?: string) {
    setShowSupplierModal(false)
    if (!supplierId) { setPayeeRefreshTrigger(t => t + 1); return }
    let supplierName = 'New Supplier'
    try {
      const businessId = data?.request?.businessId
      if (businessId) {
        const res = await fetch(`/api/business/${businessId}/suppliers`, { credentials: 'include' })
        if (res.ok) {
          const d = await res.json()
          const found = (d.data || []).find((s: any) => s.id === supplierId)
          if (found) supplierName = found.name
        }
      }
    } catch { /* ignore */ }
    setSpendPayee({ type: 'SUPPLIER', id: supplierId, name: supplierName })
    setPayeeRefreshTrigger(t => t + 1)
  }

  const loadSpendSubSubcategories = useCallback(async (subcategoryId: string) => {
    if (!subcategoryId) { setSpendSubSubcategories([]); return }
    setLoadingSpendSubSubcats(true)
    try {
      const r = await fetch(`/api/expense-categories/subcategories/${subcategoryId}/sub-subcategories`, { credentials: 'include' })
      const j = await r.json()
      const subs = (j.subSubcategories || []).sort((a: any, b: any) => a.name.localeCompare(b.name))
      setSpendSubSubcategories(subs)
    } catch { setSpendSubSubcategories([]) }
    finally { setLoadingSpendSubSubcats(false) }
  }, [])

  async function handleCreateSpendSubcategory(name: string, emoji: string) {
    if (!spendDomainId) return
    setCreatingSubItem(true)
    try {
      const res = await fetch('/api/expense-categories/flat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ name, emoji, color: '#3B82F6', domainId: spendDomainId, requiresSubcategory: false, isUserCreated: true }),
      })
      const d = await res.json()
      if (res.ok && d.data?.category) {
        await loadSpendSubcategories(spendDomainId)
        setSpendCategoryId(d.data.category.id)
        setSpendSubSubcategoryId('')
        setSpendSubSubcategories([])
        setShowCreateSubcat(false)
      } else { toast.error(d.error || 'Failed to create sub-category') }
    } catch { toast.error('Failed to create sub-category') }
    finally { setCreatingSubItem(false) }
  }

  async function handleCreateSpendSubSubcategory(name: string, emoji: string) {
    if (!spendCategoryId) return
    setCreatingSubItem(true)
    try {
      const res = await fetch('/api/expense-categories/subcategories', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ categoryId: spendCategoryId, name, emoji }),
      })
      const d = await res.json()
      if (res.ok && d.subcategory) {
        await loadSpendSubSubcategories(spendCategoryId)
        setSpendSubSubcategoryId(d.subcategory.id)
        setShowCreateSubSubcat(false)
      } else { toast.error(d.error || 'Failed to create sub-subcategory') }
    } catch { toast.error('Failed to create sub-subcategory') }
    finally { setCreatingSubItem(false) }
  }

  // Auto-select domain based on the request's business type once both are loaded
  useEffect(() => {
    if (!data?.request?.business?.type || categoryDomains.length === 0 || spendDomainId) return
    const domainName = getDefaultDomainName(data.request.business.type)
    const match = categoryDomains.find(d => d.name === domainName)
    if (match) { setSpendDomainId(match.id); loadSpendSubcategories(match.id) }
  }, [data, categoryDomains, spendDomainId, loadSpendSubcategories])

  async function handleApprove(e: React.FormEvent) {
    e.preventDefault()
    if (Number(approvedAmount) <= 0) { toast.error('Enter a valid approved amount'); return }
    setApproving(true)
    try {
      const signatureDataURL = getSignatureDataURL()
      const res = await fetch(`/api/petty-cash/requests/${requestId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          approvedAmount: Number(approvedAmount),
          ...(signatureDataURL ? { signatureData: signatureDataURL } : {}),
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to approve')
      toast.push(`Request approved for ${fmt(Number(approvedAmount))}`, { type: 'success' })
      setShowApprove(false)
      clearSignature()
      fetchDetail()
      window.dispatchEvent(new Event('pending-actions:refresh'))
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setApproving(false)
    }
  }

  async function handleMarkSent(e: React.FormEvent) {
    e.preventDefault()
    if (!markSentTxCode.trim()) { toast.error('EcoCash transaction code is required'); return }
    setMarkingSent(true)
    try {
      const res = await fetch(`/api/petty-cash/requests/${requestId}/mark-sent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ecocashTransactionCode: markSentTxCode.trim() }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to mark as sent')
      toast.push('EcoCash sent confirmed', { type: 'success' })
      setShowMarkSent(false)
      setMarkSentTxCode('')
      fetchDetail()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setMarkingSent(false)
    }
  }

  async function handleSettle(e: React.FormEvent) {
    e.preventDefault()
    const ret = Number(returnAmount) || 0
    if (ret < 0) { toast.error('Return amount cannot be negative'); return }
    // If there are unused funds, require explicit confirmation before settling
    if (ret > 0) {
      setShowReturnConfirm(true)
      return
    }
    await doSettle(ret)
  }

  async function requestSettle() {
    setRequesterSettling(true)
    try {
      const res = await fetch(`/api/petty-cash/requests/${requestId}/request-settle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to submit settlement request')
      toast.push('Settlement request submitted. An approver will complete the settlement.', { type: 'success' })
      setShowRequesterSettle(false)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setRequesterSettling(false)
    }
  }

  async function doSettle(ret: number) {
    setSettling(true)
    try {
      const res = await fetch(`/api/petty-cash/requests/${requestId}/settle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ returnAmount: ret, notes: settleNotes.trim() || undefined }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to settle')
      toast.push('Request settled', { type: 'success' })
      setShowSettle(false)
      setShowReturnConfirm(false)
      fetchDetail()
      window.dispatchEvent(new Event('pending-actions:refresh'))
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSettling(false)
    }
  }

  async function handleCancel() {
    const ok = await confirm({ title: 'Cancel Request', description: 'Are you sure you want to cancel this petty cash request?' })
    if (!ok) return
    try {
      const res = await fetch(`/api/petty-cash/requests/${requestId}/cancel`, { method: 'POST', credentials: 'include' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to cancel')
      toast.push('Request cancelled', { type: 'success' })
      fetchDetail()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  async function handleRecordSpend(e: React.FormEvent) {
    e.preventDefault()
    if (Number(spendAmount) <= 0) { toast.error('Enter a valid amount'); return }
    if (!spendDesc.trim()) { toast.error('Description is required'); return }
    if (spendPaymentChannel === 'ECOCASH' && !spendEcocashCode.trim()) { toast.error('EcoCash transaction code is required'); return }
    setSubmittingSpend(true)
    try {
      const res = await fetch(`/api/petty-cash/requests/${requestId}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          amount: Number(spendAmount),
          description: spendDesc.trim(),
          transactionDate: spendDate || todayISO(),
          payeeType: spendPayee?.type ?? 'NONE',
          paymentChannel: spendPaymentChannel,
          ...(spendPaymentChannel === 'ECOCASH' ? { ecocashTransactionCode: spendEcocashCode.trim() } : {}),
          ...(spendCategoryId ? { categoryId: spendCategoryId } : {}),
          ...(spendSubSubcategoryId ? { subcategoryId: spendSubSubcategoryId } : {}),
          ...(spendPayee?.type === 'SUPPLIER' ? { payeeSupplierId: spendPayee.id } : {}),
          ...(spendPayee?.type === 'EMPLOYEE' ? { payeeEmployeeId: spendPayee.id } : {}),
          ...(spendPayee?.type === 'USER' ? { payeeUserId: spendPayee.id } : {}),
          ...(spendPayee?.type === 'PERSON' ? { payeePersonId: spendPayee.id } : {}),
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to record spend')
      toast.push('Spend recorded', { type: 'success' })
      setShowSpend(false)
      setSpendAmount('')
      setSpendDesc('')
      setSpendDate(todayISO())
      setSpendCategoryId('')
      setSpendSubSubcategoryId('')
      setSpendSubSubcategories([])
      setSpendPayee(null)
      setSpendPaymentChannel('CASH')
      setSpendEcocashCode('')
      fetchTransactions()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSubmittingSpend(false)
    }
  }

  if (status === 'loading' || loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900 dark:border-gray-100" /></div>
  }
  if (!data) return null

  const req = data.request
  const expenseAccountId = req.expenseAccount?.id ?? null

  const reversedFromPayments: any[] = data.reversedFromPayments ?? []

  const renderNotes = (notes: string | null) => {
    if (!notes) return <span className="italic text-gray-400">No notes provided</span>
    const reversedMatch = notes.match(/^Reversed from payments:\s*(.+)/i)
    if (reversedMatch && reversedFromPayments.length > 0) {
      return (
        <div className="space-y-2">
          <button
            onClick={() => setReversedExpanded(v => !v)}
            className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
          >
            <span>{reversedExpanded ? '▾' : '▸'}</span>
            <span>Reversed from {reversedFromPayments.length} payment{reversedFromPayments.length !== 1 ? 's' : ''}</span>
          </button>
          {reversedExpanded && (
            <div className="space-y-2">
              {reversedFromPayments.map((p: any) => (
                <div key={p.id} className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-sm space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {p.category ? `${p.category.emoji ?? ''} ${p.category.name}` : 'Payment'}
                    </span>
                    <span className="font-semibold text-red-600 dark:text-red-400">-${Number(p.amount).toFixed(2)}</span>
                  </div>
                  {p.payeeName && (
                    <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                      <span className="text-gray-400">To:</span>
                      <span>{p.payeeName}</span>
                    </div>
                  )}
                  {p.payeeContact && (
                    <div className="text-gray-500 dark:text-gray-500 text-xs">{p.payeeContact}</div>
                  )}
                  <div className="text-gray-400 dark:text-gray-500 text-xs">
                    {new Date(p.paymentDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </div>
                  {p.notes && <div className="text-gray-500 dark:text-gray-400 italic text-xs border-t border-gray-200 dark:border-gray-700 pt-1.5">{p.notes}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )
    }
    return <span className="whitespace-pre-wrap">{notes}</span>
  }

  const approvedAmt = req.approvedAmount ?? 0
  const returnAmt = req.returnAmount ?? 0
  const remaining = txSummary?.remainingBalance ?? (approvedAmt - (req.spentAmount ?? 0))
  const spentAmt = txSummary?.spentAmount ?? (req.spentAmount ?? 0)
  const isApproved = req.status === 'APPROVED'
  const isEcocashRequest = (req as any).paymentChannel === 'ECOCASH'

  // Determine if current user is the requester (can record spends)
  const isRequester = session?.user && (session.user as any).id === req.requestedBy
  const canRecordSpend = isApproved && isRequester

  return (
    <ContentLayout title="Petty Cash Request">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <button onClick={() => router.push(returnUrl ?? '/petty-cash')} className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-2 flex items-center gap-1">
              &larr; Back to list
            </button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{req.purpose}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{req.business?.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_STYLES[req.status] || 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
              {req.status}
            </span>
            {(req.status === 'APPROVED' || req.status === 'SETTLED') && req.approver && (
              <>
                <button
                  onClick={() => generatePettyCashVoucher({
                    requestId: req.id,
                    businessName: req.business?.name ?? '',
                    requesterName: req.requester?.name ?? '',
                    approverName: req.approver.name,
                    purpose: req.purpose,
                    requestedAmount: Number(req.requestedAmount),
                    approvedAmount: Number(req.approvedAmount),
                    expenseAccount: req.expenseAccount ? `${req.expenseAccount.accountName} (${req.expenseAccount.accountNumber})` : '',
                    paymentChannel: (req as any).paymentChannel === 'ECOCASH' ? 'ECOCASH' : 'CASH',
                    approvedAt: req.approvedAt,
                    notes: req.notes ?? null,
                    transactions: transactions.length > 0 ? transactions : undefined,
                    spentAmount: spentAmt,
                    returnedAmount: req.status === 'SETTLED' ? returnAmt : undefined,
                  }, 'print')}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  title="Print voucher"
                >
                  🖨️ Print
                </button>
                <button
                  onClick={() => generatePettyCashVoucher({
                    requestId: req.id,
                    businessName: req.business?.name ?? '',
                    requesterName: req.requester?.name ?? '',
                    approverName: req.approver.name,
                    purpose: req.purpose,
                    requestedAmount: Number(req.requestedAmount),
                    approvedAmount: Number(req.approvedAmount),
                    expenseAccount: req.expenseAccount ? `${req.expenseAccount.accountName} (${req.expenseAccount.accountNumber})` : '',
                    paymentChannel: (req as any).paymentChannel === 'ECOCASH' ? 'ECOCASH' : 'CASH',
                    approvedAt: req.approvedAt,
                    notes: req.notes ?? null,
                    transactions: transactions.length > 0 ? transactions : undefined,
                    spentAmount: spentAmt,
                    returnedAmount: req.status === 'SETTLED' ? returnAmt : undefined,
                  }, 'save')}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  title="Save as PDF"
                >
                  📄 PDF
                </button>
              </>
            )}
          </div>
        </div>

        {/* Settled banner */}
        {req.status === 'SETTLED' && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">✅</span>
              <div>
                <h2 className="text-base font-bold text-green-800 dark:text-green-300">Request Settled</h2>
                {req.settler && req.settledAt && (
                  <p className="text-xs text-green-600 dark:text-green-400">
                    Settled by {req.settler.name} on {fmtDate(req.settledAt)}
                  </p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-green-200 dark:border-green-700">
                <p className="text-xs text-green-600 dark:text-green-400 mb-1">Approved</p>
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{fmt(approvedAmt)}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-green-200 dark:border-green-700">
                <p className="text-xs text-red-500 dark:text-red-400 mb-1">Net Spent</p>
                <p className="text-lg font-bold text-red-600 dark:text-red-400">{fmt(approvedAmt - returnAmt)}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-green-200 dark:border-green-700">
                <p className="text-xs text-green-600 dark:text-green-400 mb-1">Returned</p>
                <p className="text-lg font-bold text-green-700 dark:text-green-400">{fmt(returnAmt)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Balance card — shown while APPROVED */}
        {isApproved && txSummary && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-3">💵 Petty Cash Balance</h2>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">Approved</p>
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{fmt(txSummary.approvedAmount)}</p>
              </div>
              <div>
                <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">Spent</p>
                <p className="text-lg font-bold text-red-600 dark:text-red-400">{fmt(txSummary.spentAmount)}</p>
              </div>
              <div>
                <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">Remaining</p>
                <p className={`text-lg font-bold ${txSummary.remainingBalance > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                  {fmt(txSummary.remainingBalance)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Details card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500 dark:text-gray-400">Requested by</p>
            <p className="font-medium text-gray-900 dark:text-gray-100">{req.requester?.name || '—'}</p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400">Requested at</p>
            <p className="font-medium text-gray-900 dark:text-gray-100">{fmtDate(req.requestedAt)}</p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400">Requested amount</p>
            <p className="font-medium text-lg text-gray-900 dark:text-gray-100">{fmt(req.requestedAmount)}</p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400">Approved amount</p>
            <p className={`font-medium text-lg ${req.approvedAmount != null ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}`}>
              {req.approvedAmount != null ? fmt(req.approvedAmount) : '—'}
            </p>
          </div>
          {req.approver && (
            <>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Approved by</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">{req.approver.name}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Approved at</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">{req.approvedAt ? fmtDate(req.approvedAt) : '—'}</p>
              </div>
            </>
          )}
          {req.status === 'SETTLED' && (
            <>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Net spend</p>
                <p className="font-medium text-lg text-red-600 dark:text-red-400">{fmt(approvedAmt - returnAmt)}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Returned</p>
                <p className="font-medium text-lg text-green-600 dark:text-green-400">{fmt(returnAmt)}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Settled by</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">{req.settler?.name || '—'}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Settled at</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">{req.settledAt ? fmtDate(req.settledAt) : '—'}</p>
              </div>
            </>
          )}
          {req.expenseAccount && (
            <div className="col-span-2">
              <p className="text-gray-500 dark:text-gray-400">Expense account</p>
              <p className="font-medium text-gray-900 dark:text-gray-100">{req.expenseAccount.accountName} ({req.expenseAccount.accountNumber})</p>
            </div>
          )}
          <div>
            <p className="text-gray-500 dark:text-gray-400">Payment channel</p>
            <p className="font-medium text-gray-900 dark:text-gray-100">
              {isEcocashRequest ? '📱 EcoCash' : '💵 Cash'}
            </p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400">Priority</p>
            <p className={`font-medium ${(req as any).priority === 'URGENT' ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}`}>
              {(req as any).priority === 'URGENT' ? '🚨 Urgent' : 'Normal'}
            </p>
          </div>
          {req.notes && (
            <div className="col-span-2">
              <p className="text-gray-500 dark:text-gray-400">Notes</p>
              <p className="font-medium text-gray-900 dark:text-gray-100">{renderNotes(req.notes)}</p>
            </div>
          )}
          {req.signatureData && (
            <div className="col-span-2">
              <p className="text-gray-500 dark:text-gray-400 mb-1">Recipient Signature</p>
              <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-2 inline-block bg-white">
                <img src={req.signatureData} alt="Recipient signature" className="max-h-24 max-w-full" />
              </div>
            </div>
          )}
        </div>

        {/* Action buttons */}
        {req.status === 'PENDING' && (canApprove || canRequest) && (
          <div className="flex gap-3">
            {canApprove && (
              <button
                onClick={() => setShowApprove(true)}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                Approve & Issue Cash
              </button>
            )}
            {(canRequest || canApprove) && (
              <button
                onClick={handleCancel}
                className="px-5 py-2.5 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                Cancel Request
              </button>
            )}
          </div>
        )}

        {isApproved && (
          <div className="flex gap-3 flex-wrap">
            {canRecordSpend && (
              <button
                onClick={() => { setSpendPaymentChannel(isEcocashRequest ? 'ECOCASH' : 'CASH'); setSpendEcocashCode(''); setShowSpend(true) }}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                {isEcocashRequest ? '+ Record EcoCash Spend' : '+ Record Spend'}
              </button>
            )}
            {(canApprove || isRequester) && (
              <button
                onClick={() => canApprove ? setShowSettle(true) : setShowRequesterSettle(true)}
                className={`px-5 py-2.5 text-white rounded-lg text-sm font-medium ${isEcocashRequest ? 'bg-orange-600 hover:bg-orange-700' : 'bg-green-600 hover:bg-green-700'}`}
              >
                {isEcocashRequest ? '📱 Settle Request' : 'Settle Request'}
              </button>
            )}
          </div>
        )}

        {/* Spending history panel */}
        {(isApproved || req.status === 'SETTLED') && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h2 className="font-semibold text-gray-800 dark:text-gray-200">Spending History</h2>
              <span className="text-sm text-gray-500 dark:text-gray-400">{transactions.length} transaction{transactions.length !== 1 ? 's' : ''}</span>
            </div>
            {loadingTx ? (
              <p className="px-5 py-6 text-sm text-gray-400 dark:text-gray-500 text-center">Loading...</p>
            ) : transactions.length === 0 ? (
              <p className="px-5 py-6 text-sm text-gray-400 dark:text-gray-500 text-center">No spends recorded yet.{canRecordSpend ? ' Use "Record Spend" to track each expense.' : ''}</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-medium text-gray-600 dark:text-gray-400">Date</th>
                    <th className="px-4 py-2.5 text-left font-medium text-gray-600 dark:text-gray-400">Payee</th>
                    <th className="px-4 py-2.5 text-left font-medium text-gray-600 dark:text-gray-400">Description</th>
                    <th className="px-4 py-2.5 text-left font-medium text-gray-600 dark:text-gray-400">Category</th>
                    <th className="px-4 py-2.5 text-left font-medium text-gray-600 dark:text-gray-400">Payment</th>
                    <th className="px-4 py-2.5 text-right font-medium text-gray-600 dark:text-gray-400">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                  {transactions.map((t: any) => (
                    <tr key={t.id}>
                      <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        <div>{formatDateTimeZim(t.transactionDate)}</div>
                        {t.creator?.name && (
                          <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">by {t.creator.name}</div>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">
                        {t.payeeName ? (
                          <>
                            <div className="font-medium">{t.payeeName}</div>
                            {t.payeePhone && <div className="text-xs text-gray-400 dark:text-gray-500">{t.payeePhone}</div>}
                          </>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">{t.description}</td>
                      <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">
                        {t.category ? `${t.category.emoji} ${t.category.name}` : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {t.paymentChannel === 'ECOCASH' ? (
                          <span className="flex flex-col gap-0.5">
                            <span className="text-orange-600 dark:text-orange-400 font-medium text-xs">📱 EcoCash</span>
                            {t.ecocashTransactionCode && (
                              <span className="font-mono text-xs text-gray-500 dark:text-gray-400">{t.ecocashTransactionCode}</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-green-600 dark:text-green-400 text-xs">💵 Cash</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium tabular-nums text-red-600 dark:text-red-400">{fmt(t.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
                  <tr>
                    <td colSpan={5} className="px-4 py-2.5 font-medium text-gray-700 dark:text-gray-300">Total spent</td>
                    <td className="px-4 py-2.5 text-right font-bold tabular-nums text-red-600 dark:text-red-400">{fmt(spentAmt)}</td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        )}

        {/* Approve modal */}
        {showApprove && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Approve Petty Cash Request</h2>
              <form onSubmit={handleApprove} className="space-y-4">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-sm flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Requested amount</p>
                    <p className="font-semibold text-lg text-gray-900 dark:text-gray-100">{fmt(req.requestedAmount)}</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded ${isEcocashRequest ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'}`}>
                    {isEcocashRequest ? '📱 EcoCash' : '💵 Cash'}
                  </span>
                </div>
                {(() => {
                  const relevantBalance = isEcocashRequest ? ecocashBucketBalance : bucketBalance
                  const amt = Number(approvedAmount || 0)
                  const sufficient = relevantBalance !== null && relevantBalance >= amt
                  if (relevantBalance === null) return null
                  return (
                    <div className={`rounded-lg p-3 text-sm ${sufficient ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">{isEcocashRequest ? '📱 EcoCash wallet balance' : '💵 Cash available in bucket'}</p>
                          <p className={`font-semibold text-lg ${sufficient ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>{fmt(relevantBalance)}</p>
                        </div>
                        {amt > 0 && (
                          <div className="text-right">
                            <p className="text-gray-500 dark:text-gray-400">After approval</p>
                            <p className="font-semibold text-lg text-amber-600 dark:text-amber-400">{fmt(relevantBalance - amt)}</p>
                          </div>
                        )}
                      </div>
                      {!sufficient && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                          {isEcocashRequest ? 'Insufficient EcoCash funds — top up EcoCash wallet first' : 'Insufficient — add EOD cash before approving'}
                        </p>
                      )}
                    </div>
                  )
                })()}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Approved Amount <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">$</span>
                    <input
                      type="number" min="0.01" step="0.01" max={req.requestedAmount}
                      value={approvedAmount}
                      onChange={e => setApprovedAmount(e.target.value)}
                      className="w-full pl-8 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
                      required
                    />
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Cannot exceed requested amount</p>
                </div>
                <p className="text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
                  {isEcocashRequest
                    ? '📱 EcoCash will be sent to the requester via EcoCash mobile money transfer.'
                    : '💵 Cash will be drawn from the physical cash bucket. Hand the cash to the requester.'}
                </p>
                {/* Signature pad */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Recipient Signature <span className="text-gray-400 dark:text-gray-500 font-normal">(optional)</span>
                    </label>
                    <button type="button" onClick={clearSignature} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 underline">Clear</button>
                  </div>
                  <canvas
                    ref={canvasRef} width={440} height={120}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg bg-white cursor-crosshair touch-none"
                    style={{ height: '120px' }}
                    onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
                    onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
                  />
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Have the recipient sign above before issuing cash</p>
                </div>
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => { setShowApprove(false); clearSignature() }} className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
                  <button
                    type="submit"
                    disabled={approving || (() => { const b = isEcocashRequest ? ecocashBucketBalance : bucketBalance; return b !== null && b < Number(approvedAmount || 0) })()}
                    title={(() => { const b = isEcocashRequest ? ecocashBucketBalance : bucketBalance; return b !== null && b < Number(approvedAmount || 0) ? (isEcocashRequest ? 'Insufficient EcoCash funds' : 'Insufficient cash in bucket — add EOD cash first') : undefined })()}
                    className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {approving ? 'Processing...' : 'Approve & Issue'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Record Spend modal */}
        {showSpend && (
          <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl p-6">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Record Spend</h2>
                <div className="flex items-center gap-4 text-sm">
                  {(() => {
                    const bal = txSummary?.remainingBalance ?? remaining
                    const amt = Number(spendAmount) || 0
                    const after = bal - amt
                    const over = amt > 0 && amt > bal
                    return (
                      <>
                        <span className="text-gray-500 dark:text-gray-400">
                          Remaining: <span className={`font-semibold ${over ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>{fmt(bal)}</span>
                        </span>
                        {amt > 0 && (
                          <span className="text-gray-500 dark:text-gray-400">
                            After: <span className={`font-semibold ${after < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>{fmt(after)}</span>
                          </span>
                        )}
                      </>
                    )
                  })()}
                </div>
              </div>
              <form onSubmit={handleRecordSpend} className="mt-4 space-y-4">
                {/* Row 1: Amount + Date */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Amount <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">$</span>
                      <input
                        type="number" min="0.01" step="0.01"
                        max={txSummary?.remainingBalance ?? remaining}
                        value={spendAmount}
                        onChange={e => setSpendAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-8 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
                    <input
                      type="text"
                      value={spendDate ? spendDate.split('-').reverse().join('/') : ''}
                      onChange={e => {
                        const v = e.target.value.replace(/[^0-9/]/g, '')
                        // Parse DD/MM/YYYY → YYYY-MM-DD for storage
                        const parts = v.split('/')
                        if (parts.length === 3 && parts[0].length === 2 && parts[1].length === 2 && parts[2].length === 4) {
                          setSpendDate(`${parts[2]}-${parts[1]}-${parts[0]}`)
                        } else {
                          // Store raw while typing
                          setSpendDate(v)
                        }
                      }}
                      placeholder="DD/MM/YYYY"
                      maxLength={10}
                      className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>

                {/* Description — full width */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={spendDesc}
                    onChange={e => setSpendDesc(e.target.value)}
                    placeholder="e.g. Office supplies — 3 reams paper"
                    maxLength={200}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  />
                </div>

                {/* Row 2: Locked category domain + searchable sub-category */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                    <div className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 flex items-center gap-2 cursor-not-allowed">
                      {categoryDomains.find(d => d.id === spendDomainId)
                        ? <>{categoryDomains.find(d => d.id === spendDomainId)!.emoji} {categoryDomains.find(d => d.id === spendDomainId)!.name}</>
                        : <span className="text-gray-400 dark:text-gray-500 italic">No domain matched</span>}
                      <svg className="w-3.5 h-3.5 text-gray-400 ml-auto shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15l-8-8m8 8l8-8" /></svg>
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Locked to business type</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Sub-category <span className="text-gray-400 dark:text-gray-500 font-normal">(optional)</span>
                      </label>
                      {spendDomainId && (
                        <button type="button" onClick={() => setShowCreateSubcat(true)}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline">+ Add new</button>
                      )}
                    </div>
                    <SearchableSelectInline
                      value={spendCategoryId}
                      options={spendSubcategories.map(c => ({ id: c.id, label: `${c.emoji} ${c.name}` }))}
                      onChange={(val) => {
                        setSpendCategoryId(val)
                        setSpendSubSubcategoryId('')
                        setSpendSubSubcategories([])
                        if (val) loadSpendSubSubcategories(val)
                      }}
                      placeholder={loadingSpendSubcats ? 'Loading...' : spendDomainId ? 'Select sub-category...' : 'No domain selected'}
                      loading={loadingSpendSubcats}
                      disabled={!spendDomainId}
                    />
                  </div>
                </div>

                {/* Row 3: Sub-subcategory (shown when sub-category selected) */}
                {spendCategoryId && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-start-2">
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Sub-subcategory <span className="text-gray-400 dark:text-gray-500 font-normal">(optional)</span>
                        </label>
                        <button type="button" onClick={() => setShowCreateSubSubcat(true)}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline">+ Add new</button>
                      </div>
                      <SearchableSelectInline
                        value={spendSubSubcategoryId}
                        options={spendSubSubcategories.map(c => ({ id: c.id, label: `${c.emoji} ${c.name}` }))}
                        onChange={setSpendSubSubcategoryId}
                        placeholder={loadingSpendSubSubcats ? 'Loading...' : 'Select sub-subcategory...'}
                        loading={loadingSpendSubSubcats}
                      />
                    </div>
                  </div>
                )}

                {/* Payee — full width */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Payee <span className="text-gray-400 dark:text-gray-500 font-normal">(optional)</span>
                  </label>
                  <PayeeSelector
                    value={spendPayee}
                    onChange={setSpendPayee}
                    onCreateIndividual={(q) => { setIndividualInitialName(q || ''); setShowIndividualModal(true) }}
                    onCreateSupplier={(q) => { setSupplierInitialName(q || ''); setShowSupplierModal(true) }}
                    onCreateContractor={(q) => { setContractorInitialName(q || ''); setShowContractorModal(true) }}
                    refreshTrigger={payeeRefreshTrigger}
                  />
                </div>

                {/* Payment Method — locked to request's channel */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Payment Method <span className="text-red-500">*</span>
                    <span className="ml-2 text-xs font-normal text-gray-400 dark:text-gray-500">(locked to request type)</span>
                  </label>
                  <div className="flex gap-2">
                    {isEcocashRequest ? (
                      <div className="flex-1 py-2 rounded-lg text-sm font-medium border bg-orange-500 border-orange-500 text-white text-center">
                        📱 EcoCash
                      </div>
                    ) : (
                      <div className="flex-1 py-2 rounded-lg text-sm font-medium border bg-green-600 border-green-600 text-white text-center">
                        💵 Cash
                      </div>
                    )}
                  </div>
                  {spendPaymentChannel === 'ECOCASH' && (
                    <div className="mt-2">
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        EcoCash Transaction Code <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={spendEcocashCode}
                        onChange={e => setSpendEcocashCode(e.target.value.toUpperCase())}
                        placeholder="e.g. ECD250316123456"
                        className="w-full px-3 py-2 border border-orange-300 dark:border-orange-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500 outline-none text-sm font-mono"
                        required
                        autoFocus
                      />
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setShowSpend(false)} className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
                  {(() => {
                    const bal = txSummary?.remainingBalance ?? remaining
                    const amt = Number(spendAmount) || 0
                    const insufficient = amt > 0 && amt > bal
                    return (
                      <button type="submit"
                        disabled={submittingSpend || insufficient}
                        title={insufficient ? `Amount exceeds remaining balance of ${fmt(bal)}` : undefined}
                        className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
                        {submittingSpend ? 'Recording...' : insufficient ? 'Insufficient Funds' : 'Record Spend'}
                      </button>
                    )
                  })()}
                </div>
              </form>
            </div>
            </div>
          </div>
        )}

        {/* Mark EcoCash as Sent modal */}
        {showMarkSent && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">📱 Mark EcoCash as Sent</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Amount: {fmt(req.approvedAmount ?? 0)} — {req.purpose}</p>
              <form onSubmit={handleMarkSent} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">EcoCash Transaction Code <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={markSentTxCode}
                    onChange={e => setMarkSentTxCode(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg font-mono bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-teal-500"
                    placeholder="e.g. ECD1234567"
                    required
                    autoFocus
                  />
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowMarkSent(false)} className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
                  <button type="submit" disabled={markingSent || !markSentTxCode.trim()} className="flex-1 px-4 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50">
                    {markingSent ? 'Confirming...' : 'Confirm Sent'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Unused funds return confirmation modal */}
        {showReturnConfirm && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-sm p-6">
              <div className="flex flex-col items-center text-center mb-4">
                <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-3">
                  <span className="text-2xl">💵</span>
                </div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Unused Funds</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  There is <span className="font-bold text-amber-600 dark:text-amber-400">{fmt(Number(returnAmount))}</span> in un-used funds.
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                  Confirm you have physically received these funds back. They will be credited to the cash bucket.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowReturnConfirm(false)}
                  disabled={settling}
                  className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => doSettle(Number(returnAmount))}
                  disabled={settling}
                  className="flex-1 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {settling ? 'Settling...' : 'Confirm Receipt & Settle'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Requester settle confirmation — simple, no financial editing */}
        {showRequesterSettle && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Request Settlement</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                This will notify the approver that you are ready to settle. They will review your receipts and complete the settlement.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowRequesterSettle(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={requestSettle}
                  disabled={requesterSettling}
                  className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {requesterSettling ? 'Submitting...' : 'Notify Approver'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Settle modal */}
        {showSettle && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                {isEcocashRequest ? '📱 Settle Request' : 'Settle Petty Cash Request'}
              </h2>
              <form onSubmit={handleSettle} className="space-y-4">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Approved</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{fmt(approvedAmt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Spent (tracked)</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{fmt(spentAmt)}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-200 dark:border-gray-600 pt-1 mt-1">
                    <span className="text-gray-600 dark:text-gray-300 font-medium">
                      {isEcocashRequest ? 'EcoCash to return' : 'Calculated return'}
                    </span>
                    <span className="font-bold text-green-600 dark:text-green-400">{fmt(remaining)}</span>
                  </div>
                </div>

                {transactions.length === 0 && (
                  <p className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-2">
                    No spends were tracked via "Record Spend". Enter the return amount manually below.
                  </p>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {isEcocashRequest ? 'EcoCash Returned to Bucket' : 'Cash Returned to Cashier'}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">$</span>
                    <input
                      type="number" readOnly
                      value={returnAmount}
                      className="w-full pl-8 pr-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 cursor-not-allowed"
                    />
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Unused balance — automatically calculated.</p>
                </div>

                {Number(returnAmount) > 0 && (
                  <div className={`rounded-lg p-3 text-sm ${isEcocashRequest ? 'bg-orange-50 dark:bg-orange-900/20' : 'bg-green-50 dark:bg-green-900/20'}`}>
                    <div className={`flex justify-between ${isEcocashRequest ? 'text-orange-800 dark:text-orange-300' : 'text-green-800 dark:text-green-300'}`}>
                      <span>Net cost to business</span>
                      <span className="font-semibold">{fmt(approvedAmt - Number(returnAmount))}</span>
                    </div>
                    <p className={`mt-1 text-xs ${isEcocashRequest ? 'text-orange-700 dark:text-orange-400' : 'text-green-700 dark:text-green-400'}`}>
                      {isEcocashRequest
                        ? `${fmt(Number(returnAmount))} EcoCash will be credited back to the EcoCash cash box.`
                        : `${fmt(Number(returnAmount))} will be credited back to the business cash bucket.`}
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Settlement Notes <span className="text-gray-400 dark:text-gray-500 font-normal">(optional)</span></label>
                  <textarea
                    value={settleNotes}
                    onChange={e => setSettleNotes(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 outline-none resize-none text-sm"
                    placeholder="e.g. All receipts verified"
                  />
                </div>
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setShowSettle(false)} className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
                  <button type="submit" disabled={settling} className={`flex-1 px-4 py-2.5 text-white rounded-lg text-sm font-medium disabled:opacity-50 ${isEcocashRequest ? 'bg-orange-600 hover:bg-orange-700' : 'bg-green-600 hover:bg-green-700'}`}>
                    {settling ? 'Settling...' : 'Confirm Settlement'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {showIndividualModal && (
        <CreateIndividualPayeeModal
          isOpen={showIndividualModal}
          onClose={() => setShowIndividualModal(false)}
          onSuccess={(payload) => {
            setShowIndividualModal(false)
            if (payload.payee) {
              setSpendPayee({ type: 'PERSON', id: payload.payee.id, name: payload.payee.fullName })
              setPayeeRefreshTrigger(t => t + 1)
            }
          }}
          initialName={individualInitialName}
        />
      )}

      {showSupplierModal && data?.request?.businessId && (
        <SupplierEditor
          businessId={data.request.businessId}
          onSave={handleCreateSupplierSuccess}
          onCancel={() => setShowSupplierModal(false)}
          initialName={supplierInitialName}
        />
      )}

      {showContractorModal && (
        <CreateContractorPayeeModal
          isOpen={showContractorModal}
          onClose={() => setShowContractorModal(false)}
          onSuccess={(payload) => {
            setShowContractorModal(false)
            if (payload.payee) {
              setSpendPayee({ type: 'CONTRACTOR', id: payload.payee.id, name: payload.payee.fullName })
              setPayeeRefreshTrigger(t => t + 1)
            }
          }}
          initialName={contractorInitialName}
        />
      )}

      <QuickCreateModal
        isOpen={showCreateSubcat}
        title="Add Sub-category"
        placeholder="e.g. Shirts, Dresses..."
        onClose={() => setShowCreateSubcat(false)}
        onSubmit={handleCreateSpendSubcategory}
        loading={creatingSubItem}
      />
      <QuickCreateModal
        isOpen={showCreateSubSubcat}
        title="Add Sub-subcategory"
        placeholder="e.g. Cotton Shirts..."
        onClose={() => setShowCreateSubSubcat(false)}
        onSubmit={handleCreateSpendSubSubcategory}
        loading={creatingSubItem}
      />
    </ContentLayout>
  )
}
