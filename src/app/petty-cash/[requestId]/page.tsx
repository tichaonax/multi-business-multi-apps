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
      setReturnAmount('0')
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
  }, [status, session, router, fetchDetail])

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

  if (status === 'loading' || loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900 dark:border-gray-100" /></div>
  }
  if (!data) return null

  const req = data.request
  const payments = data.recentPayments || []
  const approvedAmt = req.approvedAmount ?? 0
  const returnAmt = req.returnAmount ?? 0

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

        {req.status === 'APPROVED' && canApprove && (
          <div className="flex gap-3">
            <button
              onClick={() => setShowSettle(true)}
              className="px-5 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
            >
              Settle Request
            </button>
          </div>
        )}

        {/* Expense account payments context panel */}
        {req.status === 'APPROVED' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h2 className="font-semibold text-gray-800 dark:text-gray-200">Expense Account Activity (since approval)</h2>
              <span className="text-sm text-gray-500 dark:text-gray-400">{payments.length} payments</span>
            </div>
            {payments.length === 0 ? (
              <p className="px-5 py-6 text-sm text-gray-400 dark:text-gray-500 text-center">No payments recorded yet in this expense account since approval.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-medium text-gray-600 dark:text-gray-400">Date</th>
                    <th className="px-4 py-2.5 text-left font-medium text-gray-600 dark:text-gray-400">Notes</th>
                    <th className="px-4 py-2.5 text-left font-medium text-gray-600 dark:text-gray-400">Category</th>
                    <th className="px-4 py-2.5 text-right font-medium text-gray-600 dark:text-gray-400">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                  {payments.map((p: any) => (
                    <tr key={p.id}>
                      <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">{new Date(p.paymentDate).toLocaleDateString()}</td>
                      <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">{p.notes || '—'}</td>
                      <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">{p.category ? `${p.category.emoji || ''} ${p.category.name}` : '—'}</td>
                      <td className="px-4 py-2.5 text-right font-medium tabular-nums text-gray-900 dark:text-gray-100">{fmt(p.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
                  <tr>
                    <td colSpan={3} className="px-4 py-2.5 font-medium text-gray-700 dark:text-gray-300">Total spent from account</td>
                    <td className="px-4 py-2.5 text-right font-bold tabular-nums text-gray-900 dark:text-gray-100">{fmt(data.summary?.totalSpentFromAccount || 0)}</td>
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Approved Amount <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">$</span>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      max={req.requestedAmount}
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
                    ref={canvasRef}
                    width={440}
                    height={120}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg bg-white cursor-crosshair touch-none"
                    style={{ height: '120px' }}
                    onMouseDown={startDraw}
                    onMouseMove={draw}
                    onMouseUp={stopDraw}
                    onMouseLeave={stopDraw}
                    onTouchStart={startDraw}
                    onTouchMove={draw}
                    onTouchEnd={stopDraw}
                  />
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Have the recipient sign above before issuing cash</p>
                </div>

                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => { setShowApprove(false); clearSignature() }} className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
                  <button type="submit" disabled={approving} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                    {approving ? 'Processing...' : 'Approve & Issue'}
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
                    <span className="text-gray-500 dark:text-gray-400">Approved amount</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{fmt(approvedAmt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Total spent (from account)</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{fmt(data.summary?.totalSpentFromAccount || 0)}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Cash Returned to Cashier <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      max={approvedAmt}
                      value={returnAmount}
                      onChange={e => setReturnAmount(e.target.value)}
                      className="w-full pl-8 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 outline-none"
                      required
                    />
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Enter 0 if all cash was spent</p>
                </div>
                {Number(returnAmount) > 0 && (
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-sm">
                    <div className="flex justify-between text-green-800 dark:text-green-300">
                      <span>Net cost to business</span>
                      <span className="font-semibold">{fmt(approvedAmt - Number(returnAmount))}</span>
                    </div>
                    <p className="text-green-700 dark:text-green-400 mt-1 text-xs">
                      {fmt(Number(returnAmount))} will be credited back to the business account.
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
