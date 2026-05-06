import { round2 } from "./utils";

export interface CalcInput {
  dueAmount: number;
  paidAmount: number;
  swipeAmount: number;
  swipePercentage: number;
}

export interface CalcResult {
  charges: number;
  clearedAmount: number;
  pendingAmount: number;
  extraSwipedAmount: number;
  balanceToCustomer: number;
}

/**
 * Ledger Auto-Calc Engine (Tracking Only).
 * NOT a payment processor. All math runs server-side.
 */
export function computeLedger(i: CalcInput): CalcResult {
  const charges = round2((i.swipeAmount * i.swipePercentage) / 100);
  const clearedAmount = round2(Math.min(i.paidAmount, i.dueAmount));
  const pendingAmount = round2(i.dueAmount - clearedAmount);
  const extraSwipedAmount = round2(Math.max(i.swipeAmount - i.dueAmount, 0));
  const balanceToCustomer = round2(clearedAmount - (i.swipeAmount - charges));
  return { charges, clearedAmount, pendingAmount, extraSwipedAmount, balanceToCustomer };
}

export function canMarkCleared(dueAmount: number, paidAmount: number, swipeAmount: number) {
  return paidAmount + swipeAmount >= dueAmount;
}
