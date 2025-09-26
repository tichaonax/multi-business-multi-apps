import { forwardRef } from 'react'

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success'
}

const Badge = forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const variants = {
      default: 'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
      secondary: 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
      destructive: 'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
      success: 'border-transparent bg-green-500 text-white hover:bg-green-600',
      outline: 'text-foreground border-border',
    }

    const classes = [
      'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
      'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
      variants[variant],
      className
    ].filter(Boolean).join(' ')

    return (
      <div className={classes} ref={ref} {...props} />
    )
  }
)

Badge.displayName = 'Badge'

export { Badge }