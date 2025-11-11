import Link from 'next/link'

// Force dynamic rendering to avoid static generation conflicts
export const dynamic = 'force-dynamic'
export const dynamicParams = true

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full space-y-8 p-8 text-center">
        <div>
          <h2 className="mt-6 text-6xl font-bold text-foreground">404</h2>
          <p className="mt-2 text-3xl font-bold text-foreground">Page Not Found</p>
          <p className="mt-2 text-sm text-muted-foreground">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        <div className="mt-8 space-y-4">
          <Link
            href="/"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            Go to Homepage
          </Link>
          <Link
            href="/auth/signin"
            className="w-full flex justify-center py-2 px-4 border border-border rounded-md shadow-sm text-sm font-medium text-foreground bg-background hover:bg-muted focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  )
}
