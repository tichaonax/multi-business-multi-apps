# Business Categories Components - API Reference

**Version:** 1.0.0
**Last Updated:** 2025-10-26

---

## Table of Contents

1. [EmojiPickerEnhanced](#emojipickerenhanced)
2. [CategoryEditor](#categoryeditor)
3. [SubcategoryEditor](#subcategoryeditor)
4. [Type Definitions](#type-definitions)

---

## EmojiPickerEnhanced

**Location:** `src/components/business/emoji-picker-enhanced.tsx`

**Description:** Advanced emoji picker with dual-source search (local database + GitHub API), usage tracking, and offline capability.

### Props

```typescript
interface EmojiPickerEnhancedProps {
  onSelect: (emoji: string) => void;
  selectedEmoji?: string;
  searchPlaceholder?: string;
}
```

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `onSelect` | `(emoji: string) => void` | ✅ Yes | - | Callback function triggered when user selects an emoji. Receives the selected emoji character as parameter. |
| `selectedEmoji` | `string` | ❌ No | `undefined` | Currently selected emoji to highlight in the picker. Used for edit mode to show current selection. |
| `searchPlaceholder` | `string` | ❌ No | `"Search emojis..."` | Placeholder text displayed in the search input field. |

### Usage Examples

#### Basic Usage
```typescript
import { EmojiPickerEnhanced } from '@/components/business/emoji-picker-enhanced';

function MyComponent() {
  const [emoji, setEmoji] = useState('');

  return (
    <EmojiPickerEnhanced
      onSelect={setEmoji}
      selectedEmoji={emoji}
    />
  );
}
```

#### Custom Placeholder
```typescript
<EmojiPickerEnhanced
  onSelect={(emoji) => console.log('Selected:', emoji)}
  searchPlaceholder="Find the perfect icon..."
/>
```

#### With Form Integration
```typescript
function CategoryForm() {
  const [formData, setFormData] = useState({
    name: '',
    emoji: '',
    color: '',
  });

  return (
    <form>
      <input
        value={formData.name}
        onChange={(e) => setFormData({...formData, name: e.target.value})}
      />

      <EmojiPickerEnhanced
        onSelect={(emoji) => setFormData({...formData, emoji})}
        selectedEmoji={formData.emoji}
        searchPlaceholder="Search category emoji..."
      />
    </form>
  );
}
```

### Features

- **Local Database Search:** Instant search from cached emojis
- **GitHub Integration:** Access 3000+ emojis on demand
- **Usage Tracking:** Popular emojis (5+ uses) highlighted with ⭐
- **Source Badges:** Visual indicators (🏠 local, 🐙 GitHub, ⭐ popular)
- **Debounced Search:** 300ms delay for optimal performance
- **Offline Mode:** Graceful fallback when GitHub unavailable
- **Auto-Caching:** GitHub selections automatically saved locally

### Internal State

```typescript
const [searchQuery, setSearchQuery] = useState<string>('');
const [localResults, setLocalResults] = useState<EmojiResult[]>([]);
const [githubResults, setGithubResults] = useState<EmojiResult[]>([]);
const [loading, setLoading] = useState<boolean>(false);
const [githubLoading, setGithubLoading] = useState<boolean>(false);
const [showGithubButton, setShowGithubButton] = useState<boolean>(false);
const [githubError, setGithubError] = useState<string | null>(null);
```

### Methods

#### `searchLocalEmojis(query: string): Promise<void>`
Searches the local emoji database with debouncing.

**Parameters:**
- `query` - Search string

**Behavior:**
- Returns empty results if query is empty
- Debounced with 300ms delay
- Shows GitHub button if < 10 results
- Sorts results by usage count (descending)

#### `searchGithubEmojis(): Promise<void>`
Fetches emojis from GitHub API.

**Behavior:**
- Uses 1-hour cache to minimize API calls
- Handles offline errors gracefully
- Refreshes local results after fetching
- Filters by current search query

#### `handleEmojiSelect(emoji: string, source: 'local' | 'github'): Promise<void>`
Processes emoji selection and auto-caching.

**Parameters:**
- `emoji` - Selected emoji character
- `source` - Origin of emoji ('local' or 'github')

**Behavior:**
- Calls `onSelect` prop with emoji
- If source is 'github', caches emoji to local database
- Increments usage count for future sorting

---

## CategoryEditor

**Location:** `src/components/business/category-editor.tsx`

**Description:** Modal component for creating and editing expense categories.

### Props

```typescript
interface CategoryEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  category?: ExpenseCategory | null;
  mode: 'create' | 'edit';
}
```

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `isOpen` | `boolean` | ✅ Yes | - | Controls modal visibility. Set to `true` to open the modal. |
| `onClose` | `() => void` | ✅ Yes | - | Callback when modal should close (user clicks cancel or backdrop). |
| `onSuccess` | `() => void` | ✅ Yes | - | Callback after successful create/edit operation. Use to refresh data. |
| `category` | `ExpenseCategory \| null` | ❌ No | `null` | Category data for edit mode. Pass `null` for create mode. |
| `mode` | `'create' \| 'edit'` | ✅ Yes | - | Operation mode: `'create'` for new category, `'edit'` for updating. |

### Usage Examples

#### Create Mode
```typescript
import { CategoryEditor } from '@/components/business/category-editor';

function CategoriesPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const handleSuccess = () => {
    setIsCreateOpen(false);
    // Refresh your categories list
    fetchCategories();
  };

  return (
    <>
      <button onClick={() => setIsCreateOpen(true)}>
        Add Category
      </button>

      <CategoryEditor
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={handleSuccess}
        category={null}
        mode="create"
      />
    </>
  );
}
```

#### Edit Mode
```typescript
function CategoryList({ categories }) {
  const [editCategory, setEditCategory] = useState<ExpenseCategory | null>(null);

  return (
    <>
      {categories.map(category => (
        <button key={category.id} onClick={() => setEditCategory(category)}>
          Edit {category.name}
        </button>
      ))}

      <CategoryEditor
        isOpen={editCategory !== null}
        onClose={() => setEditCategory(null)}
        onSuccess={() => {
          setEditCategory(null);
          fetchCategories();
        }}
        category={editCategory}
        mode="edit"
      />
    </>
  );
}
```

### Form Fields

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Domain | Select (dropdown) | ✅ Yes | Must select one of: Business, Personal, Mixed |
| Name | Text input | ✅ Yes | Must be unique within domain (case-insensitive) |
| Description | Textarea | ❌ No | Optional descriptive text |
| Emoji | Emoji picker | ✅ Yes | Must select an emoji |
| Color | Color picker | ✅ Yes | Hex color code (e.g., `#3B82F6`) |

### State Management

```typescript
const [name, setName] = useState<string>('');
const [description, setDescription] = useState<string>('');
const [emoji, setEmoji] = useState<string>('');
const [color, setColor] = useState<string>('#3B82F6');
const [domainId, setDomainId] = useState<string>('');
const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
const [error, setError] = useState<string | null>(null);
```

### API Integration

**Create Category:**
```typescript
POST /api/business/categories
{
  domainId: string;
  name: string;
  emoji: string;
  color: string;
  description?: string;
}
```

**Update Category:**
```typescript
PATCH /api/business/categories/[id]
{
  domainId?: string;
  name?: string;
  emoji?: string;
  color?: string;
  description?: string;
}
```

---

## SubcategoryEditor

**Location:** `src/components/business/subcategory-editor.tsx`

**Description:** Modal component for creating and editing subcategories under a parent category.

### Props

```typescript
interface SubcategoryEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  parentCategory: ExpenseCategory;
  subcategory?: ExpenseSubcategory | null;
  mode: 'create' | 'edit';
}
```

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `isOpen` | `boolean` | ✅ Yes | - | Controls modal visibility. |
| `onClose` | `() => void` | ✅ Yes | - | Callback when modal should close. |
| `onSuccess` | `() => void` | ✅ Yes | - | Callback after successful operation. |
| `parentCategory` | `ExpenseCategory` | ✅ Yes | - | Parent category object. Used for display and validation. |
| `subcategory` | `ExpenseSubcategory \| null` | ❌ No | `null` | Subcategory data for edit mode. Pass `null` for create mode. |
| `mode` | `'create' \| 'edit'` | ✅ Yes | - | Operation mode: `'create'` or `'edit'`. |

### Usage Examples

#### Create Subcategory
```typescript
import { SubcategoryEditor } from '@/components/business/subcategory-editor';

function CategoryDetail({ category }) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsCreateOpen(true)}>
        Add Subcategory
      </button>

      <SubcategoryEditor
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => {
          setIsCreateOpen(false);
          fetchSubcategories();
        }}
        parentCategory={category}
        subcategory={null}
        mode="create"
      />
    </>
  );
}
```

#### Edit Subcategory
```typescript
function SubcategoryList({ category, subcategories }) {
  const [editSubcat, setEditSubcat] = useState<ExpenseSubcategory | null>(null);

  return (
    <>
      {subcategories.map(subcat => (
        <button key={subcat.id} onClick={() => setEditSubcat(subcat)}>
          Edit {subcat.name}
        </button>
      ))}

      <SubcategoryEditor
        isOpen={editSubcat !== null}
        onClose={() => setEditSubcat(null)}
        onSuccess={() => {
          setEditSubcat(null);
          fetchSubcategories();
        }}
        parentCategory={category}
        subcategory={editSubcat}
        mode="edit"
      />
    </>
  );
}
```

### Form Fields

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Parent Category | Display only | - | Read-only, shows parent category name |
| Name | Text input | ✅ Yes | Must be unique within parent category (case-insensitive) |
| Description | Textarea | ❌ No | Optional descriptive text |
| Emoji | Emoji picker | ❌ No | Optional, inherits from parent if not provided |

### API Integration

**Create Subcategory:**
```typescript
POST /api/business/subcategories
{
  categoryId: string;
  name: string;
  emoji?: string;
  description?: string;
}
```

**Update Subcategory:**
```typescript
PATCH /api/business/subcategories/[id]
{
  name?: string;
  emoji?: string;
  description?: string;
}
```

---

## Type Definitions

### ExpenseCategory

```typescript
interface ExpenseCategory {
  id: string;
  domainId: string | null;
  name: string;
  emoji: string;
  color: string;
  description: string | null;
  isDefault: boolean;
  isUserCreated: boolean;
  createdAt: Date | string;
  createdBy: string | null;
  domain?: ExpenseDomain | null;
  expense_subcategories?: ExpenseSubcategory[];
}
```

### ExpenseSubcategory

```typescript
interface ExpenseSubcategory {
  id: string;
  categoryId: string;
  name: string;
  emoji: string | null;
  description: string | null;
  isDefault: boolean;
  isUserCreated: boolean;
  createdAt: Date | string;
  createdBy: string | null;
  category?: ExpenseCategory | null;
  users?: {
    id: string;
    name: string;
  } | null;
}
```

### ExpenseDomain

```typescript
interface ExpenseDomain {
  id: string;
  name: string;  // 'Business', 'Personal', or 'Mixed'
  emoji: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date | string;
  expense_categories?: ExpenseCategory[];
}
```

### EmojiResult

```typescript
interface EmojiResult {
  emoji: string;           // The actual emoji character
  name: string;            // Display name
  description?: string;    // Search keywords
  url?: string;            // GitHub CDN URL
  source: 'local' | 'github';
  usageCount?: number;     // Times selected
}
```

### CategoryEditRequest

```typescript
interface CategoryEditRequest {
  id?: string;                  // Optional for create, required for update
  domainId?: string | null;
  name: string;
  emoji: string;
  color: string;
  description?: string | null;
}
```

### SubcategoryEditRequest

```typescript
interface SubcategoryEditRequest {
  id?: string;                  // Optional for create, required for update
  categoryId: string;
  name: string;
  emoji?: string | null;
  description?: string | null;
}
```

---

## Common Patterns

### Pattern 1: Modal State Management

```typescript
function MyComponent() {
  // Single state for controlling which modal is open
  const [modalState, setModalState] = useState<{
    type: 'create-category' | 'edit-category' | 'create-subcat' | 'edit-subcat' | null;
    data?: any;
  }>({ type: null });

  return (
    <>
      <CategoryEditor
        isOpen={modalState.type === 'create-category'}
        onClose={() => setModalState({ type: null })}
        onSuccess={handleSuccess}
        category={null}
        mode="create"
      />

      <CategoryEditor
        isOpen={modalState.type === 'edit-category'}
        onClose={() => setModalState({ type: null })}
        onSuccess={handleSuccess}
        category={modalState.data}
        mode="edit"
      />
    </>
  );
}
```

### Pattern 2: Optimistic Updates

```typescript
function CategoriesList() {
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);

  const handleSuccess = async () => {
    // Optimistic update
    const tempCategory = { ...newCategory, id: 'temp-' + Date.now() };
    setCategories([...categories, tempCategory]);

    // Fetch actual data
    const updatedCategories = await fetchCategories();
    setCategories(updatedCategories);
  };

  return (
    <CategoryEditor
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      onSuccess={handleSuccess}
      category={null}
      mode="create"
    />
  );
}
```

### Pattern 3: Error Handling

```typescript
function MyComponent() {
  const [error, setError] = useState<string | null>(null);

  const handleSuccess = () => {
    setError(null);
    fetchData().catch(err => {
      setError(err.message);
    });
  };

  return (
    <>
      {error && (
        <div className="error-message">{error}</div>
      )}

      <CategoryEditor
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSuccess={handleSuccess}
        category={null}
        mode="create"
      />
    </>
  );
}
```

---

## Styling

All components use Tailwind CSS for styling. Key classes used:

### Modal Container
```css
bg-white dark:bg-gray-800
rounded-lg
shadow-xl
max-w-2xl
w-full
max-h-[90vh]
overflow-y-auto
```

### Form Inputs
```css
w-full
px-3 py-2
border border-gray-300
rounded-md
shadow-sm
focus:ring-blue-500
focus:border-blue-500
disabled:bg-gray-100
```

### Buttons
```css
/* Primary Button */
px-4 py-2
bg-blue-600
text-white
rounded-md
hover:bg-blue-700
disabled:opacity-50

/* Secondary Button */
px-4 py-2
border border-gray-300
text-gray-700
rounded-md
hover:bg-gray-50
```

---

## Accessibility

All components implement basic accessibility features:

- ✅ **Keyboard Navigation:** Tab through inputs, Enter to submit
- ✅ **Focus Management:** Auto-focus first input on modal open
- ✅ **ARIA Labels:** Descriptive labels for screen readers
- ✅ **Color Contrast:** WCAG AA compliant
- ✅ **Error Messages:** Associated with form fields via aria-describedby

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-10-26 | Initial API reference |

---

**End of Component API Reference**
