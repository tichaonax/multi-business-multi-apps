# Phase 5: Integration Guide for /personal/new Page

## Summary of Changes Needed

The `/personal/new` page (1555 lines) needs to be updated to use the new category system. Here are the key changes:

### 1. Import New Components
```tsx
import { CategorySelector } from '@/components/personal/category-selector'
import { SubcategoryCreator } from '@/components/personal/subcategory-creator'
```

### 2. Update State Management

**Replace:**
```tsx
const [categories, setCategories] = useState<Category[]>([])
const [formData, setFormData] = useState({
  category: '',
  // ... other fields
})
```

**With:**
```tsx
const [categoryId, setCategoryId] = useState<string | null>(null)
const [subcategoryId, setSubcategoryId] = useState<string | null>(null)
const [showSubcategoryCreator, setShowSubcategoryCreator] = useState(false)
const [selectedCategoryForCreator, setSelectedCategoryForCreator] = useState<{
  id: string;
  name: string;
  emoji: string;
} | null>(null)
```

### 3. Remove Old Category Fetching Logic

**Delete** the old `useEffect` that fetches categories from `/api/personal/categories`

The CategorySelector component now handles this internally.

### 4. Replace Category Dropdown Section

**Find** the section around line 600-700 that renders the category dropdown:
```tsx
<select
  value={formData.category}
  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
  className="..."
>
  <option value="">Select a category...</option>
  {categories.map((cat) => (
    <option key={cat.id} value={cat.id}>
      {cat.emoji} {cat.name}
    </option>
  ))}
</select>
```

**Replace with:**
```tsx
<CategorySelector
  onCategoryChange={(catId, subId) => {
    setCategoryId(catId)
    setSubcategoryId(subId)
  }}
  onCreateSubcategory={() => {
    if (categoryId) {
      // Get category info from the hierarchy
      setSelectedCategoryForCreator({
        id: categoryId,
        name: '...', // from state
        emoji: '...', // from state
      })
      setShowSubcategoryCreator(true)
    }
  }}
  showCreateButton={hasUserPermission(session?.user, 'canCreateExpenseSubcategories')}
  required={formData.paymentType === 'category'}
  disabled={loading}
/>
```

### 5. Add Subcategory Creator Modal

**Add** before the closing `</ProtectedRoute>` tag:
```tsx
{showSubcategoryCreator && selectedCategoryForCreator && (
  <SubcategoryCreator
    categoryId={selectedCategoryForCreator.id}
    categoryName={selectedCategoryForCreator.name}
    categoryEmoji={selectedCategoryForCreator.emoji}
    onSuccess={(newSubcategory) => {
      setShowSubcategoryCreator(false)
      setSubcategoryId(newSubcategory.id)
      // Optionally refresh the CategorySelector
    }}
    onCancel={() => setShowSubcategoryCreator(false)}
    isOpen={showSubcategoryCreator}
  />
)}
```

### 6. Update Form Submission

**Find** the `handleSubmit` function and update the payload:

**Replace:**
```tsx
const response = await fetch('/api/personal/expenses', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    amount: Number(formData.amount),
    description: formData.description,
    category: formData.category, // OLD
    date: formData.date,
    // ...
  }),
})
```

**With:**
```tsx
const response = await fetch('/api/personal/expenses', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    amount: Number(formData.amount),
    description: formData.description,
    categoryId: categoryId, // NEW
    subcategoryId: subcategoryId, // NEW
    category: 'General', // Fallback for backward compatibility
    date: formData.date,
    // ...
  }),
})
```

### 7. Update Validation

**Find** validation logic that checks if category is selected:

**Replace:**
```tsx
if (formData.paymentType === 'category' && !formData.category) {
  setError('Please select a category')
  return
}
```

**With:**
```tsx
if (formData.paymentType === 'category' && !categoryId) {
  setError('Please select a category')
  return
}
```

## Testing Checklist

After integration:

- [ ] Category selector loads with 8 domains
- [ ] Selecting domain shows categories
- [ ] Selecting category shows subcategories
- [ ] "Create New" button appears if user has permission
- [ ] Clicking "Create New" opens modal
- [ ] Creating subcategory adds it to dropdown
- [ ] Submitting expense with category works
- [ ] Submitting expense with subcategory works
- [ ] Validation prevents submission without category (when required)
- [ ] Error handling works for API failures

## Files to Modify

1. **`src/app/personal/new/page.tsx`**
   - Add imports
   - Update state
   - Replace category dropdown
   - Add subcategory creator modal
   - Update form submission
   - Update validation

## Backward Compatibility Notes

- The API still accepts old `category` string field
- New `categoryId` and `subcategoryId` take precedence
- Existing expenses will continue to work
- Migration script already ran to map old categories

## Next Steps After Integration

Once this integration is complete:
- Phase 6: Update dashboard to display emojis
- Phase 7: Create category management UI
- Phase 8: Update navigation labels
- Phase 9: Comprehensive testing
- Phase 10: Documentation

---

**Note:** Due to the file's complexity (1555 lines), making the actual edits requires careful attention to the existing form structure, validation, and state management. The changes above are the core modifications needed.
