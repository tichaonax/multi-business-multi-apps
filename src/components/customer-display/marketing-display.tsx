/**
 * Marketing Display Component
 *
 * Displays rotating advertisements when the cart is empty.
 * Falls back to a default welcome screen if no ads are configured.
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'

interface Ad {
  id: string
  title: string
  imageUrl?: string | null
  videoUrl?: string | null
  duration: number
  sortOrder: number
}

interface MarketingDisplayProps {
  businessId: string
}

export function MarketingDisplay({ businessId }: MarketingDisplayProps) {
  const [ads, setAds] = useState<Ad[]>([])
  const [currentAdIndex, setCurrentAdIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isPaused, setIsPaused] = useState(false)
  const [fadeState, setFadeState] = useState<'in' | 'out'>('in')

  // Fetch ads on mount
  useEffect(() => {
    async function fetchAds() {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/customer-display/ads?businessId=${businessId}`)
        const data = await response.json()

        if (data.success && data.ads && data.ads.length > 0) {
          setAds(data.ads)
        } else {
          setAds([])
        }
      } catch (error) {
        console.error('[MarketingDisplay] Error fetching ads:', error)
        setAds([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchAds()
  }, [businessId])

  // Auto-rotation logic
  useEffect(() => {
    if (ads.length <= 1 || isPaused) return

    const currentAd = ads[currentAdIndex]
    const duration = (currentAd?.duration || 10) * 1000 // Convert to milliseconds

    // Fade out before transition
    const fadeOutTimer = setTimeout(() => {
      setFadeState('out')
    }, duration - 500) // Start fade 500ms before transition

    // Move to next ad
    const rotateTimer = setTimeout(() => {
      setCurrentAdIndex((prev) => (prev + 1) % ads.length)
      setFadeState('in')
    }, duration)

    return () => {
      clearTimeout(fadeOutTimer)
      clearTimeout(rotateTimer)
    }
  }, [ads, currentAdIndex, isPaused])

  // Toggle pause on click/touch
  const handleTogglePause = useCallback(() => {
    if (ads.length > 1) {
      setIsPaused((prev) => !prev)
    }
  }, [ads.length])

  // Loading state
  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-blue-600 to-purple-600">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-20 w-20 border-b-4 border-white mx-auto mb-6"></div>
          <p className="text-3xl font-semibold">Loading...</p>
        </div>
      </div>
    )
  }

  // No ads - show default welcome screen
  if (ads.length === 0) {
    return <DefaultWelcomeScreen />
  }

  const currentAd = ads[currentAdIndex]

  return (
    <div
      className="h-full w-full relative overflow-hidden cursor-pointer"
      onClick={handleTogglePause}
    >
      {/* Ad content with fade transition */}
      <div
        className={`h-full w-full transition-opacity duration-500 ${
          fadeState === 'in' ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {currentAd.imageUrl ? (
          // Image ad
          <ImageAd ad={currentAd} />
        ) : (
          // Text-only ad (fallback)
          <TextAd ad={currentAd} />
        )}
      </div>

      {/* Ad counter indicator */}
      {ads.length > 1 && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex items-center gap-3 bg-black/50 backdrop-blur-sm rounded-full px-6 py-3">
          <div className="flex gap-2">
            {ads.map((_, index) => (
              <div
                key={index}
                className={`h-3 w-3 rounded-full transition-all ${
                  index === currentAdIndex
                    ? 'bg-white w-8'
                    : 'bg-white/40 hover:bg-white/60'
                }`}
              />
            ))}
          </div>
          {isPaused && (
            <div className="text-white text-lg font-semibold ml-2">
              ⏸ Paused
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Image Ad Component
 */
function ImageAd({ ad }: { ad: Ad }) {
  return (
    <div className="h-full w-full relative bg-gradient-to-br from-gray-900 to-gray-800">
      <Image
        src={ad.imageUrl!}
        alt={ad.title}
        fill
        className="object-contain"
        priority
        sizes="100vw"
      />

      {/* Title overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-8">
        <h2 className="text-5xl font-bold text-white text-center drop-shadow-lg">
          {ad.title}
        </h2>
      </div>
    </div>
  )
}

/**
 * Text-only Ad Component (fallback when no image)
 */
function TextAd({ ad }: { ad: Ad }) {
  return (
    <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600">
      <div className="text-center px-16">
        <h2 className="text-7xl font-bold text-white mb-8 leading-tight drop-shadow-2xl">
          {ad.title}
        </h2>
      </div>
    </div>
  )
}

/**
 * Default Welcome Screen (shown when no ads configured)
 */
function DefaultWelcomeScreen() {
  const [time, setTime] = useState(new Date())

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const timeString = time.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })

  const dateString = time.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-gradient-to-br from-blue-600 via-blue-700 to-purple-800 text-white">
      {/* Welcome message */}
      <div className="text-center mb-16">
        <div className="text-9xl mb-8">👋</div>
        <h1 className="text-8xl font-bold mb-6 tracking-tight">
          Welcome!
        </h1>
        <p className="text-5xl text-blue-100 font-light">
          Thank you for shopping with us
        </p>
      </div>

      {/* Clock */}
      <div className="text-center border-t-2 border-white/20 pt-12">
        <div className="text-7xl font-bold mb-4 font-mono tracking-wider">
          {timeString}
        </div>
        <div className="text-3xl text-blue-100">
          {dateString}
        </div>
      </div>
    </div>
  )
}
