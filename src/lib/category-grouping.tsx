import React from 'react';

export interface GroupableCategory {
  id: string;
  parentName?: string | null;
}

export interface CategoryGroup<T> {
  /** null = ungrouped (top-level categories that aren't under a parent) */
  label: string | null;
  items: T[];
}

/**
 * Splits a flat category list into groups by parentName, sorted
 * alphabetically by group label, with ungrouped items appended last.
 */
export function groupCategoriesByParent<T extends GroupableCategory>(categories: T[]): CategoryGroup<T>[] {
  const groups = new Map<string, T[]>();
  const ungrouped: T[] = [];

  for (const category of categories) {
    if (category.parentName) {
      const bucket = groups.get(category.parentName) ?? [];
      bucket.push(category);
      groups.set(category.parentName, bucket);
    } else {
      ungrouped.push(category);
    }
  }

  const sortedGroups: CategoryGroup<T>[] = [...groups.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([label, items]) => ({ label, items }));

  return ungrouped.length > 0 ? [...sortedGroups, { label: null, items: ungrouped }] : sortedGroups;
}

/**
 * Renders a flat category list as <option>s organized into <optgroup>s by
 * parent category, for use inside a native <select>. Categories with no
 * parent render as plain (non-grouped) options.
 */
export function CategoryOptionGroups<T extends GroupableCategory>({
  categories,
  renderLabel,
}: {
  categories: T[];
  renderLabel: (category: T) => React.ReactNode;
}) {
  const groups = groupCategoriesByParent(categories);

  return (
    <>
      {groups.map((group, index) => {
        const options = group.items.map((category) => (
          <option key={category.id} value={category.id}>
            {renderLabel(category)}
          </option>
        ));

        return group.label ? (
          <optgroup key={group.label} label={group.label}>
            {options}
          </optgroup>
        ) : (
          <React.Fragment key={`ungrouped-${index}`}>{options}</React.Fragment>
        );
      })}
    </>
  );
}
