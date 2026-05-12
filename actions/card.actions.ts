"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { cardSchema } from "@/lib/validations/card.schema";
import { NETWORK_PERCENTAGES } from "@/lib/calculations";
import { encrypt, tryDecrypt } from "@/lib/crypto";
import type { ServerActionResult } from "@/types";
import type { CardNetwork } from "@prisma/client";

export async function createCard(formData: FormData): Promise<ServerActionResult<{ id: string }>> {
  try {
    const session = await auth();
    requireRole(session, "ADMIN", "EMPLOYEE");

    const raw = {
      profileId: formData.get("profileId")?.toString() ?? "",
      holderName: formData.get("holderName")?.toString() ?? "",
      holderMobile: formData.get("holderMobile")?.toString() ?? "",
      holderAltMobile: formData.get("holderAltMobile")?.toString() ?? "",
      bankName: formData.get("bankName")?.toString() ?? "",
      bankNameOther: formData.get("bankNameOther")?.toString() ?? "", // ADDED v1.2
      cardNetwork: formData.get("cardNetwork")?.toString() ?? "",
      cardType: formData.get("cardType")?.toString() ?? "",
      cardNumber: formData.get("cardNumber")?.toString().replace(/\s/g, "") ?? "",
      cardExpireMonth: formData.get("cardExpireMonth")?.toString() ?? "",
      cardExpireYear: formData.get("cardExpireYear")?.toString() ?? "",
      cvv: formData.get("cvv")?.toString() ?? "",
      aadharFrontUrl: formData.get("aadharFrontUrl")?.toString() ?? "",
      aadharBackUrl: formData.get("aadharBackUrl")?.toString() ?? "",
      panCardUrl: formData.get("panCardUrl")?.toString() ?? "",
      cardFrontUrl: formData.get("cardFrontUrl")?.toString() ?? "",
      cardBackUrl: formData.get("cardBackUrl")?.toString() ?? "",
    };

    const parsed = cardSchema.safeParse(raw);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid card data" };
    }
    const data = parsed.data;

    // ADDED v1.2 — Card length validation per network
    if (data.cardNetwork === "AMERICAN_EXPRESS" && data.cardNumber.length !== 15) {
      return { success: false, error: "American Express cards must be 15 digits." };
    }
    if (data.cardNetwork === "DINERS_CLUB" && data.cardNumber.length !== 14) {
      return { success: false, error: "Diners Club cards must be 14 digits." };
    }
    if (
      data.cardNetwork !== "AMERICAN_EXPRESS" &&
      data.cardNetwork !== "DINERS_CLUB" &&
      data.cardNumber.length !== 16
    ) {
      return { success: false, error: "Card number must be 16 digits for this network." };
    }

    const last4 = data.cardNumber.slice(-4);
    const first6 = data.cardNumber.slice(0, 6); // ADDED v1.2
    const cardNumberHash = await bcrypt.hash(data.cardNumber, 10);
    const cardNumberEncrypted = encrypt(data.cardNumber); // ADDED v1.2 — full PAN at rest
    const cardNumberFull = data.cardNumber; // ADDED v1.3 — plain text for visible display + search
    const cvvHash = data.cvv ? await bcrypt.hash(data.cvv, 10) : null;
    const network = data.cardNetwork as CardNetwork;
    const defaultPct = NETWORK_PERCENTAGES[network] || 3.0;
    const isPrimary = formData.get("isPrimary")?.toString() === "true";

    // If bank is OTHER, require the manual name
    const otherName = (data.bankNameOther ?? "").trim();
    const finalBankName = data.bankName === "OTHER" ? otherName || "OTHER" : data.bankName;

    const card = await prisma.$transaction(async (tx) => {
      if (isPrimary) {
        await tx.card.updateMany({
          where: { profileId: data.profileId, isPrimary: true },
          data: { isPrimary: false },
        });
      }

      const c = await tx.card.create({
        data: {
          profileId: data.profileId,
          holderName: data.holderName,
          holderMobile: data.holderMobile,
          holderAltMobile: data.holderAltMobile || null,
          bankName: finalBankName,
          bankNameOther: data.bankName === "OTHER" ? data.bankNameOther : null,
          cardNetwork: network,
          cardType: data.cardType as "DOMESTIC" | "BUSINESS" | "INTERNATIONAL",
          cardNumberLast4: last4,
          cardNumberFirst6: first6,
          cardNumberHash,
          cardNumberEncrypted, // ADDED v1.2
          cardNumberFull,      // ADDED v1.3
          cardExpireMonth: data.cardExpireMonth,
          cardExpireYear: data.cardExpireYear,
          cvvHash,
          defaultPercentage: defaultPct,
          isPrimary,
          aadharFrontUrl: data.aadharFrontUrl || null,
          aadharBackUrl: data.aadharBackUrl || null,
          panCardUrl: data.panCardUrl || null,
          cardFrontUrl: data.cardFrontUrl || null,
          cardBackUrl: data.cardBackUrl || null,
        },
      });
      await tx.auditLog.create({
        data: {
          action: "CREATE",
          entityType: "Card",
          entityId: c.id,
          description: `Added card ${finalBankName} ****${last4} for profile ${data.profileId}`,
          afterData: {
            ...c,
            cardNumberHash: "[REDACTED]",
            cardNumberEncrypted: "[REDACTED]",
            cvvHash: "[REDACTED]",
          } as Record<string, unknown>,
          performedById: session.user.id,
        },
      });
      return c;
    });

    revalidatePath(`/profiles/${data.profileId}`);
    revalidatePath("/dashboard");
    return { success: true, data: { id: card.id } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to create card" };
  }
}

