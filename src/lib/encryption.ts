/**
 * Encryption Utilities
 *
 * AES-256 encryption/decryption for sensitive data (R710 passwords, etc.)
 *
 * Environment Variables Required:
 * - ENCRYPTION_KEY: 64-character hex string (32 bytes for AES-256)
 *
 * Generate a key with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16; // AES block size

/**
 * Get encryption key from environment variable
 * Throws error if key is not configured
 */
function getEncryptionKey(): Buffer {
  const encryptionKey = process.env.ENCRYPTION_KEY;

  if (!encryptionKey) {
    throw new Error(
      'ENCRYPTION_KEY environment variable is not set. ' +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }

  if (encryptionKey.length !== 64) {
    throw new Error(
      'ENCRYPTION_KEY must be a 64-character hex string (32 bytes). ' +
      `Current length: ${encryptionKey.length}`
    );
  }

  return Buffer.from(encryptionKey, 'hex');
}

/**
 * Encrypt a string using AES-256-CBC
 *
 * @param text - Plain text to encrypt
 * @returns Encrypted text in format: iv:encryptedData (both hex-encoded)
 *
 * @example
 * const encrypted = encrypt('myPassword123');
 * // Returns: "a1b2c3d4....:e5f6g7h8...."
 */
export function encrypt(text: string): string {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Return IV + encrypted data (both hex-encoded, separated by :)
    return `${iv.toString('hex')}:${encrypted}`;

  } catch (error) {
    throw new Error(
      `Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Decrypt a string encrypted with encrypt()
 *
 * @param encryptedText - Encrypted text in format: iv:encryptedData
 * @returns Decrypted plain text
 *
 * @example
 * const decrypted = decrypt('a1b2c3d4....:e5f6g7h8....');
 * // Returns: "myPassword123"
 */
export function decrypt(encryptedText: string): string {
  try {
    const key = getEncryptionKey();

    // Split IV and encrypted data
    const parts = encryptedText.split(':');

    if (parts.length !== 2) {
      throw new Error('Invalid encrypted text format (expected: iv:encryptedData)');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const encryptedData = parts[1];

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;

  } catch (error) {
    throw new Error(
      `Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Test encryption/decryption is working correctly
 *
 * @returns true if encryption is working
 * @throws Error if encryption is not configured or not working
 */
export function testEncryption(): boolean {
  const testText = 'test-encryption-12345';

  try {
    const encrypted = encrypt(testText);
    const decrypted = decrypt(encrypted);

    if (decrypted !== testText) {
      throw new Error('Encryption test failed: Decrypted text does not match original');
    }

    return true;

  } catch (error) {
    throw new Error(
      `Encryption test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
