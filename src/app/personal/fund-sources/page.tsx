'use client'

import { ProtectedRoute } from '@/components/auth/protected-route'
import { useState, useEffect } from 'react'
import { useAlert, useConfirm } from '@/components/ui/confirm-modal'
import Link from 'next/link'

interface FundSource {
  id: string
  name: string
  emoji: string
  isDefault: boolean
  usageCount: number
  createdAt: string
}

export default function FundSourcesPage() {
  const customAlert = useAlert()
  const confirm = useConfirm()
  const [fundSources, setFundSources] = useState<FundSource[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newSource, setNewSource] = useState({
    name: '',
    emoji: '💰'
  })

  useEffect(() => {
    fetchFundSources()
  }, [])

  const fetchFundSources = async () => {
    try {
      const response = await fetch('/api/personal/fund-sources')
      if (response.ok) {
        const data = await response.json()
        setFundSources(data)
      }
    } catch (error) {
      console.error('Failed to fetch fund sources:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSource.name) return

    setLoading(true)
    try {
      console.log('Submitting fund source:', newSource)
      const response = await fetch('/api/personal/fund-sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSource)
      })

      const data = await response.json()
      console.log('API response:', data)

      if (response.ok) {
        setFundSources([...fundSources, data])
        setNewSource({ name: '', emoji: '💰' })
        setShowAddForm(false)
        await customAlert({ title: 'Added', description: 'Fund source added successfully!' })
      } else {
        console.error('Failed to add fund source:', data)
        await customAlert({ title: 'Failed to add', description: `Failed to add fund source: ${data.error || 'Unknown error'}` })
      }
    } catch (error) {
      console.error('Error adding fund source:', error)
      await customAlert({ title: 'Error', description: 'Error adding fund source. Check console for details.' })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteSource = async (id: string) => {
    const ok = await confirm({ title: 'Confirm delete', description: 'Are you sure you want to delete this fund source?' })
    if (!ok) return

    try {
      const response = await fetch(`/api/personal/fund-sources?id=${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setFundSources(fundSources.filter(source => source.id !== id))
      }
    } catch (error) {
      console.error('Error deleting fund source:', error)
      await customAlert({ title: 'Delete failed', description: 'Failed to delete fund source' })
    }
  }

  const commonEmojis = ['💰', '🤑', '💵', '💸', '💚', '🟢', '💼', '🏢', '💳', '🎁', '📈', '🏦', '🔄', '📊', '💎', '🎯']

  return (
    <ProtectedRoute module="personal">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Fund Sources Management</h1>
          <div className="flex gap-3">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              + Add New Source
            </button>
            <Link
              href="/personal/add-money"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              ← Back to Add Money
            </Link>
          </div>
        </div>

        {showAddForm && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Add New Fund Source</h2>
            <form onSubmit={handleAddSource} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fund Source Name *
                </label>
                <input
                  type="text"
                  value={newSource.name}
                  onChange={(e) => setNewSource({...newSource, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="e.g., Part-time Job, Dividend, Commission"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Emoji
                </label>
                <div className="flex gap-2 mb-2">
                  {commonEmojis.map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setNewSource({...newSource, emoji})}
                      className={`p-2 text-2xl border rounded-md ${newSource.emoji === emoji ? 'bg-green-100 border-green-500' : 'border-gray-300'}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={newSource.emoji}
                  onChange={(e) => {
                    // Clean input to keep only first emoji
                    const cleanEmoji = e.target.value.match(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u)?.[0] || '💰'
                    setNewSource({...newSource, emoji: cleanEmoji})
                  }}
                  className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="💰"
                  maxLength={2}
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading || !newSource.name}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
                >
                  {loading ? 'Adding...' : 'Add Source'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">Your Fund Sources</h2>
            <p className="text-sm text-gray-600 mt-1">
              Manage your commonly used sources of funds. Usage count shows how often you've used each source.
            </p>
          </div>
          
          {loading ? (
            <div className="p-6 text-center text-gray-500">
              Loading fund sources...
            </div>
          ) : (
            <div className="p-6">
              {fundSources.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <p className="text-lg mb-2">No custom fund sources yet</p>
                  <p className="text-sm">Add your first fund source to get started!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {fundSources.map((source) => (
                    <div
                      key={source.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">{source.emoji}</span>
                          <span className="font-medium">{source.name}</span>
                        </div>
                        {!source.isDefault && (
                          <button
                            onClick={() => handleDeleteSource(source.id)}
                            className="text-red-600 hover:text-red-800 text-sm"
                            title="Delete fund source"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <span>Used {source.usageCount} times</span>
                        {source.isDefault && (
                          <span className="bg-blue-100 text-blue-600 px-2 py-1 rounded text-xs">
                            Default
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">💡 Tips</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Fund sources are sorted by usage count - most used appear first in the Add Money form</li>
            <li>• You can't delete default fund sources, but you can add your own custom ones</li>
            <li>• Choose descriptive names and appropriate emojis to make selection easier</li>
          </ul>
        </div>
      </div>
    </ProtectedRoute>
  )
}