"use client"

import { useToastContext } from './toast'

export function useToast() {
  return useToastContext()
}

export default useToast
