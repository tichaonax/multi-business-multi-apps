'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  X,
  Receipt,
  Calendar,
  Shield,
  DollarSign,
  Building2,
  ClipboardList
} from 'lucide-react'
import { MaintenanceServiceCategory, MaintenanceServiceItem, MaintenanceServiceExpense } from '@/types/maintenance-services'
import { AddServiceExpenseButton } from './add-service-expense-button'
import { MaintenanceServiceExpenseList } from './maintenance-service-expense-input'

interface MaintenanceServiceInputProps {
  category: MaintenanceServiceCategory
  service: MaintenanceServiceItem
  onChange: (updatedService: MaintenanceServiceItem) => void
  onRemove: () => void
  currency?: string
}

export function MaintenanceServiceInput({
  category,
  service,
  onChange,
  onRemove,
  currency = 'USD'
}: MaintenanceServiceInputProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const handleServiceNameChange = (serviceName: string) => {
    onChange({ ...service, serviceName })
  }

  const handleCostChange = (cost: number) => {
    onChange({ ...service, cost })
  }

  const handleProviderChange = (serviceProvider: string) => {
    onChange({ ...service, serviceProvider })
  }

  const handleDescriptionChange = (description: string) => {
    onChange({ ...service, description })
  }

  const handleScheduledChange = (isScheduledService: boolean) => {
    onChange({ ...service, isScheduledService })
  }

  const handleWarrantyChange = (warrantyUntil: string) => {
    onChange({ ...service, warrantyUntil })
  }

  const handleReceiptChange = (receiptUrl: string) => {
    onChange({ ...service, receiptUrl })
  }

  const handleAddExpense = (expense: MaintenanceServiceExpense) => {
    const currentExpenses = service.expenses || []
    onChange({ ...service, expenses: [...currentExpenses, expense] })
  }

  const handleUpdateExpenses = (expenses: MaintenanceServiceExpense[]) => {
    onChange({ ...service, expenses })
  }

  const getWarrantyDate = () => {
    if (category.warrantyMonths) {
      const warrantyDate = new Date()
      warrantyDate.setMonth(warrantyDate.getMonth() + category.warrantyMonths)
      return warrantyDate.toISOString().split('T')[0]
    }
    return ''
  }

  return (
    <Card className="relative border-l-4 border-l-blue-500">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center space-x-2">
            <span className="text-lg">{category.icon}</span>
            <span>{category.label}</span>
            <Badge variant="secondary" className="text-xs">
              {category.type.toLowerCase()}
            </Badge>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Service Name Selection */}
        <div className="space-y-2">
          <Label htmlFor={`service-name-${service.id}`} className="text-sm font-medium">
            Service Performed *
          </Label>
          <Select
            value={service.serviceName}
            onValueChange={handleServiceNameChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select service type" />
            </SelectTrigger>
            <SelectContent>
              {category.commonServices.map((serviceName) => (
                <SelectItem key={serviceName} value={serviceName}>
                  {serviceName}
                </SelectItem>
              ))}
              <SelectItem value="Custom Service">
                Custom Service (specify below)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Cost Input with Quick Amounts */}
        <div className="space-y-2">
          <Label htmlFor={`cost-${service.id}`} className="text-sm font-medium">
            Service Cost * ({currency})
          </Label>
          <div className="space-y-2">
            <Input
              id={`cost-${service.id}`}
              type="number"
              step="0.01"
              min="0"
              value={service.cost || ''}
              onChange={(e) => handleCostChange(parseFloat(e.target.value) || 0)}
              placeholder={`${category.placeholderAmount}`}
              className="text-lg"
            />
            {category.commonAmounts && (
              <div className="flex flex-wrap gap-1">
                {category.commonAmounts.map((amount) => (
                  <Button
                    key={amount}
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() => handleCostChange(amount)}
                    className="h-7 px-2 text-xs"
                  >
                    ${amount}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Service Provider */}
        <div className="space-y-2">
          <Label htmlFor={`provider-${service.id}`} className="text-sm font-medium flex items-center space-x-1">
            <Building2 className="h-3 w-3" />
            <span>Service Provider</span>
          </Label>
          {category.commonProviders ? (
            <Select
              value={service.serviceProvider || ''}
              onValueChange={handleProviderChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select or enter provider" />
              </SelectTrigger>
              <SelectContent>
                {category.commonProviders.map((provider) => (
                  <SelectItem key={provider} value={provider}>
                    {provider}
                  </SelectItem>
                ))}
                <SelectItem value="Other">
                  Other (specify below)
                </SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <Input
              id={`provider-${service.id}`}
              value={service.serviceProvider || ''}
              onChange={(e) => handleProviderChange(e.target.value)}
              placeholder="Enter service provider name"
            />
          )}
        </div>

        {/* Description - Show when Custom Service or Other Provider is selected */}
        {(service.serviceName === 'Custom Service' || service.serviceProvider === 'Other') && (
          <div className="space-y-2 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
            <Label htmlFor={`description-${service.id}`} className="text-sm font-medium flex items-center space-x-1">
              <ClipboardList className="h-3 w-3" />
              <span>
                {service.serviceName === 'Custom Service' && service.serviceProvider === 'Other'
                  ? 'Service Description & Provider Details'
                  : service.serviceName === 'Custom Service'
                  ? 'Custom Service Description'
                  : 'Service Provider Details'
                } *
              </span>
            </Label>
            <Textarea
              id={`description-${service.id}`}
              value={service.description || ''}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              placeholder={
                service.serviceName === 'Custom Service' && service.serviceProvider === 'Other'
                  ? 'Describe the custom service performed and specify the service provider...'
                  : service.serviceName === 'Custom Service'
                  ? 'Describe the custom service that was performed...'
                  : 'Specify the name of the service provider...'
              }
              rows={3}
              className="text-sm"
            />
          </div>
        )}

        {/* Service Expenses Section */}
        <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium flex items-center space-x-1">
              <DollarSign className="h-4 w-4" />
              <span>Service Expenses</span>
              {service.expenses && service.expenses.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {service.expenses.length} expense{service.expenses.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </Label>
            {service.expenses && service.expenses.length > 0 && (
              <div className="flex items-center space-x-2 text-sm">
                <span className="font-medium text-green-600 dark:text-green-400">
                  Total: ${service.expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0).toFixed(2)}
                </span>
              </div>
            )}
          </div>

          <AddServiceExpenseButton
            onAddExpense={handleAddExpense}
            currency={currency}
          />

          {service.expenses && service.expenses.length > 0 && (
            <MaintenanceServiceExpenseList
              expenses={service.expenses}
              onChange={handleUpdateExpenses}
              onAddExpense={handleAddExpense}
              currency={currency}
            />
          )}
        </div>

        {/* Scheduled Service Toggle */}
        <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-blue-600" />
            <div>
              <Label htmlFor={`scheduled-${service.id}`} className="text-sm font-medium">
                Scheduled Service
              </Label>
              <p className="text-xs text-secondary">
                Was this planned maintenance?
              </p>
            </div>
          </div>
          <Switch
            id={`scheduled-${service.id}`}
            checked={service.isScheduledService}
            onChange={(e) => handleScheduledChange(e.target.checked)}
          />
        </div>

        {/* Warranty Information */}
        {category.warrantyMonths && (
          <div className="space-y-2">
            <Label htmlFor={`warranty-${service.id}`} className="text-sm font-medium flex items-center space-x-1">
              <Shield className="h-3 w-3" />
              <span>Warranty Until</span>
            </Label>
            <Input
              id={`warranty-${service.id}`}
              type="date"
              value={service.warrantyUntil || getWarrantyDate()}
              onChange={(e) => handleWarrantyChange(e.target.value)}
              className="text-sm"
            />
            <p className="text-xs text-secondary">
              Default: {category.warrantyMonths} months from today
            </p>
          </div>
        )}

        {/* Expandable Section */}
        <div className="border-t pt-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full justify-between"
          >
            <span className="text-sm">Additional Details</span>
            <span className="text-xs text-secondary">
              {isExpanded ? 'Collapse' : 'Expand'}
            </span>
          </Button>

          {isExpanded && (
            <div className="mt-3 space-y-3">
              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor={`description-${service.id}`} className="text-sm font-medium flex items-center space-x-1">
                  <ClipboardList className="h-3 w-3" />
                  <span>Service Description</span>
                </Label>
                <Textarea
                  id={`description-${service.id}`}
                  value={service.description || ''}
                  onChange={(e) => handleDescriptionChange(e.target.value)}
                  placeholder="Any additional details about the service..."
                  rows={2}
                  className="text-sm"
                />
              </div>

              {/* Receipt URL */}
              <div className="space-y-2">
                <Label htmlFor={`receipt-${service.id}`} className="text-sm font-medium flex items-center space-x-1">
                  <Receipt className="h-3 w-3" />
                  <span>Receipt/Photo URL</span>
                </Label>
                <Input
                  id={`receipt-${service.id}`}
                  value={service.receiptUrl || ''}
                  onChange={(e) => handleReceiptChange(e.target.value)}
                  placeholder="Link to receipt photo or document"
                  className="text-sm"
                />
              </div>

            </div>
          )}
        </div>

        {/* Service Summary */}
        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">
              {service.serviceName || 'Service'}
            </span>
            <div className="flex flex-col items-end">
              <div className="flex items-center space-x-1">
                <DollarSign className="h-3 w-3" />
                <span className="font-bold">
                  {service.cost ? `${service.cost.toFixed(2)}` : '0.00'}
                </span>
              </div>
              {service.expenses && service.expenses.length > 0 && (
                <div className="text-xs text-blue-600 dark:text-blue-400">
                  +${service.expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0).toFixed(2)} expenses
                </div>
              )}
            </div>
          </div>
          {service.serviceProvider && (
            <p className="text-xs text-secondary mt-1">
              {service.serviceProvider}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}