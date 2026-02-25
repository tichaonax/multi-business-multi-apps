'use client'

import React, { useState } from 'react'

interface StarRatingProps {
  value: number           // 0 = no rating, 1-5 = filled stars
  onChange?: (rating: number) => void  // interactive when provided
  size?: 'sm' | 'md'
}

export function StarRating({ value, onChange, size = 'md' }: StarRatingProps) {
  const [hovered, setHovered] = useState(0)

  const starSize = size === 'sm' ? 'w-4 h-4' : 'w-6 h-6'
  const gap = size === 'sm' ? 'gap-0.5' : 'gap-1'
  const interactive = !!onChange

  const display = interactive && hovered > 0 ? hovered : value

  return (
    <div className={`flex items-center ${gap}`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => interactive && setHovered(star)}
          onMouseLeave={() => interactive && setHovered(0)}
          className={`${interactive ? 'cursor-pointer' : 'cursor-default'} focus:outline-none disabled:cursor-default`}
        >
          <svg
            className={`${starSize} ${star <= display ? 'text-amber-400' : 'text-gray-300 dark:text-gray-600'} ${interactive ? 'transition-colors' : ''}`}
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </button>
      ))}
    </div>
  )
}
