"use client"

// MBM-350: hardware products are listed, added and edited on the Inventory
// page ("Items" tab). This page used to be an empty placeholder, so it now
// sends people there. `?edit=<id>` (from /hardware/products/<id>/edit) opens
// that item's edit form on the Inventory page.

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function HardwareProductsRedirect() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const editId = searchParams?.get('edit')
    router.replace(
      editId
        ? `/hardware/inventory?productId=${encodeURIComponent(editId)}`
        : '/hardware/inventory?tab=inventory'
    )
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

export default function HardwareProductsPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <HardwareProductsRedirect />
    </Suspense>
  )
}
