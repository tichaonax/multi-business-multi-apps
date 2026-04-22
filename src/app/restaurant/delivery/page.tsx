'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { BusinessTypeRoute } from '@/components/auth/business-type-route'
import { ContentLayout } from '@/components/layout/content-layout'
import { useToastContext } from '@/components/ui/toast'
import { generateDeliveryKitchenReceipt, generateDeliveryRunSheet } from '@/lib/printing/receipt-templates'
import type { DeliveryReceiptData, DeliveryRunSheetData } from '@/lib/printing/receipt-templates'

// ─── Types ────────────────────────────────────────────────────────────────────

type OrderStatus = 'PENDING' | 'READY' | 'DISPATCHED' | 'DELIVERED' | 'RETURNED' | 'CANCELLED'

type DeliveryOrder = {
  id: string
  orderId: string
  status: OrderStatus
  paymentMode: string
  creditUsed: number
  creditBalance: number
  deliveryNote?: string | null
  runId?: string | null
  createdAt: string
  order?: {
    id: string
    orderNumber: string
    totalAmount: number
    business_customers?: { id: string; name: string; phone?: string } | null
    business_order_items: { quantity: number; unitPrice: number; totalPrice: number }[]
  }
}

type Run = {
  id: string
  driverId: string
  vehicleId?: string | null
  vehiclePlate?: string | null
  odometerStart?: number | null
  odometerEnd?: number | null
  runDate: string
  dispatchedAt?: string | null
  completedAt?: string | null
  notes?: string | null
  driver?: { id: string; firstName?: string; lastName?: string; fullName?: string }
  orders?: { id: string; orderId: string; status: string }[]
}

type Employee = {
  id: string
  firstName: string
  lastName: string
  fullName?: string
}

type Vehicle = {
  id: string
  licensePlate: string
  make: string
  model: string
}

const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Pending',
  READY: 'Ready',
  DISPATCHED: 'Dispatched',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
}

const STATUS_COLORS: Record<OrderStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  READY: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  DISPATCHED: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  DELIVERED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  RETURNED: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  CANCELLED: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
}

