import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: string
      permissions: Record<string, any>
    } & DefaultSession['user']
  }

  interface User {
    role: string
    permissions: Record<string, any>
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: string
    permissions: Record<string, any>
  }
}