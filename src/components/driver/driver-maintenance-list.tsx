'use client'

import { useState, useEffect, useRef } from 'react'
import { useConfirm } from '@/components/ui/confirm-modal'
import { useToastContext } from '@/components/ui/toast'
import { formatDateByFormat } from '@/lib/country-codes'
import { useDateFormat } from '@/contexts/settings-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Wrench,
  Car,
  Calendar,
  Gauge,
  DollarSign,
  Clock,
  Loader2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Building2,
  Receipt,
  Shield,
  ClipboardList,
  Edit3,
  Trash2,
  MoreHorizontal
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DriverMaintenanceEditModal } from './driver-maintenance-edit-modal'

interface ServiceExpense {
  id: string
  expenseType: string
  amount: number
  currency: string
  description?: string
  vendorName?: string
  isBusinessDeductible: boolean
  receiptUrl?: string
}

interface MaintenanceService {
  id: string
  serviceName: string
  serviceType: string
  cost: number
  currency: string
  serviceProvider?: string
  description?: string
  isScheduledService: boolean
  warrantyUntil?: string
  receiptUrl?: string
  expenses: ServiceExpense[]
}

interface DriverMaintenanceRecord {
  id: string
  vehicle: {
    licensePlate: string
    make: string
    model: string
    year: number
    mileageUnit: string
  }
  serviceDate: string
  serviceName: string
  serviceType: string
  serviceProvider?: string
  serviceCost: number
  mileageAtService?: number
  nextServiceDue?: string
  nextServiceMileage?: number
  warrantyInfo?: string
  receiptUrl?: string
  notes?: string
  isScheduledService: boolean
  createdAt: string
  updatedAt: string
  services: MaintenanceService[]
  totalServicesCount: number
  totalExpensesCount: number
  totalCostFromServices: number
}

interface DriverMaintenanceListProps {
  onAddMaintenance?: () => void
}

