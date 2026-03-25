"use client"

import { useState, useEffect } from 'react'
import type { OnSuccessArg } from '@/types/ui'

interface Employee {
  id: string
  employeeNumber: string
  fullName: string
  nationalId: string
}

interface PayrollEntryFormProps {
  payrollPeriodId: string
  businessId: string
  businessName?: string
  businessType?: string
  existingEntries?: Array<{ employeeId: string }>
  onSuccess: (payload: OnSuccessArg) => void
  onError: (error: string) => void
  onCancel: () => void
}

export function PayrollEntryForm({
  payrollPeriodId,
  businessId,
  businessName,
  businessType,
  existingEntries = [],
  onSuccess,
  onError,
  onCancel
}: PayrollEntryFormProps) {
  const [loading, setLoading] = useState(false)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [formData, setFormData] = useState({
    employeeId: '',
    workDays: 22,
    sickDays: 0,
    leaveDays: 0,
    absenceDays: 0,
    overtimeHours: 0,
    commission: 0,
    notes: ''
  })

  useEffect(() => {
    if (businessId) {
      loadEmployees()
    }
  }, [businessId, businessType, existingEntries])

  const loadEmployees = async () => {
    try {
      // For umbrella business, fetch all employees; otherwise filter by business
      const isUmbrellaOrSettings = businessType === 'umbrella' || businessType === 'settings'
      const url = isUmbrellaOrSettings
        ? '/api/employees?status=active'
        : `/api/employees?businessId=${businessId}&status=active`

      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        // API returns either an array or a wrapper { employees, pagination }
        const employeesList = Array.isArray(data) ? data : (data?.employees ?? [])

        // Create a set of employee IDs already in payroll for fast lookup
        const existingEmployeeIds = new Set(existingEntries.map(entry => entry.employeeId))

        // Filter to only employees with fully signed contracts (both employee and manager signatures)
        // AND not already in the payroll period
        const eligibleEmployees = employeesList.filter((emp: any) => {
          // Skip if already in payroll
          if (existingEmployeeIds.has(emp.id)) {
            return false
          }

          const contracts = emp.employeeContracts || emp.contracts || []
          const activeContract = contracts.find((c: any) => c.status === 'active')
          return activeContract && activeContract.employeeSignedAt && activeContract.managerSignedAt
        })

        setEmployees(eligibleEmployees)
      }
    } catch (error) {
      console.error('Failed to load employees:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/payroll/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payrollPeriodId,
          ...formData
        })
      })

      if (response.ok) {
        onSuccess({ message: 'Payroll entry created successfully', refresh: false })
        setFormData({
          employeeId: '',
          workDays: 22,
          sickDays: 0,
          leaveDays: 0,
          absenceDays: 0,
          overtimeHours: 0,
          commission: 0,
          notes: ''
        })
      } else {
        const error = await response.json()
        onError(error.error || 'Failed to create payroll entry')
      }
    } catch (error) {
      console.error('Create payroll entry error:', error)
      onError('Failed to create payroll entry')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Info message about filtering */}
      {businessName && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <p className="text-sm text-blue-700 dark:text-blue-400">
            {businessType === 'umbrella' || businessType === 'settings' ? (
              <>
                📋 <strong>{businessName}</strong> can pay employees from all businesses. Showing all employees with fully signed contracts.
              </>
            ) : (
              <>
                📋 Showing only employees from <strong>{businessName}</strong> with fully signed contracts
              </>
            )}
          </p>
        </div>
      )}

      {/* Warning if no eligible employees */}
      {employees.length === 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
          <p className="text-sm text-yellow-700 dark:text-yellow-400">
            ⚠️ No eligible employees found. Employees must have a fully signed contract (both employee and manager signatures) to be added to payroll.
          </p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-secondary mb-1">
          Employee <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.employeeId}
          onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
          className="w-full px-3 py-2 border border-border rounded-md bg-background text-primary focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          required
          disabled={employees.length === 0}
        >
          <option value="">{employees.length === 0 ? 'No eligible employees' : 'Select employee'}</option>
          {employees.map((employee) => (
            <option key={employee.id} value={employee.id}>
              {employee.employeeNumber} - {employee.fullName}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-secondary mb-1">
            Work Days
          </label>
          <input
            type="number"
            value={formData.workDays}
            onChange={(e) => setFormData({ ...formData, workDays: e.target.value === '' ? 0 : parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-primary focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            min="0"
            max="31"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-secondary mb-1">
            Sick Days
          </label>
          <input
            type="number"
            value={formData.sickDays}
            onChange={(e) => setFormData({ ...formData, sickDays: e.target.value === '' ? 0 : parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-primary focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            min="0"
            max="31"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-secondary mb-1">
            Leave Days
          </label>
          <input
            type="number"
            value={formData.leaveDays}
            onChange={(e) => setFormData({ ...formData, leaveDays: e.target.value === '' ? 0 : parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-primary focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            min="0"
            max="31"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-secondary mb-1">
            Absence Days
          </label>
          <input
            type="number"
            value={formData.absenceDays}
            onChange={(e) => setFormData({ ...formData, absenceDays: e.target.value === '' ? 0 : parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-primary focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            min="0"
            max="31"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-secondary mb-1">
            Overtime Hours
          </label>
          <input
            type="number"
            step="0.5"
            value={formData.overtimeHours}
            onChange={(e) => setFormData({ ...formData, overtimeHours: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-primary focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            min="0"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-secondary mb-1">
            Commission
          </label>
          <input
            type="number"
            step="0.01"
            value={formData.commission}
            onChange={(e) => setFormData({ ...formData, commission: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-primary focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            min="0"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-secondary mb-1">
          Notes
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows={3}
          placeholder="Optional notes about this entry"
        />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-secondary bg-background border border-border rounded-md hover:bg-muted"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading || employees.length === 0}
          title={employees.length === 0 ? 'No eligible employees available' : ''}
        >
          {loading ? 'Creating...' : 'Create Entry'}
        </button>
      </div>
    </form>
  )
}
