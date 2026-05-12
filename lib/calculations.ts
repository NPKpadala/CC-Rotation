/**
 * lib/calculations.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * THE FINANCIAL ENGINE OF THE APPLICATION.
 *
 * RULES:
 *  • Pure functions. No I/O. No Prisma. No DB calls.
 *  • Imported ONLY by server actions. NEVER by client components.
 *  • All math rounded to 2 decimal places.
 *  • All inputs validated upstream by Zod, but defensive checks here too.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import "server-only";
import { CardNetwork } from "@prisma/client";

// ─── Network defaults ────────────────────────────────────────────────────────

export const NETWORK_PERCENTAGES: Record<CardNetwork, number> = {
  VISA: 2.5,
  RUPAY: 3.0,
  MASTERCARD: 3.0,
  HDFC_RUPAY: 3.5,
  HDFC_MASTER: 3.5,
  DINERS_CLUB: 3.5,
  AMERICAN_EXPRESS: 4.0,
  OTHER: 0,
};

// ─── Utilities ───────────────────────────────────────────────────────────────

export function round2(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

/**
 * Parse a "split amount" string like "50000+50000+25000" into a number.
 * Throws on invalid format.
 */
export function parseSplitAmount(raw: string | null | undefined): number {
  if (!raw || raw.trim() === "") return 0;
  const cleaned = raw.trim();
  const parts = cleaned.split("+").map((p) => p.trim());
  if (parts.some((p) => !/^\d+$/.test(p))) {
    throw new Error(`Invalid split amount format: "${raw}". Use digits separated by +, e.g. 50000+50000`);
  }
  const sum = parts.reduce((acc, p) => acc + parseInt(p, 10), 0);
  return round2(sum);
}

// ─── BILL PAYMENT ────────────────────────────────────────────────────────────

export interface BillPaymentCalcInput {
  paidAmountRaw: string;
  swipeAmountRaw: string;
  percentage: number;
  clearedAmount: number;
  extraSwipedPercent: number;
  siteCharges: number;
}

export interface BillPaymentCalcOutput {
  paidAmount: number;
  swipeAmount: number;
  charges: number;
  pendingAmount: number;
  totalPending: number;
  afterClearPending: number;
  extraSwiped: number;
  extraSwipedCharges: number;
  balanceToCustomer: number;
  profit: number;
}

export function calculateBillPayment(input: BillPaymentCalcInput): BillPaymentCalcOutput {
  const paidAmount = parseSplitAmount(input.paidAmountRaw);
  const swipeAmount = parseSplitAmount(input.swipeAmountRaw);

  if (paidAmount <= 0) {
    throw new Error("Paid amount must be greater than 0");
  }
  if (input.percentage <= 0) {
    throw new Error("Percentage must be greater than 0");
  }

  const charges = round2((paidAmount * input.percentage) / 100);
  const pendingAmount = round2(paidAmount - swipeAmount);
  const totalPending = round2(pendingAmount + charges);
  const afterClearPending = round2(totalPending - input.clearedAmount);
  const extraSwiped = swipeAmount > paidAmount ? round2(swipeAmount - paidAmount) : 0;
  const extraSwipedCharges = round2((extraSwiped * input.extraSwipedPercent) / 100);
  const balanceToCustomer = round2(extraSwiped - afterClearPending - extraSwipedCharges);
  const profit = round2(charges - input.siteCharges);

  return {
    paidAmount,
    swipeAmount,
    charges,
    pendingAmount,
    totalPending,
    afterClearPending,
    extraSwiped,
    extraSwipedCharges,
    balanceToCustomer,
    profit,
  };
}

// ─── SWIPING ─────────────────────────────────────────────────────────────────

export interface SwipeCalcInput {
  swipeAmount: number;
  cardNetwork: CardNetwork;
  manualPercentage?: number;
  sentToCustomer: number;
}

export interface SwipeCalcOutput {
  percentage: number;
  charges: number;
  netToCustomer: number;
  pendingToCustomer: number;
}

