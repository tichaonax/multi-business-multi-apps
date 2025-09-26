'use client'

import { SessionProvider } from 'next-auth/react'

export function CustomSessionProvider({
  children,
}: {
  children: React.ReactNode
}) {
  // console.log('🔐 SessionProvider wrapper loaded')
  
  return (
    <SessionProvider>
      {children}
    </SessionProvider>
  )
}