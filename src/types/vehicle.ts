// Vehicle Management Types

export interface Vehicle {
  id: string
  licensePlate: string
  vin: string
  make: string
  model: string
  year: number
  color?: string
  weight?: number
  driveType: 'LEFT_HAND' | 'RIGHT_HAND'
  ownershipType: 'PERSONAL' | 'BUSINESS'
  currentMileage: number
  mileageUnit: 'km' | 'miles'
  hasInitialMileage: boolean
  businessId?: string
  userId?: string
  isActive: boolean
  purchaseDate?: string
  purchasePrice?: number
  notes?: string
  createdAt: string
  updatedAt: string

  // Relations
  business?: {
    id: string
    name: string
    type: string
  }
  user?: {
    id: string
    name: string
    email: string
  }
  vehicleLicenses?: VehicleLicense[]
  driverAuthorizations?: DriverAuthorization[]
  trips?: VehicleTrip[]
  maintenanceRecords?: VehicleMaintenanceRecord[]
  expenseRecords?: VehicleExpense[]
}

export interface VehicleDriver {
  id: string
  fullName: string
  licenseNumber: string
  licenseExpiry: string
  phoneNumber?: string
  emailAddress?: string
  emergencyContact?: string
  emergencyPhone?: string
  userId?: string
  isActive: boolean
  dateOfBirth?: string
  address?: string
  createdAt: string
  updatedAt: string

  // Relations
  user?: {
    id: string
    name: string
    email: string
  }
  authorizations?: DriverAuthorization[]
  trips?: VehicleTrip[]
}

export interface VehicleLicense {
  id: string
  vehicleId: string
  licenseType: 'REGISTRATION' | 'RADIO' | 'ROAD_USE' | 'INSURANCE' | 'INSPECTION'
  licenseNumber: string
  issuingAuthority?: string
  issueDate: string
  expiryDate: string
  renewalCost?: number
  isActive: boolean
  documentUrl?: string
  reminderDays: number
  createdAt: string
  updatedAt: string

  // Relations
  vehicle?: Vehicle
}

export interface DriverAuthorization {
  id: string
  driverId: string
  vehicleId: string
  authorizedBy: string
  authorizedDate: string
  expiryDate?: string
  isActive: boolean
  authorizationLevel: 'BASIC' | 'ADVANCED' | 'EMERGENCY'
  notes?: string
  createdAt: string
  updatedAt: string

  // Relations
  driver?: VehicleDriver
  vehicle?: Vehicle
  authorizer?: {
    id: string
    name: string
    email: string
  }
}

export interface VehicleTrip {
  id: string
  vehicleId: string
  driverId: string
  businessId?: string
  startMileage: number
  endMileage: number
  tripMileage: number
  tripPurpose: string
  tripType: 'BUSINESS' | 'PERSONAL' | 'MIXED'
  startLocation?: string
  endLocation?: string
  startTime: string
  endTime?: string
  isCompleted: boolean
  notes?: string
  gpsTrackingData?: any
  createdAt: string
  updatedAt: string

  // Relations
  vehicle?: Vehicle
  driver?: VehicleDriver
  business?: {
    id: string
    name: string
    type: string
  }
  expenses?: VehicleExpense[]
}

export interface VehicleExpense {
  id: string
  vehicleId: string
  tripId?: string
  businessId?: string
  expenseType: 'FUEL' | 'TOLL' | 'PARKING' | 'MAINTENANCE' | 'INSURANCE' | 'OTHER'
  expenseCategory?: string
  amount: number
  currency: string
  expenseDate: string
  isBusinessDeductible: boolean
  receiptUrl?: string
  vendorName?: string
  description?: string
  mileageAtExpense?: number
  fuelQuantity?: number
  fuelType?: 'GASOLINE' | 'DIESEL' | 'ELECTRIC' | 'HYBRID'
  createdBy: string
  createdAt: string
  updatedAt: string

  // Relations
  vehicle?: Vehicle
  trip?: VehicleTrip
  business?: {
    id: string
    name: string
    type: string
  }
  creator?: {
    id: string
    name: string
    email: string
  }
}