const QUEUE_STATUSES: OrderStatus[] = ['PENDING', 'READY', 'DISPATCHED', 'DELIVERED', 'RETURNED']

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  PENDING: 'READY',
  READY: 'DISPATCHED',
  DISPATCHED: 'DELIVERED',
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DeliveryManagementPage() {
  const { currentBusinessId, currentBusiness, hasPermission, isSystemAdmin } = useBusinessPermissionsContext()
  const toast = useToastContext()
  const router = useRouter()

  const canViewQueue = isSystemAdmin || hasPermission('canViewDeliveryQueue')
  const canViewReports = isSystemAdmin || hasPermission('canViewDeliveryReports')
  const canPrintMarketing = isSystemAdmin || hasPermission('canPrintDeliveryMarketing')
  const isManager = isSystemAdmin || hasPermission('canManageDeliveryRuns')
  const canUpdateStatus = hasPermission('canUpdateDeliveryStatus') || isSystemAdmin

  useEffect(() => {
    if (!canViewQueue) router.replace('/restaurant')
  }, [canViewQueue, router])

  // Date filter
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10))

  // Orders
  const [orders, setOrders] = useState<DeliveryOrder[]>([])
  const [loadingOrders, setLoadingOrders] = useState(false)

  // Runs
  const [runs, setRuns] = useState<Run[]>([])
  const [loadingRuns, setLoadingRuns] = useState(false)

  // Employees and vehicles (for create run)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])

  // Printer
  const [printerId, setPrinterId] = useState<string | null>(null)

  // Create Run modal
  const [showCreateRun, setShowCreateRun] = useState(false)
  const [runDriverId, setRunDriverId] = useState('')
  const [runVehicleId, setRunVehicleId] = useState('')
  const [runVehiclePlate, setRunVehiclePlate] = useState('')
  const [runOdometerStart, setRunOdometerStart] = useState('')
  const [runNotes, setRunNotes] = useState('')
  const [creatingRun, setCreatingRun] = useState(false)

  // Complete Run modal (odometer end)
  const [completingRun, setCompletingRun] = useState<Run | null>(null)
  const [odometerEnd, setOdometerEnd] = useState('')
  const [savingOdometer, setSavingOdometer] = useState(false)

  // Assign orders to run
  const [assigningRun, setAssigningRun] = useState<Run | null>(null)
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set())

  // Updating status
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)

  // ── Load data ──────────────────────────────────────────────────────────────

  const loadOrders = useCallback(async () => {
    if (!currentBusinessId) return
    setLoadingOrders(true)
    try {
      const res = await fetch(`/api/restaurant/delivery/orders?businessId=${currentBusinessId}&date=${selectedDate}`)
      const data = await res.json()
      if (data.success) setOrders(data.orders)
    } catch {
      toast.error('Failed to load delivery orders')
    } finally {
      setLoadingOrders(false)
    }
  }, [currentBusinessId, selectedDate, toast])

  const loadRuns = useCallback(async () => {
    if (!currentBusinessId) return
    setLoadingRuns(true)
    try {
      const res = await fetch(`/api/restaurant/delivery/runs?businessId=${currentBusinessId}&date=${selectedDate}`)
      const data = await res.json()
      if (data.success) setRuns(data.runs)
    } catch {
      toast.error('Failed to load delivery runs')
    } finally {
      setLoadingRuns(false)
    }
  }, [currentBusinessId, selectedDate, toast])

  const loadEmployees = useCallback(async () => {
    if (!currentBusinessId) return
    try {
      const res = await fetch(`/api/employees?businessId=${currentBusinessId}&limit=200`)
      const data = await res.json()
      if (data.employees) setEmployees(data.employees)
    } catch { /* silent */ }
  }, [currentBusinessId])

  const loadVehicles = useCallback(async () => {
    if (!currentBusinessId) return
    try {
      const res = await fetch(`/api/vehicles?businessId=${currentBusinessId}`)
      const data = await res.json()
      if (data.success && data.data) setVehicles(data.data)
    } catch { /* silent */ }
  }, [currentBusinessId])

  const loadPrinter = useCallback(async () => {
    if (!currentBusinessId) return
    try {
      const res = await fetch(`/api/network-printers?businessId=${currentBusinessId}`)
      const data = await res.json()
      const printers = data.printers || data.data || []
      if (printers.length > 0) setPrinterId(printers[0].id)
    } catch { /* silent */ }
  }, [currentBusinessId])

  useEffect(() => {
    loadOrders()
    loadRuns()
  }, [loadOrders, loadRuns])

  useEffect(() => {
    if (showCreateRun) {
      loadEmployees()
      loadVehicles()
    }
  }, [showCreateRun, loadEmployees, loadVehicles])

  useEffect(() => {
    loadPrinter()
  }, [loadPrinter])

  // ── Status update ──────────────────────────────────────────────────────────

  const updateStatus = async (orderId: string, newStatus: OrderStatus) => {
    setUpdatingStatus(orderId)
    try {
      const res = await fetch(`/api/restaurant/delivery/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) { toast.error(data.error || 'Failed to update status'); return }
      setOrders(prev => prev.map(o => o.orderId === orderId ? { ...o, status: newStatus } : o))
    } catch {
      toast.error('Failed to update status')
    } finally {
      setUpdatingStatus(null)
    }
  }

  // ── Create run ─────────────────────────────────────────────────────────────

  const handleCreateRun = async () => {
    if (!currentBusinessId || !runDriverId) { toast.error('Select a driver'); return }
    setCreatingRun(true)
    try {
      const res = await fetch('/api/restaurant/delivery/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: currentBusinessId,
          driverId: runDriverId,
          vehicleId: runVehicleId || undefined,
          vehiclePlate: runVehiclePlate || undefined,
          odometerStart: runOdometerStart ? Number(runOdometerStart) : undefined,
          notes: runNotes || undefined,
          runDate: new Date().toISOString(),
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) { toast.error(data.error || 'Failed to create run'); return }
      toast.push('Run created')
      setShowCreateRun(false)
      setRunDriverId(''); setRunVehicleId(''); setRunVehiclePlate(''); setRunOdometerStart(''); setRunNotes('')
      loadRuns()
    } catch {
      toast.error('Failed to create run')
    } finally {
      setCreatingRun(false)
    }
  }

  // ── Complete run (odometer end) ────────────────────────────────────────────

  const handleCompleteRun = async () => {
    if (!completingRun) return
    setSavingOdometer(true)
    try {
      const res = await fetch(`/api/restaurant/delivery/runs/${completingRun.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          odometerEnd: odometerEnd ? Number(odometerEnd) : undefined,
          completedAt: new Date().toISOString(),
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) { toast.error(data.error || 'Failed to update run'); return }
      toast.push('Run completed')
      setCompletingRun(null); setOdometerEnd('')
      loadRuns()
    } catch {
      toast.error('Failed to complete run')
    } finally {
      setSavingOdometer(false)
    }
  }

  // ── Assign orders to run ───────────────────────────────────────────────────

  const handleAssignOrders = async () => {
    if (!assigningRun || selectedOrderIds.size === 0) return
    try {
      const res = await fetch(`/api/restaurant/delivery/runs/${assigningRun.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderIds: Array.from(selectedOrderIds),
          dispatchedAt: new Date().toISOString(),
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) { toast.error(data.error || 'Failed to assign orders'); return }
      toast.push('Orders assigned and run dispatched')
      setAssigningRun(null); setSelectedOrderIds(new Set())
      loadOrders(); loadRuns()

      // Print run sheet
      if (printerId && currentBusinessId) {
        printRunSheet(assigningRun, Array.from(selectedOrderIds))
      }
    } catch {
      toast.error('Failed to assign orders')
    }
  }

  // ── Print helpers ──────────────────────────────────────────────────────────

  const toBase64 = (s: string) => {
    const bytes = new Uint8Array(s.length)
    for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i) & 0xff
    let bin = ''; bytes.forEach(b => { bin += String.fromCharCode(b) }); return btoa(bin)
  }

  const sendRawPrint = async (escData: string) => {
    if (!printerId || !currentBusinessId) { toast.error('No printer configured'); return }
    try {
      const res = await fetch('/api/print/card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ printerId, businessId: currentBusinessId, escPosData: toBase64(escData) }),
      })
      if (!res.ok) toast.error('Print failed')
      else toast.push('Sent to printer')
    } catch {
      toast.error('Print error')
    }
  }

  const printRunSheet = (run: Run, orderIdsForRun?: string[]) => {
    const driver = run.driver
    const driverName = driver?.fullName || `${driver?.firstName || ''} ${driver?.lastName || ''}`.trim() || 'Driver'
    const runOrders = orders.filter(o => orderIdsForRun ? orderIdsForRun.includes(o.orderId) : o.runId === run.id)
    const sheetData: DeliveryRunSheetData = {
      businessName: currentBusiness?.businessName || '',
      runDate: new Date(run.runDate),
      driverName,
      vehiclePlate: run.vehiclePlate || undefined,
      odometerStart: run.odometerStart ?? undefined,
      orders: runOrders.map(o => ({
        orderNumber: o.order?.orderNumber || o.orderId.slice(-8),
        customerName: o.order?.business_customers?.name || 'Customer',
        deliveryNote: o.deliveryNote || undefined,
        amountDue: o.paymentMode === 'PREPAID' ? 0 : Number(o.order?.totalAmount || 0) - Number(o.creditUsed || 0),
        paymentMode: o.paymentMode,
      })),
    }
    sendRawPrint(generateDeliveryRunSheet(sheetData))
  }

  const printKitchenBatch = async () => {
    const pendingOrders = orders.filter(o => o.status === 'PENDING')
    if (pendingOrders.length === 0) { toast.error('No pending orders to print'); return }
    for (const o of pendingOrders) {
      const receiptData: DeliveryReceiptData = {
        businessName: currentBusiness?.businessName || '',
        orderNumber: o.order?.orderNumber || o.orderId.slice(-8),
        orderId: o.orderId,
        customerName: o.order?.business_customers?.name || 'Customer',
        customerPhone: o.order?.business_customers?.phone,
        items: (o.order?.business_order_items || []).map(i => ({ name: `Item`, quantity: i.quantity })),
        deliveryNote: o.deliveryNote || undefined,
        transactionDate: new Date(o.createdAt),
        orderTotal: Number(o.order?.totalAmount || 0),
      }
      await sendRawPrint(generateDeliveryKitchenReceipt(receiptData))
    }
  }

  // ── Derived data ───────────────────────────────────────────────────────────

  const ordersByStatus = QUEUE_STATUSES.reduce((acc, status) => {
    acc[status] = orders.filter(o => o.status === status)
    return acc
  }, {} as Record<OrderStatus, DeliveryOrder[]>)

  const unassignedReadyOrders = orders.filter(o => o.status === 'PENDING' || (o.status === 'READY' && !o.runId))

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <BusinessTypeRoute requiredBusinessType="restaurant">
      <ContentLayout title="Delivery Management">
        <div className="space-y-6">

          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <button
              onClick={() => setSelectedDate(new Date().toISOString().slice(0, 10))}
              className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              Today
            </button>
            <div className="flex-1" />
            {canViewReports && (
              <Link
                href="/restaurant/delivery/payments"
                className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Payments
              </Link>
            )}
            {canViewReports && (
              <Link
                href="/restaurant/delivery/reports"
                className="px-4 py-2 text-sm bg-sky-600 text-white rounded-lg hover:bg-sky-700"
              >
                Reports
              </Link>
            )}
            {canPrintMarketing && (
              <Link
                href="/restaurant/delivery/marketing"
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Marketing
              </Link>
            )}
            {isManager && (
              <button
                onClick={printKitchenBatch}
                className="px-4 py-2 text-sm bg-gray-700 text-white rounded-lg hover:bg-gray-800"
              >
                Print Kitchen Batch
              </button>
            )}
            {isManager && (
              <button
                onClick={() => setShowCreateRun(true)}
                className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:opacity-90"
              >
                + Create Run
              </button>
            )}
          </div>

          {/* Delivery Runs */}
          {runs.length > 0 && (
            <div className="card bg-white dark:bg-gray-900 p-4 rounded-lg shadow">
              <h2 className="text-base font-semibold mb-3 text-gray-800 dark:text-gray-200">Delivery Runs</h2>
              <div className="space-y-3">
                {runs.map(run => {
                  const driverName = run.driver?.fullName || `${run.driver?.firstName || ''} ${run.driver?.lastName || ''}`.trim()
                  const isComplete = !!run.completedAt
                  const isDispatched = !!run.dispatchedAt
                  return (
                    <div key={run.id} className="border border-gray-100 dark:border-gray-700 rounded-lg p-3">
                      <div className="flex flex-wrap items-center gap-2 justify-between">
                        <div>
                          <span className="font-medium text-gray-800 dark:text-gray-200">{driverName}</span>
                          {run.vehiclePlate && <span className="ml-2 text-sm text-gray-500">{run.vehiclePlate}</span>}
                          {run.odometerStart != null && <span className="ml-2 text-xs text-gray-400">Start: {run.odometerStart} km</span>}
                          {run.odometerEnd != null && <span className="ml-2 text-xs text-gray-400">End: {run.odometerEnd} km</span>}
                          <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${isComplete ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : isDispatched ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'}`}>
                            {isComplete ? 'Complete' : isDispatched ? 'Dispatched' : 'Created'}
                          </span>
                          <span className="ml-2 text-xs text-gray-400">{run.orders?.length || 0} orders</span>
                        </div>
                        <div className="flex gap-2">
                          {isManager && !isDispatched && (
                            <button
                              onClick={() => { setAssigningRun(run); setSelectedOrderIds(new Set()) }}
                              className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                              Assign & Dispatch
                            </button>
                          )}
                          {isManager && isDispatched && !isComplete && (
                            <button
                              onClick={() => { setCompletingRun(run); setOdometerEnd('') }}
                              className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                            >
                              Complete Run
                            </button>
                          )}
                          <button
                            onClick={() => printRunSheet(run)}
                            className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
                          >
                            Print Sheet
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Order Queue — status columns */}
          {loadingOrders ? (
            <div className="text-center text-gray-400 py-12">Loading orders...</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {QUEUE_STATUSES.map(status => (
                <div key={status} className="card bg-white dark:bg-gray-900 p-3 rounded-lg shadow">
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[status]}`}>
                      {STATUS_LABELS[status]}
                    </span>
                    <span className="text-xs text-gray-400">{ordersByStatus[status].length}</span>
                  </div>
                  <div className="space-y-2">
                    {ordersByStatus[status].length === 0 && (
                      <p className="text-xs text-gray-400 text-center py-4">No orders</p>
                    )}
                    {ordersByStatus[status].map(o => {
                      const customer = o.order?.business_customers
                      const orderNum = o.order?.orderNumber || o.orderId.slice(-8)
                      const total = Number(o.order?.totalAmount || 0)
                      const due = o.paymentMode === 'PREPAID' ? 0 : total - Number(o.creditUsed || 0)
                      const next = NEXT_STATUS[status]
                      return (
                        <div key={o.id} className="border border-gray-100 dark:border-gray-700 rounded-lg p-2 text-sm space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs font-medium text-gray-700 dark:text-gray-300">{orderNum}</span>
                            {o.paymentMode === 'ON_DELIVERY' || o.paymentMode === 'PARTIAL' ? (
                              <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">${due.toFixed(2)} due</span>
                            ) : (
                              <span className="text-xs text-green-600 dark:text-green-400">Prepaid</span>
                            )}
                          </div>
                          {customer && <div className="text-xs text-gray-600 dark:text-gray-400">{customer.name}{customer.phone ? ` · ${customer.phone}` : ''}</div>}
                          {o.deliveryNote && <div className="text-xs text-gray-500 italic truncate">{o.deliveryNote}</div>}
                          {o.runId && <div className="text-xs text-purple-500 dark:text-purple-400">In run</div>}
                          {canUpdateStatus && next && (
                            <button
                              onClick={() => updateStatus(o.orderId, next)}
                              disabled={updatingStatus === o.orderId}
                              className="w-full mt-1 py-1 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-700 dark:text-gray-300 disabled:opacity-50"
                            >
                              {updatingStatus === o.orderId ? '...' : `Mark ${STATUS_LABELS[next]}`}
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>

        {/* ── Modals ──────────────────────────────────────────────────────── */}

        {/* Create Run Modal */}
        {showCreateRun && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Create Delivery Run</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Driver *</label>
                <select
                  value={runDriverId}
                  onChange={e => setRunDriverId(e.target.value)}
                  className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Select driver...</option>
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>{e.fullName || `${e.firstName} ${e.lastName}`}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vehicle</label>
                <select
                  value={runVehicleId}
                  onChange={e => {
                    const v = vehicles.find(v => v.id === e.target.value)
                    setRunVehicleId(e.target.value)
                    setRunVehiclePlate(v?.licensePlate || '')
                  }}
                  className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Select vehicle...</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.licensePlate} — {v.make} {v.model}</option>
                  ))}
                </select>
              </div>

              {!runVehicleId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Plate (manual)</label>
                  <input
                    type="text"
                    value={runVehiclePlate}
                    onChange={e => setRunVehiclePlate(e.target.value)}
                    placeholder="e.g. ABC 1234"
                    className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Odometer Start (km)</label>
                <input
                  type="number"
                  value={runOdometerStart}
                  onChange={e => setRunOdometerStart(e.target.value)}
                  placeholder="e.g. 45230"
                  className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes (optional)</label>
                <input
                  type="text"
                  value={runNotes}
                  onChange={e => setRunNotes(e.target.value)}
                  className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowCreateRun(false)} className="flex-1 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-500">Cancel</button>
                <button onClick={handleCreateRun} disabled={creatingRun || !runDriverId} className="flex-1 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
                  {creatingRun ? 'Creating...' : 'Create Run'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Assign Orders Modal */}
        {assigningRun && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg p-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Assign Orders to Run</h3>
              <p className="text-sm text-gray-500">Select orders to include in this run. Dispatching will update their status.</p>

              {unassignedReadyOrders.length === 0 ? (
                <p className="text-sm text-gray-400">No unassigned orders available</p>
              ) : (
                <div className="max-h-72 overflow-y-auto space-y-2">
                  {unassignedReadyOrders.map(o => {
                    const customer = o.order?.business_customers
                    const orderNum = o.order?.orderNumber || o.orderId.slice(-8)
                    const checked = selectedOrderIds.has(o.orderId)
                    return (
                      <label key={o.id} className="flex items-start gap-3 p-2 border border-gray-100 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={e => {
                            const next = new Set(selectedOrderIds)
                            if (e.target.checked) next.add(o.orderId); else next.delete(o.orderId)
                            setSelectedOrderIds(next)
                          }}
                          className="mt-0.5 rounded"
                        />
                        <div className="text-sm">
                          <div className="font-mono font-medium text-gray-700 dark:text-gray-300">{orderNum}</div>
                          {customer && <div className="text-gray-500">{customer.name}{customer.phone ? ` · ${customer.phone}` : ''}</div>}
                          {o.deliveryNote && <div className="text-gray-400 italic text-xs">{o.deliveryNote}</div>}
                        </div>
                      </label>
                    )
                  })}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button onClick={() => { setAssigningRun(null); setSelectedOrderIds(new Set()) }} className="flex-1 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg text-sm font-medium">Cancel</button>
                <button
                  onClick={handleAssignOrders}
                  disabled={selectedOrderIds.size === 0}
                  className="flex-1 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
                >
                  Dispatch ({selectedOrderIds.size} orders)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Complete Run Modal */}
        {completingRun && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-sm p-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Complete Run</h3>
              {completingRun.odometerStart != null && (
                <p className="text-sm text-gray-500">Odometer start: {completingRun.odometerStart} km</p>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Odometer End (km)</label>
                <input
                  type="number"
                  value={odometerEnd}
                  onChange={e => setOdometerEnd(e.target.value)}
                  placeholder="e.g. 45280"
                  autoFocus
                  className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => { setCompletingRun(null); setOdometerEnd('') }} className="flex-1 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg text-sm font-medium">Cancel</button>
                <button onClick={handleCompleteRun} disabled={savingOdometer} className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                  {savingOdometer ? 'Saving...' : 'Complete Run'}
                </button>
              </div>
            </div>
          </div>
        )}

      </ContentLayout>
    </BusinessTypeRoute>
  )
}
