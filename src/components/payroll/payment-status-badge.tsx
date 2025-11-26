interface PaymentStatusBadgeProps {
  status: string
  className?: string
}

export function PaymentStatusBadge({ status, className = '' }: PaymentStatusBadgeProps) {
  const getStatusConfig = (status: string) => {
    switch (status.toUpperCase()) {
      case 'PENDING':
        return {
          label: 'Pending',
          emoji: '⏳',
          bgColor: 'bg-yellow-100',
          textColor: 'text-yellow-800',
          borderColor: 'border-yellow-200',
        }
      case 'VOUCHER_ISSUED':
        return {
          label: 'Voucher Issued',
          emoji: '📄',
          bgColor: 'bg-blue-100',
          textColor: 'text-blue-800',
          borderColor: 'border-blue-200',
        }
      case 'SIGNED':
        return {
          label: 'Signed',
          emoji: '✍️',
          bgColor: 'bg-purple-100',
          textColor: 'text-purple-800',
          borderColor: 'border-purple-200',
        }
      case 'COMPLETED':
        return {
          label: 'Completed',
          emoji: '✅',
          bgColor: 'bg-green-100',
          textColor: 'text-green-800',
          borderColor: 'border-green-200',
        }
      default:
        return {
          label: status,
          emoji: '❓',
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-800',
          borderColor: 'border-gray-200',
        }
    }
  }

  const config = getStatusConfig(status)

  return (
    <span
      className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium border ${config.bgColor} ${config.textColor} ${config.borderColor} ${className}`}
    >
      <span>{config.emoji}</span>
      <span>{config.label}</span>
    </span>
  )
}
