"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { bankSchema, type BankInput } from "@/lib/validations";
import { requireRole } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";

export async function createBank(input: BankInput) {
  const session = await requireRole(["ADMIN"]);
  const data = bankSchema.parse(input);
  const bank = await prisma.$transaction(async (tx) => {
    if (data.isPrimary) {
      await tx.bankAccount.updateMany({ data: { isPrimary: false }, where: { isPrimary: true } });
    }
    return tx.bankAccount.create({
      data: { ...data, ifsc: data.ifsc.toUpperCase(), createdById: session.user.id },
    });
  });
  await logAudit({ action: "CREATE", entityType: "BankAccount", entityId: bank.id, performedBy: session.user.id });
  revalidatePath("/bank");
  return { ok: true as const, id: bank.id };
}

export async function deleteBank(id: string) {
  const session = await requireRole(["ADMIN"]);
  await prisma.bankAccount.delete({ where: { id } });
  await logAudit({ action: "DELETE", entityType: "BankAccount", entityId: id, performedBy: session.user.id });
  revalidatePath("/bank");
  return { ok: true as const };
}

export async function setPrimary(id: string) {
  const session = await requireRole(["ADMIN"]);
  await prisma.$transaction([
    prisma.bankAccount.updateMany({ data: { isPrimary: false }, where: { isPrimary: true } }),
    prisma.bankAccount.update({ where: { id }, data: { isPrimary: true } }),
  ]);
  await logAudit({ action: "SET_PRIMARY", entityType: "BankAccount", entityId: id, performedBy: session.user.id });
  revalidatePath("/bank");
  return { ok: true as const };
}