export function DriverMaintenanceList({ onAddMaintenance }: DriverMaintenanceListProps) {
  const { format: globalDateFormat } = useDateFormat()
  const [records, setRecords] = useState<DriverMaintenanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalRecords, setTotalRecords] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const [vehicleFilter, setVehicleFilter] = useState('')
  const [serviceTypeFilter, setServiceTypeFilter] = useState('')
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<DriverMaintenanceRecord | null>(null)
  // Track ongoing fetch promises to avoid duplicate network requests
  const ongoingFetchesRef = useRef<Map<string, Promise<any>>>(new Map())

  const fetchRecords = async (page = 1) => {
    try {
      setRefreshing(page === currentPage)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10'
      })

      if (vehicleFilter) params.append('vehicleId', vehicleFilter)
      if (serviceTypeFilter) params.append('serviceType', serviceTypeFilter)

      const key = params.toString()

      // If an identical request is already in-flight, reuse its promise instead of issuing a new fetch
      let data
      if (ongoingFetchesRef.current.has(key)) {
        data = await ongoingFetchesRef.current.get(key)
      } else {
        const promise = (async () => {
          const res = await fetch(`/api/driver/maintenance?${params}`)
          return res.json()
        })()

        ongoingFetchesRef.current.set(key, promise)
        try {
          data = await promise
        } finally {
          ongoingFetchesRef.current.delete(key)
        }
      }

      console.log('Maintenance API Response:', data) // Debug log

      if (data && data.success) {
        setRecords(data.data || [])
        setTotalPages(data.meta?.totalPages || 1)
        setTotalRecords(data.meta?.total || 0)
        setCurrentPage(page)
        setError('')
      } else {
        setError(data.error || 'Failed to load maintenance records')
      }
    } catch (err) {
      setError('Network error loading maintenance records')
      console.error('Error fetching maintenance records:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchRecords(1)
  }, [vehicleFilter, serviceTypeFilter])

  const handleRefresh = () => {
    fetchRecords(currentPage)
  }

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setLoading(true)
      fetchRecords(page)
    }
  }

  const formatDateTime = (dateTimeString: string) => {
    const date = new Date(dateTimeString)
    return {
      date: formatDateByFormat(date, globalDateFormat),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  }

  const getServiceTypeColor = (type: string) => {
    switch (type.toUpperCase()) {
      case 'ROUTINE':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'REPAIR':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'INSPECTION':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'EMERGENCY':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
      case 'WARRANTY':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      case 'UPGRADE':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const formatMileage = (mileage: number | null | undefined, unit: string = 'km') => {
    return mileage ? `${mileage.toLocaleString()} ${unit}` : 'N/A'
  }

  const getServiceIcon = (serviceType: string): string => {
    const icons: Record<string, string> = {
      'ROUTINE': '🔧',
      'REPAIR': '⚙️',
      'INSPECTION': '🔍',
      'EMERGENCY': '🚨',
      'WARRANTY': '🛡️',
      'UPGRADE': '⬆️',
      'OTHER': '🔩'
    }
    return icons[serviceType.toUpperCase()] || '🔧'
  }

  const canEditRecord = (record: DriverMaintenanceRecord): boolean => {
    const createdAt = new Date(record.createdAt)
    const now = new Date()
    const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)
    return hoursDiff < 24
  }

  const handleEditRecord = (record: DriverMaintenanceRecord) => {
    setEditingRecord(record)
    setEditModalOpen(true)
  }

  const handleEditSuccess = () => {
    setEditModalOpen(false)
    setEditingRecord(null)
    // Refresh the records list
    fetchRecords(currentPage)
  }

  const handleEditClose = () => {
    setEditModalOpen(false)
    setEditingRecord(null)
  }

  const handleDeleteRecord = async (record: DriverMaintenanceRecord) => {
    const ok = await confirm({
      title: 'Delete maintenance record',
      description: 'Are you sure you want to delete this maintenance record? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    })

    if (!ok) return

    try {
      const response = await fetch(`/api/driver/maintenance?id=${record.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        // Refresh the records list
        fetchRecords(currentPage)
      } else {
  const data = await response.json()
  toast.push(data.error || 'Failed to delete maintenance record')
      }
    } catch (error) {
      console.error('Error deleting record:', error)
      toast.push('Network error. Please try again.')
    }
  }

  const confirm = useConfirm()
  const toast = useToastContext()

  if (loading && !refreshing) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin mr-2" />
          <span>Loading maintenance history...</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Wrench className="h-5 w-5" />
            <span>My Maintenance History</span>
            {totalRecords > 0 && (
              <Badge variant="secondary" className="ml-2">
                {totalRecords} record{totalRecords !== 1 ? 's' : ''}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center space-x-2">
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
            {onAddMaintenance && (
              <Button
                onClick={onAddMaintenance}
                size="sm"
                className="flex items-center space-x-2"
              >
                <Wrench className="h-4 w-4" />
                <span>Record Maintenance</span>
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-lg mb-4">
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}

        {records.length === 0 ? (
          <div className="text-center py-8">
            <Wrench className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-600 dark:text-gray-400 mb-2">
              No maintenance records yet
            </h3>
            <p className="text-gray-500 dark:text-gray-500 text-sm mb-4">
              Start recording vehicle maintenance to see history here. You can edit records within 24 hours of creation.
            </p>
            {onAddMaintenance && (
              <Button onClick={onAddMaintenance} className="mt-2">
                <Wrench className="h-4 w-4 mr-2" />
                Record First Maintenance
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {records.map((record) => {
              const serviceDateTime = formatDateTime(record.serviceDate)
              const hasWarranty = record.warrantyInfo && new Date(record.warrantyInfo) > new Date()

              return (
                <div
                  key={record.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  {/* Record Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{getServiceIcon(record.serviceType)}</span>
                        <span className="font-medium text-primary">
                          {record.serviceName}
                        </span>
                      </div>
                      <Badge className={getServiceTypeColor(record.serviceType)}>
                        {record.serviceType.toLowerCase()}
                      </Badge>
                      {record.isScheduledService && (
                        <Badge variant="outline" className="text-xs">
                          <Clock className="h-3 w-3 mr-1" />
                          Scheduled
                        </Badge>
                      )}
                      {hasWarranty && (
                        <Badge variant="outline" className="text-xs text-green-600">
                          <Shield className="h-3 w-3 mr-1" />
                          Warranty
                        </Badge>
                      )}
                      {canEditRecord(record) && (
                        <Badge variant="outline" className="text-xs text-blue-600">
                          <Edit3 className="h-3 w-3 mr-1" />
                          Editable
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="text-right text-sm text-secondary">
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4" />
                          <span>{serviceDateTime.date}</span>
                        </div>
                      </div>
                      {/* Actions Menu */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                            title="Options"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {canEditRecord(record) && (
                            <DropdownMenuItem onClick={() => handleEditRecord(record)}>
                              <Edit3 className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => handleDeleteRecord(record)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Vehicle & Service Info */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                    <div className="flex items-center space-x-2">
                      <Car className="h-4 w-4 text-gray-400" />
                      <span className="text-sm">
                        <strong>{record.vehicle.licensePlate}</strong>
                        <span className="text-secondary ml-1">
                          {record.vehicle.make} {record.vehicle.model}
                        </span>
                      </span>
                    </div>

                    <div className="text-sm">
                      <span className="text-secondary">Cost: </span>
                      {record.serviceCost > 0 ? (
                        <span className="font-medium text-green-600 dark:text-green-400">
                          <DollarSign className="h-3 w-3 inline mr-1" />
                          ${record.serviceCost.toFixed(2)}
                        </span>
                      ) : (
                        <span className="font-medium text-gray-500 dark:text-gray-400">
                          Not specified
                        </span>
                      )}
                    </div>

                    {record.mileageAtService && (
                      <div className="text-sm">
                        <span className="text-secondary">Mileage: </span>
                        <span className="font-medium">
                          <Gauge className="h-3 w-3 inline mr-1" />
                          {formatMileage(record.mileageAtService, record.vehicle?.mileageUnit || 'km')}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Individual Services */}
                  {record.services && record.services.length > 0 && (
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-3">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-primary flex items-center space-x-2">
                          <Wrench className="h-4 w-4" />
                          <span>Services Performed ({record.services.length})</span>
                        </h4>
                        {record.totalCostFromServices > 0 && (
                          <div className="text-sm font-medium text-green-600 dark:text-green-400">
                            Total: ${record.totalCostFromServices.toFixed(2)}
                          </div>
                        )}
                      </div>

                      <div className="space-y-3">
                        {record.services.map((service, serviceIndex) => (
                          <div key={service.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-900">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <span className="text-lg">{getServiceIcon(service.serviceType)}</span>
                                <div>
                                  <span className="font-medium">{service.serviceName}</span>
                                  <Badge className={`ml-2 ${getServiceTypeColor(service.serviceType)}`}>
                                    {service.serviceType.toLowerCase()}
                                  </Badge>
                                  {service.isScheduledService && (
                                    <Badge variant="outline" className="ml-1 text-xs">
                                      <Clock className="h-3 w-3 mr-1" />
                                      Scheduled
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="text-right text-sm">
                                <div className="font-medium text-green-600 dark:text-green-400">
                                  ${service.cost.toFixed(2)}
                                </div>
                              </div>
                            </div>

                            {/* Service Provider */}
                            {service.serviceProvider && (
                              <div className="text-sm text-secondary mb-2">
                                <Building2 className="h-3 w-3 inline mr-1" />
                                Provider: {service.serviceProvider}
                              </div>
                            )}

                            {/* Service Description */}
                            {service.description && (
                              <div className="text-sm text-secondary mb-2">
                                <ClipboardList className="h-3 w-3 inline mr-1" />
                                {service.description}
                              </div>
                            )}

                            {/* Service Warranty */}
                            {service.warrantyUntil && (
                              <div className="text-sm text-green-600 dark:text-green-400 mb-2">
                                <Shield className="h-3 w-3 inline mr-1" />
                                Warranty until: {new Date(service.warrantyUntil).toLocaleDateString()}
                              </div>
                            )}

                            {/* Service Expenses */}
                            {service.expenses && service.expenses.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                                <div className="text-sm font-medium text-secondary mb-2">
                                  Expenses ({service.expenses.length}):
                                </div>
                                <div className="space-y-2">
                                  {service.expenses.map((expense) => (
                                    <div key={expense.id} className="flex items-center justify-between text-sm bg-gray-50 dark:bg-gray-800 p-2 rounded">
                                      <div className="flex items-center space-x-2">
                                        <DollarSign className="h-3 w-3 text-gray-400" />
                                        <span>{expense.expenseType}</span>
                                        {expense.vendorName && (
                                          <span className="text-secondary">({expense.vendorName})</span>
                                        )}
                                        {expense.isBusinessDeductible && (
                                          <Badge variant="outline" className="text-xs">Tax Deductible</Badge>
                                        )}
                                      </div>
                                      <span className="font-medium">${expense.amount.toFixed(2)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Service Receipt */}
                            {service.receiptUrl && (
                              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                                <a
                                  href={service.receiptUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                                >
                                  <Receipt className="h-3 w-3" />
                                  <span>View Service Receipt</span>
                                </a>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Legacy Service Provider (for old records without services array) */}
                  {(!record.services || record.services.length === 0) && record.serviceProvider && (
                    <div className="flex items-center space-x-2 mb-3 text-sm">
                      <Building2 className="h-4 w-4 text-gray-400" />
                      <span>
                        <span className="text-secondary">Provider: </span>
                        <span className="font-medium">{record.serviceProvider}</span>
                      </span>
                    </div>
                  )}

                  {/* Warranty Information */}
                  {record.warrantyInfo && (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 mb-3">
                      <div className="flex items-center space-x-2">
                        <Shield className="h-4 w-4 text-green-600" />
                        <div>
                          <span className="text-sm font-medium text-green-800 dark:text-green-200">
                            Warranty Coverage
                          </span>
                          <p className="text-xs text-green-700 dark:text-green-300">
                            Valid until: {new Date(record.warrantyInfo).toLocaleDateString()}
                            {hasWarranty ? (
                              <Badge variant="outline" className="ml-2 text-xs text-green-600">
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="ml-2 text-xs text-gray-600">
                                Expired
                              </Badge>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Next Service Due */}
                  {(record.nextServiceDue || record.nextServiceMileage) && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-3">
                      <div className="flex items-center space-x-2 mb-1">
                        <AlertCircle className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                          Next Service Due
                        </span>
                      </div>
                      <div className="text-xs text-blue-700 dark:text-blue-300">
                        {record.nextServiceDue && (
                          <div>Date: {new Date(record.nextServiceDue).toLocaleDateString()}</div>
                        )}
                        {record.nextServiceMileage && (
                          <div>Mileage: {formatMileage(record.nextServiceMileage, record.vehicle?.mileageUnit || 'km')}</div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {record.notes && (
                    <div className="text-sm text-secondary bg-gray-50 dark:bg-gray-800 p-2 rounded">
                      <div className="flex items-start space-x-2">
                        <ClipboardList className="h-3 w-3 mt-0.5 text-gray-400" />
                        <div>
                          <strong>Notes:</strong> {record.notes}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Receipt Link */}
                  {record.receiptUrl && (
                    <div className="mt-3 pt-3 border-t">
                      <a
                        href={record.receiptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        <Receipt className="h-4 w-4" />
                        <span>View Receipt</span>
                      </a>
                    </div>
                  )}

                  {/* Record Metadata */}
                  <div className="mt-3 pt-3 border-t text-xs text-secondary">
                    <div className="flex justify-between">
                      <span>Recorded: {formatDateTime(record.createdAt).date}</span>
                      {record.updatedAt !== record.createdAt && (
                        <span>Updated: {formatDateTime(record.updatedAt).date}</span>
                      )}
                    </div>
                  </div>
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

      {/* Edit Modal */}
      {editingRecord && (
        <DriverMaintenanceEditModal
          record={editingRecord}
          isOpen={editModalOpen}
          onClose={handleEditClose}
          onSuccess={handleEditSuccess}
        />
      )}
    </Card>
  )
}