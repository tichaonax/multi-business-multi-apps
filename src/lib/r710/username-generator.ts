/**
 * R710 Direct Sale Username Generator
 *
 * Generates unique usernames for R710 tokens created via direct sales.
 * Format: DS-YYMMDD-HHMMSS-RND
 * Example: DS-251227-143052-A3F
 *
 * Components:
 * - DS: Direct Sale prefix
 * - YYMMDD: Date (year, month, day)
 * - HHMMSS: Time (hours, minutes, seconds)
 * - RND: 3-character random hex suffix
 *
 * This ensures:
 * - Uniqueness (timestamp + random)
 * - Traceability (can identify when token was sold)
 * - Distinction from batch-generated tokens (Guest-XX format)
 */

export function generateDirectSaleUsername(): string {
  const now = new Date();

  const year = now.getFullYear().toString().slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  // Generate 3-character random suffix (hex: 0-FFF)
  const random = Math.floor(Math.random() * 4096)
    .toString(16)
    .toUpperCase()
    .padStart(3, '0');

  return `DS-${year}${month}${day}-${hours}${minutes}${seconds}-${random}`;
}

/**
 * Parse components from a direct sale username
 * Returns null if format is invalid
 */
export function parseDirectSaleUsername(username: string): {
  prefix: string;
  date: Date;
  random: string;
} | null {
  const match = username.match(/^DS-(\d{6})-(\d{6})-([0-9A-F]{3})$/);
  if (!match) return null;

  const [, dateStr, timeStr, random] = match;

  const year = 2000 + parseInt(dateStr.slice(0, 2));
  const month = parseInt(dateStr.slice(2, 4)) - 1;
  const day = parseInt(dateStr.slice(4, 6));

  const hours = parseInt(timeStr.slice(0, 2));
  const minutes = parseInt(timeStr.slice(2, 4));
  const seconds = parseInt(timeStr.slice(4, 6));

  const date = new Date(year, month, day, hours, minutes, seconds);

  return {
    prefix: 'DS',
    date,
    random
  };
}

/**
 * Check if a username is a direct sale username
 */
export function isDirectSaleUsername(username: string): boolean {
  return /^DS-\d{6}-\d{6}-[0-9A-F]{3}$/.test(username);
}
