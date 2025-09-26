'use client'

import { ProtectedRoute } from '@/components/auth/protected-route'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ContentLayout } from '@/components/layout/content-layout'

interface Category {
  id: string
  name: string
  emoji: string
  color: string
  isDefault: boolean
  createdAt: string
}

interface Project {
  id: string
  name: string
  description?: string
  status: string
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newCategory, setNewCategory] = useState({
    name: '',
    emoji: '💰',
    color: '#3B82F6'
  })

  useEffect(() => {
    // Fetch categories
    fetch('/api/personal/categories')
      .then(res => res.json())
      .then(data => setCategories(data))
      .catch(console.error)

    // Fetch projects for lookup
    fetch('/api/construction/projects')
      .then(res => res.json())
      .then(data => setProjects(data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCategory.name || !newCategory.emoji) return

    try {
      const response = await fetch('/api/personal/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCategory)
      })

      if (response.ok) {
        const category = await response.json()
        setCategories([...categories, category])
        setNewCategory({ name: '', emoji: '💰', color: '#3B82F6' })
        setShowAddForm(false)
      }
    } catch (error) {
      console.error('Error adding category:', error)
    }
  }

  const createCategoryFromProject = async (project: Project) => {
    const categoryData = {
      name: project.name,
      emoji: '🏗️',
      color: '#F59E0B'
    }

    try {
      const response = await fetch('/api/personal/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryData)
      })

      if (response.ok) {
        const category = await response.json()
        setCategories([...categories, category])
      }
    } catch (error) {
      console.error('Error creating category from project:', error)
    }
  }

  const commonEmojis = ['💰', '🍽️', '🚗', '💡', '🎬', '🛒', '🏥', '📚', '🏗️', '👕', '🎯', '💼', '🎪', '🌟']

  return (
    <ProtectedRoute>
      <ContentLayout
        title="Expense Categories"
        subtitle="Manage your expense categories and organize your spending"
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Personal', href: '/personal' },
          { label: 'Categories', isActive: true }
        ]}
        headerActions={
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="btn-primary"
          >
            + Add Category
          </button>
        }
      >
        <div className="space-y-6">

        {showAddForm && (
          <div className="card p-6">
            <h2 className="text-xl font-semibold text-primary mb-4">Add New Category</h2>
            <form onSubmit={handleAddCategory} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-secondary mb-2">
                  Category Name
                </label>
                <input
                  type="text"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Groceries, Gas, Rent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary mb-2">
                  Emoji
                </label>
                <div className="flex gap-2 mb-2">
                  {commonEmojis.map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setNewCategory({...newCategory, emoji})}
                      className={`p-2 text-2xl border rounded-md ${newCategory.emoji === emoji ? 'bg-blue-100 dark:bg-blue-800 border-blue-500' : 'border-gray-300 dark:border-gray-600'} dark:text-white`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={newCategory.emoji}
                  onChange={(e) => setNewCategory({...newCategory, emoji: e.target.value})}
                  className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="💰"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary mb-2">
                  Color
                </label>
                <input
                  type="color"
                  value={newCategory.color}
                  onChange={(e) => setNewCategory({...newCategory, color: e.target.value})}
                  className="w-16 h-10 border border-gray-300 dark:border-gray-600 rounded-md"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="btn-primary bg-green-600 hover:bg-green-700"
                >
                  Add Category
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="card">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-primary">Your Categories</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
            {categories.map((category) => (
              <div
                key={category.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow bg-white dark:bg-gray-800"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{category.emoji}</span>
                    <span className="font-medium text-primary">{category.name}</span>
                  </div>
                  {category.isDefault && (
                    <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded">
                      Default
                    </span>
                  )}
                </div>
                <div
                  className="w-full h-2 rounded"
                  style={{ backgroundColor: category.color }}
                />
              </div>
            ))}
          </div>
        </div>

        {projects.length > 0 && (
          <div className="card">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-primary">Create Categories from Projects</h2>
              <p className="text-sm text-secondary mt-1">
                Quickly create expense categories from your existing construction projects
              </p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800"
                  >
                    <div>
                      <h3 className="font-medium text-primary">🏗️ {project.name}</h3>
                      <p className="text-sm text-secondary">{project.description}</p>
                      <span className={`text-xs px-2 py-1 rounded ${
                        project.status === 'active' ? 'bg-green-100 dark:bg-green-800 text-green-600 dark:text-green-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                      }`}>
                        {project.status}
                      </span>
                    </div>
                    <button
                      onClick={() => createCategoryFromProject(project)}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md disabled:opacity-50"
                      disabled={categories.some(cat => cat.name === project.name)}
                    >
                      {categories.some(cat => cat.name === project.name) ? 'Added' : 'Add Category'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        </div>
      </ContentLayout>
    </ProtectedRoute>
  )
}