export interface MaintenanceServiceExpense {
  id: string
  expenseType: 'PARTS' | 'LABOR' | 'TAX' | 'DISPOSAL' | 'TRANSPORTATION' | 'OTHER'
  amount: number
  currency: string
  description?: string
  vendorName?: string
  isBusinessDeductible: boolean
  receiptUrl?: string
}

export interface MaintenanceServiceItem {
  id: string
  serviceType: string
  serviceName: string
  serviceProvider?: string
  cost: number
  currency: string
  description?: string
  receiptUrl?: string
  isScheduledService: boolean
  warrantyUntil?: string
  expenses?: MaintenanceServiceExpense[]
}

export interface MaintenanceServiceCategory {
  type: string
  label: string
  icon: string
  description: string
  commonServices: string[]
  commonAmounts?: number[]
  placeholderAmount: number
  isScheduledService: boolean
  commonProviders?: string[]
  warrantyMonths?: number
}

export const MAINTENANCE_SERVICE_CATEGORIES: MaintenanceServiceCategory[] = [
  {
    type: 'ROUTINE',
    label: 'Oil Change',
    icon: '🛢️',
    description: 'Engine oil and filter change service',
    commonServices: ['Engine Oil Change', 'Oil Filter Replacement', 'Full Service'],
    commonAmounts: [25, 35, 45, 60, 75],
    placeholderAmount: 45,
    isScheduledService: true,
    commonProviders: ['Quick Lube', 'Auto Shop', 'Dealership', 'Mobile Service'],
    warrantyMonths: 3
  },
  {
    type: 'INSPECTION',
    label: 'Vehicle Inspection',
    icon: '🔍',
    description: 'Safety inspection, emissions test, or annual check',
    commonServices: ['Annual Safety Inspection', 'Emissions Test', 'Pre-trip Inspection', 'DOT Inspection'],
    commonAmounts: [15, 25, 35, 50],
    placeholderAmount: 25,
    isScheduledService: true,
    commonProviders: ['Inspection Station', 'Dealership', 'Auto Shop', 'Government Center']
  },
  {
    type: 'REPAIR',
    label: 'Tire Service',
    icon: '🛞',
    description: 'Tire repair, replacement, rotation, or balancing',
    commonServices: ['Tire Repair', 'New Tire', 'Tire Rotation', 'Wheel Balancing', 'Flat Tire Fix'],
    commonAmounts: [20, 40, 80, 120, 200],
    placeholderAmount: 80,
    isScheduledService: false,
    commonProviders: ['Tire Shop', 'Auto Shop', 'Mobile Tire Service', 'Dealership']
  },
  {
    type: 'REPAIR',
    label: 'Minor Repair',
    icon: '🔧',
    description: 'Small repairs like lights, belts, or minor issues',
    commonServices: ['Headlight Replacement', 'Belt Replacement', 'Fuse Replacement', 'Minor Electrical', 'Wiper Blades'],
    commonAmounts: [10, 20, 35, 50, 75],
    placeholderAmount: 35,
    isScheduledService: false,
    commonProviders: ['Auto Shop', 'Parts Store', 'Mobile Mechanic', 'Dealership']
  },
  {
    type: 'EMERGENCY',
    label: 'Emergency Service',
    icon: '🚨',
    description: 'Roadside assistance, towing, or emergency repairs',
    commonServices: ['Towing Service', 'Jump Start', 'Lockout Service', 'Emergency Repair', 'Fuel Delivery'],
    commonAmounts: [50, 75, 100, 150, 200],
    placeholderAmount: 100,
    isScheduledService: false,
    commonProviders: ['Roadside Assistance', 'Towing Company', 'Mobile Mechanic', 'Emergency Service']
  },
  {
    type: 'OTHER',
    label: 'Cleaning & Detailing',
    icon: '🧽',
    description: 'Vehicle washing, detailing, and interior cleaning',
    commonServices: ['Car Wash', 'Interior Cleaning', 'Full Detail', 'Wax Service', 'Vacuum Service'],
    commonAmounts: [10, 20, 30, 50, 75],
    placeholderAmount: 25,
    isScheduledService: false,
    commonProviders: ['Car Wash', 'Detail Shop', 'Mobile Detail', 'Self-Service']
  },
  {
    type: 'OTHER',
    label: 'Battery Service',
    icon: '🔋',
    description: 'Battery testing, charging, or replacement',
    commonServices: ['Battery Test', 'Battery Replacement', 'Battery Charging', 'Alternator Check'],
    commonAmounts: [25, 50, 75, 100, 150],
    placeholderAmount: 75,
    isScheduledService: false,
    commonProviders: ['Auto Shop', 'Parts Store', 'Mobile Service', 'Dealership'],
    warrantyMonths: 12
  },
  {
    type: 'ROUTINE',
    label: 'Brake Service',
    icon: '🛑',
    description: 'Brake inspection, pad replacement, or brake repair',
    commonServices: ['Brake Inspection', 'Brake Pad Replacement', 'Brake Fluid Change', 'Brake Repair'],
    commonAmounts: [50, 100, 200, 300, 400],
    placeholderAmount: 150,
    isScheduledService: true,
    commonProviders: ['Brake Shop', 'Auto Shop', 'Dealership', 'Mobile Mechanic'],
    warrantyMonths: 6
  }
]

