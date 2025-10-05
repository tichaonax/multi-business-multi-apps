'use client'

import { useState, useEffect } from 'react'
import { useConfirm } from '@/components/ui/confirm-modal'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { hasUserPermission } from '@/lib/permission-utils'
import { formatDateByFormat } from '@/lib/country-codes'
import { useDateFormat } from '@/contexts/settings-context'
import {
  Clock,
  MapPin,
  Car,
  Calendar,
  Loader2,
  RefreshCw,
  CheckCircle2,
  Circle,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Receipt,
  TrendingUp,
  MoreVertical,
  Edit,
  Trash2
} from 'lucide-react'

interface TripExpense {
  id: string
  expenseType: string
  amount: number
  currency: string
  description?: string
  vendorName?: string
  isBusinessDeductible: boolean
  fuelQuantity?: number
  fuelType?: string
}

interface ExpenseSummary {
  totalExpenses: number
  expenseCount: number
  businessDeductibleTotal: number
  personalTotal: number
}

interface DriverTrip {
  id: string
  vehicle: {
    licensePlate: string
    make: string
    model: string
    mileageUnit?: string
  }
  startMileage: number
  endMileage: number | null
  tripMileage: number
  tripPurpose: string
  tripType: 'BUSINESS' | 'PERSONAL' | 'MIXED'
  startLocation: string | null
  endLocation: string | null
  startTime: string
  endTime: string | null
  isCompleted: boolean
  notes: string | null
  expenses?: TripExpense[]
  expenseSummary?: ExpenseSummary
  createdAt?: string
  updatedAt?: string
}

interface DriverTripListProps {
  onEditTrip?: (trip: DriverTrip) => void
}

