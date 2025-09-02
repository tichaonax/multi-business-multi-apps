'use client'

import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { canAccessModule, BusinessModule } from '@/lib/rbac'

const modules: { name: string; path: string; module: BusinessModule; icon: string }[] = [
  { name: 'Construction', path: '/construction', module: 'construction', icon: '🏗️' },
  { name: 'Restaurant', path: '/restaurant', module: 'restaurant', icon: '🍽️' },
  { name: 'Grocery', path: '/grocery', module: 'grocery', icon: '🛒' },
  { name: 'Clothing', path: '/clothing', module: 'clothing', icon: '👕' },
  { name: 'Personal', path: '/personal', module: 'personal', icon: '💰' },
]

export function Sidebar() {
  const { data: session } = useSession()

  if (!session) return null

  const userPermissions = session.user.permissions || {}

  return (
    <div className="w-64 lg:w-64 md:w-20 bg-gray-800 text-white min-h-screen p-4 transition-all duration-300">
      <div className="mb-8">
        <h1 className="text-xl font-bold">Business Hub</h1>
      </div>
      
      <nav className="space-y-2">
        <Link 
          href="/dashboard" 
          className="block px-4 py-2 rounded hover:bg-gray-700"
        >
          📊 Dashboard
        </Link>
        
        {modules.map((module) => {
          if (!canAccessModule(userPermissions, module.module)) return null
          
          return (
            <Link
              key={module.path}
              href={module.path}
              className="block px-4 py-2 rounded hover:bg-gray-700"
            >
              {module.icon} {module.name}
            </Link>
          )
        })}
        
        <Link 
          href="/chat" 
          className="block px-4 py-2 rounded hover:bg-gray-700"
        >
          💬 Chat
        </Link>
        
        <Link 
          href="/reports" 
          className="block px-4 py-2 rounded hover:bg-gray-700"
        >
          📈 Reports
        </Link>
        
        {session.user.role === 'admin' && (
          <Link 
            href="/admin" 
            className="block px-4 py-2 rounded hover:bg-gray-700"
          >
            ⚙️ Admin
          </Link>
        )}
      </nav>
      
      <div className="absolute bottom-4">
        <div className="text-sm text-gray-400">
          {session.user.name}
        </div>
        <button 
          onClick={() => signOut()}
          className="text-sm text-gray-400 hover:text-white"
        >
          Sign Out
        </button>
      </div>
    </div>
  )
}