export type MaintenanceServiceType = 'ROUTINE' | 'REPAIR' | 'INSPECTION' | 'EMERGENCY' | 'WARRANTY' | 'UPGRADE' | 'OTHER'

export const MAINTENANCE_SERVICE_TYPES: { value: MaintenanceServiceType; label: string; description: string }[] = [
  { value: 'ROUTINE', label: 'Routine Service', description: 'Scheduled maintenance like oil changes, inspections' },
  { value: 'REPAIR', label: 'Repair Service', description: 'Fixing broken or worn parts' },
  { value: 'INSPECTION', label: 'Inspection', description: 'Safety checks and compliance inspections' },
  { value: 'EMERGENCY', label: 'Emergency Service', description: 'Urgent roadside assistance or emergency repairs' },
  { value: 'WARRANTY', label: 'Warranty Service', description: 'Service covered under warranty' },
  { value: 'UPGRADE', label: 'Upgrade/Modification', description: 'Improvements or modifications to the vehicle' },
  { value: 'OTHER', label: 'Other Service', description: 'Other maintenance not categorized above' }
]

export interface MaintenanceServiceExpenseCategory {
  type: 'PARTS' | 'LABOR' | 'TAX' | 'DISPOSAL' | 'TRANSPORTATION' | 'OTHER'
  label: string
  icon: string
  description: string
  isBusinessDeductible: boolean
}

export const MAINTENANCE_SERVICE_EXPENSE_CATEGORIES: MaintenanceServiceExpenseCategory[] = [
  {
    type: 'PARTS',
    label: 'Parts',
    icon: '🔧',
    description: 'Replacement parts and components',
    isBusinessDeductible: true
  },
  {
    type: 'LABOR',
    label: 'Labor',
    icon: '👨‍🔧',
    description: 'Labor charges and service fees',
    isBusinessDeductible: true
  },
  {
    type: 'TAX',
    label: 'Tax',
    icon: '📋',
    description: 'Sales tax and other taxes',
    isBusinessDeductible: true
  },
  {
    type: 'DISPOSAL',
    label: 'Disposal',
    icon: '♻️',
    description: 'Environmental fees and disposal costs',
    isBusinessDeductible: true
  },
  {
    type: 'TRANSPORTATION',
    label: 'Transportation',
    icon: '🚚',
    description: 'Towing, transport, or delivery fees',
    isBusinessDeductible: true
  },
  {
    type: 'OTHER',
    label: 'Other',
    icon: '💰',
    description: 'Other miscellaneous expenses',
    isBusinessDeductible: false
  }
]

export interface CreateMaintenanceWithServicesData {
  vehicleId: string
  serviceDate: string
  mileageAtService?: number
  notes?: string
  services: MaintenanceServiceItem[]
}