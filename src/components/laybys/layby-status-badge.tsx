'use client'

import { Badge } from '@/components/ui/badge'
import { LaybyStatus } from '@/types/layby'

interface LaybyStatusBadgeProps {
  status: LaybyStatus
  className?: string
}

export function LaybyStatusBadge({ status, className }: LaybyStatusBadgeProps) {
  const statusConfig = {
    ACTIVE: {
      variant: 'default' as const,
      label: 'Active',
      color: 'bg-blue-500 text-white hover:bg-blue-600'
    },
    COMPLETED: {
      variant: 'success' as const,
      label: 'Completed',
      color: 'bg-green-500 text-white hover:bg-green-600'
    },
    CANCELLED: {
      variant: 'destructive' as const,
      label: 'Cancelled',
      color: 'bg-red-500 text-white hover:bg-red-600'
    },
    DEFAULTED: {
      variant: 'destructive' as const,
      label: 'Defaulted',
      color: 'bg-orange-600 text-white hover:bg-orange-700'
    },
    ON_HOLD: {
      variant: 'secondary' as const,
      label: 'On Hold',
      color: 'bg-yellow-500 text-white hover:bg-yellow-600'
    }
  }

  const config = statusConfig[status]

  return (
    <Badge
      variant={config.variant}
      className={`${config.color} ${className || ''}`}
    >
      {config.label}
    </Badge>
  )
}
