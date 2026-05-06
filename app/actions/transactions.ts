"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { transactionSchema, type TransactionInput } from "@/lib/validations";
import { requireSession } from "@/lib/rbac";
import { computeLedger, canMarkCleared } from "@/lib/calculations";
import { logAudit } from "@/lib/audit";
import { maskCard } from "@/lib/utils";

export async function createTransaction(input: TransactionInput) {
  const session = await requireSession();
  const data = transactionSchema.parse(input);

  if (data.status === "CLEARED" && !canMarkCleared(data.dueAmount, data.paidAmount, data.swipeAmount)) {
    throw new Error("Cannot mark CLEARED: paid + swipe < due");
  }

  const calc = computeLedger({
    dueAmount: data.dueAmount,
    paidAmount: data.paidAmount,
    swipeAmount: data.swipeAmount,
    swipePercentage: data.swipePercentage,
  });

  const txn = await prisma.$transaction(async (tx) => {
    const profile = await tx.profile.findUnique({ where: { id: data.profileId } });
    if (!profile) throw new Error("Profile not found");

    const created = await tx.transaction.create({
      data: {
        profileId: data.profileId,
        date: data.date,
        dueAmount: data.dueAmount,
        paidAmount: data.paidAmount,
        swipeAmount: data.swipeAmount,
        splitPayments: data.splitPayments as any,
        swipePercentage: data.swipePercentage,
        charges: calc.charges,
        clearedAmount: calc.clearedAmount,
        pendingAmount: calc.pendingAmount,
        extraSwipedAmount: calc.extraSwipedAmount,
        balanceToCustomer: calc.balanceToCustomer,
        cardName: data.cardName,
        cardType: data.cardType,
        cardNumber: maskCard(data.cardNumber),
        paymentSite: data.paymentSite,
        swipeSite: data.swipeSite,
        swipeDate: data.swipeDate,
        remarks: data.remarks,
        status: data.status,
        bankAccountId: data.bankAccountId || null,
        createdById: session.user.id,
      },
    });

    await tx.auditLog.create({
      data: {
        action: "CREATE",
        entityType: "Transaction",
        entityId: created.id,
        performedBy: session.user.id,
        meta: { calc, profileId: data.profileId } as any,
      },
    });

    return created;
  });

  revalidatePath("/transactions");
  revalidatePath(`/users/${data.profileId}`);
  revalidatePath("/dashboard");
  return { ok: true as const, id: txn.id, calc };
}

export async function deleteTransaction(id: string) {
  const session = await requireSession();
  if (session.user.role !== "ADMIN") throw new Error("FORBIDDEN");
  await prisma.transaction.delete({ where: { id } });
  await logAudit({ action: "DELETE", entityType: "Transaction", entityId: id, performedBy: session.user.id });
  revalidatePath("/transactions");
  return { ok: true as const };
}

export async function previewCalc(input: { dueAmount: number; paidAmount: number; swipeAmount: number; swipePercentage: number }) {
  await requireSession();
  return computeLedger(input);
}