export function DriverTripList({ onEditTrip }: DriverTripListProps) {
  const { data: session } = useSession()
  const { format: globalDateFormat } = useDateFormat()
  const [trips, setTrips] = useState<DriverTrip[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalTrips, setTotalTrips] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const [deletingTripId, setDeletingTripId] = useState<string | null>(null)
  const confirm = useConfirm()

  const fetchTrips = async (page = 1) => {
    try {
      setRefreshing(page === currentPage)
      const response = await fetch(`/api/driver/trips?page=${page}&limit=10`)
      const data = await response.json()

      if (data.success) {
        setTrips(data.data || [])
        setTotalPages(data.meta?.totalPages || 1)
        setTotalTrips(data.meta?.total || 0)
        setCurrentPage(page)
        setError('')
      } else {
        setError(data.error || 'Failed to load trips')
      }
    } catch (err) {
      setError('Network error loading trips')
      console.error('Error fetching trips:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchTrips(1)
  }, [])

  const handleRefresh = () => {
    fetchTrips(currentPage)
  }

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setLoading(true)
      fetchTrips(page)
    }
  }

  const canEditTrip = (trip: DriverTrip): boolean => {
    if (!session?.user) return false

    // Admin or managers can always edit
    if (hasUserPermission(session.user, 'isSystemAdmin') ||
      hasUserPermission(session.user, 'isBusinessManager')) {
      return true
    }

    // Drivers can edit within 24 hours
    if (trip.createdAt) {
      const now = new Date()
      const createdAt = new Date(trip.createdAt)
      const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)
      return hoursSinceCreation <= 24
    }

    return false
  }

  const canDeleteTrip = (trip: DriverTrip): boolean => {
    if (!session?.user) return false

    // Admin can always delete
    if (hasUserPermission(session.user, 'isSystemAdmin')) {
      return true
    }

    // Managers can delete within their business
    if (hasUserPermission(session.user, 'isBusinessManager')) {
      return true
    }

    // Drivers can delete within 24 hours
    if (trip.createdAt) {
      const now = new Date()
      const createdAt = new Date(trip.createdAt)
      const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)
      return hoursSinceCreation <= 24
    }

    return false
  }

  const handleDeleteTrip = async (tripId: string) => {
    const ok = await confirm({ title: 'Delete trip', description: 'Are you sure you want to delete this trip? This action cannot be undone.', confirmText: 'Delete', cancelText: 'Cancel' })
    if (!ok) return

    setDeletingTripId(tripId)

    try {
      const response = await fetch(`/api/driver/trips?id=${tripId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        // Remove trip from the list
        setTrips(prev => prev.filter(trip => trip.id !== tripId))
        setTotalTrips(prev => Math.max(0, prev - 1))
        setError('')
      } else {
        setError(data.error || 'Failed to delete trip')
      }
    } catch (err) {
      setError('Network error while deleting trip')
      console.error('Error deleting trip:', err)
    } finally {
      setDeletingTripId(null)
    }
  }

  const formatDateTime = (dateTimeString: string) => {
    const date = new Date(dateTimeString)
    return {
      date: formatDateByFormat(dateTimeString, globalDateFormat),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  }

  const getTripTypeColor = (type: string) => {
    switch (type) {
      case 'BUSINESS':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'PERSONAL':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'MIXED':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const formatMileage = (mileage: number | null, unit: string = 'km') => {
    return mileage ? `${mileage.toLocaleString()} ${unit}` : 'N/A'
  }

  const getExpenseIcon = (expenseType: string): string => {
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

  if (loading && !refreshing) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin mr-2" />
          <span>Loading your trips...</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>My Trip History</span>
            {totalTrips > 0 && (
              <Badge variant="secondary" className="ml-2">
                {totalTrips} trips
              </Badge>
            )}
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center space-x-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-lg mb-4">
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}

        {trips.length === 0 ? (
          <div className="text-center py-8">
            <Car className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-600 dark:text-gray-400 mb-2">
              No trips logged yet
            </h3>
            <p className="text-gray-500 dark:text-gray-500 text-sm">
              Start logging your trips to see them here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {trips.map((trip) => {
              const startDateTime = formatDateTime(trip.startTime)
              const endDateTime = trip.endTime ? formatDateTime(trip.endTime) : null

              return (
                <div
                  key={trip.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  {/* Trip Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        {trip.isCompleted ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <Circle className="h-5 w-5 text-gray-400" />
                        )}
                        <span className="font-medium text-primary">
                          {trip.tripPurpose}
                        </span>
                      </div>
                      <Badge className={getTripTypeColor(trip.tripType)}>
                        {trip.tripType}
                      </Badge>
                      {/* Edit Badge */}
                      {canEditTrip(trip) && (
                        <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50 dark:bg-green-900/20">
                          Editable
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="text-right text-sm text-secondary">
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4" />
                          <span>{startDateTime.date}</span>
                        </div>
                      </div>

                      {/* Actions Dropdown */}
                      {(canEditTrip(trip) || canDeleteTrip(trip)) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                              disabled={deletingTripId === trip.id}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {canEditTrip(trip) && onEditTrip && (
                              <DropdownMenuItem onClick={() => onEditTrip(trip)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Trip
                              </DropdownMenuItem>
                            )}
                            {canDeleteTrip(trip) && (
                              <DropdownMenuItem
                                onClick={() => handleDeleteTrip(trip.id)}
                                className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                {deletingTripId === trip.id ? 'Deleting...' : 'Delete Trip'}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>

                  {/* Vehicle & Mileage Info */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                    <div className="flex items-center space-x-2">
                      <Car className="h-4 w-4 text-gray-400" />
                      <span className="text-sm">
                        <strong>{trip.vehicle.licensePlate}</strong>
                        <span className="text-secondary ml-1">
                          {trip.vehicle.make} {trip.vehicle.model}
                        </span>
                      </span>
                    </div>

                    <div className="text-sm">
                      <span className="text-secondary">Mileage: </span>
                      <span className="font-medium">
                        {formatMileage(trip.startMileage, trip.vehicle?.mileageUnit)}
                        {trip.endMileage && (
                          <> → {formatMileage(trip.endMileage, trip.vehicle?.mileageUnit)}</>
                        )}
                      </span>
                      {trip.tripMileage > 0 && (
                        <span className="text-blue-600 dark:text-blue-400 ml-2">
                          ({trip.tripMileage} {trip.vehicle?.mileageUnit || 'km'})
                        </span>
                      )}
                    </div>

                    <div className="text-sm">
                      <span className="text-secondary">Time: </span>
                      <span className="font-medium">
                        {startDateTime.time}
                        {endDateTime && <> → {endDateTime.time}</>}
                      </span>
                    </div>
                  </div>

                  {/* Location Info */}
                  {(trip.startLocation || trip.endLocation) && (
                    <div className="flex items-center space-x-2 mb-3 text-sm">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span>
                        {trip.startLocation || 'Unknown start'}
                        {trip.endLocation && (
                          <> → {trip.endLocation}</>
                        )}
                      </span>
                    </div>
                  )}

                  {/* Trip Expenses Summary */}
                  {trip.expenseSummary && trip.expenseSummary.expenseCount > 0 && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Receipt className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                            Trip Expenses ({trip.expenseSummary.expenseCount})
                          </span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <DollarSign className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-bold text-blue-800 dark:text-blue-200">
                            ${trip.expenseSummary.totalExpenses.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-green-700 dark:text-green-300">Business:</span>
                          <span className="font-medium text-green-800 dark:text-green-200">
                            ${trip.expenseSummary.businessDeductibleTotal.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Personal:</span>
                          <span className="font-medium text-gray-700 dark:text-gray-300">
                            ${trip.expenseSummary.personalTotal.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Expense Types Summary */}
                      {trip.expenses && trip.expenses.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-blue-200 dark:border-blue-700">
                          <div className="flex flex-wrap gap-1">
                            {trip.expenses.reduce((acc, expense) => {
                              const existing = acc.find(item => item.type === expense.expenseType)
                              if (existing) {
                                existing.total += expense.amount
                                existing.count += 1
                              } else {
                                acc.push({
                                  type: expense.expenseType,
                                  total: expense.amount,
                                  count: 1,
                                  icon: getExpenseIcon(expense.expenseType)
                                })
                              }
                              return acc
                            }, [] as Array<{ type: string, total: number, count: number, icon: string }>)
                              .map((expenseGroup) => (
                                <Badge
                                  key={expenseGroup.type}
                                  variant="secondary"
                                  className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200"
                                >
                                  {expenseGroup.icon} {expenseGroup.type.toLowerCase()}: ${expenseGroup.total.toFixed(2)}
                                  {expenseGroup.count > 1 && ` (${expenseGroup.count})`}
                                </Badge>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Notes */}
                  {trip.notes && (
                    <div className="text-sm text-secondary bg-gray-50 dark:bg-gray-800 p-2 rounded">
                      <strong>Notes:</strong> {trip.notes}
                    </div>
                  )}

                </div>
              )
            })}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="text-sm text-secondary">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}