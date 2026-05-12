/**
 * lib/calc-shared.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Client-safe calculation helpers.
 *
 * These are USED IN BROWSERS (forms, live previews) and have no
 * "server-only" import. They share formulas with lib/calculations.ts but the
 * server-side authoritative versions still recompute on save (defense in depth).
 * ─────────────────────────────────────────────────────────────────────────────
 */

export function round2Client(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

/**
 * Parse "500+7000+2500" → 10000. Returns 0 on invalid input (no throws).
 * Used in BROWSER for live preview while typing.
 */
export function calculateSplitTotal(raw: string | null | undefined): number {
  if (!raw || raw.trim() === "") return 0;
  const parts = raw.trim().split("+").map((p) => p.trim());
  let sum = 0;
  for (const p of parts) {
    if (p === "") continue;
    if (!/^\d+(\.\d+)?$/.test(p)) return 0; // be permissive, no UI errors mid-typing
    sum += parseFloat(p);
  }
  return round2Client(sum);
}

/**
 * Pending after this payment = max(due - paid, 0).
 * If due is 0 or paid is 0, pending = max(due - paid, 0).
 */
export function calculatePendingAfterPayment(dueAmount: number, paidTotal: number): number {
  return Math.max(round2Client(dueAmount - paidTotal), 0);
}

/**
 * Customer Today Pending =
 *   (paidTotal - swipeTotal) - (clearedPhonePe + clearedWallet + clearedCash)
 *
 * Capped at 0 — if cleared exceeds remaining, today pending is 0 (the excess
 * is balanceToCustomer, handled separately on the server).
 */
export function customerTodayPending(opts: {
  paidTotal: number;
  swipeTotal: number;
  clearedPhonePe: number;
  clearedWallet: number;
  clearedCash: number;
}): number {
  const remaining = opts.paidTotal - opts.swipeTotal;
  const totalCleared = opts.clearedPhonePe + opts.clearedWallet + opts.clearedCash;
  return Math.max(round2Client(remaining - totalCleared), 0);
}

/**
 * Returns true if the bill payment is fully cleared (no pending remaining).
 *
 * Called from the form to flip the Save button between
 *   ✅ "PAID — NO DUES"  (cleared)
 *   ⚠ "SAVE — PENDING"   (still owes)
 */
export function isTransactionCleared(opts: {
  paidTotal: number;
  swipeTotal: number;
  clearedPhonePe: number;
  clearedWallet: number;
  clearedCash: number;
}): boolean {
  return customerTodayPending(opts) <= 0.01;
}

/**
 * Reverse percentage calculation: when user enters charges manually,
 * derive the percentage that produced it.
 *
 *   percentage = (charges / paid) * 100
 *
 * Returns 0 if paid is 0 (avoids division by zero).
 */
export function reversePercentage(charges: number, paid: number): number {
  if (paid <= 0) return 0;
  return round2Client((charges / paid) * 100);
}

// ─── Card-network detection from PAN prefix ────────────────────────────────
// Used by the card form to auto-fill the network dropdown when typing the number.
export type DetectableNetwork =
  | "VISA"
  | "MASTERCARD"
  | "RUPAY"
  | "AMERICAN_EXPRESS"
  | "DINERS_CLUB"
  | "OTHER";

const NETWORK_PREFIXES: Array<{ test: (n: string) => boolean; network: DetectableNetwork }> = [
  // Amex: starts with 34 or 37
  { test: (n) => /^3[47]/.test(n), network: "AMERICAN_EXPRESS" },
  // Diners: 300-305, 36, 38, 39
  { test: (n) => /^(30[0-5]|36|38|39)/.test(n), network: "DINERS_CLUB" },
  // Visa: starts with 4
  { test: (n) => /^4/.test(n), network: "VISA" },
  // MasterCard: 51-55 or 2221-2720
  { test: (n) => /^(5[1-5]|2[2-7])/.test(n), network: "MASTERCARD" },
  // RuPay: 60, 6521, 6522, 81, 82, 508 (representative)
  { test: (n) => /^(60|65[2-9]|81|82|508)/.test(n), network: "RUPAY" },
];

export function detectCardNetwork(cardNumber: string): DetectableNetwork | null {
  const clean = cardNumber.replace(/\D/g, "");
  if (clean.length < 2) return null;
  for (const rule of NETWORK_PREFIXES) {
    if (rule.test(clean)) return rule.network;
  }
  return null;
}

/**
 * Card length validation per network:
 *   Amex          → 15 digits
 *   Diners Club   → 14 digits
 *   Everything else → 16 digits
 */
export function expectedCardLength(network: string | null): number[] {
  if (network === "AMERICAN_EXPRESS") return [15];
  if (network === "DINERS_CLUB") return [14];
  return [16];
}

/**
 * Card expiry validation: valid if expiry month/year is >= current month/year.
 * Treats next month as valid too. Only invalid if expiry < current month.
 */
export function isCardExpired(month: number, year: number, now: Date = new Date()): boolean {
  const m = now.getMonth() + 1; // JS is 0-indexed
  const y = now.getFullYear();
  if (year < y) return true;
  if (year > y) return false;
  // Same year:
  return month < m;
}

/**
 * Format card number with spaces. Length-aware.
 *   16-digit: 4-4-4-4
 *   15-digit (Amex): 4-6-5
 *   14-digit (Diners): 4-6-4
 */
export function formatCardNumberDisplay(num: string | null | undefined): string {
  if (!num) return "";
  const clean = num.replace(/\D/g, "");
  if (clean.length === 15) return `${clean.slice(0, 4)} ${clean.slice(4, 10)} ${clean.slice(10)}`;
  if (clean.length === 14) return `${clean.slice(0, 4)} ${clean.slice(4, 10)} ${clean.slice(10)}`;
  return clean.match(/.{1,4}/g)?.join(" ") ?? clean;
}

// ─── ADDED v1.3: ARD Swipe live preview (client-safe) ─────────────────────────
// Mirror of computeArdSwipe() in lib/calculations.ts — no `server-only` import.
// Used by ArdSwipeForm to recalculate as the user types. Server still recomputes
// on save (defense in depth).

export interface ArdSwipeCalcPreview {
  charges: number;
  balanceAmount: number;
  pendingToCustomer: number;
  profit: number;
}

export function computeArdSwipePreview(input: {
  swipeAmount: number;
  percentage: number;
  extraChargesInRs: number;
  sentToCustomer: number;
  ourCharges: number;
}): ArdSwipeCalcPreview {
  const pctCharges = round2Client((input.swipeAmount * input.percentage) / 100);
  const charges = round2Client(pctCharges + input.extraChargesInRs);
  const balanceAmount = round2Client(input.swipeAmount - charges);
  const pendingToCustomer = round2Client(input.sentToCustomer - balanceAmount);
  const profit = round2Client(pctCharges - input.ourCharges);
  return { charges, balanceAmount, pendingToCustomer, profit };
}

// ─── ADDED v1.4 (A1): Bill payment pending — client-safe mirror ─────────────
export interface BillPaymentPendingPreviewInput {
  paidAmount: number;
  charges: number;
  siteCharges: number;
  clearedPhonePe: number;
  clearedWallet: number;
  clearedCash: number;
  alreadyCleared: number;
}

export interface BillPaymentPendingPreviewOutput {
  totalPayable: number;
  clearedTotal: number;
  customerTodayPending: number;
  isCleared: boolean;
}

export function computeBillPaymentPendingPreview(
  input: BillPaymentPendingPreviewInput
): BillPaymentPendingPreviewOutput {
  const totalPayable = round2Client(input.paidAmount + input.charges + input.siteCharges);
  const clearedTotal = round2Client(
    input.clearedPhonePe + input.clearedWallet + input.clearedCash + input.alreadyCleared
  );
  const customerTodayPending = Math.max(round2Client(totalPayable - clearedTotal), 0);
  return {
    totalPayable,
    clearedTotal,
    customerTodayPending,
    isCleared: customerTodayPending <= 0.01,
  };
}

// ─── ADDED v1.4 (A2): Profit preview (client-safe) ───────────────────────────
export function computeProfitPreview(input: {
  charges: number;
  extraSwipedCharges?: number;
  ourCharges?: number;
}): number {
  return round2Client(
    (input.charges ?? 0) + (input.extraSwipedCharges ?? 0) - (input.ourCharges ?? 0)
  );
}