export interface VehicleMaintenanceRecord {
  id: string
  vehicleId: string
  serviceType: 'ROUTINE' | 'REPAIR' | 'INSPECTION' | 'EMERGENCY' | 'WARRANTY' | 'UPGRADE'
  serviceName: string
  serviceProvider?: string
  serviceDate: string
  mileageAtService?: number
  cost: number
  currency: string
  nextServiceMileage?: number
  nextServiceDate?: string
  warrantyUntil?: string
  receiptUrl?: string
  notes?: string
  isCompleted: boolean
  createdBy: string
  createdAt: string
  updatedAt: string

  // Relations
  vehicle?: Vehicle
  creator?: {
    id: string
    name: string
    email: string
  }
}

export interface VehicleReimbursement {
  id: string
  userId: string
  vehicleId: string
  businessId: string
  reimbursementPeriod: string
  totalMileage: number
  businessMileage: number
  personalMileage: number
  statutoryRate: number
  totalAmount: number
  status: 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED'
  submissionDate: string
  approvalDate?: string
  paymentDate?: string
  approvedBy?: string
  notes?: string
  createdAt: string
  updatedAt: string

  // Relations
  user?: {
    id: string
    name: string
    email: string
  }
  vehicle?: Vehicle
  business?: {
    id: string
    name: string
    type: string
  }
  approver?: {
    id: string
    name: string
    email: string
  }
}

// Form and API types
export interface CreateVehicleData {
  licensePlate: string
  vin: string
  make: string
  model: string
  year: number
  color?: string
  weight?: number
  driveType: 'LEFT_HAND' | 'RIGHT_HAND'
  ownershipType: 'PERSONAL' | 'BUSINESS'
  currentMileage: number
  mileageUnit: 'km' | 'miles'
  businessId?: string
  userId?: string
  purchaseDate?: string
  purchasePrice?: number
  notes?: string
}

export interface CreateDriverData {
  fullName: string
  licenseNumber: string
  licenseExpiry: string
  phoneNumber?: string
  emailAddress?: string
  emergencyContact?: string
  emergencyPhone?: string
  userId?: string
  dateOfBirth?: string
  address?: string
}

export interface CreateTripData {
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
}

export interface CreateExpenseData {
  vehicleId: string
  tripId?: string
  businessId?: string
  expenseType: 'FUEL' | 'TOLL' | 'PARKING' | 'MAINTENANCE' | 'INSURANCE' | 'OTHER'
  expenseCategory?: string
  amount: number
  currency?: string
  expenseDate: string
  isBusinessDeductible: boolean
  receiptUrl?: string
  vendorName?: string
  description?: string
  mileageAtExpense?: number
  fuelQuantity?: number
  fuelType?: 'GASOLINE' | 'DIESEL' | 'ELECTRIC' | 'HYBRID'
}

export interface CreateMaintenanceData {
  vehicleId: string
  serviceType: 'ROUTINE' | 'REPAIR' | 'INSPECTION' | 'EMERGENCY' | 'WARRANTY' | 'UPGRADE'
  serviceName: string
  serviceProvider?: string
  serviceDate: string
  mileageAtService?: number
  cost: number
  currency: string
  nextServiceMileage?: number
  nextServiceDate?: string
  warrantyUntil?: string
  receiptUrl?: string
  notes?: string
  isCompleted: boolean
}

// API Response types
export interface VehicleApiResponse {
  success: boolean
  data: Vehicle[]
  meta?: {
    total: number
    page: number
    limit: number
    totalPages: number
    hasMore: boolean
  }
  error?: string
}

export interface SingleVehicleApiResponse {
  success: boolean
  data: Vehicle
  error?: string
}

export interface DriverApiResponse {
  success: boolean
  data: VehicleDriver[]
  meta?: {
    total: number
    page: number
    limit: number
    totalPages: number
    hasMore: boolean
  }
  error?: string
}

export interface TripApiResponse {
  success: boolean
  data: VehicleTrip[]
  meta?: {
    total: number
    page: number
    limit: number
    totalPages: number
    hasMore: boolean
  }
  error?: string
}

export interface ExpenseApiResponse {
  success: boolean
  data: VehicleExpense[]
  meta?: {
    total: number
    page: number
    limit: number
    totalPages: number
    hasMore: boolean
  }
  error?: string
}

export interface MaintenanceApiResponse {
  success: boolean
  data: VehicleMaintenanceRecord[]
  meta?: {
    total: number
    page: number
    limit: number
    totalPages: number
    hasMore: boolean
  }
  error?: string
}