export function calculateSwiping(input: SwipeCalcInput): SwipeCalcOutput {
  const networkDefault = NETWORK_PERCENTAGES[input.cardNetwork];
  const percentage =
    input.manualPercentage !== undefined && input.manualPercentage > 0
      ? input.manualPercentage
      : networkDefault;

  if (percentage <= 0) {
    throw new Error(`Percentage required for network ${input.cardNetwork}`);
  }
  if (input.swipeAmount <= 0) {
    throw new Error("Swipe amount must be greater than 0");
  }

  const charges = round2((input.swipeAmount * percentage) / 100);
  const netToCustomer = round2(input.swipeAmount - charges);
  const pendingToCustomer = round2(netToCustomer - input.sentToCustomer);

  return { percentage, charges, netToCustomer, pendingToCustomer };
}

// ─── DAILY REPORT ────────────────────────────────────────────────────────────

export interface WalletBreakdown {
  cash: number;
  phonepay: number;
  pay1: number;
  paybijili: number;
  paymama: number;
  softpay: number;
  roinet: number;
  other: number;
}

export const EMPTY_WALLET: WalletBreakdown = {
  cash: 0,
  phonepay: 0,
  pay1: 0,
  paybijili: 0,
  paymama: 0,
  softpay: 0,
  roinet: 0,
  other: 0,
};

export function sumWallet(w: WalletBreakdown): number {
  return round2(
    w.cash + w.phonepay + w.pay1 + w.paybijili + w.paymama + w.softpay + w.roinet + w.other
  );
}

export interface DailyReportCalcOutput {
  openingTotal: number;
  closingTotal: number;
  total: number;
  difference: number;
}

export function calculateDailyReport(
  opening: WalletBreakdown,
  closing: WalletBreakdown,
  pendings: number
): DailyReportCalcOutput {
  const openingTotal = sumWallet(opening);
  const closingTotal = sumWallet(closing);
  const total = round2(closingTotal + pendings);
  const difference = round2(openingTotal - closingTotal);
  return { openingTotal, closingTotal, total, difference };
}

// ─── BIDIRECTIONAL SYNC ──────────────────────────────────────────────────────

export function percentageFromCharges(charges: number, paidAmount: number): number {
  if (paidAmount <= 0) return 0;
  return round2((charges / paidAmount) * 100);
}

export function chargesFromPercentage(percentage: number, paidAmount: number): number {
  return round2((paidAmount * percentage) / 100);
}

// ─── ADDED v1.2: Cleared section + dynamic save state ─────────────────────────
// Re-export client-safe helpers so server actions can use the same formulas

export {
  calculateSplitTotal,
  calculatePendingAfterPayment,
  customerTodayPending,
  isTransactionCleared,
  reversePercentage,
  detectCardNetwork,
  expectedCardLength,
  isCardExpired,
  formatCardNumberDisplay,
} from "./calc-shared";

/**
 * Recompute cleared totals on the server (defense in depth — never trust client).
 *
 * ⚠ DEPRECATED in v1.4 for bill payments: this used the swipe-recovery formula
 *   customerTodayPending = max((paidAmount − swipeAmount) − clearedTotal, 0)
 * which is wrong for bill payments. Use `computeBillPaymentPending()` below instead.
 * Kept for backward-compat with any caller still depending on the old shape.
 */
export function computeClearedSection(opts: {
  paidTotal: number;
  swipeTotal: number;
  clearedPhonePe: number;
  clearedWallet: number;
  clearedCash: number;
}): {
  clearedTotal: number;
  customerTodayPending: number;
  isCleared: boolean;
} {
  const clearedTotal = round2(opts.clearedPhonePe + opts.clearedWallet + opts.clearedCash);
  const remaining = round2(opts.paidTotal - opts.swipeTotal);
  const today = Math.max(round2(remaining - clearedTotal), 0);
  return {
    clearedTotal,
    customerTodayPending: today,
    isCleared: today <= 0.01,
  };
}

// ─── ADDED v1.4 (A1): Correct bill-payment pending formula ──────────────────
// Old v1.2/v1.3 formula was wrong (used swipe-recovery math). Corrected formula:
//   totalPayable          = paidAmount + charges + siteCharges
//   customerTodayPending  = max(totalPayable − clearedTotal, 0)
//   isCleared             = customerTodayPending <= 0.01

