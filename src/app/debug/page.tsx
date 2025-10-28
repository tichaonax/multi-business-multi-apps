'use client'

import { useSession } from 'next-auth/react'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { useEffect, useState } from 'react'

export default function DebugPage() {
  const { data: session } = useSession()
  const { currentBusiness, businesses, isAuthenticated, loading } = useBusinessPermissionsContext()
  const [apiBusinesses, setApiBusinesses] = useState<any[]>([])

  useEffect(() => {
    fetch('/api/businesses')
      .then(res => res.json())
      .then(data => {
        setApiBusinesses(data.businesses || [])
      })
      .catch(err => console.error('Error fetching businesses:', err))
  }, [])

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Debug Information</h1>

      <div className="space-y-4">
        <div className="card p-4">
          <h2 className="font-bold mb-2">Session Info:</h2>
          <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-auto">
            {JSON.stringify(session?.user, null, 2)}
          </pre>
        </div>

        <div className="card p-4">
          <h2 className="font-bold mb-2">Business Context:</h2>
          <p>Loading: {loading ? 'Yes' : 'No'}</p>
          <p>Authenticated: {isAuthenticated ? 'Yes' : 'No'}</p>
          <p>Current Business ID: {currentBusiness?.businessId || 'None'}</p>
          <p>Current Business Name: {currentBusiness?.businessName || 'None'}</p>
          <p>Current Business Type: {currentBusiness?.businessType || 'None'}</p>
        </div>

        <div className="card p-4">
          <h2 className="font-bold mb-2">Business Memberships ({businesses?.length || 0}):</h2>
          <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-auto max-h-60">
            {JSON.stringify(businesses, null, 2)}
          </pre>
        </div>

        <div className="card p-4">
          <h2 className="font-bold mb-2">API Businesses ({apiBusinesses.length}):</h2>
          <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-auto max-h-60">
            {JSON.stringify(apiBusinesses, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  )
}
