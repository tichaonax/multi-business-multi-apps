"use client"

// MBM-350: a restaurant's products are its menu items, managed on the Menu
// page (its Inventory page holds ingredients). This page used to be an empty
// placeholder, so it now sends people to the Menu.

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function RestaurantProductsRedirect() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    router.replace('/restaurant/menu')
  }, [searchParams, router])

  return <Spinner />
}

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
    </div>
  )
}

export default function RestaurantProductsPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <RestaurantProductsRedirect />
    </Suspense>
  )
}
