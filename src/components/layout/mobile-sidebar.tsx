'use client'

import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { useState } from 'react'
import { canAccessModule, BusinessModule } from '@/lib/rbac'

const modules: { name: string; path: string; module: BusinessModule; icon: string }[] = [
  { name: 'Construction', path: '/construction', module: 'construction', icon: '🏗️' },
  { name: 'Restaurant', path: '/restaurant', module: 'restaurant', icon: '🍽️' },
  { name: 'Grocery', path: '/grocery', module: 'grocery', icon: '🛒' },
  { name: 'Clothing', path: '/clothing', module: 'clothing', icon: '👕' },
  { name: 'Personal', path: '/personal', module: 'personal', icon: '💰' },
]

export function MobileSidebar() {
  const { data: session } = useSession()
  const [isOpen, setIsOpen] = useState(false)

  if (!session) return null

  const userPermissions = session.user.permissions || {}

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-gray-800 text-white rounded-md"
      >
        ☰
      </button>

      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black opacity-50" onClick={() => setIsOpen(false)} />
          
          <div className="relative w-64 bg-gray-800 text-white p-4">
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-xl font-bold">Business Hub</h1>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white"
              >
                ✕
              </button>
            </div>
            
            <nav className="space-y-2">
              <Link 
                href="/dashboard" 
                className="block px-4 py-3 rounded hover:bg-gray-700"
                onClick={() => setIsOpen(false)}
              >
                📊 Dashboard
              </Link>
              
              {modules.map((module) => {
                if (!canAccessModule(userPermissions, module.module)) return null
                
                return (
                  <Link
                    key={module.path}
                    href={module.path}
                    className="block px-4 py-3 rounded hover:bg-gray-700"
                    onClick={() => setIsOpen(false)}
                  >
                    {module.icon} {module.name}
                  </Link>
                )
              })}
              
              <Link 
                href="/chat" 
                className="block px-4 py-3 rounded hover:bg-gray-700"
                onClick={() => setIsOpen(false)}
              >
                💬 Chat
              </Link>
              
              <Link 
                href="/reports" 
                className="block px-4 py-3 rounded hover:bg-gray-700"
                onClick={() => setIsOpen(false)}
              >
                📈 Reports
              </Link>
              
              {session.user.role === 'admin' && (
                <Link 
                  href="/admin" 
                  className="block px-4 py-3 rounded hover:bg-gray-700"
                  onClick={() => setIsOpen(false)}
                >
                  ⚙️ Admin
                </Link>
              )}
              
              <button 
                onClick={() => signOut()}
                className="block w-full text-left px-4 py-3 rounded hover:bg-gray-700"
              >
                🚪 Sign Out
              </button>
            </nav>
          </div>
        </div>
      )}
    </>
  )
}