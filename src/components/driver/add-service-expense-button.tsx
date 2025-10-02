'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { MaintenanceServiceExpense, MaintenanceServiceExpenseCategory, MAINTENANCE_SERVICE_EXPENSE_CATEGORIES } from '@/types/maintenance-services'

interface AddServiceExpenseButtonProps {
  onAddExpense: (expense: MaintenanceServiceExpense) => void
  currency?: string
}

export function AddServiceExpenseButton({ onAddExpense, currency = 'USD' }: AddServiceExpenseButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleAddExpense = (category: MaintenanceServiceExpenseCategory) => {
    const newExpense: MaintenanceServiceExpense = {
      id: crypto.randomUUID(),
      expenseType: category.type,
      amount: 0,
      currency: currency,
      isBusinessDeductible: category.isBusinessDeductible,
      description: '',
      vendorName: ''
    }

    onAddExpense(newExpense)
    setIsOpen(false)
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setIsOpen(true)}
        className="w-full border-dashed"
        size="sm"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Service Expense
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Service Expense</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {MAINTENANCE_SERVICE_EXPENSE_CATEGORIES.map((category) => (
              <Button
                key={category.type}
                variant="outline"
                onClick={() => handleAddExpense(category)}
                className="h-auto p-4 flex flex-col items-center space-y-2 hover:bg-blue-50 hover:border-blue-300"
              >
                <span className="text-2xl">{category.icon}</span>
                <div className="text-center">
                  <div className="font-medium">{category.label}</div>
                  <div className="text-xs text-secondary">{category.description}</div>
                </div>
              </Button>
            ))}
          </div>

          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              💡 <strong>Tip:</strong> Add expenses related to this service such as parts, labor, taxes, or disposal fees.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}