import { NextAuthOptions } from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'
import { SessionUser } from './permission-utils'

console.log('🔐 Auth configuration loading at:', new Date().toISOString())
console.log('🔑 NEXTAUTH_SECRET configured:', !!process.env.NEXTAUTH_SECRET)

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as NextAuthOptions['adapter'],
  session: {
    strategy: 'jwt',
  },
  cookies: {
    sessionToken: {
      name: `multi-business.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
    csrfToken: {
      name: `multi-business.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
    callbackUrl: {
      name: `multi-business.callback-url`,
      options: {
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  // 'trustHost' is intentionally omitted because it's not part of NextAuthOptions
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        identifier: { label: 'Email or Username', type: 'text' },
        password: { label: 'Password', type: 'password' }
      },
    async authorize(credentials, req) {
        console.log('🔐 Authorization attempt for:', credentials?.identifier)

        if (!credentials?.identifier || !credentials?.password) {
          console.log('❌ Missing credentials')
          return null
        }

        console.log('🔍 Searching for user in database...')
        // Try to find user by email first, then by username
        let dbUser = await prisma.users.findUnique({ where: { email: credentials.identifier } }) as any

        if (!dbUser) {
          // If not found by email, try finding by username
          dbUser = await prisma.users.findUnique({ where: { username: credentials.identifier } }) as any
        }

        if (!dbUser) {
          console.log('❌ User not found:', credentials.identifier)
          return null
        }

        // Fetch active business memberships separately (typed as any to avoid strict client shape differences)
        const businessMemberships = await prisma.businessMemberships.findMany({
          where: { userId: dbUser.id, isActive: true },
          include: { business: true }
        }) as any[]

        const user = {
          ...dbUser,
          businessMemberships
        } as any

        if (!user) {
          console.log('❌ User not found:', credentials.email)
          return null
        }

  console.log('👤 User found:', { id: user.id, email: user.email, isActive: user.isActive, memberships: user.businessMemberships?.length || 0 })

        if (!user.isActive) {
          console.log('❌ User account is inactive')
          return null
        }

        console.log('🔒 Verifying password...')
        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        )

        if (!isPasswordValid) {
          console.log('❌ Invalid password')
          return null
        }

        console.log('✅ Authentication successful for:', user.email)

        // Transform business memberships for session
        // Map membership shapes coming from prisma (which include a nested business) into the
        // lightweight session-friendly shape. Use `any` for the incoming items to avoid mismatches
        // against the SessionUser type definitions.
        const transformedMemberships = (user.businessMemberships || [] as any[]).map((membership: any) => ({
          businessId: membership.business?.id || membership.businessId,
          businessName: membership.business?.name || membership.businessName,
          role: membership.role,
          permissions: (membership.permissions || {}) as Record<string, any>,
          isActive: membership.isActive,
          joinedAt: membership.joinedAt,
          lastAccessedAt: membership.lastAccessedAt,
        }))

        console.log('🔑 User business memberships:', transformedMemberships.length)
        console.log('🎭 User system role:', user.role)

        // Return a shape compatible with SessionUser for downstream helpers
        // Return `any` to satisfy the provider's expected User shape while keeping our
        // richer SessionUser information available at runtime.
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          permissions: (user.permissions || {}) as Record<string, any>,
          businessMemberships: transformedMemberships,
        } as any
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const t: any = token
        t.role = (user as any).role
        t.permissions = (user as any).permissions
        t.businessMemberships = (user as any).businessMemberships

        // Add unique session identifier and login timestamp
        t.sessionId = `${(user as any).id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        t.loginTime = Date.now()

        console.log('🔑 New session created:', t.sessionId, 'for user:', (user as any).email)
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        const s: any = session
        const t: any = token
        s.user = s.user || {}
        s.user.id = t.sub || s.user.id
        s.user.role = t.role
        s.user.permissions = t.permissions
        s.user.businessMemberships = t.businessMemberships
        s.sessionId = t.sessionId
        s.loginTime = t.loginTime
      }
      return session
    },
  },
  events: {
    async signIn({ user, account, profile, isNewUser }) {
      console.log('✅ Sign-in event:', {
        userId: (user as any).id,
        email: (user as any).email,
        isNewUser,
        timestamp: new Date().toISOString()
      })
    },
    async signOut({ token, session }) {
      console.log('🚪 Sign-out event:', {
        sessionId: (token as any)?.sessionId || (session as any)?.sessionId,
        userId: (token as any)?.sub || (session as any)?.user?.id,
        timestamp: new Date().toISOString()
      })
    },
  },
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signin',
  },
}