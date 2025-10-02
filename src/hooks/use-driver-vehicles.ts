'use client'

import { useState, useEffect, useCallback } from 'react'

interface AuthorizedVehicle {
  id: string
  licensePlate: string
  make: string
  model: string
  year: number
  currentMileage: number
  mileageUnit: string
  displayName: string
  authorizationExpiry?: string
}

interface UseDriverVehiclesResult {
  vehicles: AuthorizedVehicle[]
  loading: boolean
  error: string
  refetch: () => void
}

// Simple in-memory cache to prevent duplicate API calls
let cachedVehicles: AuthorizedVehicle[] | null = null
let cacheTimestamp: number | null = null
let activeRequest: Promise<any> | null = null
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export function useDriverVehicles(): UseDriverVehiclesResult {
  const [vehicles, setVehicles] = useState<AuthorizedVehicle[]>(cachedVehicles || [])
  const [loading, setLoading] = useState(!cachedVehicles)
  const [error, setError] = useState('')

  const fetchVehicles = useCallback(async (force = false) => {
    const now = Date.now()

    // Check if we have fresh cached data and not forcing refresh
    if (!force && cachedVehicles && cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION) {
      setVehicles(cachedVehicles)
      setLoading(false)
      return
    }

    // If there's already an active request, wait for it instead of making a new one
    if (activeRequest && !force) {
      try {
        await activeRequest
        if (cachedVehicles) {
          setVehicles(cachedVehicles)
        }
        setLoading(false)
        return
      } catch (err) {
        // If the active request failed, we'll make a new one below
      }
    }

    setLoading(true)
    setError('')

    const request = async () => {
      try {
        const response = await fetch('/api/driver/vehicles')
        const data = await response.json()

        if (data.success) {
          const vehicleData = data.data || []
          setVehicles(vehicleData)

          // Update cache
          cachedVehicles = vehicleData
          cacheTimestamp = Date.now()

          setError('')
          return vehicleData
        } else {
          const errorMsg = data.message || 'Failed to load vehicles'
          setError(errorMsg)
          throw new Error(errorMsg)
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to load authorized vehicles'
        setError(errorMsg)
        console.error('Error fetching driver vehicles:', err)
        throw err
      } finally {
        setLoading(false)
        activeRequest = null
      }
    }

    activeRequest = request()
    return activeRequest
  }, [])

  const refetch = useCallback(() => {
    fetchVehicles(true)
  }, [fetchVehicles])

  useEffect(() => {
    fetchVehicles()
  }, [fetchVehicles])

  return {
    vehicles,
    loading,
    error,
    refetch
  }
}