'use client'

import { useEffect, useState } from 'react'

interface Employee {
  id: string
  fullName: string
  jobTitle?: {
    title: string
    department?: string
    level?: string
  } | null
}

interface EmployeeFilterProps {
  businessId: string
  selectedEmployeeId: string | null
  onEmployeeChange: (employeeId: string | null) => void
  className?: string
}

export function EmployeeFilter({
  businessId,
  selectedEmployeeId,
  onEmployeeChange,
  className = ''
}: EmployeeFilterProps) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (businessId) {
      loadEmployees()
    }
  }, [businessId])

  const loadEmployees = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/employees?businessId=${businessId}`)

      if (response.ok) {
        const data = await response.json()
        setEmployees(data.employees || [])
      }
    } catch (error) {
      console.error('Error loading employees:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span className="text-sm text-gray-600 dark:text-gray-400">Loading employees...</span>
      </div>
    )
  }

  if (employees.length === 0) {
    return null
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <label htmlFor="employee-filter" className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Sales Person:
      </label>
      <select
        id="employee-filter"
        value={selectedEmployeeId || ''}
        onChange={(e) => onEmployeeChange(e.target.value || null)}
        className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">All Sales Persons</option>
        {employees.map((emp) => (
          <option key={emp.id} value={emp.id}>
            {emp.fullName} {emp.jobTitle?.title ? `(${emp.jobTitle.title})` : ''}
          </option>
        ))}
      </select>
      {selectedEmployeeId && (
        <button
          onClick={() => onEmployeeChange(null)}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          Clear
        </button>
      )}
    </div>
  )
}
