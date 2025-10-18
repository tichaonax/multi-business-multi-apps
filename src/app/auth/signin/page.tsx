'use client'

import { signIn, getSession } from 'next-auth/react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import HealthIndicator from '@/components/ui/health-indicator'

export default function SignIn() {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = await signIn('credentials', {
        identifier,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('Invalid credentials')
      } else {
        router.push('/dashboard')
      }
    } catch (error) {
      setError('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center page-background px-4">
      {/* Health Status Indicator */}
      <HealthIndicator position="bottom-right" />

      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center mb-4">
            <span className="text-4xl text-white">🏢</span>
          </div>
          <h2 className="text-3xl font-bold text-primary mb-2">
            Welcome Back
          </h2>
          <p className="text-secondary">
            Sign in to access your business management platform
          </p>
        </div>
        
        <div className="card p-8">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="identifier" className="block text-sm font-medium text-primary mb-2">
                Email or Username
              </label>
              <input
                id="identifier"
                name="identifier"
                type="text"
                required
                className="input-field"
                placeholder="admin@business.local or username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="input-field"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex">
                  <span className="text-red-400 mr-2">⚠️</span>
                  <span className="text-red-700 text-sm">{error}</span>
                </div>
              </div>
            )}
            
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Signing in...
                </div>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
          
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="text-center text-sm text-gray-600 mb-4">
              Don't have an account?{' '}
              <a href="/auth/register" className="font-medium text-blue-600 hover:text-blue-500">
                Create one here
              </a>
            </div>
            <div className="text-center text-sm text-gray-500">
              <p className="mb-2">Demo Credentials:</p>
              <p><strong>Login:</strong> admin@business.local</p>
              <p><strong>Password:</strong> admin123</p>
              <p className="mt-2 text-xs">Note: You can login with email or username</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}