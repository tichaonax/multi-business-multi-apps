'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, Wrench } from 'lucide-react'
import { MAINTENANCE_SERVICE_CATEGORIES, MaintenanceServiceCategory, MaintenanceServiceItem } from '@/types/maintenance-services'

interface AddMaintenanceServiceButtonProps {
  onAddService: (service: MaintenanceServiceItem) => void
  currency?: string
}

export function AddMaintenanceServiceButton({
  onAddService,
  currency = 'USD'
}: AddMaintenanceServiceButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleSelectCategory = (category: MaintenanceServiceCategory) => {
    const newService: MaintenanceServiceItem = {
      id: crypto.randomUUID(),
      serviceType: category.type,
      serviceName: '',
      cost: category.placeholderAmount,
      currency,
      isScheduledService: category.isScheduledService,
      description: '',
      serviceProvider: '',
      receiptUrl: '',
      warrantyUntil: category.warrantyMonths ?
        new Date(Date.now() + (category.warrantyMonths * 30 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0] :
        undefined,
      expenses: []
    }

    onAddService(newService)
    setIsOpen(false)
  }

  return (
    <>
      <Button
        variant="outline"
        className="w-full border-dashed"
        onClick={() => setIsOpen(true)}
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Maintenance Service
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Wrench className="h-5 w-5" />
            <span>Select Maintenance Service Type</span>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {MAINTENANCE_SERVICE_CATEGORIES.map((category) => (
            <Card
              key={category.type + category.label}
              className="cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] border-2 hover:border-blue-300"
              onClick={() => handleSelectCategory(category)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{category.icon}</span>
                    <span>{category.label}</span>
                  </div>
                  <Badge
                    variant={category.isScheduledService ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {category.isScheduledService ? 'Scheduled' : 'As-needed'}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-secondary mb-2 line-clamp-2">
                  {category.description}
                </p>

                {/* Common Services Preview */}
                <div className="space-y-1">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    Common services:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {category.commonServices.slice(0, 2).map((service) => (
                      <Badge key={service} variant="outline" className="text-xs">
                        {service}
                      </Badge>
                    ))}
                    {category.commonServices.length > 2 && (
                      <Badge variant="outline" className="text-xs">
                        +{category.commonServices.length - 2} more
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Typical Cost Range */}
                {category.commonAmounts && (
                  <div className="mt-2 text-xs">
                    <span className="text-secondary">Typical cost: </span>
                    <span className="font-medium">
                      ${Math.min(...category.commonAmounts)} - ${Math.max(...category.commonAmounts)}
                    </span>
                  </div>
                )}

                {/* Warranty Info */}
                {category.warrantyMonths && (
                  <div className="mt-1 text-xs text-blue-600 dark:text-blue-400">
                    📋 {category.warrantyMonths} month warranty typical
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            💡 <strong>Tip:</strong> Select the service type that best matches your maintenance activity.
            You can customize the specific service name and details in the next step.
          </p>
        </div>
      </DialogContent>
    </Dialog>
    </>
  )
}