'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Minus, DollarSign, Receipt } from 'lucide-react'
import { TripExpenseItem, TripExpenseCategory, FuelType } from '@/types/trip-expenses'
import { useConfirm } from '@/components/ui/confirm-modal'

interface ExpenseInputProps {
  category: TripExpenseCategory
  expense: TripExpenseItem
  onChange: (expense: TripExpenseItem) => void
  onRemove: () => void
  onAddNext?: () => void
  currency?: string
}

export function ExpenseInput({
  category,
  expense,
  onChange,
  onRemove,
  onAddNext,
  currency = 'USD'
}: ExpenseInputProps) {
  const [showDetails, setShowDetails] = useState(false)
  const confirm = useConfirm()

  const handleChange = (field: keyof TripExpenseItem, value: any) => {
    onChange({
      ...expense,
      [field]: value,
      currency: currency
    })
  }

  const setQuickAmount = (amount: number) => {
    handleChange('amount', amount)
  }

  const handleRemove = async () => {
    const description = [
      `Amount: $${expense.amount || 0}`,
      expense.vendorName ? `Vendor: ${expense.vendorName}` : '',
      expense.description ? `Description: ${expense.description}` : ''
    ].filter(Boolean).join('\n')

    const confirmed = await confirm({
      title: `Delete ${category.label} Expense`,
      description: description || 'Are you sure you want to delete this expense?',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    })

    if (confirmed) {
      onRemove()
    }
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-lg">{category.icon}</span>
          <h4 className="font-medium text-primary">{category.label}</h4>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleRemove}
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <Minus className="h-4 w-4" />
        </Button>
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

        {/* Quick Amount Buttons */}
        {category.commonAmounts && (
          <div className="flex flex-wrap gap-1">
            {category.commonAmounts.map((amount) => (
              <Button
                key={amount}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setQuickAmount(amount)}
                className="text-xs px-2 py-1 h-auto"
              >
                ${amount}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Fuel Quantity (for fuel expenses) */}
      {category.requiresQuantity && expense.expenseType === 'FUEL' && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Fuel Quantity (L)</Label>
            <Input
              type="number"
              step="0.1"
              min="0"
              value={expense.fuelQuantity || ''}
              onChange={(e) => handleChange('fuelQuantity', parseFloat(e.target.value) || undefined)}
              placeholder="Liters"
            />
          </div>
          <div className="space-y-2">
            <Label>Fuel Type</Label>
            <Select
              value={expense.fuelType || 'GASOLINE'}
              onValueChange={(value: FuelType) => handleChange('fuelType', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GASOLINE">Gasoline/Petrol</SelectItem>
                <SelectItem value="DIESEL">Diesel</SelectItem>
                <SelectItem value="ELECTRIC">Electric</SelectItem>
                <SelectItem value="HYBRID">Hybrid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

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
            <Label>Vendor/Location</Label>
            <Input
              value={expense.vendorName || ''}
              onChange={(e) => handleChange('vendorName', e.target.value)}
              placeholder="Where was this expense incurred?"
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

          {/* Receipt URL (placeholder for future implementation) */}
          <div className="space-y-2">
            <Label className="flex items-center space-x-2">
              <Receipt className="h-4 w-4" />
              <span>Receipt (optional)</span>
            </Label>
            <Input
              value={expense.receiptUrl || ''}
              onChange={(e) => handleChange('receiptUrl', e.target.value)}
              placeholder="Receipt photo URL or reference"
            />
          </div>
        </div>
      )}

      {/* Add Next Expense Button - Prominent at bottom */}
      {onAddNext && (
        <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
          <Button
            type="button"
            variant="outline"
            onClick={onAddNext}
            className="w-full text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-300 hover:border-blue-400"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Next Expense
          </Button>
        </div>
      )}
    </div>
  )
}

interface ExpenseListProps {
  expenses: TripExpenseItem[]
  onChange: (expenses: TripExpenseItem[]) => void
  onAddExpense?: (expense: TripExpenseItem) => void
  currency?: string
}

export function ExpenseList({ expenses, onChange, onAddExpense, currency = 'USD' }: ExpenseListProps) {
  const updateExpense = (index: number, expense: TripExpenseItem) => {
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
      // Create a basic expense with no defaults - user must fill in details
      const newExpense: TripExpenseItem = {
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
        No trip expenses added yet.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {expenses.map((expense, index) => {
        // Find the category for this expense type
        const category = {
          type: expense.expenseType,
          label: expense.expenseType,
          icon: getExpenseIcon(expense.expenseType),
          description: '',
          isBusinessDeductible: expense.isBusinessDeductible
        } as TripExpenseCategory

        return (
          <ExpenseInput
            key={index}
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
          <span>Total Expenses:</span>
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
    'FUEL': '⛽',
    'TOLL': '🛣️',
    'PARKING': '🅿️',
    'FOOD': '🍽️',
    'TIRE': '🛞',
    'OIL': '🛢️',
    'MAINTENANCE': '🔧',
    'OTHER': '💰'
  }
  return icons[expenseType] || '💰'
}