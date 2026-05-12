import { z } from "zod";

// ─── Aadhaar: 12 digits ──────────────────────────────────────────────
// Note: this is informal capture, not regulated KYC.
// We do basic format validation only — no Verhoeff checksum.
export const aadhaarSchema = z
  .string()
  .regex(/^\d{12}$/, "Aadhaar must be exactly 12 digits")
  .optional()
  .or(z.literal(""));

// ─── PAN: 5 letters + 4 digits + 1 letter ────────────────────────────
export const panSchema = z
  .string()
  .regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, "PAN format: ABCDE1234F (uppercase)")
  .optional()
  .or(z.literal(""));

// ─── Pincode: 6 digits, can't start with 0 ───────────────────────────
export const pincodeSchema = z
  .string()
  .regex(/^[1-9]\d{5}$/, "Pincode must be 6 digits, can't start with 0")
  .optional()
  .or(z.literal(""));

// ─── Mobile: 10 digits, must start with 6-9 ──────────────────────────
export const indianMobileSchema = z
  .string()
  .regex(/^[6-9]\d{9}$/, "Indian mobile must be 10 digits starting with 6-9");

// ─── Indian states (used in Select dropdowns) ────────────────────────
export const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Jammu and Kashmir",
  "Ladakh",
  "Chandigarh",
  "Puducherry",
  "Andaman and Nicobar Islands",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Lakshadweep",
] as const;

export type IndianState = (typeof INDIAN_STATES)[number];
