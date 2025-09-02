'use client'

import { ProtectedRoute } from '@/components/auth/protected-route'
import { useState } from 'react'

export default function AdminPage() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const createBackup = async () => {
    setLoading(true)
    setMessage('')
    
    try {
      const response = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          includeAuditLog: true,
          includeChat: true,
        }),
      })
      
      const result = await response.json()
      
      if (response.ok) {
        setMessage(`Backup created: ${result.backupFile}`)
      } else {
        setMessage(`Error: ${result.error}`)
      }
    } catch (error) {
      setMessage('Backup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ProtectedRoute>
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">System Administration</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Backup & Restore</h3>
            <button
              onClick={createBackup}
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Creating Backup...' : 'Create Backup'}
            </button>
            {message && (
              <p className="mt-2 text-sm text-gray-600">{message}</p>
            )}
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">User Management</h3>
            <p className="text-gray-600">User management interface coming soon</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">System Settings</h3>
            <p className="text-gray-600">System configuration coming soon</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Audit Logs</h3>
            <p className="text-gray-600">View system audit trail</p>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}