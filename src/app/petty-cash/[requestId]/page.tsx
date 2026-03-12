'use client'

export const dynamic = 'force-dynamic'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ContentLayout } from '@/components/layout/content-layout'
import { useToastContext } from '@/components/ui/toast'
import { useConfirm } from '@/components/ui/confirm-modal'

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

export default function PettyCashDetailPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const requestId = params.requestId as string
  const toast = useToastContext()
  const confirm = useConfirm()

  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
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

  // Transactions state
  const [transactions, setTransactions] = useState<any[]>([])
  const [txSummary, setTxSummary] = useState<{ approvedAmount: number; spentAmount: number; remainingBalance: number } | null>(null)
  const [loadingTx, setLoadingTx] = useState(false)

  // Bucket balance for the request's business
  const [bucketBalance, setBucketBalance] = useState<number | null>(null)

  // Record Spend modal state
  const [showSpend, setShowSpend] = useState(false)
  const [spendAmount, setSpendAmount] = useState('')
  const [spendDesc, setSpendDesc] = useState('')
  const [spendDate, setSpendDate] = useState(todayISO())
  const [spendCategoryId, setSpendCategoryId] = useState('')
  const [spendPayeeType, setSpendPayeeType] = useState('NONE')
  const [submittingSpend, setSubmittingSpend] = useState(false)
  const [categories, setCategories] = useState<{ id: string; name: string; emoji: string }[]>([])

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
          setBucketBalance(biz ? biz.balance : 0)
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
    // Load categories for Record Spend modal
    fetch('/api/expense-categories', { credentials: 'include' })
      .then(r => r.json())
      .then(j => {
        const cats: { id: string; name: string; emoji: string }[] = []
        ;(j.domains || j || []).forEach((domain: any) => {
          ;(domain.categories || []).forEach((c: any) => cats.push({ id: c.id, name: c.name, emoji: c.emoji || '💰' }))
        })
        setCategories(cats)
      })
      .catch(() => {})
  }, [status, session, router, fetchDetail])

  // Fetch transactions whenever the request is APPROVED
  useEffect(() => {
    if (data?.request?.status === 'APPROVED') {
      fetchTransactions()
    }
  }, [data?.request?.status, fetchTransactions])

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
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setApproving(false)
    }
  }

  async function handleSettle(e: React.FormEvent) {
    e.preventDefault()
    const ret = Number(returnAmount) || 0
    if (ret < 0) { toast.error('Return amount cannot be negative'); return }
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
      fetchDetail()
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
          payeeType: spendPayeeType,
          ...(spendCategoryId ? { categoryId: spendCategoryId } : {}),
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
      setSpendPayeeType('NONE')
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
  const approvedAmt = req.approvedAmount ?? 0
  const returnAmt = req.returnAmount ?? 0
  const remaining = txSummary?.remainingBalance ?? (approvedAmt - (req.spentAmount ?? 0))
  const spentAmt = txSummary?.spentAmount ?? (req.spentAmount ?? 0)
  const isApproved = req.status === 'APPROVED'

  // Determine if current user is the requester (can record spends)
  const isRequester = session?.user && (session.user as any).id === req.requestedBy
  const canRecordSpend = isApproved && (isRequester || canApprove)

  return (
    <ContentLayout title="Petty Cash Request">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <button onClick={() => router.push('/petty-cash')} className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-2 flex items-center gap-1">
              &larr; Back to list
            </button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{req.purpose}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{req.business?.name}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_STYLES[req.status] || 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
            {req.status}
          </span>
        </div>

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
          {req.notes && (
            <div className="col-span-2">
              <p className="text-gray-500 dark:text-gray-400">Notes</p>
              <p className="font-medium text-gray-900 dark:text-gray-100">{req.notes}</p>
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
            {(canRecordSpend || canRequest) && (
              <button
                onClick={() => canRecordSpend ? setShowSpend(true) : undefined}
                disabled={!canRecordSpend}
                title={!canRecordSpend ? 'You need the Petty Cash Approver permission to record spend' : undefined}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                + Record Spend
              </button>
            )}
            {canApprove && (
              <button
                onClick={() => setShowSettle(true)}
                className="px-5 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
              >
                Settle Request
              </button>
            )}
          </div>
        )}

        {/* Spending history panel */}
        {isApproved && (
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
                    <th className="px-4 py-2.5 text-left font-medium text-gray-600 dark:text-gray-400">Description</th>
                    <th className="px-4 py-2.5 text-left font-medium text-gray-600 dark:text-gray-400">Category</th>
                    <th className="px-4 py-2.5 text-right font-medium text-gray-600 dark:text-gray-400">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                  {transactions.map((t: any) => (
                    <tr key={t.id}>
                      <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {new Date(t.transactionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </td>
                      <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">{t.description}</td>
                      <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">
                        {t.category ? `${t.category.emoji} ${t.category.name}` : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium tabular-nums text-red-600 dark:text-red-400">{fmt(t.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
                  <tr>
                    <td colSpan={3} className="px-4 py-2.5 font-medium text-gray-700 dark:text-gray-300">Total spent</td>
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
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-sm">
                  <p className="text-gray-500 dark:text-gray-400">Requested amount</p>
                  <p className="font-semibold text-lg text-gray-900 dark:text-gray-100">{fmt(req.requestedAmount)}</p>
                </div>
                {bucketBalance !== null && (
                  <div className={`rounded-lg p-3 text-sm ${
                    bucketBalance >= Number(approvedAmount || 0)
                      ? 'bg-green-50 dark:bg-green-900/20'
                      : 'bg-red-50 dark:bg-red-900/20'
                  }`}>
                    <p className="text-gray-500 dark:text-gray-400">Cash available in bucket</p>
                    <p className={`font-semibold text-lg ${
                      bucketBalance >= Number(approvedAmount || 0)
                        ? 'text-green-700 dark:text-green-300'
                        : 'text-red-700 dark:text-red-300'
                    }`}>{fmt(bucketBalance)}</p>
                    {bucketBalance < Number(approvedAmount || 0) && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">Insufficient — add EOD cash before approving</p>
                    )}
                  </div>
                )}
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
                  This will debit the business account and deposit into the expense account. Physical cash must be handed to the requester.
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
                    disabled={approving || (bucketBalance !== null && bucketBalance < Number(approvedAmount || 0))}
                    title={bucketBalance !== null && bucketBalance < Number(approvedAmount || 0) ? 'Insufficient cash in bucket — add EOD cash first' : undefined}
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
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6 my-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Record Spend</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Remaining balance: <span className="font-semibold text-green-600 dark:text-green-400">{fmt(txSummary?.remainingBalance ?? remaining)}</span>
              </p>
              <form onSubmit={handleRecordSpend} className="space-y-4">
                {/* Amount */}
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

                {/* Description */}
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

                {/* Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
                  <input
                    type="date"
                    value={spendDate}
                    onChange={e => setSpendDate(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Category <span className="text-gray-400 dark:text-gray-500 font-normal">(optional)</span>
                  </label>
                  <select
                    value={spendCategoryId}
                    onChange={e => setSpendCategoryId(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">— No category —</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Payee type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Payee type <span className="text-gray-400 dark:text-gray-500 font-normal">(optional)</span>
                  </label>
                  <select
                    value={spendPayeeType}
                    onChange={e => setSpendPayeeType(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="NONE">None / General</option>
                    <option value="SUPPLIER">Supplier</option>
                    <option value="EMPLOYEE">Employee</option>
                    <option value="USER">User</option>
                    <option value="PERSON">Person</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setShowSpend(false)} className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
                  <button type="submit" disabled={submittingSpend} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                    {submittingSpend ? 'Recording...' : 'Record Spend'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Settle modal */}
        {showSettle && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Settle Petty Cash Request</h2>
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
                    <span className="text-gray-600 dark:text-gray-300 font-medium">Calculated return</span>
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
                    Cash Returned to Cashier <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">$</span>
                    <input
                      type="number" min="0" step="0.01" max={approvedAmt}
                      value={returnAmount}
                      onChange={e => setReturnAmount(e.target.value)}
                      className="w-full pl-8 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 outline-none"
                      required
                    />
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Pre-filled from tracked spends. Edit if physical cash differs.</p>
                </div>

                {Number(returnAmount) > 0 && (
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-sm">
                    <div className="flex justify-between text-green-800 dark:text-green-300">
                      <span>Net cost to business</span>
                      <span className="font-semibold">{fmt(approvedAmt - Number(returnAmount))}</span>
                    </div>
                    <p className="text-green-700 dark:text-green-400 mt-1 text-xs">
                      {fmt(Number(returnAmount))} will be credited back to the business account and cash bucket.
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
                  <button type="submit" disabled={settling} className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                    {settling ? 'Settling...' : 'Confirm Settlement'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </ContentLayout>
  )
}
