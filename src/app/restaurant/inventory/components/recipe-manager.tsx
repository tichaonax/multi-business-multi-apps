'use client'

import { useState, useEffect } from 'react'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'

interface RecipeIngredient {
  id: string
  ingredientId: string
  ingredientName: string
  quantity: number
  unit: string
  cost: number
}

interface Recipe {
  id: string
  name: string
  description: string
  category: string
  servings: number
  prepTime: number
  cookTime: number
  difficulty: 'Easy' | 'Medium' | 'Hard'
  ingredients: RecipeIngredient[]
  totalCost: number
  costPerServing: number
  sellPrice: number
  profitMargin: number
  instructions: string[]
  allergens: string[]
  isActive: boolean
}

export function RestaurantRecipeManager() {
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null)
  const [showRecipeModal, setShowRecipeModal] = useState(false)
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('All')
  const { currentBusinessId } = useBusinessPermissionsContext()

  // Fetch menu items as recipes
  useEffect(() => {
    const fetchRecipes = async () => {
      if (!currentBusinessId) return

      try {
        setLoading(true)
        const response = await fetch(`/api/inventory/${currentBusinessId}/items?limit=1000`)
        
        if (response.ok) {
          const data = await response.json()
          const items = data.items || []
          
          // Filter for menu items (items without ingredientType attribute)
          // and convert them to recipe format
          const menuItems = items
            .filter((item: any) => !item.attributes?.ingredientType)
            .map((item: any) => ({
              id: item.id,
              name: item.name,
              description: item.description || '',
              category: item.category || 'Uncategorized',
              servings: 1,
              prepTime: item.attributes?.prepTime || 15,
              cookTime: item.attributes?.cookTime || 10,
              difficulty: item.attributes?.difficulty || 'Medium',
              ingredients: [], // We'll need a separate endpoint for recipe ingredients
              totalCost: item.costPrice || 0,
              costPerServing: item.costPrice || 0,
              sellPrice: item.sellPrice || 0,
              profitMargin: item.costPrice && item.sellPrice
                ? ((item.sellPrice - item.costPrice) / item.sellPrice) * 100
                : 0,
              instructions: [],
              allergens: item.attributes?.allergens || [],
              isActive: item.isActive !== false
            }))
          
          setRecipes(menuItems)
        }
      } catch (error) {
        console.error('Error fetching recipes:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchRecipes()
  }, [currentBusinessId])

  // Get unique categories from recipes
  const categories = ['All', ...Array.from(new Set(recipes.map(r => r.category)))]

  // Filter recipes by selected category
  const filteredRecipes = selectedCategoryFilter === 'All'
    ? recipes
    : recipes.filter(r => r.category === selectedCategoryFilter)

  // Calculate statistics
  const activeRecipes = recipes.filter(r => r.isActive)
  const totalRecipeValue = activeRecipes.reduce((sum, recipe) => sum + recipe.totalCost, 0)
  const averageMargin = activeRecipes.length > 0
    ? activeRecipes.reduce((sum, recipe) => sum + recipe.profitMargin, 0) / activeRecipes.length
    : 0
  const lowMarginCount = activeRecipes.filter(recipe => recipe.profitMargin < 60).length

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  // Keep mock data structure for reference
  const mockRecipes: Recipe[] = [
    {
      id: '1',
      name: 'Classic Beef Burger',
      description: 'Quarter pound beef patty with lettuce, tomato, onion',
      category: 'Burgers',
      servings: 1,
      prepTime: 5,
      cookTime: 8,
      difficulty: 'Easy',
      totalCost: 4.85,
      costPerServing: 4.85,
      sellPrice: 12.99,
      profitMargin: 62.7,
      isActive: true,
      allergens: ['Gluten', 'Dairy'],
      instructions: [
        'Season ground beef with salt and pepper',
        'Form into quarter pound patties',
        'Grill for 4 minutes each side',
        'Toast buns on grill',
        'Assemble with vegetables and condiments'
      ],
      ingredients: [
        {
          id: '1',
          ingredientId: 'beef-ground',
          ingredientName: 'Ground Beef 80/20',
          quantity: 0.25,
          unit: 'lbs',
          cost: 1.75
        },
        {
          id: '2',
          ingredientId: 'bun-burger',
          ingredientName: 'Burger Bun',
          quantity: 1,
          unit: 'each',
          cost: 0.75
        },
        {
          id: '3',
          ingredientId: 'lettuce',
          ingredientName: 'Iceberg Lettuce',
          quantity: 1,
          unit: 'oz',
          cost: 0.25
        },
        {
          id: '4',
          ingredientId: 'tomato',
          ingredientName: 'Roma Tomato',
          quantity: 2,
          unit: 'slices',
          cost: 0.35
        },
        {
          id: '5',
          ingredientId: 'cheese-american',
          ingredientName: 'American Cheese',
          quantity: 1,
          unit: 'slice',
          cost: 0.45
        }
      ]
    },
    {
      id: '2',
      name: 'Caesar Salad',
      description: 'Crisp romaine lettuce with parmesan and croutons',
      category: 'Salads',
      servings: 1,
      prepTime: 8,
      cookTime: 0,
      difficulty: 'Easy',
      totalCost: 3.25,
      costPerServing: 3.25,
      sellPrice: 9.99,
      profitMargin: 67.5,
      isActive: true,
      allergens: ['Dairy', 'Gluten'],
      instructions: [
        'Wash and chop romaine lettuce',
        'Prepare Caesar dressing',
        'Toss lettuce with dressing',
        'Add parmesan cheese and croutons',
        'Garnish with lemon wedge'
      ],
      ingredients: [
        {
          id: '6',
          ingredientId: 'lettuce-romaine',
          ingredientName: 'Romaine Lettuce',
          quantity: 4,
          unit: 'oz',
          cost: 1.20
        },
        {
          id: '7',
          ingredientId: 'cheese-parmesan',
          ingredientName: 'Parmesan Cheese',
          quantity: 1,
          unit: 'oz',
          cost: 0.85
        },
        {
          id: '8',
          ingredientId: 'croutons',
          ingredientName: 'House Croutons',
          quantity: 0.5,
          unit: 'cup',
          cost: 0.45
        },
        {
          id: '9',
          ingredientId: 'dressing-caesar',
          ingredientName: 'Caesar Dressing',
          quantity: 2,
          unit: 'oz',
          cost: 0.75
        }
      ]
    }
  ]

  const handleRecipeClick = (recipe: Recipe) => {
    setSelectedRecipe(recipe)
    setShowRecipeModal(true)
  }

  return (
    <div className="space-y-6">
      {/* Recipe Management Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-primary">Recipe Cost Analysis</h3>
        <div className="flex gap-2">
          <button className="btn-secondary text-sm">
            📊 Cost Report
          </button>
          <button className="btn-primary text-sm">
            ➕ New Recipe
          </button>
        </div>
      </div>

      {/* Recipe Categories Filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategoryFilter(category)}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              selectedCategoryFilter === category
                ? 'bg-orange-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Recipe Cost Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
  <div className="card p-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <h4 className="font-semibold text-green-800 dark:text-green-300 mb-2">💰 Total Recipe Value</h4>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            ${totalRecipeValue.toFixed(2)}
          </div>
          <div className="text-sm text-green-700 dark:text-green-400">
            Across {activeRecipes.length} active recipes
          </div>
        </div>

  <div className="card p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">📈 Average Margin</h4>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {averageMargin.toFixed(1)}%
          </div>
          <div className="text-sm text-blue-700 dark:text-blue-400">
            Target: 65-75%
          </div>
        </div>

  <div className="card p-4 bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800">
          <h4 className="font-semibold text-orange-800 dark:text-orange-300 mb-2">⚠️ Needs Review</h4>
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            {lowMarginCount}
          </div>
          <div className="text-sm text-orange-700 dark:text-orange-400">
            Low margin recipes
          </div>
        </div>
      </div>

      {/* Recipe List */}
      <div className="card">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <h4 className="font-semibold text-primary">Recipe Portfolio</h4>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Search recipes..."
                className="input-field text-sm w-64"
              />
              <select className="input-field text-sm">
                <option>Sort by Cost</option>
                <option>Sort by Margin</option>
                <option>Sort by Popularity</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="text-left p-3 font-medium text-secondary">Recipe</th>
                <th className="text-left p-3 font-medium text-secondary">Category</th>
                <th className="text-left p-3 font-medium text-secondary">Cost</th>
                <th className="text-left p-3 font-medium text-secondary">Sell Price</th>
                <th className="text-left p-3 font-medium text-secondary">Margin</th>
                <th className="text-left p-3 font-medium text-secondary">Prep Time</th>
                <th className="text-left p-3 font-medium text-secondary">Status</th>
                <th className="text-left p-3 font-medium text-secondary">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredRecipes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-secondary">
                    <div className="text-4xl mb-2">👨‍🍳</div>
                    <div>No recipes found in this category</div>
                  </td>
                </tr>
              ) : (
                filteredRecipes.map((recipe) => (
                <tr
                  key={recipe.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                  onClick={() => handleRecipeClick(recipe)}
                >
                  <td className="p-3">
                    <div>
                      <div className="font-medium text-primary">{recipe.name}</div>
                      <div className="text-xs text-secondary">{recipe.description}</div>
                      <div className="flex gap-1 mt-1">
                        {recipe.allergens.map((allergen) => (
                          <span key={allergen} className="px-1 py-0.5 bg-red-100 text-red-700 text-xs rounded">
                            {allergen}
                          </span>
                        ))}
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-secondary">{recipe.category}</td>
                  <td className="p-3 font-medium">${recipe.costPerServing.toFixed(2)}</td>
                  <td className="p-3 font-medium">${recipe.sellPrice.toFixed(2)}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      recipe.profitMargin >= 70 ? 'bg-green-100 text-green-800' :
                      recipe.profitMargin >= 60 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {recipe.profitMargin.toFixed(1)}%
                    </span>
                  </td>
                  <td className="p-3 text-secondary">
                    {recipe.prepTime + recipe.cookTime} min
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      recipe.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {recipe.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      <button className="text-blue-600 hover:text-blue-800 text-xs p-1">
                        ✏️ Edit
                      </button>
                      <button className="text-green-600 hover:text-green-800 text-xs p-1">
                        🧮 Cost
                      </button>
                      <button className="text-purple-600 hover:text-purple-800 text-xs p-1">
                        📋 Print
                      </button>
                    </div>
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recipe Detail Modal */}
      {showRecipeModal && selectedRecipe && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-semibold text-primary">{selectedRecipe.name}</h3>
                  <p className="text-secondary mt-1">{selectedRecipe.description}</p>
                </div>
                <button
                  onClick={() => setShowRecipeModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-xl"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Recipe Details */}
              <div>
                <h4 className="font-semibold text-primary mb-3">Recipe Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-secondary">Category:</span>
                    <span className="font-medium">{selectedRecipe.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary">Servings:</span>
                    <span className="font-medium">{selectedRecipe.servings}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary">Prep Time:</span>
                    <span className="font-medium">{selectedRecipe.prepTime} min</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary">Cook Time:</span>
                    <span className="font-medium">{selectedRecipe.cookTime} min</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary">Difficulty:</span>
                    <span className="font-medium">{selectedRecipe.difficulty}</span>
                  </div>
                </div>

                <h4 className="font-semibold text-primary mb-3 mt-6">Cost Breakdown</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-secondary">Total Cost:</span>
                    <span className="font-medium">${selectedRecipe.totalCost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary">Sell Price:</span>
                    <span className="font-medium">${selectedRecipe.sellPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary">Profit Margin:</span>
                    <span className={`font-medium ${
                      selectedRecipe.profitMargin >= 70 ? 'text-green-600' :
                      selectedRecipe.profitMargin >= 60 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {selectedRecipe.profitMargin.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Ingredients */}
              <div>
                <h4 className="font-semibold text-primary mb-3">Ingredients</h4>
                <div className="space-y-2">
                  {selectedRecipe.ingredients.map((ingredient) => (
                    <div key={ingredient.id} className="flex justify-between items-center text-sm">
                      <div>
                        <span className="font-medium">{ingredient.ingredientName}</span>
                        <span className="text-secondary ml-2">
                          {ingredient.quantity} {ingredient.unit}
                        </span>
                      </div>
                      <span className="font-medium">${ingredient.cost.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Instructions */}
              <div className="md:col-span-2">
                <h4 className="font-semibold text-primary mb-3">Instructions</h4>
                <ol className="space-y-2">
                  {selectedRecipe.instructions.map((instruction, index) => (
                    <li key={index} className="flex text-sm">
                      <span className="font-medium text-orange-600 mr-3">{index + 1}.</span>
                      <span>{instruction}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => setShowRecipeModal(false)}
                className="btn-secondary"
              >
                Close
              </button>
              <button className="btn-primary">
                Edit Recipe
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}