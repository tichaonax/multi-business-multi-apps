'use client'

interface Category {
  id: string
  name: string
  emoji?: string
}

interface MenuCategoryFilterProps {
  categories: Category[]
  selectedCategory: string
  onCategoryChange: (categoryId: string) => void
}

export function MenuCategoryFilter({
  categories,
  selectedCategory,
  onCategoryChange
}: MenuCategoryFilterProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-primary mb-1">
        Category
      </label>
      <select
        value={selectedCategory}
        onChange={(e) => onCategoryChange(e.target.value)}
        className="input-field"
      >
        <option value="all">All Categories</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.emoji ? `${category.emoji} ${category.name}` : category.name}
          </option>
        ))}
      </select>
    </div>
  )
}