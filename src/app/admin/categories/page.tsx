'use client'

export const dynamic = 'force-dynamic'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { ContentLayout } from '@/components/layout/content-layout'
import { useState, useEffect } from 'react'
import { useToastContext } from '@/components/ui/toast'

const BUSINESS_TYPES = ['grocery', 'hardware', 'restaurant', 'clothing']

interface Category {
  id: string
  name: string
  emoji: string
  color: string
  businessType: string
  domainId: string | null
  businessId: string | null
  isActive: boolean
  domain: { id: string; name: string; emoji: string } | null
  _count: { business_products: number }
}

interface Domain {
  id: string
  name: string
  emoji: string
}

function CategoriesContent() {
  const [businessType, setBusinessType] = useState('grocery')
  const [categories, setCategories] = useState<Category[]>([])
  const [domains, setDomains] = useState<Domain[]>([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: '', emoji: '', domainId: '' })
  const [saving, setSaving] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const toast = useToastContext()

  const fetchData = async (type: string) => {
    setLoading(true)
    try {
      const [catRes, domRes] = await Promise.all([
        fetch(`/api/inventory/categories?businessType=${type}&includeProducts=true`),
        fetch(`/api/admin/${type}/stats`),
      ])
      const catData = await catRes.json()
      const domData = await domRes.json()

      setCategories(catData.categories || [])

      // Extract domains from stats
      if (domData.success && domData.data?.byDepartment) {
        const domainList = Object.entries(domData.data.byDepartment).map(([id, d]: [string, any]) => ({
          id,
          name: d.name,
          emoji: d.emoji,
        }))
        setDomains(domainList)
      }
    } catch {
      toast.error('Failed to load categories')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData(businessType)
  }, [businessType])

  const startEdit = (cat: Category) => {
    setEditingId(cat.id)
    setEditForm({ name: cat.name, emoji: cat.emoji, domainId: cat.domainId || '' })
  }

  const cancelEdit = () => {
    setEditingId(null)
  }

  const saveEdit = async (cat: Category) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/inventory/categories/${cat.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name.trim(),
          emoji: editForm.emoji,
          domainId: editForm.domainId || null,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.push('Category updated')
        setEditingId(null)
        fetchData(businessType)
      } else {
        toast.error(data.error || 'Failed to update')
      }
    } catch {
      toast.error('Network error')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (cat: Category) => {
    try {
      const res = await fetch(`/api/inventory/categories/${cat.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !cat.isActive }),
      })
      if (res.ok) {
        toast.push(cat.isActive ? 'Category deactivated' : 'Category activated')
        fetchData(businessType)
      }
    } catch {
      toast.error('Network error')
    }
  }

  const handleSeed = async () => {
    setSeeding(true)
    try {
      const res = await fetch('/api/admin/seed-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessType }),
      })
      const data = await res.json()
      if (data.success) {
        toast.push(`Created ${data.created} categories, skipped ${data.skipped} existing`)
        fetchData(businessType)
      } else {
        toast.error(data.error || 'Seed failed')
      }
    } catch {
      toast.error('Network error')
    } finally {
      setSeeding(false)
    }
  }

  // Group categories by domain
  const grouped: Record<string, Category[]> = {}
  const noDomain: Category[] = []

  categories.forEach(cat => {
    if (cat.domainId) {
      if (!grouped[cat.domainId]) grouped[cat.domainId] = []
      grouped[cat.domainId].push(cat)
    } else {
      noDomain.push(cat)
    }
  })

  const domainOrder = domains.map(d => d.id)
  const sortedGroupKeys = Object.keys(grouped).sort(
    (a, b) => domainOrder.indexOf(a) - domainOrder.indexOf(b)
  )

  return (
    <ContentLayout
      title="Category Management"
      breadcrumbs={[
        { label: 'Admin', href: '/admin' },
        { label: 'Categories', isActive: true },
      ]}
      headerActions={
        <button
          onClick={handleSeed}
          disabled={seeding || categories.length > 0}
          title={categories.length > 0 ? 'Categories already seeded' : 'Seed standard categories'}
          className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {seeding ? 'Seeding...' : categories.length > 0 ? '✅ Categories Seeded' : '🌱 Seed Categories'}
        </button>
      }
    >
      {/* Business Type Tabs */}
      <div className="flex gap-2 mb-6">
        {BUSINESS_TYPES.map(bt => (
          <button
            key={bt}
            onClick={() => setBusinessType(bt)}
            className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition-colors ${
              businessType === bt
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {bt}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : (
        <div className="space-y-6">
          {sortedGroupKeys.map(domainId => {
            const domain = domains.find(d => d.id === domainId)
            const cats = grouped[domainId]
            return (
              <div key={domainId} className="bg-white dark:bg-gray-800 rounded-lg border border-border shadow-sm">
                <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                  <h3 className="font-semibold text-sm">
                    {domain?.emoji} {domain?.name || domainId}
                    <span className="ml-2 text-xs text-gray-400 font-normal">{cats.length} categories</span>
                  </h3>
                </div>
                <div className="divide-y divide-border">
                  {cats.map(cat => (
                    <CategoryRow
                      key={cat.id}
                      cat={cat}
                      domains={domains}
                      editing={editingId === cat.id}
                      editForm={editForm}
                      saving={saving}
                      onEditFormChange={setEditForm}
                      onStartEdit={startEdit}
                      onSaveEdit={saveEdit}
                      onCancelEdit={cancelEdit}
                      onToggleActive={toggleActive}
                    />
                  ))}
                </div>
              </div>
            )
          })}

          {noDomain.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-border shadow-sm">
              <div className="px-4 py-3 border-b border-border">
                <h3 className="font-semibold text-sm text-gray-500">
                  No Department Assigned
                  <span className="ml-2 text-xs font-normal">{noDomain.length} categories</span>
                </h3>
              </div>
              <div className="divide-y divide-border">
                {noDomain.map(cat => (
                  <CategoryRow
                    key={cat.id}
                    cat={cat}
                    domains={domains}
                    editing={editingId === cat.id}
                    editForm={editForm}
                    saving={saving}
                    onEditFormChange={setEditForm}
                    onStartEdit={startEdit}
                    onSaveEdit={saveEdit}
                    onCancelEdit={cancelEdit}
                    onToggleActive={toggleActive}
                  />
                ))}
              </div>
            </div>
          )}

          {categories.length === 0 && (
            <div className="text-center py-16 text-gray-500">
              <p className="text-lg mb-2">No categories yet</p>
              <p className="text-sm mb-4">Click "🌱 Seed Categories" to populate standard categories for {businessType}.</p>
            </div>
          )}
        </div>
      )}
    </ContentLayout>
  )
}

interface RowProps {
  cat: Category
  domains: Domain[]
  editing: boolean
  editForm: { name: string; emoji: string; domainId: string }
  saving: boolean
  onEditFormChange: (f: { name: string; emoji: string; domainId: string }) => void
  onStartEdit: (cat: Category) => void
  onSaveEdit: (cat: Category) => void
  onCancelEdit: () => void
  onToggleActive: (cat: Category) => void
}

function CategoryRow({ cat, domains, editing, editForm, saving, onEditFormChange, onStartEdit, onSaveEdit, onCancelEdit, onToggleActive }: RowProps) {
  if (editing) {
    return (
      <div className="px-4 py-3 flex items-center gap-3 bg-blue-50 dark:bg-blue-900/10">
        <input
          type="text"
          value={editForm.emoji}
          onChange={e => onEditFormChange({ ...editForm, emoji: e.target.value })}
          className="w-12 border border-border rounded px-2 py-1 text-sm text-center bg-background"
          maxLength={4}
          placeholder="😀"
        />
        <input
          type="text"
          value={editForm.name}
          onChange={e => onEditFormChange({ ...editForm, name: e.target.value })}
          className="flex-1 border border-border rounded px-2 py-1 text-sm bg-background"
        />
        <select
          value={editForm.domainId}
          onChange={e => onEditFormChange({ ...editForm, domainId: e.target.value })}
          className="border border-border rounded px-2 py-1 text-sm bg-background"
        >
          <option value="">No Department</option>
          {domains.map(d => (
            <option key={d.id} value={d.id}>{d.emoji} {d.name}</option>
          ))}
        </select>
        <button
          onClick={() => onSaveEdit(cat)}
          disabled={saving || !editForm.name.trim()}
          className="px-3 py-1 bg-blue-600 text-white rounded text-xs disabled:opacity-50"
        >
          Save
        </button>
        <button onClick={onCancelEdit} className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs">
          Cancel
        </button>
      </div>
    )
  }

  return (
    <div className={`px-4 py-2.5 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/30 ${!cat.isActive ? 'opacity-50' : ''}`}>
      <span className="text-lg w-7 text-center">{cat.emoji}</span>
      <span className="flex-1 text-sm">{cat.name}</span>
      <span className="text-xs text-gray-400">{cat._count?.business_products ?? 0} products</span>
      <span className={`text-xs px-2 py-0.5 rounded-full ${cat.businessId ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'}`}>
        {cat.businessId ? 'business' : 'global'}
      </span>
      <button
        onClick={() => onStartEdit(cat)}
        className="text-xs text-blue-600 hover:underline"
      >
        Edit
      </button>
      <button
        onClick={() => onToggleActive(cat)}
        className={`text-xs ${cat.isActive ? 'text-red-500 hover:underline' : 'text-green-600 hover:underline'}`}
      >
        {cat.isActive ? 'Deactivate' : 'Activate'}
      </button>
    </div>
  )
}

export default function AdminCategoriesPage() {
  return (
    <ProtectedRoute requireAdmin>
      <CategoriesContent />
    </ProtectedRoute>
  )
}
