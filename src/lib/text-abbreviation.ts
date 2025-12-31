/**
 * Abbreviates a text segment for display on labels
 * Consistently abbreviates the same input to the same output
 *
 * Examples:
 * - "Home & Beauty Accessories" → "H&BA"
 * - "Hardware Tools" → "HT"
 * - "Premium Cotton T-Shirt" → "PCTS"
 *
 * @param text - The full text to abbreviate
 * @returns Abbreviated version using first letters of each word
 */
export function abbreviateText(text: string): string {
  if (!text) return '';

  // Split by spaces and filter out empty strings
  const words = text.split(/\s+/).filter(word => word.length > 0);

  // Map each word to its first character
  const abbreviated = words.map(word => {
    // Preserve special characters like "&"
    if (word === '&') return '&';

    // Handle words with special characters (e.g., "T-Shirt" → "T")
    const firstChar = word[0];

    // Return uppercase first letter
    return firstChar.toUpperCase();
  }).join('');

  return abbreviated;
}

/**
 * Partially abbreviates text by selectively condensing words to fit a target length
 * Prioritizes keeping full words readable, only abbreviating when necessary
 *
 * Strategy:
 * 1. Keep first and last words fully readable (most important for context)
 * 2. Abbreviate middle words if needed, preferring longer words
 * 3. Abbreviate pairs of consecutive long words in the middle
 *
 * Example:
 * - "Purple Jewel Flower Statement Earrings" (fits in ~40 chars)
 *   → "Purple JF Statement Earrings" (~28 chars)
 * - Target: Keep as much readable as possible
 *
 * @param text - The full text to partially abbreviate
 * @param targetLength - Target character length (default: 30)
 * @returns Partially abbreviated version
 */
export function partiallyAbbreviateText(text: string, targetLength: number = 30): string {
  if (!text) return '';

  // If already fits, return as-is
  if (text.length <= targetLength) {
    return text;
  }

  const words = text.split(/\s+/).filter(word => word.length > 0);

  if (words.length <= 2) {
    // Don't abbreviate if only 1-2 words, just return
    return text;
  }

  // Strategy 1: Keep first and last word, abbreviate middle pairs
  // E.g., "Purple Jewel Flower Statement Earrings" → "Purple JF Statement Earrings"
  if (words.length >= 4) {
    const result: string[] = [];
    result.push(words[0]); // Keep first word

    // Process middle words - abbreviate pairs of long consecutive words
    let i = 1;
    while (i < words.length - 1) {
      const currentWord = words[i];
      const nextWord = words[i + 1];

      // If we have at least 2 words left (not counting last) and both are long
      if (i < words.length - 2 && currentWord.length > 4 && nextWord.length > 4) {
        // Abbreviate this pair
        result.push(currentWord[0].toUpperCase() + nextWord[0].toUpperCase());
        i += 2;
      } else {
        // Keep this word readable
        result.push(currentWord);
        i++;
      }
    }

    result.push(words[words.length - 1]); // Keep last word

    const strategy1 = result.join(' ');
    if (strategy1.length <= targetLength) {
      return strategy1;
    }
  }

  // Strategy 2: More aggressive - abbreviate all middle words
  if (words.length >= 3) {
    const result = [
      words[0], // First word
      ...words.slice(1, -1).map(w => w[0].toUpperCase()), // Abbreviate all middle
      words[words.length - 1] // Last word
    ];
    return result.join(' ');
  }

  // Fallback - return original
  return text;
}

/**
 * Fits a template name within a specified character width using smart abbreviation
 * For colon-separated names (e.g., "Category:Product Description"):
 * 1. First tries abbreviating only the left side (before colon)
 * 2. If still doesn't fit, partially abbreviates the right side (condenses long words)
 * 3. If still doesn't fit, fully abbreviates both sides
 * 4. Maximizes human-readable information
 *
 * Examples:
 * - "Home & Beauty Accessories:Purple Jewel Flower Statement Earrings"
 *   - Try: full name
 *   - Try: "H&BA:Purple Jewel Flower Statement Earrings" (left abbreviated)
 *   - Try: "H&BA:Purple JF Statement Earrings" (left abbreviated + right partially abbreviated)
 *   - Try: "H&BA:PJFSE" (both fully abbreviated)
 *   - Last resort: truncate
 *
 * @param templateName - The full template name
 * @param maxChars - Maximum number of characters allowed
 * @returns Optimally fitted template name
 */
export function fitTemplateName(templateName: string, maxChars: number): string {
  if (!templateName) return '';

  // If it fits, use the full name
  if (templateName.length <= maxChars) {
    return templateName;
  }

  // Check if name has colon separator
  const colonIndex = templateName.indexOf(':');

  if (colonIndex > 0) {
    // Split into left and right parts
    const leftPart = templateName.substring(0, colonIndex).trim();
    const rightPart = templateName.substring(colonIndex + 1).trim();

    // Strategy 1: Abbreviate only the left part
    const abbreviatedLeft = abbreviateText(leftPart);
    const strategy1 = `${abbreviatedLeft}:${rightPart}`;

    if (strategy1.length <= maxChars) {
      return strategy1;
    }

    // Strategy 2: Abbreviate left + partially abbreviate right
    // Calculate remaining space for right side
    const remainingSpace = maxChars - abbreviatedLeft.length - 1; // -1 for colon
    const partiallyAbbreviatedRight = partiallyAbbreviateText(rightPart, remainingSpace);
    const strategy2 = `${abbreviatedLeft}:${partiallyAbbreviatedRight}`;

    if (strategy2.length <= maxChars) {
      return strategy2;
    }

    // Strategy 3: Abbreviate both left and right parts fully
    const abbreviatedRight = abbreviateText(rightPart);
    const strategy3 = `${abbreviatedLeft}:${abbreviatedRight}`;

    if (strategy3.length <= maxChars) {
      return strategy3;
    }

    // Strategy 4: Truncate the fully abbreviated version
    return strategy3.substring(0, maxChars - 3) + '...';
  }

  // No colon - use simple abbreviation
  const abbreviated = abbreviateText(templateName);
  if (abbreviated.length <= maxChars) {
    return abbreviated;
  }

  // If abbreviation is still too long, truncate it
  return abbreviated.substring(0, maxChars - 3) + '...';
}
