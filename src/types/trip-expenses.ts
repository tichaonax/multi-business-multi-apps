// Trip Expense Types for Enhanced Trip Logger

export interface TripExpenseItem {
  id?: string
  expenseType: TripExpenseType
  expenseCategory?: string
  amount: number
  currency: string
  description?: string
  vendorName?: string
  isBusinessDeductible: boolean
  fuelQuantity?: number
  fuelType?: FuelType
  receiptUrl?: string
}

export type TripExpenseType =
  | 'FUEL'
  | 'TOLL'
  | 'PARKING'
  | 'FOOD'
  | 'MAINTENANCE'
  | 'TIRE'
  | 'OIL'
  | 'OTHER'

export type FuelType = 'GASOLINE' | 'DIESEL' | 'ELECTRIC' | 'HYBRID'

export interface TripExpenseCategory {
  type: TripExpenseType
  label: string
  icon: string
  description: string
  requiresQuantity?: boolean
  commonAmounts?: number[]
  placeholderAmount?: number
  isBusinessDeductible: boolean
}

export const TRIP_EXPENSE_CATEGORIES: TripExpenseCategory[] = [
  {
    type: 'FUEL',
    label: 'Fuel',
    icon: '⛽',
    description: 'Petrol, diesel, or other fuel purchases',
    requiresQuantity: true,
    commonAmounts: [20, 30, 50, 75, 100],
    placeholderAmount: 50,
    isBusinessDeductible: true
  },
  {
    type: 'TOLL',
    label: 'Toll Roads',
    icon: '🛣️',
    description: 'Highway tolls and road fees',
    commonAmounts: [2, 5, 10, 15, 20],
    placeholderAmount: 5,
    isBusinessDeductible: true
  },
  {
    type: 'PARKING',
    label: 'Parking',
    icon: '🅿️',
    description: 'Parking fees at destinations',
    commonAmounts: [2, 5, 10, 15, 25],
    placeholderAmount: 5,
    isBusinessDeductible: true
  },
  {
    type: 'FOOD',
    label: 'Meal Allowance',
    icon: '🍽️',
    description: 'Driver meals during trip',
    commonAmounts: [10, 15, 20, 25, 30],
    placeholderAmount: 15,
    isBusinessDeductible: true
  },
  {
    type: 'TIRE',
    label: 'Tire Services',
    icon: '🛞',
    description: 'Tire repair, replacement, or air',
    commonAmounts: [5, 15, 50, 100, 200],
    placeholderAmount: 50,
    isBusinessDeductible: true
  },
  {
    type: 'OIL',
    label: 'Oil & Fluids',
    icon: '🛢️',
    description: 'Engine oil, brake fluid, coolant',
    commonAmounts: [10, 25, 40, 60, 80],
    placeholderAmount: 25,
    isBusinessDeductible: true
  },
  {
    type: 'MAINTENANCE',
    label: 'Emergency Repairs',
    icon: '🔧',
    description: 'Unexpected vehicle maintenance',
    commonAmounts: [25, 50, 100, 200, 500],
    placeholderAmount: 100,
    isBusinessDeductible: true
  },
  {
    type: 'OTHER',
    label: 'Other Expenses',
    icon: '💰',
    description: 'Other trip-related expenses',
    commonAmounts: [5, 10, 20, 50, 100],
    placeholderAmount: 20,
    isBusinessDeductible: false
  }
]

export interface CreateTripWithExpensesData {
  // Trip data
  vehicleId: string
  driverId: string
  businessId?: string
  startMileage: number
  endMileage?: number
  tripPurpose: string
  tripType: 'BUSINESS' | 'PERSONAL' | 'MIXED'
  startLocation?: string
  endLocation?: string
  startTime: string
  endTime?: string
  notes?: string

  // Expense data
  expenses: TripExpenseItem[]
}

// Frontend request type - omits driverId since API determines it from session
export interface CreateTripWithExpensesRequest {
  // Trip data
  vehicleId: string
  businessId?: string
  startMileage: number
  endMileage?: number
  tripPurpose: string
  tripType: 'BUSINESS' | 'PERSONAL' | 'MIXED'
  startLocation?: string
  endLocation?: string
  startTime: string
  endTime?: string
  notes?: string

  // Expense data
  expenses: TripExpenseItem[]
}

export interface TripExpenseSummary {
  totalExpenses: number
  expenseCount: number
  expensesByType: Record<TripExpenseType, number>
  businessDeductibleTotal: number
  personalTotal: number
}