/**
 * ADDED v1.2 — Get the full decrypted card number for a card.
 * Server action wraps decryption so the encryption key never leaves the server.
 * RBAC enforced: ADMIN or EMPLOYEE only.
 */
export async function getFullCardNumber(cardId: string): Promise<ServerActionResult<{ full: string }>> {
  try {
    const session = await auth();
    requireRole(session, "ADMIN", "EMPLOYEE");
    const card = await prisma.card.findUnique({
      where: { id: cardId },
      select: { cardNumberEncrypted: true, cardNumberLast4: true },
    });
    if (!card) return { success: false, error: "Card not found" };
    if (!card.cardNumberEncrypted) {
      // Legacy card from before v1.2 — only last 4 known
      return { success: true, data: { full: `••••••••••••${card.cardNumberLast4}` } };
    }
    const full = tryDecrypt(card.cardNumberEncrypted);
    if (!full) return { success: false, error: "Failed to decrypt card number" };
    return { success: true, data: { full } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed" };
  }
}

export async function deleteCard(id: string): Promise<ServerActionResult> {
  try {
    const session = await auth();
    requireRole(session, "ADMIN");

    const before = await prisma.card.findUnique({ where: { id } });
    if (!before) return { success: false, error: "Card not found" };

    await prisma.$transaction(async (tx) => {
      await tx.transaction.updateMany({ where: { cardId: id }, data: { cardId: null } });
      await tx.card.delete({ where: { id } });
      await tx.auditLog.create({
        data: {
          action: "DELETE",
          entityType: "Card",
          entityId: id,
          description: `Deleted card ${before.bankName} ****${before.cardNumberLast4}`,
          beforeData: {
            ...before,
            cardNumberHash: "[REDACTED]",
            cardNumberEncrypted: "[REDACTED]",
            cvvHash: "[REDACTED]",
          } as Record<string, unknown>,
          performedById: session.user.id,
        },
      });
    });

    revalidatePath(`/profiles/${before.profileId}`);
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed" };
  }
}

// ─── ADDED v1.3: Update card documents only (Edit Mode on card detail) ────────
// Card number / expiry / network / bank / holder details — all locked.
// Only KYC documents and card photos are editable.
import { cardDocEditSchema } from "@/lib/validations/card.schema";

export async function updateCardDocs(
  cardId: string,
  formData: FormData
): Promise<ServerActionResult<void>> {
  try {
    const session = await auth();
    requireRole(session, "ADMIN", "EMPLOYEE");

    const before = await prisma.card.findUnique({ where: { id: cardId } });
    if (!before) return { success: false, error: "Card not found" };

    const get = (k: string) => formData.get(k)?.toString() ?? "";
    const raw = {
      aadharFrontUrl: get("aadharFrontUrl"),
      aadharBackUrl: get("aadharBackUrl"),
      panCardUrl: get("panCardUrl"),
      localProofUrl: get("localProofUrl"),
      cardFrontUrl: get("cardFrontUrl"),
      cardBackUrl: get("cardBackUrl"),
    };

    const parsed = cardDocEditSchema.safeParse(raw);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid data" };
    }
    const data = parsed.data;

    // Compute changed keys for audit message
    const changed: string[] = [];
    for (const k of Object.keys(data) as Array<keyof typeof data>) {
      const beforeVal = (before as unknown as Record<string, unknown>)[k as string] ?? null;
      const newVal = data[k] || null;
      if (beforeVal !== newVal) changed.push(k as string);
    }

    await prisma.$transaction(async (tx) => {
      const updated = await tx.card.update({
        where: { id: cardId },
        data: {
          aadharFrontUrl: data.aadharFrontUrl || null,
          aadharBackUrl: data.aadharBackUrl || null,
          panCardUrl: data.panCardUrl || null,
          localProofUrl: data.localProofUrl || null,
          cardFrontUrl: data.cardFrontUrl || null,
          cardBackUrl: data.cardBackUrl || null,
        },
      });
      await tx.auditLog.create({
        data: {
          action: "UPDATE",
          entityType: "Card",
          entityId: cardId,
          description: `Edited card ${before.bankName} ••••${before.cardNumberLast4} — updated ${changed.length || 0} doc(s)${changed.length ? `: ${changed.join(", ")}` : ""}`,
          beforeData: {
            ...before,
            cardNumberHash: "[REDACTED]",
            cardNumberEncrypted: "[REDACTED]",
            cvvHash: "[REDACTED]",
          } as Record<string, unknown>,
          afterData: {
            ...updated,
            cardNumberHash: "[REDACTED]",
            cardNumberEncrypted: "[REDACTED]",
            cvvHash: "[REDACTED]",
          } as Record<string, unknown>,
          performedById: session.user.id,
        },
      });
    });

    revalidatePath(`/cards/${cardId}`);
    revalidatePath(`/profiles/${before.profileId}`);
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to update card docs" };
  }
}
