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
import { TripExpenseItem, TripExpenseCategory, TRIP_EXPENSE_CATEGORIES } from '@/types/trip-expenses'

interface AddExpenseButtonProps {
  onAddExpense: (expense: TripExpenseItem) => void
  currency?: string
}

export function AddExpenseButton({ onAddExpense, currency = 'USD' }: AddExpenseButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleAddExpense = (category: TripExpenseCategory) => {
    const newExpense: TripExpenseItem = {
      expenseType: category.type,
      amount: 0,
      currency: currency,
      isBusinessDeductible: category.isBusinessDeductible,
      description: '',
      vendorName: ''
    }

    // Set default fuel type for fuel expenses
    if (category.type === 'FUEL') {
      newExpense.fuelType = 'GASOLINE'
      newExpense.fuelQuantity = 0
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
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Trip Expense
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Trip Expense</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {TRIP_EXPENSE_CATEGORIES.map((category) => (
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
                  {category.placeholderAmount && (
                    <div className="text-xs text-blue-600 mt-1">
                      ~${category.placeholderAmount}
                    </div>
                  )}
                </div>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}