export interface BillPaymentPendingInput {
  paidAmount: number;
  charges: number;
  siteCharges: number;
  clearedPhonePe: number;
  clearedWallet: number;
  clearedCash: number;
  alreadyCleared: number; // legacy "Already Cleared" field on the form (pre-tx settlement)
}

export interface BillPaymentPendingOutput {
  totalPayable: number;
  clearedTotal: number;
  customerTodayPending: number;
  isCleared: boolean;
}

export function computeBillPaymentPending(input: BillPaymentPendingInput): BillPaymentPendingOutput {
  const totalPayable = round2(input.paidAmount + input.charges + input.siteCharges);
  const clearedTotal = round2(
    input.clearedPhonePe + input.clearedWallet + input.clearedCash + input.alreadyCleared
  );
  const customerTodayPending = Math.max(round2(totalPayable - clearedTotal), 0);
  return {
    totalPayable,
    clearedTotal,
    customerTodayPending,
    isCleared: customerTodayPending <= 0.01,
  };
}

// ─── ADDED v1.4 (A2): First-class profit formula ─────────────────────────────
// Per user instruction:
//   Profit = Charges + Extra Swiped Charges − Our Charges
// NOTE: siteCharges intentionally NOT subtracted (per user's explicit correction).
//
// extraSwipedCharges applies to bill payments (legacy field)
// ourCharges applies to swipes (ardOurCharges) — for bill payments, pass 0

export function computeProfit(input: {
  charges: number;
  extraSwipedCharges?: number;
  ourCharges?: number;
}): number {
  return round2(
    (input.charges ?? 0) + (input.extraSwipedCharges ?? 0) - (input.ourCharges ?? 0)
  );
}

// ─── ADDED v1.3: ARD Swipe sheet calculations ────────────────────────────────
// Matches the May Swiping Sheet 2026 column formulas.

export interface ArdSwipeCalcInput {
  swipeAmount: number;
  percentage: number;
  extraChargesInRs: number;
  sentToCustomer: number;
  ourCharges: number;
}

export interface ArdSwipeCalcOutput {
  charges: number;          // (swipeAmount × %) + extraCharges
  balanceAmount: number;    // swipeAmount − charges
  pendingToCustomer: number;// sentToCustomer − balanceAmount  (NEGATIVE = we owe customer)
  profit: number;           // (swipeAmount × %) − ourCharges
}

/**
 * Server-authoritative ARD Swipe calculation.
 *
 * Worked example (row 1 of May Swiping Sheet 2026):
 *   swipe=25003, %=2.5, extra=25, sent=24377, ourCharges=427
 *   charges = (25003 × 2.5%) + 25 = 625.075 + 25 = 650.075   (% portion alone = 625.075)
 *   balance = 25003 − 650.075 = 24352.925
 *   pending = 24377 − 24352.925 = 24.075   (positive = customer overpaid us → we owe them)
 *   profit  = 625.075 − 427 = 198.075
 *
 * Note on signs:
 *   pendingToCustomer > 0 → we owe the customer (they got less than they should have, OR sent us more)
 *   pendingToCustomer < 0 → customer owes us
 * Per the user's spreadsheet convention, "PENDING TO CUSTOMER" = sentToCustomer − balance.
 * In their row 1 it shows −24.075 because sentToCustomer (24377) > balance (24352.925) → vendor sent
 *   24.075 extra → vendor is "owed back" 24.075 by customer → showing as negative.
 * We preserve the literal sheet formula: pending = sent − balance.
 */
export function computeArdSwipe(input: ArdSwipeCalcInput): ArdSwipeCalcOutput {
  const pctCharges = round2((input.swipeAmount * input.percentage) / 100);
  const charges = round2(pctCharges + input.extraChargesInRs);
  const balanceAmount = round2(input.swipeAmount - charges);
  const pendingToCustomer = round2(input.sentToCustomer - balanceAmount);
  // v1.4 (A2): Profit = Charges (% portion) + Extra Charges − Our Charges
  // Note: "charges" already includes extraCharges, so we use pctCharges + extra (= charges) − ourCharges.
  const profit = round2(charges - input.ourCharges);
  return { charges, balanceAmount, pendingToCustomer, profit };
}

