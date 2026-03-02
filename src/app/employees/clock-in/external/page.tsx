'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { EmployeeIdCard } from '@/components/clock-in/employee-id-card'

interface Person {
  id: string
  fullName: string
  phone: string | null
  nationalId: string | null
}

interface ExternalRecord {
  id: string
  type: string
  personId: string | null
  visitorName: string | null
  displayName: string
  person: Person | null
  clockIn: string | null
  clockOut: string | null
  hoursWorked: string | null
  clockState: 'notYetClockedIn' | 'clockedIn' | 'clockedOut'
  notes: string | null
}

export default function ExternalClockInPage() {
  const [records, setRecords] = useState<ExternalRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modal state
  const [modal, setModal] = useState<'contractor' | 'visitor' | 'registerNew' | null>(null)

  // Contractor search
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Person[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null)

  // Register new contractor
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newNationalId, setNewNationalId] = useState('')

  // Visitor
  const [visitorName, setVisitorName] = useState('')
  const [visitorNotes, setVisitorNotes] = useState('')

  const [isSaving, setIsSaving] = useState(false)
  const [modalMsg, setModalMsg] = useState<string | null>(null)

  // Print ID card
  const [printCardPerson, setPrintCardPerson] = useState<Person | null>(null)

  const loadRecords = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/clock-in/external/today')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load')
      setRecords(data.records)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error loading records')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRecords()
  }, [loadRecords])

  const searchPersons = useCallback(async (q: string) => {
    if (q.length < 2) { setSearchResults([]); return }
    setIsSearching(true)
    try {
      const res = await fetch(`/api/persons?search=${encodeURIComponent(q)}&isActive=true`)
      const data = await res.json()
      setSearchResults(Array.isArray(data) ? data : (data.persons ?? []))
    } catch {
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => searchPersons(searchQuery), 300)
    return () => clearTimeout(t)
  }, [searchQuery, searchPersons])

  const openContractorModal = () => {
    setSearchQuery('')
    setSearchResults([])
    setSelectedPerson(null)
    setModalMsg(null)
    setModal('contractor')
  }

  const openVisitorModal = () => {
    setVisitorName('')
    setVisitorNotes('')
    setModalMsg(null)
    setModal('visitor')
  }

  const openRegisterNew = () => {
    setNewName(searchQuery)
    setNewPhone('')
    setNewNationalId('')
    setModalMsg(null)
    setModal('registerNew')
  }

  const closeModal = () => {
    setModal(null)
    setModalMsg(null)
  }

  // Clock in a contractor (selected person)
  const clockInContractor = async () => {
    if (!selectedPerson) return
    setIsSaving(true)
    setModalMsg(null)
    try {
      // Get businessId from current user context — use a placeholder for now, API accepts any string
      const res = await fetch('/api/clock-in/external/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clockIn', type: 'contractor', personId: selectedPerson.id, businessId: 'default' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setModalMsg('Clocked in!')
      await loadRecords()
      setTimeout(closeModal, 800)
    } catch (e) {
      setModalMsg(e instanceof Error ? e.message : 'Failed')
    } finally {
      setIsSaving(false)
    }
  }

  // Register a new contractor then clock them in
  const registerAndClockIn = async () => {
    if (!newName.trim() || !newPhone.trim() || !newNationalId.trim()) {
      setModalMsg('Full name, phone, and national ID are all required')
      return
    }
    setIsSaving(true)
    setModalMsg(null)
    try {
      // Create Persons record
      const createRes = await fetch('/api/persons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: newName.trim(), phone: newPhone.trim(), nationalId: newNationalId.trim() }),
      })
      const createData = await createRes.json()
      if (!createRes.ok) throw new Error(createData.error || 'Failed to register contractor')

      const personId = createData.id ?? createData.person?.id
      if (!personId) throw new Error('No person ID returned')

      // Clock in
      const clockRes = await fetch('/api/clock-in/external/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clockIn', type: 'contractor', personId, businessId: 'default' }),
      })
      const clockData = await clockRes.json()
      if (!clockRes.ok) throw new Error(clockData.error)

      setModalMsg('Registered and clocked in!')
      await loadRecords()
      // Auto-show print card for the newly registered contractor
      setTimeout(() => {
        closeModal()
        setPrintCardPerson({ id: personId, fullName: newName.trim(), phone: newPhone.trim(), nationalId: newNationalId.trim() })
      }, 800)
    } catch (e) {
      setModalMsg(e instanceof Error ? e.message : 'Failed')
    } finally {
      setIsSaving(false)
    }
  }

  // Clock in a visitor
  const clockInVisitor = async () => {
    if (!visitorName.trim()) {
      setModalMsg('Full name is required')
      return
    }
    setIsSaving(true)
    setModalMsg(null)
    try {
      const res = await fetch('/api/clock-in/external/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'clockIn',
          type: 'visitor',
          visitorName: visitorName.trim(),
          businessId: 'default',
          ...(visitorNotes.trim() ? { notes: visitorNotes.trim() } : {}),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setModalMsg('Clocked in!')
      await loadRecords()
      setTimeout(closeModal, 800)
    } catch (e) {
      setModalMsg(e instanceof Error ? e.message : 'Failed')
    } finally {
      setIsSaving(false)
    }
  }

  // Clock out any record
  const clockOut = async (recordId: string) => {
    try {
      const res = await fetch('/api/clock-in/external/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clockOut', recordId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      await loadRecords()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Clock-out failed')
    }
  }

  const printIdCard = (person: Person) => {
    // Small delay to let EmployeeIdCard render the barcode before printing
    setTimeout(() => {
      const cardEl = document.getElementById('employee-id-card')
      if (!cardEl) return
      const printWindow = window.open('', '_blank', 'width=900,height=460')
      if (!printWindow) return
      const styles = Array.from(document.styleSheets)
        .map((sheet) => { try { return Array.from(sheet.cssRules).map((r) => r.cssText).join('\n') } catch { return '' } })
        .join('\n')
      const cardHtml = cardEl.outerHTML
      printWindow.document.write(`<!DOCTYPE html><html><head><title>ID Card — ${person.fullName}</title><style>${styles}html,body{height:100%;margin:0;padding:0;}body{display:flex;justify-content:center;align-items:center;min-height:100vh;}.card-pair{display:inline-flex;align-items:flex-start;}.fold-guide{width:0;align-self:stretch;border-left:2px dashed #888;}@media print{html,body{height:100vh;margin:0;padding:0;}.fold-guide{border-left-color:#bbb;}}</style></head><body><div class="card-pair">${cardHtml}<div class="fold-guide"></div>${cardHtml}</div><script>window.onload=()=>{window.print();window.close();}<\/script></body></html>`)
      printWindow.document.close()
    }, 300)
  }

  const formatTime = (iso: string | null) => {
    if (!iso) return '--'
    return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }

  const inputCls = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
            <Link href="/employees/clock-in" className="hover:underline">🕐 Clock-In</Link>
            <span>/</span>
            <span>External & Visitors</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">👥 External & Visitors</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Today — {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={openContractorModal}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            🧑‍💼 Clock In Contractor
          </button>
          <button
            onClick={openVisitorModal}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
          >
            🙋 Clock In Visitor
          </button>
          <button
            onClick={loadRecords}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          <span className="ml-3 text-gray-500">Loading...</span>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Name</th>
                <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Type</th>
                <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Clock In</th>
                <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Clock Out</th>
                <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Hours</th>
                <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Status</th>
                <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400">
                    No external clock-ins today. Use the buttons above to add one.
                  </td>
                </tr>
              ) : (
                records.map((rec) => (
                  <tr key={rec.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 dark:text-white">{rec.displayName}</div>
                      {rec.person?.phone && <div className="text-xs text-gray-400">{rec.person.phone}</div>}
                      {rec.person?.nationalId && <div className="text-xs text-gray-400">ID: {rec.person.nationalId}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        rec.type === 'contractor'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                          : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                      }`}>
                        {rec.type === 'contractor' ? '🧑‍💼 Contractor' : '🙋 Visitor'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{formatTime(rec.clockIn)}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{formatTime(rec.clockOut)}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                      {rec.hoursWorked ? `${Number(rec.hoursWorked).toFixed(2)}h` : '--'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        rec.clockState === 'clockedIn'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {rec.clockState === 'clockedIn' ? 'Present' : 'Clocked Out'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {rec.clockState === 'clockedIn' && (
                          <button
                            onClick={() => clockOut(rec.id)}
                            className="text-xs text-orange-500 hover:text-orange-700 dark:text-orange-400 font-medium"
                          >
                            Clock Out
                          </button>
                        )}
                        {rec.type === 'contractor' && rec.person?.nationalId && (
                          <button
                            onClick={() => setPrintCardPerson(rec.person!)}
                            className="text-xs text-gray-400 hover:text-green-600 dark:hover:text-green-400"
                            title="Print ID Card"
                          >
                            🪪
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Contractor Clock-In Modal */}
      {modal === 'contractor' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-4 overflow-hidden">
            <div className="bg-blue-600 px-5 py-3 flex items-center justify-between">
              <h3 className="text-white font-semibold">🧑‍💼 Clock In Contractor</h3>
              <button onClick={closeModal} className="text-white/80 hover:text-white">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Search by name, phone, or ID</label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setSelectedPerson(null) }}
                  placeholder="Start typing..."
                  className={inputCls}
                  autoFocus
                />
              </div>

              {isSearching && <p className="text-xs text-gray-400">Searching...</p>}

              {searchResults.length > 0 && !selectedPerson && (
                <div className="border border-gray-200 dark:border-gray-600 rounded-lg divide-y divide-gray-100 dark:divide-gray-700 max-h-48 overflow-y-auto">
                  {searchResults.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => { setSelectedPerson(p); setSearchResults([]) }}
                      className="w-full text-left px-4 py-2.5 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    >
                      <div className="font-medium text-gray-900 dark:text-white text-sm">{p.fullName}</div>
                      <div className="text-xs text-gray-400">{p.phone} {p.nationalId ? `· ID: ${p.nationalId}` : ''}</div>
                    </button>
                  ))}
                </div>
              )}

              {searchQuery.length >= 2 && !isSearching && searchResults.length === 0 && !selectedPerson && (
                <div className="text-center py-3">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">No match found for &quot;{searchQuery}&quot;</p>
                  <button
                    onClick={openRegisterNew}
                    className="px-4 py-2 border border-blue-500 text-blue-600 dark:text-blue-400 rounded-lg text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20"
                  >
                    + Register New Contractor
                  </button>
                </div>
              )}

              {selectedPerson && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                  <div className="font-medium text-gray-900 dark:text-white">{selectedPerson.fullName}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {selectedPerson.phone} {selectedPerson.nationalId ? `· ID: ${selectedPerson.nationalId}` : ''}
                  </div>
                  <div className="flex items-center gap-3 mt-1.5">
                    <button onClick={() => setSelectedPerson(null)} className="text-xs text-blue-500 hover:underline">
                      Change
                    </button>
                    {selectedPerson.nationalId && (
                      <button
                        onClick={() => { setPrintCardPerson(selectedPerson); closeModal() }}
                        className="text-xs text-green-600 hover:underline"
                      >
                        🪪 Print Card
                      </button>
                    )}
                  </div>
                </div>
              )}

              {modalMsg && (
                <p className={`text-sm ${modalMsg === 'Clocked in!' ? 'text-green-600' : 'text-red-600'}`}>{modalMsg}</p>
              )}

              <div className="flex gap-3">
                <button onClick={closeModal} className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                  Cancel
                </button>
                <button
                  onClick={clockInContractor}
                  disabled={isSaving || !selectedPerson}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSaving ? 'Clocking In...' : 'Clock In'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Register New Contractor Modal */}
      {modal === 'registerNew' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-sm w-full mx-4 overflow-hidden">
            <div className="bg-blue-600 px-5 py-3 flex items-center justify-between">
              <h3 className="text-white font-semibold">+ Register Contractor</h3>
              <button onClick={() => setModal('contractor')} className="text-white/80 hover:text-white">←</button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Contractors require full name, phone, and a national ID before they can be clocked in and paid.
              </p>
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Full Name <span className="text-red-500">*</span></label>
                <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} className={inputCls} placeholder="e.g. John Doe" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Phone <span className="text-red-500">*</span></label>
                <input type="tel" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} className={inputCls} placeholder="e.g. 555-1234" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">National ID <span className="text-red-500">*</span></label>
                <input type="text" value={newNationalId} onChange={(e) => setNewNationalId(e.target.value)} className={inputCls} placeholder="Government-issued ID number" />
              </div>

              {modalMsg && (
                <p className={`text-sm ${modalMsg.includes('Registered') ? 'text-green-600' : 'text-red-600'}`}>{modalMsg}</p>
              )}

              <div className="flex gap-3 pt-1">
                <button onClick={() => setModal('contractor')} className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                  Back
                </button>
                <button
                  onClick={registerAndClockIn}
                  disabled={isSaving}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Register & Clock In'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Visitor Clock-In Modal */}
      {modal === 'visitor' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-sm w-full mx-4 overflow-hidden">
            <div className="bg-green-600 px-5 py-3 flex items-center justify-between">
              <h3 className="text-white font-semibold">🙋 Clock In Visitor</h3>
              <button onClick={closeModal} className="text-white/80 hover:text-white">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Full Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={visitorName}
                  onChange={(e) => setVisitorName(e.target.value)}
                  className={inputCls}
                  placeholder="Visitor's full name"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Notes (optional)</label>
                <input
                  type="text"
                  value={visitorNotes}
                  onChange={(e) => setVisitorNotes(e.target.value)}
                  className={inputCls}
                  placeholder="e.g. Meeting with sales team"
                />
              </div>

              {modalMsg && (
                <p className={`text-sm ${modalMsg === 'Clocked in!' ? 'text-green-600' : 'text-red-600'}`}>{modalMsg}</p>
              )}

              <div className="flex gap-3">
                <button onClick={closeModal} className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                  Cancel
                </button>
                <button
                  onClick={clockInVisitor}
                  disabled={isSaving || !visitorName.trim()}
                  className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  {isSaving ? 'Clocking In...' : 'Clock In'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print ID Card Modal */}
      {printCardPerson && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-5 mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">🪪 Contractor ID Card</h3>
              <button onClick={() => setPrintCardPerson(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">✕</button>
            </div>
            {/* EmployeeIdCard reused — nationalId shown as barcode for contractors */}
            <EmployeeIdCard
              employee={{
                id: printCardPerson.id,
                fullName: printCardPerson.fullName,
                employeeNumber: printCardPerson.nationalId ?? printCardPerson.id,
                scanToken: printCardPerson.nationalId ?? printCardPerson.id,
                phone: printCardPerson.phone,
              }}
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setPrintCardPerson(null)}
                className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Close
              </button>
              <button
                onClick={() => printIdCard(printCardPerson)}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                🖨️ Print
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
