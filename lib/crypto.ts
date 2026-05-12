import "server-only";
import crypto from "crypto";

/**
 * AES-256-GCM encryption helpers.
 *
 * Used for storing full credit card numbers and other sensitive data at rest.
 *
 * IMPORTANT: ENCRYPTION_KEY env variable must be a 64-character hex string (32 bytes).
 * Generate with:  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 *
 * If the key is lost, all encrypted data becomes unrecoverable. BACK IT UP.
 */

const ALGO = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits — recommended for GCM
const KEY_LENGTH = 32; // 256 bits

let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (cachedKey) return cachedKey;
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "ENCRYPTION_KEY environment variable is missing. " +
        "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }
  const buf = Buffer.from(raw, "hex");
  if (buf.length !== KEY_LENGTH) {
    throw new Error(
      `ENCRYPTION_KEY must be ${KEY_LENGTH * 2} hex characters (got ${raw.length}).`
    );
  }
  cachedKey = buf;
  return buf;
}

/**
 * Encrypt a plaintext string. Returns a base64-encoded payload that bundles
 * IV + auth tag + ciphertext for easy storage in a single column.
 *
 * Format: base64(iv ‖ tag ‖ ciphertext)
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) return "";
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

/**
 * Decrypt a payload produced by encrypt(). Returns "" for empty inputs.
 * Throws if the auth tag doesn't match (i.e. data was tampered with).
 */
export function decrypt(payload: string): string {
  if (!payload) return "";
  const buf = Buffer.from(payload, "base64");
  if (buf.length < IV_LENGTH + 16) {
    throw new Error("Invalid encrypted payload — too short");
  }
  const iv = buf.subarray(0, IV_LENGTH);
  const tag = buf.subarray(IV_LENGTH, IV_LENGTH + 16);
  const ciphertext = buf.subarray(IV_LENGTH + 16);
  const decipher = crypto.createDecipheriv(ALGO, getKey(), iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString("utf8");
}

/**
 * Format a card number with spaces: "4532123456781234" -> "4532 1234 5678 1234"
 * Amex (15 digits) -> "3782 822463 10005" (4-6-5 grouping)
 */
export function formatCardNumber(num: string): string {
  if (!num) return "";
  const clean = num.replace(/\s/g, "");
  if (clean.length === 15) {
    // Amex format: 4-6-5
    return `${clean.slice(0, 4)} ${clean.slice(4, 10)} ${clean.slice(10)}`;
  }
  // Standard 4-4-4-4 (or 4-4-4-2 for 14-digit Diners)
  return clean.match(/.{1,4}/g)?.join(" ") ?? clean;
}

/**
 * Safely decrypt — returns null on any error (key missing, payload tampered, etc.)
 * Use this in display contexts where a single bad row shouldn't crash the page.
 */
export function tryDecrypt(payload: string | null | undefined): string | null {
  if (!payload) return null;
  try {
    return decrypt(payload);
  } catch {
    return null;
  }
}
