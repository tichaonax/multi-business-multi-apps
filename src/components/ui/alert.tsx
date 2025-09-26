import * as React from "react"

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'destructive' | 'warning' | 'success'
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const variants = {
      default: 'bg-background text-foreground border-border',
      destructive: 'border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive',
      warning: 'border-yellow-500/50 text-yellow-700 dark:text-yellow-400 [&>svg]:text-yellow-700 dark:[&>svg]:text-yellow-400',
      success: 'border-green-500/50 text-green-700 dark:text-green-400 [&>svg]:text-green-700 dark:[&>svg]:text-green-400'
    }

    const classes = [
      'relative w-full rounded-lg border p-4',
      '[&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground',
      variants[variant],
      className
    ].filter(Boolean).join(' ')

    return (
      <div
        ref={ref}
        role="alert"
        className={classes}
        {...props}
      />
    )
  }
)
Alert.displayName = "Alert"

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={`text-sm [&_p]:leading-relaxed ${className || ''}`}
    {...props}
  />
))
AlertDescription.displayName = "AlertDescription"

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={`mb-1 font-medium leading-none tracking-tight ${className || ''}`}
    {...props}
  />
))
AlertTitle.displayName = "AlertTitle"

export { Alert, AlertDescription, AlertTitle }