'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, RotateCcw } from 'lucide-react'

export interface SelectedSalesperson {
  employeeId: string
  userId?: string | null
  name: string
  photoUrl?: string | null
}

interface Employee {
  id: string
  fullName: string
  profilePhotoUrl?: string | null
  userId?: string | null
  job_titles?: { title: string } | null
}

interface SalespersonSelectorProps {
  businessId: string
  currentUserId: string
  currentUserName: string
  onSalespersonChange: (sp: SelectedSalesperson) => void
}

const STORAGE_KEY = (businessId: string) => `pos-salesperson-${businessId}`

function getInitials(name: string) {
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2)
}

export function SalespersonSelector({
  businessId,
  currentUserId,
  currentUserName,
  onSalespersonChange,
}: SalespersonSelectorProps) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selected, setSelected] = useState<SelectedSalesperson | null>(null)
  const [myEmployee, setMyEmployee] = useState<SelectedSalesperson | null>(null)
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Focus search when dropdown opens
  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50)
  }, [open])

  useEffect(() => {
    if (!businessId || !currentUserId) return
    fetchEmployees()
  }, [businessId, currentUserId])

  const fetchEmployees = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/employees/pos-selector?businessId=${businessId}`)
      if (!res.ok) return
      const data = await res.json()
      const list: Employee[] = data.employees || []
      setEmployees(list)
      resolveSelection(list)
    } catch {
      // silently fail — selector is non-critical
    } finally {
      setLoading(false)
    }
  }

  const resolveSelection = (list: Employee[]) => {
    const meEmp = list.find(e => e.userId === currentUserId)
    const me: SelectedSalesperson = meEmp
      ? { employeeId: meEmp.id, userId: currentUserId, name: meEmp.fullName, photoUrl: meEmp.profilePhotoUrl }
      : { employeeId: currentUserId, userId: currentUserId, name: currentUserName, photoUrl: null }
    setMyEmployee(me)

    try {
      const raw = localStorage.getItem(STORAGE_KEY(businessId))
      if (raw) {
        const stored: SelectedSalesperson = JSON.parse(raw)
        // Restore whatever salesperson was last selected for this business —
        // the stored employee may differ from the logged-in user (e.g. manager
        // selected a cashier), which is intentional and must survive remounts.
        setSelected(stored)
        onSalespersonChange(stored)
        return
      }
    } catch { /* ignore */ }

    persist(me)
  }

  const persist = (sp: SelectedSalesperson) => {
    setSelected(sp)
    try { localStorage.setItem(STORAGE_KEY(businessId), JSON.stringify(sp)) } catch { /* ignore */ }
    onSalespersonChange(sp)
  }

  const handleToggle = () => {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setDropdownPos({ top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX })
    }
    setOpen(o => !o)
  }

  const handleSelect = (emp: Employee) => {
    const sp: SelectedSalesperson = {
      employeeId: emp.id,
      userId: emp.userId ?? null,
      name: emp.fullName,
      photoUrl: emp.profilePhotoUrl ?? null,
    }
    persist(sp)
    setOpen(false)
    setSearch('')
  }

  const handleResetToMe = () => {
    if (myEmployee) persist(myEmployee)
    setOpen(false)
  }

  const filtered = employees.filter(e =>
    e.fullName.toLowerCase().includes(search.toLowerCase()) &&
    e.id !== selected?.employeeId
  )

  const isOverridden = selected && myEmployee && selected.employeeId !== myEmployee.employeeId

  if (loading || !selected) {
    return (
      <div className="flex items-center gap-2 text-xs text-secondary">
        <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
        <span className="w-20 h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-secondary whitespace-nowrap">Salesperson:</span>

      <div className="relative">
        {/* Trigger */}
        <button
          ref={buttonRef}
          type="button"
          onClick={handleToggle}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-full border text-xs font-medium transition-colors ${
            isOverridden
              ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300'
              : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-primary hover:bg-gray-50 dark:hover:bg-gray-600'
          }`}
        >
          {selected.photoUrl ? (
            <img
              src={selected.photoUrl}
              alt={selected.name}
              className="w-5 h-5 rounded-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          ) : (
            <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-[9px] font-bold shrink-0">
              {getInitials(selected.name)}
            </div>
          )}
          <span className="max-w-[120px] truncate">{selected.name}</span>
          <ChevronDown className="w-3 h-3 opacity-60" />
        </button>

        {/* Dropdown rendered in portal to escape stacking context */}
        {open && typeof document !== 'undefined' && createPortal(
          <div
            ref={dropdownRef}
            style={{ position: 'absolute', top: dropdownPos.top, left: dropdownPos.left, zIndex: 9999 }}
            className="w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl"
          >
            <div className="p-2 border-b border-gray-100 dark:border-gray-700">
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-full text-xs px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <ul className="max-h-48 overflow-y-auto py-1">
              {filtered.length === 0 && (
                <li className="px-3 py-2 text-xs text-secondary">No employees found</li>
              )}
              {filtered.map(emp => (
                <li key={emp.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(emp)}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                      selected?.employeeId === emp.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                  >
                    {emp.profilePhotoUrl ? (
                      <img
                        src={emp.profilePhotoUrl}
                        alt={emp.fullName}
                        className="w-6 h-6 rounded-full object-cover shrink-0"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-[9px] font-bold shrink-0">
                        {getInitials(emp.fullName)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-primary truncate">{emp.fullName}</div>
                      {emp.job_titles?.title && (
                        <div className="text-[10px] text-secondary truncate">{emp.job_titles.title}</div>
                      )}
                    </div>
                    {selected?.employeeId === emp.id && (
                      <span className="ml-auto text-blue-500 text-[10px] font-medium shrink-0">✓</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>,
          document.body
        )}
      </div>

      {/* Reset to me */}
      {isOverridden && (
        <button
          type="button"
          onClick={handleResetToMe}
          className="flex items-center gap-1 text-[10px] text-amber-700 dark:text-amber-400 hover:underline"
          title="Reset to logged-in user"
        >
          <RotateCcw className="w-3 h-3" />
          Reset to me
        </button>
      )}
    </div>
  )
}
