'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useBusinessPermissions } from '@/contexts/business-permissions-context'

/**
 * Auto-redirects to the current business's home page when a page
 * detects the current business type doesn't match the route.
 * Used in place of the static "Wrong Business Type" error screens.
 */
export function BusinessTypeRedirect() {
  const router = useRouter()
  const { currentBusiness } = useBusinessPermissions()

  useEffect(() => {
    if (currentBusiness) {
      const businessType = currentBusiness.businessType
      const primaryTypes = ['restaurant', 'grocery', 'clothing', 'hardware', 'construction', 'services']
      const targetPath = primaryTypes.includes(businessType) ? `/${businessType}` : '/dashboard'
      router.replace(targetPath)
    }
  }, [currentBusiness, router])

  return null
}
