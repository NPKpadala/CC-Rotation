"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requireRole, canEditFraudAfterSubmit } from "@/lib/rbac";
import { fraudSchema } from "@/lib/validations/transaction.schema";
import { encrypt } from "@/lib/crypto";
import type { ServerActionResult } from "@/types";

function sanitizeCardNumber(raw: string): string {
  return raw.replace(/\D/g, "");
}

export async function createFraud(formData: FormData): Promise<ServerActionResult<{ id: string }>> {
  try {
    const session = await auth();
    requireRole(session, "ADMIN", "EMPLOYEE");

    const photoUrls = formData.getAll("cardPhotoUrls").map((v) => v.toString()).filter(Boolean);

    // ADDED v1.2 — structured card fields (NO CVV)
    const cardFrontPhotoUrl = formData.get("cardFrontPhotoUrl")?.toString() ?? "";
    const cardBackPhotoUrl = formData.get("cardBackPhotoUrl")?.toString() ?? "";
    const cardBankName = formData.get("cardBankName")?.toString() ?? "";
    const cardNumberRaw = sanitizeCardNumber(formData.get("cardNumber")?.toString() ?? "");
    const cardExpiry = formData.get("cardExpiry")?.toString() ?? "";

    let cardNumberEncrypted: string | null = null;
    let cardNumberLast4: string | null = null;
    if (cardNumberRaw.length >= 4 && cardNumberRaw.length <= 16) {
      cardNumberEncrypted = encrypt(cardNumberRaw);
      cardNumberLast4 = cardNumberRaw.slice(-4);
    }

    const raw = {
      mobile: formData.get("mobile")?.toString() ?? "",
      name: formData.get("name")?.toString() ?? "",
      cardDetails: formData.get("cardDetails")?.toString() ?? "",
      cardPhotoUrls: photoUrls,
      remarks: formData.get("remarks")?.toString() ?? "",
    };

    const parsed = fraudSchema.safeParse(raw);
    if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid" };

    const f = await prisma.$transaction(async (db) => {
      const created = await db.fraudCustomer.create({
        data: {
          mobile: parsed.data.mobile,
          name: parsed.data.name || null,
          cardDetails: parsed.data.cardDetails || null,
          cardPhotoUrls: parsed.data.cardPhotoUrls,
          remarks: parsed.data.remarks || null,
          createdById: session.user.id,
          // ADDED v1.2
          cardFrontPhotoUrl: cardFrontPhotoUrl || null,
          cardBackPhotoUrl: cardBackPhotoUrl || null,
          cardBankName: cardBankName || null,
          cardNumberEncrypted,
          cardNumberLast4,
          cardExpiry: cardExpiry || null,
        },
      });
      await db.auditLog.create({
        data: {
          action: "CREATE",
          entityType: "FraudCustomer",
          entityId: created.id,
          description: `Reported fraud for ${parsed.data.mobile}${cardNumberLast4 ? ` (card ••${cardNumberLast4})` : ""}`,
          afterData: { ...created, cardNumberEncrypted: "[REDACTED]" },
          performedById: session.user.id,
        },
      });
      return created;
    });

    revalidatePath("/customers/fraud");
    return { success: true, data: { id: f.id } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed" };
  }
}

export async function updateFraud(id: string, formData: FormData): Promise<ServerActionResult> {
  try {
    const session = await auth();
    requireRole(session, "ADMIN", "EMPLOYEE");

    const before = await prisma.fraudCustomer.findUnique({ where: { id } });
    if (!before) return { success: false, error: "Not found" };

    if (before.isSubmitted && !canEditFraudAfterSubmit(session.user.role)) {
      return { success: false, error: "This fraud entry is locked. Only admins can edit after submission." };
    }

    const photoUrls = formData.getAll("cardPhotoUrls").map((v) => v.toString()).filter(Boolean);

    // ADDED v1.2 — Re-encrypt if a new number is provided
    const newCardRaw = sanitizeCardNumber(formData.get("cardNumber")?.toString() ?? "");
    const newEncrypted =
      newCardRaw && newCardRaw.length >= 4 && newCardRaw.length <= 16 ? encrypt(newCardRaw) : null;
    const newLast4 = newCardRaw && newCardRaw.length >= 4 ? newCardRaw.slice(-4) : null;

    await prisma.$transaction(async (db) => {
      const updated = await db.fraudCustomer.update({
        where: { id },
        data: {
          mobile: formData.get("mobile")?.toString() ?? before.mobile,
          name: formData.get("name")?.toString() || null,
          cardDetails: formData.get("cardDetails")?.toString() || null,
          cardPhotoUrls: photoUrls.length > 0 ? photoUrls : before.cardPhotoUrls,
          remarks: formData.get("remarks")?.toString() || null,
          // ADDED v1.2
          cardFrontPhotoUrl: formData.get("cardFrontPhotoUrl")?.toString() || before.cardFrontPhotoUrl,
          cardBackPhotoUrl: formData.get("cardBackPhotoUrl")?.toString() || before.cardBackPhotoUrl,
          cardBankName: formData.get("cardBankName")?.toString() || before.cardBankName,
          cardNumberEncrypted: newEncrypted ?? before.cardNumberEncrypted,
          cardNumberLast4: newLast4 ?? before.cardNumberLast4,
          cardExpiry: formData.get("cardExpiry")?.toString() || before.cardExpiry,
        },
      });
      await db.auditLog.create({
        data: {
          action: "UPDATE",
          entityType: "FraudCustomer",
          entityId: id,
          description: `Updated fraud entry for ${before.mobile}`,
          beforeData: { ...before, cardNumberEncrypted: "[REDACTED]" },
          afterData: { ...updated, cardNumberEncrypted: "[REDACTED]" },
          performedById: session.user.id,
        },
      });
    });

    revalidatePath("/customers/fraud");
    revalidatePath(`/customers/fraud/${id}`);
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed" };
  }
}

export async function submitFraud(id: string): Promise<ServerActionResult> {
  try {
    const session = await auth();
    requireRole(session, "ADMIN", "EMPLOYEE");

    const before = await prisma.fraudCustomer.findUnique({ where: { id } });
    if (!before) return { success: false, error: "Not found" };
    if (before.isSubmitted) return { success: false, error: "Already submitted" };

    await prisma.$transaction(async (db) => {
      const submitted = await db.fraudCustomer.update({
        where: { id },
        data: { isSubmitted: true, submittedAt: new Date() },
      });
      await db.auditLog.create({
        data: {
          action: "SUBMIT",
          entityType: "FraudCustomer",
          entityId: id,
          description: `Submitted (locked) fraud entry for ${before.mobile}`,
          beforeData: { ...before, cardNumberEncrypted: "[REDACTED]" },
          afterData: { ...submitted, cardNumberEncrypted: "[REDACTED]" },
          performedById: session.user.id,
        },
      });
    });

    revalidatePath("/customers/fraud");
    revalidatePath(`/customers/fraud/${id}`);
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed" };
  }
}

export async function deleteFraud(id: string): Promise<ServerActionResult> {
  try {
    const session = await auth();
    requireRole(session, "ADMIN");

    const before = await prisma.fraudCustomer.findUnique({ where: { id } });
    if (!before) return { success: false, error: "Not found" };

    await prisma.$transaction(async (db) => {
      await db.fraudCustomer.delete({ where: { id } });
      await db.auditLog.create({
        data: {
          action: "DELETE",
          entityType: "FraudCustomer",
          entityId: id,
          description: `Deleted fraud entry for ${before.mobile}`,
          beforeData: { ...before, cardNumberEncrypted: "[REDACTED]" },
          performedById: session.user.id,
        },
      });
    });

    revalidatePath("/customers/fraud");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed" };
  }
}
