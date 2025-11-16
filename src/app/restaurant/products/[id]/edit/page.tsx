"use client"

import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

export default function RestaurantProductEditPage() {
  const router = useRouter()
  const params = useParams()
  const productId = params?.id as string

  useEffect(() => {
    if (productId) {
      // Redirect to main products page with edit modal open
      router.replace(`/restaurant/products?edit=${productId}`)
    }
  }, [router, productId])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
    </div>
  )
}