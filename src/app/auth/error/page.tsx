'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'

// Force dynamic rendering to avoid static generation conflicts with Next-Auth
export const dynamic = 'force-dynamic'
export const dynamicParams = true

function ErrorContent() {
  const searchParams = useSearchParams()
  const error = searchParams?.get('error')

  const errorMessages: Record<string, { title: string; description: string }> = {
    Configuration: {
      title: 'Server Configuration Error',
      description: 'There is a problem with the server configuration. Please contact support.',
    },
    AccessDenied: {
      title: 'Access Denied',
      description: 'You do not have permission to access this resource.',
    },
    Verification: {
      title: 'Verification Error',
      description: 'The verification link may have expired or has already been used.',
    },
    Default: {
      title: 'Authentication Error',
      description: 'An error occurred during authentication. Please try again.',
    },
  }

  const errorInfo = errorMessages[error || 'Default'] || errorMessages.Default

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-foreground">
            {errorInfo.title}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {errorInfo.description}
          </p>
          {error && (
            <p className="mt-2 text-xs text-muted-foreground">
              Error code: {error}
            </p>
          )}
        </div>

        <div className="mt-8 space-y-4">
          <Link
            href="/auth/signin"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            Return to Sign In
          </Link>
          <Link
            href="/"
            className="w-full flex justify-center py-2 px-4 border border-border rounded-md shadow-sm text-sm font-medium text-foreground bg-background hover:bg-muted focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            Go to Homepage
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    }>
      <ErrorContent />
    </Suspense>
  )
}
