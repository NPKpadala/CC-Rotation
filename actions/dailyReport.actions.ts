"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { dailyReportSchema } from "@/lib/validations/transaction.schema";
import { calculateDailyReport, type WalletBreakdown } from "@/lib/calculations";
import type { ServerActionResult } from "@/types";

export async function createDailyReport(formData: FormData): Promise<ServerActionResult<{ id: string }>> {
  try {
    const session = await auth();
    requireRole(session, "ADMIN", "EMPLOYEE");

    const num = (k: string) => parseFloat(formData.get(k)?.toString() ?? "0") || 0;

    const opening: WalletBreakdown = {
      cash: num("opening_cash"),
      phonepay: num("opening_phonepay"),
      pay1: num("opening_pay1"),
      paybijili: num("opening_paybijili"),
      paymama: num("opening_paymama"),
      softpay: num("opening_softpay"),
      roinet: num("opening_roinet"),
      other: num("opening_other"),
    };
    const closing: WalletBreakdown = {
      cash: num("closing_cash"),
      phonepay: num("closing_phonepay"),
      pay1: num("closing_pay1"),
      paybijili: num("closing_paybijili"),
      paymama: num("closing_paymama"),
      softpay: num("closing_softpay"),
      roinet: num("closing_roinet"),
      other: num("closing_other"),
    };

    const raw = {
      transactionDate: formData.get("transactionDate")?.toString() ?? new Date().toISOString(),
      walletOpening: opening,
      walletClosing: closing,
      walletPendings: num("walletPendings"),
      remarks: formData.get("remarks")?.toString() ?? "",
    };

    const parsed = dailyReportSchema.safeParse(raw);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid data" };
    }
    const data = parsed.data;

    const calc = calculateDailyReport(data.walletOpening, data.walletClosing, data.walletPendings);

    const placeholderProfile = await prisma.profile.findFirst();
    if (!placeholderProfile) return { success: false, error: "No profile to attach report — create one first." };

    const tx = await prisma.$transaction(async (db) => {
      const t = await db.transaction.create({
        data: {
          type: "DAILY_REPORT",
          profileId: placeholderProfile.id,
          transactionDate: data.transactionDate,
          customerName: "Daily Report",
          customerMobile: "0000000000",
          percentage: 0,
          charges: 0,
          pendingAmount: 0,
          totalPending: 0,
          afterClearPending: 0,
          walletOpeningJson: JSON.stringify(data.walletOpening),
          walletClosingJson: JSON.stringify(data.walletClosing),
          walletPendings: data.walletPendings,
          walletTotal: calc.total,
          walletDifference: calc.difference,
          status: "CLEARED",
          remarks: data.remarks || null,
          createdById: session.user.id,
        },
      });
      await db.auditLog.create({
        data: {
          action: "CREATE",
          entityType: "Transaction",
          entityId: t.id,
          description: `Daily report for ${new Date(data.transactionDate).toDateString()}`,
          afterData: t as unknown as Record<string, unknown>,
          performedById: session.user.id,
        },
      });
      return t;
    });

    revalidatePath("/transactions/daily-reports");
    return { success: true, data: { id: tx.id } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed" };
  }
}
