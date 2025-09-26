import { NextAuthOptions } from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'

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
  trustHost: true,
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        console.log('🔐 Authorization attempt for:', credentials?.email)

        if (!credentials?.email || !credentials?.password) {
          console.log('❌ Missing credentials')
          return null
        }

        console.log('🔍 Searching for user in database...')
        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email,
          },
          include: {
            businessMemberships: {
              where: {
                isActive: true,
              },
              include: {
                business: true,
              },
            },
          },
        })

        if (!user) {
          console.log('❌ User not found:', credentials.email)
          return null
        }

        console.log('👤 User found:', { id: user.id, email: user.email, isActive: user.isActive, memberships: user.businessMemberships.length })

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
        const transformedMemberships = user.businessMemberships.map(membership => ({
          businessId: membership.business.id,
          businessName: membership.business.name,
          role: membership.role,
          permissions: membership.permissions as Record<string, any>,
          isActive: membership.isActive,
          joinedAt: membership.joinedAt,
          lastAccessedAt: membership.lastAccessedAt,
        }))

        console.log('🔑 User business memberships:', transformedMemberships.length)
        console.log('🎭 User system role:', user.role)

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          permissions: user.permissions as Record<string, any> || {},
          businessMemberships: transformedMemberships,
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.permissions = user.permissions
        token.businessMemberships = user.businessMemberships
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!
        session.user.role = token.role
        session.user.permissions = token.permissions
        session.user.businessMemberships = token.businessMemberships
      }
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signin',
  },
}