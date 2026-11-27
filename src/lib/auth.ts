import { NextAuthOptions } from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'
import { SessionUser } from './permission-utils'
import { registerSession, isSessionAllowed, markSignedOut } from './user-sessions'

console.log('🔐 Auth configuration loading at:', new Date().toISOString())
console.log('🔑 NEXTAUTH_SECRET configured:', !!process.env.NEXTAUTH_SECRET)

// Allow HTTP cookies when NEXTAUTH_URL explicitly uses http:// (e.g., LAN access)
const useSecureCookies = process.env.NODE_ENV === 'production' && !process.env.NEXTAUTH_URL?.startsWith('http://')

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as NextAuthOptions['adapter'],
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 hours — one workday; prevents stale sessions persisting
  },
  cookies: {
    sessionToken: {
      name: `multi-business.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: useSecureCookies,
      },
    },
    csrfToken: {
      name: `multi-business.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: useSecureCookies,
      },
    },
    callbackUrl: {
      name: `multi-business.callback-url`,
      options: {
        sameSite: 'lax',
        path: '/',
        secure: useSecureCookies,
      },
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  // Removed trustHost as it's not available in NextAuth v4
  // Instead, we'll handle URL validation in callbacks
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        identifier: { label: 'Email or Username', type: 'text' },
        password: { label: 'Password', type: 'password' }
      },
    async authorize(credentials, req) {
        // --- Card scan path: employee scans their ID card on the login screen ---
        const c = credentials as Record<string, string> | undefined
        if (c?.type === 'card' && c?.employeeNumber) {
          const emp = await prisma.employees.findFirst({
            where: { employeeNumber: c.employeeNumber, isActive: true },
            select: {
              users: { select: { id: true, email: true, name: true, role: true, isActive: true, isSuspended: true } },
            },
          })
          if (!emp?.users || !emp.users.isActive) {
            console.log('❌ Card scan: no active user account for employee:', c.employeeNumber)
            return null
          }
          // MBM-351: a suspended user can't sign in until a manager lifts it
          if (emp.users.isSuspended) throw new Error('ACCOUNT_SUSPENDED')
          console.log('✅ Card scan login for:', emp.users.email)
          return { id: emp.users.id, email: emp.users.email, name: emp.users.name, role: emp.users.role } as any
        }

        // --- Normal email / password path ---
        console.log('🔐 Authorization attempt for:', credentials?.identifier)

        if (!credentials?.identifier || !credentials?.password) {
          console.log('❌ Missing credentials')
          return null
        }

        console.log('🔍 Searching for user in database...')
        // Try to find user by email first, then by username
        let user = await prisma.users.findUnique({ where: { email: credentials.identifier } }) as any

        if (!user) {
          // If not found by email, try finding by username
          user = await prisma.users.findUnique({ where: { username: credentials.identifier } }) as any
        }

        if (!user) {
          console.log('❌ User not found:', credentials.identifier)
          return null
        }

        console.log('👤 User found:', { id: user.id, email: user.email, isActive: user.isActive })

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

        // MBM-351: checked after the password, so it's only revealed to the account holder
        if (user.isSuspended) {
          console.log('❌ User account is suspended')
          throw new Error('ACCOUNT_SUSPENDED')
        }

        console.log('✅ Authentication successful for:', user.email)
        console.log('🎭 User system role:', user.role)

        // Return minimal data for JWT — business memberships are fetched
        // from DB on each request via getServerUser() to keep the cookie small.
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        } as any
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const t: any = token
        t.role = (user as any).role
        t.name = (user as any).name || null
        // Only store role in JWT — permissions and businessMemberships are
        // fetched from DB per-request via getServerUser() to keep cookies small.
        t.sub = (user as any).id
        t.sessionId = `${t.sub}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        t.loginTime = Date.now()

        console.log('🔑 New session created:', t.sessionId, 'for user:', (user as any).email)
        // MBM-351: record the sign-in (workstation, time) for the Signed-in Users screen
        try { await registerSession(t.sessionId, t.sub) } catch (e) { console.error('[auth] could not record session:', e) }
      } else {
        // MBM-351: a manager may have signed this session out (or suspended the
        // user). Throwing makes NextAuth clear the cookie: signed out everywhere.
        const t: any = token
        if (!(await isSessionAllowed(t.sessionId, t.sub, t.loginTime))) {
          throw new Error('SESSION_ENDED')
        }
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
        s.user.name = t.name || s.user.name || null
        s.sessionId = t.sessionId
        s.loginTime = t.loginTime
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      // Allow redirects to the current host (supports both localhost and IP access)
      if (url.startsWith('/')) return `${baseUrl}${url}`
      // Allow redirects to the same origin
      if (new URL(url).origin === baseUrl) return url
      // For cross-origin redirects, allow them (needed for IP address access)
      return url
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
      await markSignedOut((token as any)?.sessionId || (session as any)?.sessionId)
      console.log('🚪 Sign-out event:', {
        sessionId: (token as any)?.sessionId || (session as any)?.sessionId,
        userId: (token as any)?.sub || (session as any)?.users?.id,
        timestamp: new Date().toISOString()
      })
    },
  },
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signin',
    error: '/auth/error', // Custom error page to avoid Next-Auth v4 Pages Router compatibility issues
  },
}