'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Minus, DollarSign } from 'lucide-react'
import { MaintenanceServiceExpense, MaintenanceServiceExpenseCategory } from '@/types/maintenance-services'

interface MaintenanceServiceExpenseInputProps {
  category: MaintenanceServiceExpenseCategory
  expense: MaintenanceServiceExpense
  onChange: (expense: MaintenanceServiceExpense) => void
  onRemove: () => void
  onAddNext?: () => void
  currency?: string
}

export function MaintenanceServiceExpenseInput({
  category,
  expense,
  onChange,
  onRemove,
  onAddNext,
  currency = 'USD'
}: MaintenanceServiceExpenseInputProps) {
  const [showDetails, setShowDetails] = useState(false)

  const handleChange = (field: keyof MaintenanceServiceExpense, value: any) => {
    onChange({
      ...expense,
      [field]: value,
      currency: currency
    })
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-lg">{category.icon}</span>
          <h4 className="font-medium text-primary">{category.label}</h4>
        </div>
        <div className="flex items-center space-x-2">
          {onAddNext && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onAddNext}
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Minus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Amount Input */}
      <div className="space-y-2">
        <Label>Amount *</Label>
        <div className="relative">
          <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="number"
            step="0.01"
            min="0"
            value={expense.amount || ''}
            onChange={(e) => handleChange('amount', e.target.value === '' ? 0 : parseFloat(e.target.value))}
            placeholder="0.00"
            className="pl-10"
          />
        </div>
      </div>

      {/* Show Details Toggle */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setShowDetails(!showDetails)}
        className="text-sm text-blue-600 hover:text-blue-700 p-0 h-auto"
      >
        {showDetails ? 'Hide Details' : 'Add Details'}
      </Button>

      {/* Additional Details */}
      {showDetails && (
        <div className="space-y-3 pt-2 border-t border-gray-200 dark:border-gray-700">
          {/* Vendor Name */}
          <div className="space-y-2">
            <Label>Vendor/Supplier</Label>
            <Input
              value={expense.vendorName || ''}
              onChange={(e) => handleChange('vendorName', e.target.value)}
              placeholder="Who provided this service/part?"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={expense.description || ''}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Additional details about this expense..."
              rows={2}
            />
          </div>

          {/* Business Deductible Toggle */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id={`deductible-${expense.expenseType}`}
              checked={expense.isBusinessDeductible}
              onChange={(e) => handleChange('isBusinessDeductible', e.target.checked)}
              className="h-4 w-4"
            />
            <Label htmlFor={`deductible-${expense.expenseType}`} className="text-sm">
              Business deductible expense
            </Label>
          </div>

          {/* Receipt URL */}
          <div className="space-y-2">
            <Label>Receipt (optional)</Label>
            <Input
              value={expense.receiptUrl || ''}
              onChange={(e) => handleChange('receiptUrl', e.target.value)}
              placeholder="Receipt photo URL or reference"
            />
          </div>
        </div>
      )}
    </div>
  )
}

interface MaintenanceServiceExpenseListProps {
  expenses: MaintenanceServiceExpense[]
  onChange: (expenses: MaintenanceServiceExpense[]) => void
  onAddExpense?: (expense: MaintenanceServiceExpense) => void
  currency?: string
}

export function MaintenanceServiceExpenseList({
  expenses,
  onChange,
  onAddExpense,
  currency = 'USD'
}: MaintenanceServiceExpenseListProps) {
  const updateExpense = (index: number, expense: MaintenanceServiceExpense) => {
    const newExpenses = [...expenses]
    newExpenses[index] = expense
    onChange(newExpenses)
  }

  const removeExpense = (index: number) => {
    const newExpenses = expenses.filter((_, i) => i !== index)
    onChange(newExpenses)
  }

  const addNextExpense = () => {
    if (onAddExpense) {
      const newExpense: MaintenanceServiceExpense = {
        id: crypto.randomUUID(),
        expenseType: 'OTHER',
        amount: 0,
        currency: currency,
        isBusinessDeductible: false,
        description: '',
        vendorName: ''
      }
      onAddExpense(newExpense)
    }
  }

  const calculateTotal = () => {
    return expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0)
  }

  const calculateBusinessTotal = () => {
    return expenses
      .filter(expense => expense.isBusinessDeductible)
      .reduce((sum, expense) => sum + (expense.amount || 0), 0)
  }

  if (expenses.length === 0) {
    return (
      <div className="text-center py-4 text-secondary">
        No service expenses added yet.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {expenses.map((expense, index) => {
        const category = {
          type: expense.expenseType,
          label: expense.expenseType,
          icon: getExpenseIcon(expense.expenseType),
          description: '',
          isBusinessDeductible: expense.isBusinessDeductible
        } as MaintenanceServiceExpenseCategory

        return (
          <MaintenanceServiceExpenseInput
            key={expense.id}
            category={category}
            expense={expense}
            onChange={(updatedExpense) => updateExpense(index, updatedExpense)}
            onRemove={() => removeExpense(index)}
            onAddNext={onAddExpense ? addNextExpense : undefined}
            currency={currency}
          />
        )
      })}

      {/* Expense Summary */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span>Total Additional Expenses:</span>
          <span className="font-medium">${calculateTotal().toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Business Deductible:</span>
          <span className="font-medium text-green-600">${calculateBusinessTotal().toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Personal:</span>
          <span className="font-medium">${(calculateTotal() - calculateBusinessTotal()).toFixed(2)}</span>
        </div>
      </div>
    </div>
  )
}

function getExpenseIcon(expenseType: string): string {
  const icons: Record<string, string> = {
    'PARTS': '🔧',
    'LABOR': '👨‍🔧',
    'TAX': '📋',
    'DISPOSAL': '♻️',
    'TRANSPORTATION': '🚚',
    'OTHER': '💰'
  }
  return icons[expenseType] || '💰'
}