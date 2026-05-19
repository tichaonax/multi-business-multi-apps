// Capitalizes the first letter of each word; keeps spaces and hyphens intact.
// e.g. "baking soda" -> "Baking Soda", "my-product" -> "My-Product"
export function toTitleCase(str: string): string {
  return str.replace(/([^-\s]+)/g, (word) =>
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  )
}
