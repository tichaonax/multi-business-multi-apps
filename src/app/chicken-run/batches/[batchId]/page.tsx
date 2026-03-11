'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { ContentLayout } from '@/components/layout/content-layout'
import { formatDate, formatCurrency } from '@/lib/date-format'
import { useAlert, useConfirm } from '@/components/ui/confirm-modal'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { DateInput } from '@/components/ui/date-input'
import { SupplierSelector } from '@/components/suppliers/supplier-selector'
import { ChickenRunCategorySelect } from '@/components/chicken-run/category-select'

const STATUS_STYLES: Record<string, string> = {
  GROWING:   'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  CULLING:   'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  COMPLETED: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
}

const TABS = ['Overview', 'Feed', 'Medication', 'Mortality', 'Vaccination', 'Weight', 'Culling']

const todayStr = () => new Date().toISOString().split('T')[0]

const INPUT_CLS = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'
const LABEL_CLS = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'
const SUBMIT_CLS = 'px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50'
const CARD_CLS = 'bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4'
const TH_CLS = 'text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider py-2 px-3'
const TD_CLS = 'py-2 px-3 text-sm text-gray-900 dark:text-gray-100'

export default function BatchDetailPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const batchId = params.batchId as string
  const alert = useAlert()
  const confirm = useConfirm()
  const { currentBusinessId } = useBusinessPermissionsContext()

  const [batch, setBatch] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const initialLoadDone = useRef(false)
  const tabParam = searchParams.get('tab')
  const [activeTab, setActiveTab] = useState(TABS.includes(tabParam || '') ? tabParam! : 'Overview')
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({ notes: '', expectedCullDate: '', status: '' })
  const [saving, setSaving] = useState(false)

  // Mortality form
  const [mortalityForm, setMortalityForm] = useState({ date: todayStr(), count: '', reason: 'UNKNOWN', notes: '' })
  const [mortalitySubmitting, setMortalitySubmitting] = useState(false)

  // Feed form
  const [feedForm, setFeedForm] = useState({ date: todayStr(), feedType: '', quantityKg: '', costPerKg: '', totalCost: '', notes: '' })
  const [feedSupplierId, setFeedSupplierId] = useState<string | null>(null)
  const [feedSubmitting, setFeedSubmitting] = useState(false)

  // Medication form
  const [medForm, setMedForm] = useState({ date: todayStr(), medicationName: '', quantityMl: '', quantityG: '', totalCost: '', administeredBy: '', notes: '' })
  const [medSubmitting, setMedSubmitting] = useState(false)

  // Weight form
  const [weightForm, setWeightForm] = useState({ date: todayStr(), weekAge: '', sampleSize: '', avgWeightKg: '', notes: '' })
  const [weightSubmitting, setWeightSubmitting] = useState(false)

  // Vaccination form
  const [vaccinationForm, setVaccinationForm] = useState({ date: todayStr(), vaccineName: '', dosage: '', scheduleId: '', notes: '' })
  const [vaccinationSubmitting, setVaccinationSubmitting] = useState(false)
  const [vaccinationSchedules, setVaccinationSchedules] = useState<any[]>([])

  // Culling state
  const [cullingForm, setCullingForm] = useState({ cullingDate: todayStr(), weightEntryMode: 'INDIVIDUAL', notes: '' })
  const [cullingSubmitting, setCullingSubmitting] = useState(false)
  const [cullingWeightInput, setCullingWeightInput] = useState('')
  const cullingWeightInputRef = useRef<HTMLInputElement>(null)
  const [pendingCullingWeights, setPendingCullingWeights] = useState<number[]>([])
  const [cullingSaving, setCullingSaving] = useState(false)
  const [cullingBulkText, setCullingBulkText] = useState('')
  const [cullingBulkPreview, setCullingBulkPreview] = useState<{ count: number; total: number; avg: number; min: number; max: number } | null>(null)
  const [cullingBulkTotalBirds, setCullingBulkTotalBirds] = useState('')
  const [cullingBulkTotalKg, setCullingBulkTotalKg] = useState('')
  const [cullingClosing, setCullingClosing] = useState(false)

  const fetchBatch = useCallback(async () => {
    if (!batchId) return
    // Only show the full-page spinner on the very first load
    if (!initialLoadDone.current) setLoading(true)
    try {
      const res = await fetch(`/api/chicken-run/batches/${batchId}`, { credentials: 'include' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load batch')
      setBatch(json.data)
      setEditForm({
        notes: json.data.notes || '',
        expectedCullDate: json.data.expectedCullDate
          ? new Date(json.data.expectedCullDate).toISOString().split('T')[0]
          : '',
        status: json.data.status,
      })
      // Seed weekAge default from batch age
      setWeightForm(prev => ({ ...prev, weekAge: String(json.data.ageInWeeks || 0) }))
      // Seed feedType from feedStage
      setFeedForm(prev => ({ ...prev, feedType: prev.feedType || json.data.feedStage || '' }))
      initialLoadDone.current = true
    } catch (e: any) {
      await alert({ title: 'Error', description: e.message })
    } finally {
      setLoading(false)
    }
  }, [batchId, alert])

  const fetchVaccinationSchedules = useCallback(async (businessId: string) => {
    try {
      const res = await fetch(`/api/chicken-run/vaccination-schedules?businessId=${businessId}`, { credentials: 'include' })
      const json = await res.json()
      if (res.ok) setVaccinationSchedules(json.data || [])
    } catch {
      // non-critical, ignore
    }
  }, [])

  useEffect(() => {
    if (status === 'loading') return
    if (!session) { router.push('/auth/signin'); return }
    fetchBatch()
  }, [session, status, router, fetchBatch])

  useEffect(() => {
    if (activeTab === 'Vaccination' && currentBusinessId) {
      fetchVaccinationSchedules(currentBusinessId)
    }
  }, [activeTab, currentBusinessId, fetchVaccinationSchedules])

  const handleSaveEdit = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/chicken-run/batches/${batchId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          status: editForm.status,
          notes: editForm.notes || null,
          expectedCullDate: editForm.expectedCullDate || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to save')
      setEditing(false)
      fetchBatch()
    } catch (e: any) {
      await alert({ title: 'Error', description: e.message })
    } finally {
      setSaving(false)
    }
  }

  const handleMortalitySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMortalitySubmitting(true)
    try {
      const res = await fetch(`/api/chicken-run/batches/${batchId}/mortality`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...mortalityForm, count: Number(mortalityForm.count) }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to save mortality record')
      setMortalityForm({ date: todayStr(), count: '', reason: 'UNKNOWN', notes: '' })
      fetchBatch()
    } catch (e: any) {
      await alert({ title: 'Error', description: e.message })
    } finally {
      setMortalitySubmitting(false)
    }
  }

  const handleFeedSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFeedSubmitting(true)
    try {
      const res = await fetch(`/api/chicken-run/batches/${batchId}/feed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...feedForm, supplierId: feedSupplierId || undefined }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to save feed record')
      setFeedForm({ date: todayStr(), feedType: batch?.feedStage || '', quantityKg: '', costPerKg: '', totalCost: '', notes: '' })
      setFeedSupplierId(null)
      fetchBatch()
    } catch (e: any) {
      await alert({ title: 'Error', description: e.message })
    } finally {
      setFeedSubmitting(false)
    }
  }

  const handleMedSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMedSubmitting(true)
    try {
      const res = await fetch(`/api/chicken-run/batches/${batchId}/medication`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(medForm),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to save medication record')
      setMedForm({ date: todayStr(), medicationName: '', quantityMl: '', quantityG: '', totalCost: '', administeredBy: '', notes: '' })
      fetchBatch()
    } catch (e: any) {
      await alert({ title: 'Error', description: e.message })
    } finally {
      setMedSubmitting(false)
    }
  }

  const handleWeightSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setWeightSubmitting(true)
    try {
      const res = await fetch(`/api/chicken-run/batches/${batchId}/weight`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(weightForm),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to save weight record')
      setWeightForm({ date: todayStr(), weekAge: String(batch?.ageInWeeks || 0), sampleSize: '', avgWeightKg: '', notes: '' })
      fetchBatch()
    } catch (e: any) {
      await alert({ title: 'Error', description: e.message })
    } finally {
      setWeightSubmitting(false)
    }
  }

  const handleVaccinationSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setVaccinationSubmitting(true)
    try {
      const res = await fetch(`/api/chicken-run/batches/${batchId}/vaccination`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(vaccinationForm),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to save vaccination record')
      setVaccinationForm({ date: todayStr(), vaccineName: '', dosage: '', scheduleId: '', notes: '' })
      fetchBatch()
    } catch (e: any) {
      await alert({ title: 'Error', description: e.message })
    } finally {
      setVaccinationSubmitting(false)
    }
  }

  const handleStartCulling = async (e: React.FormEvent) => {
    e.preventDefault()
    setCullingSubmitting(true)
    try {
      const res = await fetch(`/api/chicken-run/batches/${batchId}/cull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(cullingForm),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to start culling session')
      setCullingForm({ cullingDate: todayStr(), weightEntryMode: 'INDIVIDUAL', notes: '' })
      fetchBatch()
    } catch (e: any) {
      await alert({ title: 'Error', description: e.message })
    } finally {
      setCullingSubmitting(false)
    }
  }

  // Adds weight to local pending list — no API call, no refresh
  const handleAddCullingWeight = () => {
    const w = Number(cullingWeightInput)
    if (!cullingWeightInput || w <= 0) return
    setPendingCullingWeights(prev => [...prev, w])
    setCullingWeightInput('')
    setTimeout(() => cullingWeightInputRef.current?.focus(), 0)
  }

  // Submit all pending weights in one batch call — updates local state only, no full page reload
  const handleSavePendingWeights = async (cullingId: string, existingWeights: number[]) => {
    if (pendingCullingWeights.length === 0) return
    setCullingSaving(true)
    try {
      const combined = [...existingWeights, ...pendingCullingWeights]
      const res = await fetch(`/api/chicken-run/cullings/${cullingId}/weights/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ mode: 'BULK_LIST', weightList: combined }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to save weights')

      // Update local batch state — no page reload
      const total = combined.reduce((s, w) => s + w, 0)
      const avg = combined.length > 0 ? total / combined.length : 0
      setBatch((prev: any) => ({
        ...prev,
        cullingRecords: prev.cullingRecords.map((c: any) =>
          c.id !== cullingId ? c : {
            ...c,
            birdWeights: combined.map((w, i) => ({ id: `saved-${i}`, weightKg: w, sequenceNo: i + 1 })),
            quantityCulled: combined.length,
            totalWeightKg: total,
            avgWeightKg: avg,
          }
        ),
      }))
      setPendingCullingWeights([])
    } catch (e: any) {
      await alert({ title: 'Error', description: e.message })
    } finally {
      setCullingSaving(false)
    }
  }

  const handleDeleteCullingWeight = async (cullingId: string, weightId: string) => {
    const ok = await confirm({ title: 'Delete weight entry?', description: 'This will remove this weight and recalculate totals.' })
    if (!ok) return
    try {
      const res = await fetch(`/api/chicken-run/cullings/${cullingId}/weights/${weightId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to delete weight')
      fetchBatch()
    } catch (e: any) {
      await alert({ title: 'Error', description: e.message })
    }
  }

  const handleCloseCullingIndividual = async (culling: any, existingWeights: number[]) => {
    // Auto-save any unsaved pending weights first
    if (pendingCullingWeights.length > 0) {
      setCullingSaving(true)
      try {
        const combined = [...existingWeights, ...pendingCullingWeights]
        const res = await fetch(`/api/chicken-run/cullings/${culling.id}/weights/bulk`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ mode: 'BULK_LIST', weightList: combined }),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Failed to save weights')
        setPendingCullingWeights([])
      } catch (e: any) {
        await alert({ title: 'Error', description: e.message })
        setCullingSaving(false)
        return
      }
      setCullingSaving(false)
    }

    const totalBirds = existingWeights.length + pendingCullingWeights.length || culling.quantityCulled
    const ok = await confirm({
      title: 'Close culling session?',
      description: `This will close the session with ${totalBirds} birds. This cannot be undone.`,
    })
    if (!ok) return
    await closeCullingSession(culling.id)
  }

  const handleCullingBulkListPreview = () => {
    const lines = cullingBulkText.split('\n').map(l => l.trim()).filter(l => l !== '')
    const nums = lines.map(l => parseFloat(l)).filter(n => !isNaN(n) && n > 0)
    if (nums.length === 0) {
      setCullingBulkPreview(null)
      return
    }
    const total = nums.reduce((s: number, n: number) => s + n, 0)
    setCullingBulkPreview({
      count: nums.length,
      total,
      avg: total / nums.length,
      min: Math.min(...nums),
      max: Math.max(...nums),
    })
  }

  const handleCloseCullingBulkList = async (cullingId: string) => {
    const lines = cullingBulkText.split('\n').map(l => l.trim()).filter(l => l !== '')
    const nums = lines.map(l => parseFloat(l)).filter(n => !isNaN(n) && n > 0)
    if (nums.length === 0) {
      await alert({ title: 'No valid weights', description: 'Please enter at least one valid weight.' })
      return
    }
    const ok = await confirm({
      title: 'Submit bulk weights and close session?',
      description: `${nums.length} birds, total ${nums.reduce((s: number, n: number) => s + n, 0).toFixed(3)} kg. This cannot be undone.`,
    })
    if (!ok) return
    setCullingClosing(true)
    try {
      const res = await fetch(`/api/chicken-run/cullings/${cullingId}/weights/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ mode: 'BULK_LIST', weightList: nums }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to submit bulk weights')
      await closeCullingSession(cullingId)
    } catch (e: any) {
      await alert({ title: 'Error', description: e.message })
      setCullingClosing(false)
    }
  }

  const handleCloseCullingBulkTotal = async (cullingId: string) => {
    if (!cullingBulkTotalBirds || Number(cullingBulkTotalBirds) <= 0) {
      await alert({ title: 'Invalid input', description: 'Number of birds must be greater than 0.' })
      return
    }
    if (!cullingBulkTotalKg || Number(cullingBulkTotalKg) <= 0) {
      await alert({ title: 'Invalid input', description: 'Total weight must be greater than 0.' })
      return
    }
    const count = Number(cullingBulkTotalBirds)
    const total = Number(cullingBulkTotalKg)
    const ok = await confirm({
      title: 'Submit bulk total and close session?',
      description: `${count} birds, total ${total.toFixed(3)} kg, avg ${(total / count).toFixed(3)} kg/bird. This cannot be undone.`,
    })
    if (!ok) return
    setCullingClosing(true)
    try {
      const res = await fetch(`/api/chicken-run/cullings/${cullingId}/weights/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ mode: 'BULK_TOTAL', quantityCulled: count, totalWeightKg: total }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to submit bulk total')
      await closeCullingSession(cullingId)
    } catch (e: any) {
      await alert({ title: 'Error', description: e.message })
      setCullingClosing(false)
    }
  }

  const closeCullingSession = async (cullingId: string) => {
    setCullingClosing(true)
    try {
      const res = await fetch(`/api/chicken-run/cullings/${cullingId}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to close culling session')
      setCullingBulkText('')
      setCullingBulkPreview(null)
      setCullingBulkTotalBirds('')
      setCullingBulkTotalKg('')
      fetchBatch()
    } catch (e: any) {
      await alert({ title: 'Error', description: e.message })
    } finally {
      setCullingClosing(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900 dark:border-gray-100" />
      </div>
    )
  }
  if (!session || !batch) return null

  const mortalityHigh = parseFloat(batch.mortalityRateNum) >= 5

  return (
    <ContentLayout title={batch.batchNumber}>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
          <Link href="/chicken-run" className="hover:text-gray-700 dark:hover:text-gray-200">Chicken Run</Link>
          <span>/</span>
          <span className="text-gray-900 dark:text-gray-100">{batch.batchNumber}</span>
        </nav>

        {/* Batch Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{batch.batchNumber}</h1>
            <span className={`text-sm font-medium px-2.5 py-1 rounded-full ${STATUS_STYLES[batch.status] || STATUS_STYLES.COMPLETED}`}>
              {batch.status}
            </span>
          </div>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Edit
            </button>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Age</p>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{batch.ageInWeeks}w {batch.ageInDays % 7}d</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">{batch.feedStage} stage</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Alive</p>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{batch.currentAliveCount.toLocaleString()}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">of {batch.initialCount.toLocaleString()} initial</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Mortality Rate</p>
            <p className={`text-xl font-bold ${mortalityHigh ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}`}>
              {batch.mortalityRate}%
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">{batch.totalMortality} birds</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Cost</p>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(batch.totalCost)}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              F: {formatCurrency(batch.totalFeedCost)} | M: {formatCurrency(batch.totalMedCost)}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex gap-0 overflow-x-auto">
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab
                    ? 'border-green-600 text-green-600 dark:text-green-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'Overview' && (
          <div className="space-y-6">
            {editing ? (
              <div className={CARD_CLS}>
                <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Edit Batch</h2>
                <div>
                  <label className={LABEL_CLS}>Status</label>
                  <select
                    value={editForm.status}
                    onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))}
                    className={INPUT_CLS}
                  >
                    <option value="GROWING">GROWING</option>
                    <option value="CULLING">CULLING</option>
                    <option value="COMPLETED">COMPLETED</option>
                  </select>
                </div>
                <div>
                  <DateInput
                    value={editForm.expectedCullDate}
                    onChange={(d) => setEditForm(p => ({ ...p, expectedCullDate: d }))}
                    label="Expected Cull Date"
                    compact={true}
                  />
                </div>
                <div>
                  <label className={LABEL_CLS}>Notes</label>
                  <textarea
                    rows={3}
                    value={editForm.notes}
                    onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))}
                    className={INPUT_CLS + ' resize-none'}
                  />
                </div>
                <div className="flex gap-3">
                  <button onClick={handleSaveEdit} disabled={saving} className={SUBMIT_CLS}>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">Batch Details</h2>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <dt className="text-xs text-gray-500 dark:text-gray-400">Batch Number</dt>
                  <dd className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-0.5">{batch.batchNumber}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500 dark:text-gray-400">Status</dt>
                  <dd className="mt-0.5">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[batch.status] || STATUS_STYLES.COMPLETED}`}>
                      {batch.status}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500 dark:text-gray-400">Purchase Date</dt>
                  <dd className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-0.5">{formatDate(batch.purchaseDate)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500 dark:text-gray-400">Supplier</dt>
                  <dd className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-0.5">{batch.supplier?.name || '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500 dark:text-gray-400">Initial Count</dt>
                  <dd className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-0.5">{batch.initialCount.toLocaleString()} birds</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500 dark:text-gray-400">Cost Per Chick</dt>
                  <dd className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-0.5">{formatCurrency(Number(batch.costPerChick))}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500 dark:text-gray-400">Purchase Cost Total</dt>
                  <dd className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-0.5">{formatCurrency(Number(batch.purchaseCostTotal))}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500 dark:text-gray-400">Expected Cull Date</dt>
                  <dd className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-0.5">
                    {batch.expectedCullDate ? formatDate(batch.expectedCullDate) : '—'}
                  </dd>
                </div>
                {batch.notes && (
                  <div className="sm:col-span-2">
                    <dt className="text-xs text-gray-500 dark:text-gray-400">Notes</dt>
                    <dd className="text-sm text-gray-900 dark:text-gray-100 mt-0.5 whitespace-pre-wrap">{batch.notes}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        )}

        {/* Mortality Tab */}
        {activeTab === 'Mortality' && (
          <div className="space-y-6">
            <form onSubmit={handleMortalitySubmit} className={CARD_CLS}>
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Log Mortality</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <DateInput
                    value={mortalityForm.date}
                    onChange={(d) => setMortalityForm(p => ({ ...p, date: d }))}
                    label="Date"
                    required={true}
                    compact={true}
                  />
                </div>
                <div>
                  <label className={LABEL_CLS}>Count (birds died)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={mortalityForm.count}
                    onChange={e => setMortalityForm(p => ({ ...p, count: e.target.value }))}
                    className={INPUT_CLS}
                    placeholder="e.g. 3"
                  />
                </div>
                <div>
                  <label className={LABEL_CLS}>Reason</label>
                  <select
                    value={mortalityForm.reason}
                    onChange={e => setMortalityForm(p => ({ ...p, reason: e.target.value }))}
                    className={INPUT_CLS}
                  >
                    <option value="DISEASE">Disease</option>
                    <option value="INJURY">Injury</option>
                    <option value="PREDATOR">Predator</option>
                    <option value="UNKNOWN">Unknown</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className={LABEL_CLS}>Notes (optional)</label>
                  <input
                    type="text"
                    value={mortalityForm.notes}
                    onChange={e => setMortalityForm(p => ({ ...p, notes: e.target.value }))}
                    className={INPUT_CLS}
                    placeholder="Additional details"
                  />
                </div>
              </div>
              <button type="submit" disabled={mortalitySubmitting} className={SUBMIT_CLS}>
                {mortalitySubmitting ? 'Saving...' : 'Log Mortality'}
              </button>
            </form>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Mortality History ({batch.mortalityLogs?.length || 0} records)
              </h2>
              {batch.mortalityLogs?.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className={TH_CLS}>Date</th>
                        <th className={TH_CLS}>Count</th>
                        <th className={TH_CLS}>Reason</th>
                        <th className={TH_CLS}>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {batch.mortalityLogs.map((log: any) => (
                        <tr key={log.id} className="border-b border-gray-100 dark:border-gray-700/50">
                          <td className={TD_CLS}>{formatDate(log.date)}</td>
                          <td className={TD_CLS}>{log.count}</td>
                          <td className={TD_CLS}>{log.reason}</td>
                          <td className={TD_CLS}>{log.notes || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">No mortality records yet.</p>
              )}
            </div>
          </div>
        )}

        {/* Feed Tab */}
        {activeTab === 'Feed' && (
          <div className="space-y-6">
            <form onSubmit={handleFeedSubmit} className={CARD_CLS}>
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Log Feed</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <DateInput
                    value={feedForm.date}
                    onChange={(d) => setFeedForm(p => ({ ...p, date: d }))}
                    label="Date"
                    required={true}
                    compact={true}
                  />
                </div>
                <div>
                  <label className={LABEL_CLS}>Feed Type</label>
                  <ChickenRunCategorySelect
                    group="feed_type"
                    value={feedForm.feedType}
                    onChange={v => setFeedForm(p => ({ ...p, feedType: v }))}
                    placeholder={`Suggested: ${batch.feedStage}`}
                    required
                  />
                </div>
                <div>
                  <label className={LABEL_CLS}>Quantity (kg)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    step="0.1"
                    value={feedForm.quantityKg}
                    onChange={e => {
                      const qty = e.target.value
                      const cpk = qty && feedForm.totalCost
                        ? (parseFloat(feedForm.totalCost) / parseFloat(qty)).toFixed(4)
                        : feedForm.costPerKg
                      setFeedForm(p => ({ ...p, quantityKg: qty, costPerKg: cpk }))
                    }}
                    className={INPUT_CLS}
                    placeholder="e.g. 50"
                  />
                </div>
                <div>
                  <label className={LABEL_CLS}>Total Cost (from invoice)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    step="0.01"
                    value={feedForm.totalCost}
                    onChange={e => {
                      const total = e.target.value
                      const cpk = total && feedForm.quantityKg
                        ? (parseFloat(total) / parseFloat(feedForm.quantityKg)).toFixed(4)
                        : feedForm.costPerKg
                      setFeedForm(p => ({ ...p, totalCost: total, costPerKg: cpk }))
                    }}
                    className={INPUT_CLS}
                    placeholder="e.g. 75.00"
                  />
                </div>
                <div>
                  <label className={LABEL_CLS}>Cost per kg (auto-computed)</label>
                  <input
                    type="number"
                    readOnly
                    value={feedForm.costPerKg}
                    className={INPUT_CLS + ' bg-gray-50 dark:bg-gray-600/50 cursor-not-allowed'}
                    placeholder="Auto-calculated"
                    tabIndex={-1}
                  />
                </div>
                <div>
                  <label className={LABEL_CLS}>Supplier (optional)</label>
                  <SupplierSelector
                    businessId={currentBusinessId!}
                    value={feedSupplierId}
                    onChange={setFeedSupplierId}
                    canCreate={true}
                    placeholder="Select supplier..."
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={LABEL_CLS}>Notes (optional)</label>
                  <input
                    type="text"
                    value={feedForm.notes}
                    onChange={e => setFeedForm(p => ({ ...p, notes: e.target.value }))}
                    className={INPUT_CLS}
                    placeholder="Additional details"
                  />
                </div>
              </div>
              <button type="submit" disabled={feedSubmitting} className={SUBMIT_CLS}>
                {feedSubmitting ? 'Saving...' : 'Log Feed'}
              </button>
            </form>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Feed History ({batch.feedLogs?.length || 0} records)
              </h2>
              {batch.feedLogs?.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className={TH_CLS}>Date</th>
                        <th className={TH_CLS}>Feed Type</th>
                        <th className={TH_CLS}>Qty (kg)</th>
                        <th className={TH_CLS}>Cost/kg</th>
                        <th className={TH_CLS}>Total</th>
                        <th className={TH_CLS}>Supplier</th>
                      </tr>
                    </thead>
                    <tbody>
                      {batch.feedLogs.map((log: any) => (
                        <tr key={log.id} className="border-b border-gray-100 dark:border-gray-700/50">
                          <td className={TD_CLS}>{formatDate(log.date)}</td>
                          <td className={TD_CLS}>{log.feedType}</td>
                          <td className={TD_CLS}>{Number(log.quantityKg).toFixed(1)}</td>
                          <td className={TD_CLS}>{formatCurrency(Number(log.costPerKg))}</td>
                          <td className={TD_CLS}>{formatCurrency(Number(log.totalCost))}</td>
                          <td className={TD_CLS}>{log.supplier?.name || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">No feed records yet.</p>
              )}
            </div>
          </div>
        )}

        {/* Medication Tab */}
        {activeTab === 'Medication' && (
          <div className="space-y-6">
            <form onSubmit={handleMedSubmit} className={CARD_CLS}>
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Log Medication</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <DateInput
                    value={medForm.date}
                    onChange={(d) => setMedForm(p => ({ ...p, date: d }))}
                    label="Date"
                    required={true}
                    compact={true}
                  />
                </div>
                <div>
                  <label className={LABEL_CLS}>Medication Name</label>
                  <ChickenRunCategorySelect
                    group="medication"
                    value={medForm.medicationName}
                    onChange={v => setMedForm(p => ({ ...p, medicationName: v }))}
                    placeholder="Select or type medication…"
                    required
                  />
                </div>
                <div>
                  <label className={LABEL_CLS}>Quantity (ml, optional)</label>
                  <input
                    type="number"
                    min={0}
                    step="0.1"
                    value={medForm.quantityMl}
                    onChange={e => setMedForm(p => ({ ...p, quantityMl: e.target.value }))}
                    className={INPUT_CLS}
                    placeholder="ml"
                  />
                </div>
                <div>
                  <label className={LABEL_CLS}>Quantity (g, optional)</label>
                  <input
                    type="number"
                    min={0}
                    step="0.1"
                    value={medForm.quantityG}
                    onChange={e => setMedForm(p => ({ ...p, quantityG: e.target.value }))}
                    className={INPUT_CLS}
                    placeholder="grams"
                  />
                </div>
                <div>
                  <label className={LABEL_CLS}>Total Cost</label>
                  <input
                    type="number"
                    required
                    min={0}
                    step="0.01"
                    value={medForm.totalCost}
                    onChange={e => setMedForm(p => ({ ...p, totalCost: e.target.value }))}
                    className={INPUT_CLS}
                    placeholder="e.g. 25.00"
                  />
                </div>
                <div>
                  <label className={LABEL_CLS}>Administered By (optional)</label>
                  <input
                    type="text"
                    value={medForm.administeredBy}
                    onChange={e => setMedForm(p => ({ ...p, administeredBy: e.target.value }))}
                    className={INPUT_CLS}
                    placeholder="Name"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={LABEL_CLS}>Notes (optional)</label>
                  <input
                    type="text"
                    value={medForm.notes}
                    onChange={e => setMedForm(p => ({ ...p, notes: e.target.value }))}
                    className={INPUT_CLS}
                    placeholder="Additional details"
                  />
                </div>
              </div>
              <button type="submit" disabled={medSubmitting} className={SUBMIT_CLS}>
                {medSubmitting ? 'Saving...' : 'Log Medication'}
              </button>
            </form>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Medication History ({batch.medicationLogs?.length || 0} records)
              </h2>
              {batch.medicationLogs?.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className={TH_CLS}>Date</th>
                        <th className={TH_CLS}>Medication</th>
                        <th className={TH_CLS}>Qty (ml)</th>
                        <th className={TH_CLS}>Qty (g)</th>
                        <th className={TH_CLS}>Total Cost</th>
                        <th className={TH_CLS}>Administered By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {batch.medicationLogs.map((log: any) => (
                        <tr key={log.id} className="border-b border-gray-100 dark:border-gray-700/50">
                          <td className={TD_CLS}>{formatDate(log.date)}</td>
                          <td className={TD_CLS}>{log.medicationName}</td>
                          <td className={TD_CLS}>{log.quantityMl != null ? Number(log.quantityMl).toFixed(1) : '—'}</td>
                          <td className={TD_CLS}>{log.quantityG != null ? Number(log.quantityG).toFixed(1) : '—'}</td>
                          <td className={TD_CLS}>{formatCurrency(Number(log.totalCost))}</td>
                          <td className={TD_CLS}>{log.administeredBy || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">No medication records yet.</p>
              )}
            </div>
          </div>
        )}

        {/* Weight Tab */}
        {activeTab === 'Weight' && (
          <div className="space-y-6">
            <form onSubmit={handleWeightSubmit} className={CARD_CLS}>
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Log Sample Weight</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <DateInput
                    value={weightForm.date}
                    onChange={(d) => setWeightForm(p => ({ ...p, date: d }))}
                    label="Date"
                    required={true}
                    compact={true}
                  />
                </div>
                <div>
                  <label className={LABEL_CLS}>Week Age</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={weightForm.weekAge}
                    onChange={e => setWeightForm(p => ({ ...p, weekAge: e.target.value }))}
                    className={INPUT_CLS}
                    placeholder={`Batch is ${batch.ageInWeeks} weeks`}
                  />
                </div>
                <div>
                  <label className={LABEL_CLS}>Sample Size (birds)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={weightForm.sampleSize}
                    onChange={e => setWeightForm(p => ({ ...p, sampleSize: e.target.value }))}
                    className={INPUT_CLS}
                    placeholder="e.g. 10"
                  />
                </div>
                <div>
                  <label className={LABEL_CLS}>Average Weight (kg)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    step="0.01"
                    value={weightForm.avgWeightKg}
                    onChange={e => setWeightForm(p => ({ ...p, avgWeightKg: e.target.value }))}
                    className={INPUT_CLS}
                    placeholder="e.g. 1.85"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={LABEL_CLS}>Notes (optional)</label>
                  <input
                    type="text"
                    value={weightForm.notes}
                    onChange={e => setWeightForm(p => ({ ...p, notes: e.target.value }))}
                    className={INPUT_CLS}
                    placeholder="Additional details"
                  />
                </div>
              </div>
              <button type="submit" disabled={weightSubmitting} className={SUBMIT_CLS}>
                {weightSubmitting ? 'Saving...' : 'Log Weight'}
              </button>
            </form>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Weight History ({batch.weightLogs?.length || 0} records)
              </h2>
              {batch.weightLogs?.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className={TH_CLS}>Date</th>
                        <th className={TH_CLS}>Week</th>
                        <th className={TH_CLS}>Sample Size</th>
                        <th className={TH_CLS}>Avg Weight (kg)</th>
                        <th className={TH_CLS}>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {batch.weightLogs.map((log: any) => (
                        <tr key={log.id} className="border-b border-gray-100 dark:border-gray-700/50">
                          <td className={TD_CLS}>{formatDate(log.date)}</td>
                          <td className={TD_CLS}>W{log.weekAge}</td>
                          <td className={TD_CLS}>{log.sampleSize}</td>
                          <td className={TD_CLS}>{Number(log.avgWeightKg).toFixed(2)} kg</td>
                          <td className={TD_CLS}>{log.notes || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">No weight records yet.</p>
              )}
            </div>

            {/* Weight Growth Chart */}
            {batch.weightLogs?.length > 0 && (() => {
              // Expected growth curve (kg) by week: week 0→0.05, 1→0.15, 2→0.35, 3→0.65, 4→1.0, 5→1.4, 6→1.8, 7→2.1, 8→2.4
              const expected: Record<number, number> = { 0: 0.05, 1: 0.15, 2: 0.35, 3: 0.65, 4: 1.0, 5: 1.4, 6: 1.8, 7: 2.1, 8: 2.4 }
              const logs: { weekAge: number; avgWeightKg: unknown }[] = [...batch.weightLogs].sort((a: any, b: any) => a.weekAge - b.weekAge)
              const maxWeek = Math.max(8, ...logs.map((l) => l.weekAge))
              const maxWeight = Math.max(2.4, ...logs.map((l) => Number(l.avgWeightKg)))
              const W = 500, H = 180, padL = 40, padB = 30, padT = 10, padR = 10
              const xScale = (week: number) => padL + (week / maxWeek) * (W - padL - padR)
              const yScale = (kg: number) => H - padB - (kg / maxWeight) * (H - padB - padT)
              const expPoints = Object.entries(expected)
                .filter(([w]) => Number(w) <= maxWeek)
                .map(([w, kg]) => `${xScale(Number(w))},${yScale(kg)}`)
                .join(' ')
              const actPoints = logs.map((l) => `${xScale(l.weekAge)},${yScale(Number(l.avgWeightKg))}`).join(' ')
              return (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                  <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">Weight Growth Chart</h2>
                  <div className="flex gap-4 text-xs mb-2">
                    <span className="flex items-center gap-1"><span className="inline-block w-6 h-0.5 bg-gray-300 dark:bg-gray-500" style={{ borderTop: '2px dashed' }} />Expected</span>
                    <span className="flex items-center gap-1"><span className="inline-block w-6 h-0.5 bg-green-500" />Actual</span>
                  </div>
                  <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 200 }}>
                    {/* Y-axis grid lines */}
                    {[0.5, 1.0, 1.5, 2.0].map(kg => (
                      <g key={kg}>
                        <line x1={padL} y1={yScale(kg)} x2={W - padR} y2={yScale(kg)} stroke="currentColor" strokeOpacity={0.1} />
                        <text x={padL - 4} y={yScale(kg) + 4} fontSize={9} textAnchor="end" fill="currentColor" opacity={0.5}>{kg}</text>
                      </g>
                    ))}
                    {/* X-axis labels */}
                    {Array.from({ length: maxWeek + 1 }, (_, w) => (
                      <text key={w} x={xScale(w)} y={H - 8} fontSize={9} textAnchor="middle" fill="currentColor" opacity={0.5}>W{w}</text>
                    ))}
                    {/* Expected curve (dashed) */}
                    <polyline points={expPoints} fill="none" stroke="#9ca3af" strokeWidth={1.5} strokeDasharray="4 3" />
                    {/* Actual curve */}
                    <polyline points={actPoints} fill="none" stroke="#16a34a" strokeWidth={2} />
                    {/* Actual data points */}
                    {logs.map((l, i) => (
                      <circle key={i} cx={xScale(l.weekAge)} cy={yScale(Number(l.avgWeightKg))} r={3} fill="#16a34a" />
                    ))}
                  </svg>
                </div>
              )
            })()}
          </div>
        )}

        {/* Vaccination Tab */}
        {activeTab === 'Vaccination' && (
          <div className="space-y-6">
            <form onSubmit={handleVaccinationSubmit} className={CARD_CLS}>
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Log Vaccination</h2>
                <Link
                  href="/chicken-run/vaccination-schedules"
                  className="text-sm text-green-600 dark:text-green-400 hover:underline"
                >
                  Manage vaccination schedules →
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <DateInput
                    value={vaccinationForm.date}
                    onChange={(d) => setVaccinationForm(p => ({ ...p, date: d }))}
                    label="Date"
                    required={true}
                    compact={true}
                  />
                </div>
                <div>
                  <label className={LABEL_CLS}>Vaccine Name</label>
                  <ChickenRunCategorySelect
                    group="vaccination"
                    value={vaccinationForm.vaccineName}
                    onChange={v => setVaccinationForm(p => ({ ...p, vaccineName: v }))}
                    placeholder="Select or type vaccine…"
                    required
                  />
                </div>
                <div>
                  <label className={LABEL_CLS}>Dosage (optional)</label>
                  <input
                    type="text"
                    value={vaccinationForm.dosage}
                    onChange={e => setVaccinationForm(p => ({ ...p, dosage: e.target.value }))}
                    className={INPUT_CLS}
                    placeholder="e.g. 1 drop per bird"
                  />
                </div>
                <div>
                  <label className={LABEL_CLS}>Schedule (optional)</label>
                  <select
                    value={vaccinationForm.scheduleId}
                    onChange={e => setVaccinationForm(p => ({ ...p, scheduleId: e.target.value }))}
                    className={INPUT_CLS}
                  >
                    <option value="">— None —</option>
                    {vaccinationSchedules.map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.name} (Day {s.dayAge})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className={LABEL_CLS}>Notes (optional)</label>
                  <input
                    type="text"
                    value={vaccinationForm.notes}
                    onChange={e => setVaccinationForm(p => ({ ...p, notes: e.target.value }))}
                    className={INPUT_CLS}
                    placeholder="Additional details"
                  />
                </div>
              </div>
              <button type="submit" disabled={vaccinationSubmitting} className={SUBMIT_CLS}>
                {vaccinationSubmitting ? 'Saving...' : 'Log Vaccination'}
              </button>
            </form>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Vaccination History ({batch.vaccinationLogs?.length || 0} records)
              </h2>
              {batch.vaccinationLogs?.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className={TH_CLS}>Date</th>
                        <th className={TH_CLS}>Vaccine</th>
                        <th className={TH_CLS}>Dosage</th>
                        <th className={TH_CLS}>Schedule</th>
                        <th className={TH_CLS}>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {batch.vaccinationLogs.map((log: any) => {
                        const schedule = vaccinationSchedules.find((s: any) => s.id === log.scheduleId)
                        return (
                          <tr key={log.id} className="border-b border-gray-100 dark:border-gray-700/50">
                            <td className={TD_CLS}>{formatDate(log.date)}</td>
                            <td className={TD_CLS}>{log.vaccineName}</td>
                            <td className={TD_CLS}>{log.dosage || '—'}</td>
                            <td className={TD_CLS}>{schedule ? schedule.name : log.scheduleId ? 'Linked' : '—'}</td>
                            <td className={TD_CLS}>{log.notes || '—'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">No vaccination records yet.</p>
              )}
            </div>
          </div>
        )}

        {/* Culling Tab */}
        {activeTab === 'Culling' && (() => {
          const openCulling = batch.cullingRecords?.find((c: any) => c.weighingStatus === 'OPEN')
          const closedCullings = batch.cullingRecords?.filter((c: any) => c.weighingStatus === 'CLOSED') || []

          return (
            <div className="space-y-6">
              {/* Open Culling Session */}
              {openCulling ? (
                <div className={CARD_CLS}>
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Open Culling Session</h2>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300">OPEN</span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Date: {formatDate(openCulling.cullingDate)} · Mode: {openCulling.weightEntryMode}</p>

                  {/* INDIVIDUAL mode */}
                  {openCulling.weightEntryMode === 'INDIVIDUAL' && (() => {
                    const savedWeights: number[] = (openCulling.birdWeights || [])
                      .sort((a: any, b: any) => a.sequenceNo - b.sequenceNo)
                      .map((w: any) => Number(w.weightKg))
                    const allWeights = [...savedWeights, ...pendingCullingWeights]
                    const totalKg = allWeights.reduce((s, w) => s + w, 0)
                    const avgKg = allWeights.length > 0 ? totalKg / allWeights.length : 0

                    return (
                      <div className="space-y-4">
                        {/* Input row */}
                        <div className="flex gap-2">
                          <input
                            type="number"
                            step="0.001"
                            min="0"
                            ref={cullingWeightInputRef}
                            placeholder="Weight in kg (e.g. 1.850)"
                            value={cullingWeightInput}
                            onChange={e => setCullingWeightInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCullingWeight() } }}
                            className={INPUT_CLS}
                          />
                          <button
                            type="button"
                            onClick={handleAddCullingWeight}
                            disabled={!cullingWeightInput || Number(cullingWeightInput) <= 0}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 whitespace-nowrap"
                          >
                            Add Bird
                          </button>
                        </div>

                        {/* Live totals */}
                        {allWeights.length > 0 && (
                          <div className="grid grid-cols-3 gap-3">
                            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
                              <p className="text-xs text-gray-500 dark:text-gray-400">Pending</p>
                              <p className="text-xl font-bold text-green-700 dark:text-green-300">{allWeights.length}</p>
                            </div>
                            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
                              <p className="text-xs text-gray-500 dark:text-gray-400">Total kg</p>
                              <p className="text-xl font-bold text-green-700 dark:text-green-300">{totalKg.toFixed(3)}</p>
                            </div>
                            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
                              <p className="text-xs text-gray-500 dark:text-gray-400">Avg kg</p>
                              <p className="text-xl font-bold text-green-700 dark:text-green-300">{avgKg.toFixed(3)}</p>
                            </div>
                          </div>
                        )}

                        {/* Combined weight list */}
                        {allWeights.length > 0 && (
                          <div className="max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                            <table className="w-full text-sm">
                              <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                                <tr>
                                  <th className={TH_CLS}>#</th>
                                  <th className={TH_CLS}>Weight (kg)</th>
                                  <th className={TH_CLS}></th>
                                </tr>
                              </thead>
                              <tbody>
                                {allWeights.map((w, i) => {
                                  const isSaved = i < savedWeights.length
                                  return (
                                    <tr key={i} className="border-b border-gray-100 dark:border-gray-700/50">
                                      <td className={TD_CLS}>{i + 1}</td>
                                      <td className={TD_CLS}>
                                        {w.toFixed(3)}
                                        {!isSaved && (
                                          <span className="ml-2 text-xs text-orange-500 dark:text-orange-400">unsaved</span>
                                        )}
                                      </td>
                                      <td className={TD_CLS}>
                                        {!isSaved && (
                                          <button
                                            type="button"
                                            onClick={() => setPendingCullingWeights(prev => prev.filter((_, pi) => pi !== i - savedWeights.length))}
                                            className="text-red-500 hover:text-red-700 text-xs px-2 py-0.5 rounded"
                                          >
                                            Remove
                                          </button>
                                        )}
                                      </td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {/* Action buttons */}
                        <div className="flex gap-3 flex-wrap">
                          {pendingCullingWeights.length > 0 && (
                            <button
                              type="button"
                              onClick={() => handleSavePendingWeights(openCulling.id, savedWeights)}
                              disabled={cullingSaving}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                            >
                              {cullingSaving ? 'Saving...' : `Save ${pendingCullingWeights.length} Weight${pendingCullingWeights.length > 1 ? 's' : ''}`}
                            </button>
                          )}
                          {allWeights.length > 0 && (
                            <button
                              type="button"
                              onClick={() => handleCloseCullingIndividual(openCulling, savedWeights)}
                              disabled={cullingClosing || cullingSaving}
                              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                            >
                              {cullingClosing ? 'Closing...' : 'Close Session'}
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })()}

                  {/* BULK_LIST mode */}
                  {openCulling.weightEntryMode === 'BULK_LIST' && (
                    <div className="space-y-3">
                      <label className={LABEL_CLS}>Enter one weight per line (in kg)</label>
                      <textarea
                        rows={8}
                        value={cullingBulkText}
                        onChange={e => { setCullingBulkText(e.target.value); setCullingBulkPreview(null) }}
                        placeholder={'1.850\n2.100\n1.750\n...'}
                        className={INPUT_CLS + ' font-mono'}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleCullingBulkListPreview}
                          className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          Preview
                        </button>
                        {cullingBulkPreview && (
                          <button
                            onClick={() => handleCloseCullingBulkList(openCulling.id)}
                            disabled={cullingClosing}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                          >
                            {cullingClosing ? 'Closing...' : 'Confirm & Close'}
                          </button>
                        )}
                      </div>
                      {cullingBulkPreview && (
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 text-sm space-y-1">
                          <p><span className="font-medium">Birds:</span> {cullingBulkPreview.count}</p>
                          <p><span className="font-medium">Total:</span> {cullingBulkPreview.total.toFixed(3)} kg</p>
                          <p><span className="font-medium">Avg:</span> {cullingBulkPreview.avg.toFixed(3)} kg</p>
                          <p><span className="font-medium">Min:</span> {cullingBulkPreview.min.toFixed(3)} kg · <span className="font-medium">Max:</span> {cullingBulkPreview.max.toFixed(3)} kg</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* BULK_TOTAL mode */}
                  {openCulling.weightEntryMode === 'BULK_TOTAL' && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={LABEL_CLS}>Number of Birds</label>
                          <input
                            type="number"
                            min="1"
                            value={cullingBulkTotalBirds}
                            onChange={e => setCullingBulkTotalBirds(e.target.value)}
                            className={INPUT_CLS}
                            placeholder="e.g. 50"
                          />
                        </div>
                        <div>
                          <label className={LABEL_CLS}>Total Weight (kg)</label>
                          <input
                            type="number"
                            step="0.001"
                            min="0"
                            value={cullingBulkTotalKg}
                            onChange={e => setCullingBulkTotalKg(e.target.value)}
                            className={INPUT_CLS}
                            placeholder="e.g. 95.500"
                          />
                        </div>
                      </div>
                      {cullingBulkTotalBirds && cullingBulkTotalKg && Number(cullingBulkTotalBirds) > 0 && Number(cullingBulkTotalKg) > 0 && (
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 text-sm">
                          <p><span className="font-medium">Avg:</span> {(Number(cullingBulkTotalKg) / Number(cullingBulkTotalBirds)).toFixed(3)} kg/bird</p>
                        </div>
                      )}
                      <button
                        onClick={() => handleCloseCullingBulkTotal(openCulling.id)}
                        disabled={cullingClosing}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                      >
                        {cullingClosing ? 'Closing...' : 'Confirm & Close Session'}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* Start Culling Session Form */
                <form onSubmit={handleStartCulling} className={CARD_CLS}>
                  <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Start Culling Session</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <DateInput
                        value={cullingForm.cullingDate}
                        onChange={(d) => setCullingForm(p => ({ ...p, cullingDate: d }))}
                        label="Culling Date"
                        required={true}
                        compact={true}
                      />
                    </div>
                    <div>
                      <label className={LABEL_CLS}>Weight Entry Mode</label>
                      <select
                        value={cullingForm.weightEntryMode}
                        onChange={e => setCullingForm(p => ({ ...p, weightEntryMode: e.target.value }))}
                        className={INPUT_CLS}
                      >
                        <option value="INDIVIDUAL">Individual (scan each bird)</option>
                        <option value="BULK_LIST">Bulk List (paste weights)</option>
                        <option value="BULK_TOTAL">Bulk Total (count + total kg)</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className={LABEL_CLS}>Notes (optional)</label>
                      <input
                        type="text"
                        value={cullingForm.notes}
                        onChange={e => setCullingForm(p => ({ ...p, notes: e.target.value }))}
                        className={INPUT_CLS}
                        placeholder="Any notes about this culling session"
                      />
                    </div>
                  </div>
                  <button type="submit" disabled={cullingSubmitting} className={SUBMIT_CLS}>
                    {cullingSubmitting ? 'Starting...' : 'Start Culling Session'}
                  </button>
                </form>
              )}

              {/* Closed Culling Sessions History */}
              {closedCullings.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                  <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    Completed Culling Sessions ({closedCullings.length})
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <th className={TH_CLS}>Date</th>
                          <th className={TH_CLS}>Mode</th>
                          <th className={TH_CLS}>Birds</th>
                          <th className={TH_CLS}>Total kg</th>
                          <th className={TH_CLS}>Avg kg</th>
                          <th className={TH_CLS}>Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {closedCullings.map((c: any) => (
                          <tr key={c.id} className="border-b border-gray-100 dark:border-gray-700/50">
                            <td className={TD_CLS}>{formatDate(c.cullingDate)}</td>
                            <td className={TD_CLS}>{c.weightEntryMode}</td>
                            <td className={TD_CLS}>{c.quantityCulled}</td>
                            <td className={TD_CLS}>{Number(c.totalWeightKg).toFixed(3)}</td>
                            <td className={TD_CLS}>{Number(c.avgWeightKg).toFixed(3)}</td>
                            <td className={TD_CLS}>{c.notes || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )
        })()}
      </div>
    </ContentLayout>
  )
}
