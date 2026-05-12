"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { billPaymentSchema } from "@/lib/validations/transaction.schema";
import {
  calculateBillPayment,
  computeClearedSection,
  computeBillPaymentPending,
  computeProfit,
} from "@/lib/calculations";
import { generateTransactionId } from "@/lib/transactionId";
import type { ServerActionResult } from "@/types";

interface PreviewOutput {
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
  // ADDED v1.2
  clearedTotal: number;
  customerTodayPending: number;
  isCleared: boolean;
}

export async function previewBillPayment(formData: FormData): Promise<ServerActionResult<PreviewOutput>> {
  try {
    const session = await auth();
    requireRole(session, "ADMIN", "EMPLOYEE");

    const out = calculateBillPayment({
      paidAmountRaw: formData.get("paidAmountRaw")?.toString() ?? "",
      swipeAmountRaw: formData.get("swipeAmountRaw")?.toString() ?? "",
      percentage: parseFloat(formData.get("percentage")?.toString() ?? "0"),
      clearedAmount: parseFloat(formData.get("clearedAmount")?.toString() ?? "0"),
      extraSwipedPercent: parseFloat(formData.get("extraSwipedPercent")?.toString() ?? "0"),
      siteCharges: parseFloat(formData.get("siteCharges")?.toString() ?? "0"),
    });

    const cleared = computeClearedSection({
      paidTotal: out.paidAmount,
      swipeTotal: out.swipeAmount,
      clearedPhonePe: parseFloat(formData.get("clearedPhonePe")?.toString() ?? "0") || 0,
      clearedWallet: parseFloat(formData.get("clearedWallet")?.toString() ?? "0") || 0,
      clearedCash: parseFloat(formData.get("clearedCash")?.toString() ?? "0") || 0,
    });

    return {
      success: true,
      data: { ...out, ...cleared },
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Calculation failed" };
  }
}

function readClearedFields(fd: FormData) {
  return {
    clearedPhonePe: parseFloat(fd.get("clearedPhonePe")?.toString() ?? "0") || 0,
    clearedWallet: parseFloat(fd.get("clearedWallet")?.toString() ?? "0") || 0,
    clearedCash: parseFloat(fd.get("clearedCash")?.toString() ?? "0") || 0,
  };
}

export async function createBillPayment(formData: FormData): Promise<ServerActionResult<{ id: string; transactionId: string | null; isCleared: boolean }>> {
  try {
    const session = await auth();
    requireRole(session, "ADMIN", "EMPLOYEE");

    const raw = {
      profileId: formData.get("profileId")?.toString() ?? "",
      cardId: formData.get("cardId")?.toString() || undefined,
      transactionDate: formData.get("transactionDate")?.toString() ?? new Date().toISOString(),
      customerName: formData.get("customerName")?.toString() ?? "",
      customerMobile: formData.get("customerMobile")?.toString() ?? "",
      dueAmount: parseFloat(formData.get("dueAmount")?.toString() ?? "0"),
      paidAmountRaw: formData.get("paidAmountRaw")?.toString() ?? "",
      paymentGateway: formData.get("paymentGateway")?.toString() ?? "",
      swipeAmountRaw: formData.get("swipeAmountRaw")?.toString() ?? "",
      swipeGateway: formData.get("swipeGateway")?.toString() ?? "",
      swipeDate: formData.get("swipeDate")?.toString() || undefined,
      paymentSite: formData.get("paymentSite")?.toString() ?? "",
      swipeSite: formData.get("swipeSite")?.toString() ?? "",
      cardNameUsed: formData.get("cardNameUsed")?.toString() ?? "",
      percentage: parseFloat(formData.get("percentage")?.toString() ?? "0"),
      clearedAmount: parseFloat(formData.get("clearedAmount")?.toString() ?? "0"),
      extraSwipedPercent: parseFloat(formData.get("extraSwipedPercent")?.toString() ?? "0"),
      siteCharges: parseFloat(formData.get("siteCharges")?.toString() ?? "0"),
      pendingHeldBy: formData.get("pendingHeldBy")?.toString() ?? "",
      chargesSentType: formData.get("chargesSentType")?.toString() || undefined,
      remarks: formData.get("remarks")?.toString() ?? "",
    };

    const parsed = billPaymentSchema.safeParse(raw);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid data" };
    }
    const data = parsed.data;

    // Server-side calc — NEVER trust client values
    const calc = calculateBillPayment({
      paidAmountRaw: data.paidAmountRaw,
      swipeAmountRaw: data.swipeAmountRaw || "",
      percentage: data.percentage,
      clearedAmount: data.clearedAmount,
      extraSwipedPercent: data.extraSwipedPercent,
      siteCharges: data.siteCharges,
    });

    // v1.4 (A1): Use the CORRECT bill-payment pending formula.
    // (Old v1.2 computeClearedSection had swipe-recovery math which is wrong here.)
    const clearedFields = readClearedFields(formData);
    const pending = computeBillPaymentPending({
      paidAmount: calc.paidAmount,
      charges: calc.charges,
      siteCharges: data.siteCharges,
      clearedPhonePe: clearedFields.clearedPhonePe,
      clearedWallet: clearedFields.clearedWallet,
      clearedCash: clearedFields.clearedCash,
      alreadyCleared: data.clearedAmount,
    });

    // v1.4 (A2): Profit = Charges + ExtraSwipedCharges − OurCharges (siteCharges NOT subtracted)
    const profit = computeProfit({
      charges: calc.charges,
      extraSwipedCharges: calc.extraSwipedCharges,
      ourCharges: 0, // bill payments don't have ourCharges
    });

    const isPending = !pending.isCleared;

    const tx = await prisma.$transaction(async (db) => {
      // v1.4 (A3): Generate human-readable transaction ID atomically
      const transactionId = await generateTransactionId(db, data.transactionDate);

      const t = await db.transaction.create({
        data: {
          transactionId, // v1.4 (A3)
          type: "BILL_PAYMENT",
          profileId: data.profileId,
          cardId: data.cardId || null,
          transactionDate: data.transactionDate,
          customerName: data.customerName,
          customerMobile: data.customerMobile,
          dueAmount: data.dueAmount,
          paidAmountRaw: data.paidAmountRaw,
          paidAmount: calc.paidAmount,
          paymentGateway: data.paymentGateway,
          swipeAmountRaw: data.swipeAmountRaw || null,
          swipeAmount: calc.swipeAmount,
          swipeGateway: data.swipeGateway || null,
          swipeDate: data.swipeDate ?? null,
          paymentSite: data.paymentSite || null,
          swipeSite: data.swipeSite || null,
          cardNameUsed: data.cardNameUsed || null,
          percentage: data.percentage,
          charges: calc.charges,
          pendingAmount: calc.pendingAmount,
          totalPending: calc.totalPending,
          clearedAmount: data.clearedAmount,
          afterClearPending: calc.afterClearPending,
          extraSwiped: calc.extraSwiped,
          extraSwipedPercent: data.extraSwipedPercent,
          extraSwipedCharges: calc.extraSwipedCharges,
          balanceToCustomer: calc.balanceToCustomer,
          siteCharges: data.siteCharges,
          profit, // v1.4 (A2) — corrected formula

          clearedPhonePe: clearedFields.clearedPhonePe,
          clearedWallet: clearedFields.clearedWallet,
          clearedCash: clearedFields.clearedCash,
          clearedTotal: pending.clearedTotal, // v1.4 — includes alreadyCleared
          customerTodayPending: pending.customerTodayPending, // v1.4 (A1) corrected

          status: isPending ? "PENDING" : "CLEARED",
          customerConduct: isPending ? "PENDING" : "GOOD",
          pendingHeldBy: data.pendingHeldBy || null,
          chargesSentType: data.chargesSentType ?? null,
          remarks: data.remarks || null,
          createdById: session.user.id,
        },
      });

      await db.auditLog.create({
        data: {
          action: "CREATE",
          entityType: "Transaction",
          entityId: t.id,
          description: `Bill payment ₹${calc.paidAmount} for ${data.customerName} — ${isPending ? "PENDING" : "CLEARED"}`,
          afterData: t as unknown as Record<string, unknown>,
          performedById: session.user.id,
        },
      });

      return t;
    });

    revalidatePath("/transactions/payments");
    revalidatePath("/dashboard");
    revalidatePath("/reports/pending");
    revalidatePath(`/profiles/${data.profileId}`);
    return { success: true, data: { id: tx.id, transactionId: tx.transactionId, isCleared: !isPending } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to create payment" };
  }
}

/**
 * ADDED v1.2 — Edit a bill payment.
 * Employees: only allowed if transaction is PENDING.
 * Admins: can edit anything (including CLEARED), audit-logged.
 */
export async function updateBillPayment(
  id: string,
  formData: FormData
): Promise<ServerActionResult<{ id: string; isCleared: boolean }>> {
  try {
    const session = await auth();
    requireRole(session, "ADMIN", "EMPLOYEE");

    const before = await prisma.transaction.findUnique({ where: { id } });
    if (!before) return { success: false, error: "Transaction not found" };
    if (before.type !== "BILL_PAYMENT") return { success: false, error: "Not a bill payment" };

    // ADDED v1.2 — RBAC: only admins can edit cleared transactions
    if (before.status === "CLEARED" && session.user.role !== "ADMIN") {
      return {
        success: false,
        error: "This transaction is locked. Only admins can edit cleared transactions.",
      };
    }

    const raw = {
      profileId: formData.get("profileId")?.toString() ?? before.profileId,
      cardId: formData.get("cardId")?.toString() || undefined,
      transactionDate: formData.get("transactionDate")?.toString() ?? before.transactionDate.toISOString(),
      customerName: formData.get("customerName")?.toString() ?? before.customerName,
      customerMobile: formData.get("customerMobile")?.toString() ?? before.customerMobile,
      dueAmount: parseFloat(formData.get("dueAmount")?.toString() ?? "0"),
      paidAmountRaw: formData.get("paidAmountRaw")?.toString() ?? "",
      paymentGateway: formData.get("paymentGateway")?.toString() ?? "",
      swipeAmountRaw: formData.get("swipeAmountRaw")?.toString() ?? "",
      swipeGateway: formData.get("swipeGateway")?.toString() ?? "",
      swipeDate: formData.get("swipeDate")?.toString() || undefined,
      paymentSite: formData.get("paymentSite")?.toString() ?? "",
      swipeSite: formData.get("swipeSite")?.toString() ?? "",
      cardNameUsed: formData.get("cardNameUsed")?.toString() ?? "",
      percentage: parseFloat(formData.get("percentage")?.toString() ?? "0"),
      clearedAmount: parseFloat(formData.get("clearedAmount")?.toString() ?? "0"),
      extraSwipedPercent: parseFloat(formData.get("extraSwipedPercent")?.toString() ?? "0"),
      siteCharges: parseFloat(formData.get("siteCharges")?.toString() ?? "0"),
      pendingHeldBy: formData.get("pendingHeldBy")?.toString() ?? "",
      chargesSentType: formData.get("chargesSentType")?.toString() || undefined,
      remarks: formData.get("remarks")?.toString() ?? "",
    };

    const parsed = billPaymentSchema.safeParse(raw);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid data" };
    }
    const data = parsed.data;

    const calc = calculateBillPayment({
      paidAmountRaw: data.paidAmountRaw,
      swipeAmountRaw: data.swipeAmountRaw || "",
      percentage: data.percentage,
      clearedAmount: data.clearedAmount,
      extraSwipedPercent: data.extraSwipedPercent,
      siteCharges: data.siteCharges,
    });

    const clearedFields = readClearedFields(formData);
    // v1.4 (A1): Correct bill-payment pending
    const pending = computeBillPaymentPending({
      paidAmount: calc.paidAmount,
      charges: calc.charges,
      siteCharges: data.siteCharges,
      clearedPhonePe: clearedFields.clearedPhonePe,
      clearedWallet: clearedFields.clearedWallet,
      clearedCash: clearedFields.clearedCash,
      alreadyCleared: data.clearedAmount,
    });
    // v1.4 (A2): Profit formula
    const profit = computeProfit({
      charges: calc.charges,
      extraSwipedCharges: calc.extraSwipedCharges,
      ourCharges: 0,
    });

    const isPending = !pending.isCleared;

    const updated = await prisma.$transaction(async (db) => {
      const t = await db.transaction.update({
        where: { id },
        data: {
          profileId: data.profileId,
          cardId: data.cardId || null,
          transactionDate: data.transactionDate,
          customerName: data.customerName,
          customerMobile: data.customerMobile,
          dueAmount: data.dueAmount,
          paidAmountRaw: data.paidAmountRaw,
          paidAmount: calc.paidAmount,
          paymentGateway: data.paymentGateway,
          swipeAmountRaw: data.swipeAmountRaw || null,
          swipeAmount: calc.swipeAmount,
          swipeGateway: data.swipeGateway || null,
          swipeDate: data.swipeDate ?? null,
          paymentSite: data.paymentSite || null,
          swipeSite: data.swipeSite || null,
          cardNameUsed: data.cardNameUsed || null,
          percentage: data.percentage,
          charges: calc.charges,
          pendingAmount: calc.pendingAmount,
          totalPending: calc.totalPending,
          clearedAmount: data.clearedAmount,
          afterClearPending: calc.afterClearPending,
          extraSwiped: calc.extraSwiped,
          extraSwipedPercent: data.extraSwipedPercent,
          extraSwipedCharges: calc.extraSwipedCharges,
          balanceToCustomer: calc.balanceToCustomer,
          siteCharges: data.siteCharges,
          profit, // v1.4
          clearedPhonePe: clearedFields.clearedPhonePe,
          clearedWallet: clearedFields.clearedWallet,
          clearedCash: clearedFields.clearedCash,
          clearedTotal: pending.clearedTotal,
          customerTodayPending: pending.customerTodayPending, // v1.4 (A1)
          status: isPending ? "PENDING" : "CLEARED",
          customerConduct: isPending ? "PENDING" : "GOOD",
          pendingHeldBy: data.pendingHeldBy || null,
          chargesSentType: data.chargesSentType ?? null,
          remarks: data.remarks || null,
        },
      });

      await db.auditLog.create({
        data: {
          action: "UPDATE",
          entityType: "Transaction",
          entityId: id,
          description: `Edited bill payment for ${data.customerName} (was ${before.status} → ${isPending ? "PENDING" : "CLEARED"})`,
          beforeData: before as unknown as Record<string, unknown>,
          afterData: t as unknown as Record<string, unknown>,
          performedById: session.user.id,
        },
      });

      return t;
    });

    revalidatePath("/transactions/payments");
    revalidatePath("/dashboard");
    revalidatePath("/reports/pending");
    revalidatePath(`/profiles/${data.profileId}`);
    return { success: true, data: { id: updated.id, isCleared: !isPending } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to update" };
  }
}

export async function clearPendingBalance(transactionId: string, additionalCleared: number): Promise<ServerActionResult> {
  try {
    const session = await auth();
    requireRole(session, "ADMIN", "EMPLOYEE");

    const before = await prisma.transaction.findUnique({ where: { id: transactionId } });
    if (!before) return { success: false, error: "Transaction not found" };
    if (before.type !== "BILL_PAYMENT") return { success: false, error: "Not a bill payment" };

    const newCleared = Number(before.clearedAmount) + additionalCleared;
    const newAfter = Number(before.totalPending) - newCleared;
    const isPending = newAfter > 0.01;

    await prisma.$transaction(async (db) => {
      const t = await db.transaction.update({
        where: { id: transactionId },
        data: {
          clearedAmount: newCleared,
          afterClearPending: newAfter > 0 ? newAfter : 0,
          status: isPending ? "PENDING" : "CLEARED",
          customerConduct: isPending ? "PENDING" : "GOOD",
        },
      });
      await db.auditLog.create({
        data: {
          action: "UPDATE",
          entityType: "Transaction",
          entityId: t.id,
          description: `Cleared ₹${additionalCleared} for ${before.customerName}`,
          beforeData: before as unknown as Record<string, unknown>,
          afterData: t as unknown as Record<string, unknown>,
          performedById: session.user.id,
        },
      });
    });

    revalidatePath("/transactions/payments");
    revalidatePath("/reports/pending");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed" };
  }
}

export async function deleteBillPayment(id: string): Promise<ServerActionResult> {
  try {
    const session = await auth();
    requireRole(session, "ADMIN");

    const before = await prisma.transaction.findUnique({ where: { id } });
    if (!before) return { success: false, error: "Transaction not found" };
    if (before.deletedAt) return { success: false, error: "Already deleted" };

    await prisma.$transaction(async (db) => {
      // v1.4 (D1): Soft delete — mark deletedAt + deletedById
      await db.transaction.update({
        where: { id },
        data: { deletedAt: new Date(), deletedById: session.user.id },
      });
      await db.auditLog.create({
        data: {
          action: "DELETE",
          entityType: "Transaction",
          entityId: id,
          description: `Soft-deleted bill payment ${before.transactionId ?? id} for ${before.customerName}`,
          beforeData: before as unknown as Record<string, unknown>,
          performedById: session.user.id,
        },
      });
    });

    revalidatePath("/transactions/payments");
    revalidatePath("/dashboard");
    revalidatePath("/reports/pending");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed" };
  }
}

// ─── ADDED v1.4 (D1): Restore from trash ──────────────────────────────────────
export async function restoreTransaction(id: string): Promise<ServerActionResult> {
  try {
    const session = await auth();
    requireRole(session, "ADMIN");

    const before = await prisma.transaction.findUnique({ where: { id } });
    if (!before) return { success: false, error: "Transaction not found" };
    if (!before.deletedAt) return { success: false, error: "Not deleted" };

    await prisma.$transaction(async (db) => {
      await db.transaction.update({
        where: { id },
        data: { deletedAt: null, deletedById: null },
      });
      await db.auditLog.create({
        data: {
          action: "UPDATE",
          entityType: "Transaction",
          entityId: id,
          description: `Restored ${before.transactionId ?? id} from trash`,
          beforeData: before as unknown as Record<string, unknown>,
          performedById: session.user.id,
        },
      });
    });

    revalidatePath("/transactions/payments");
    revalidatePath("/transactions/swiping");
    revalidatePath("/admin/trash");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to restore" };
  }
}

// ─── ADDED v1.4 (D1): Permanent delete from trash (admin, requires confirm id) ─
export async function permanentDeleteTransaction(
  id: string,
  confirmId: string
): Promise<ServerActionResult> {
  try {
    const session = await auth();
    requireRole(session, "ADMIN");

    const before = await prisma.transaction.findUnique({ where: { id } });
    if (!before) return { success: false, error: "Transaction not found" };
    if (!before.deletedAt)
      return { success: false, error: "Must be soft-deleted first" };
    if (confirmId !== id && confirmId !== (before.transactionId ?? ""))
      return {
        success: false,
        error: "Confirmation ID does not match. Type the transaction id exactly.",
      };

    await prisma.$transaction(async (db) => {
      await db.auditLog.create({
        data: {
          action: "DELETE",
          entityType: "Transaction",
          entityId: id,
          description: `Permanently deleted ${before.transactionId ?? id}`,
          beforeData: before as unknown as Record<string, unknown>,
          performedById: session.user.id,
        },
      });
      await db.transaction.delete({ where: { id } });
    });

    revalidatePath("/admin/trash");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed" };
  }
}
