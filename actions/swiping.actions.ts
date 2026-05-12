"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { swipingSchema } from "@/lib/validations/transaction.schema";
import { calculateSwiping } from "@/lib/calculations";
import type { ServerActionResult } from "@/types";

export async function createSwipe(formData: FormData): Promise<ServerActionResult<{ id: string }>> {
  try {
    const session = await auth();
    requireRole(session, "ADMIN", "EMPLOYEE");

    // ADDED v1.2 — Swipe source SAME or OTHER
    const swipedCardSource = (formData.get("swipedCardSource")?.toString() ?? "SAME").toUpperCase();
    let cardId = formData.get("cardId")?.toString() ?? "";
    let otherCardJson: string | null = null;

    if (swipedCardSource === "OTHER") {
      const otherDetails = {
        bankName: formData.get("otherBankName")?.toString() ?? "",
        cardNetwork: formData.get("otherCardNetwork")?.toString() ?? "",
        cardNumberLast4: formData.get("otherCardNumber")?.toString().slice(-4) ?? "",
        cardExpireMonth: formData.get("otherCardExpireMonth")?.toString() ?? "",
        cardExpireYear: formData.get("otherCardExpireYear")?.toString() ?? "",
      };
      if (!otherDetails.bankName || !otherDetails.cardNetwork || otherDetails.cardNumberLast4.length !== 4) {
        return { success: false, error: "Please fill in OTHER card details (bank, network, card number)" };
      }
      otherCardJson = JSON.stringify(otherDetails);
      // For OTHER swipes we don't link a real card row — store snapshot only
      cardId = "";
    }

    const raw = {
      profileId: formData.get("profileId")?.toString() ?? "",
      cardId: cardId || (swipedCardSource === "SAME" ? cardId : "PLACEHOLDER"),
      transactionDate: formData.get("transactionDate")?.toString() ?? new Date().toISOString(),
      customerName: formData.get("customerName")?.toString() ?? "",
      customerMobile: formData.get("customerMobile")?.toString() ?? "",
      swipeAmount: parseFloat(formData.get("swipeAmount")?.toString() ?? "0"),
      manualPercentage: formData.get("manualPercentage")
        ? parseFloat(formData.get("manualPercentage")!.toString())
        : undefined,
      sentToCustomer: parseFloat(formData.get("sentToCustomer")?.toString() ?? "0"),
      remarks: formData.get("remarks")?.toString() ?? "",
    };

    // For OTHER, skip card-id validation by not running through full schema
    let parsedData;
    if (swipedCardSource === "OTHER") {
      // Manual minimal validation
      if (!raw.profileId || raw.swipeAmount <= 0) {
        return { success: false, error: "Profile and swipe amount are required" };
      }
      parsedData = raw;
    } else {
      const parsed = swipingSchema.safeParse(raw);
      if (!parsed.success) {
        return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid data" };
      }
      parsedData = parsed.data;
    }

    let cardForCalc: { cardNetwork: "VISA" | "RUPAY" | "MASTERCARD" | "HDFC_RUPAY" | "HDFC_MASTER" | "DINERS_CLUB" | "AMERICAN_EXPRESS" | "OTHER"; bankName: string; cardNumberLast4: string } | null = null;
    let attemptSnapshot = 0;

    if (swipedCardSource === "SAME" && cardId) {
      const card = await prisma.card.findUnique({ where: { id: cardId } });
      if (!card) return { success: false, error: "Card not found" };
      cardForCalc = { cardNetwork: card.cardNetwork, bankName: card.bankName, cardNumberLast4: card.cardNumberLast4 };
      // ADDED v1.2 — Snapshot the attempt count for this swipe (1st = 1, 2nd = 2, etc.)
      attemptSnapshot = card.swipeAttemptCount + 1;
    } else if (swipedCardSource === "OTHER" && otherCardJson) {
      const o = JSON.parse(otherCardJson);
      cardForCalc = {
        cardNetwork: (o.cardNetwork || "OTHER") as typeof cardForCalc extends null ? never : NonNullable<typeof cardForCalc>["cardNetwork"],
        bankName: o.bankName || "OTHER",
        cardNumberLast4: o.cardNumberLast4 || "0000",
      };
    } else {
      return { success: false, error: "Card source unclear" };
    }

    const calc = calculateSwiping({
      swipeAmount: parsedData.swipeAmount,
      cardNetwork: cardForCalc.cardNetwork,
      manualPercentage: parsedData.manualPercentage,
      sentToCustomer: parsedData.sentToCustomer,
    });

    const tx = await prisma.$transaction(async (db) => {
      // v1.4 (A3): Generate human-readable transaction ID
      const transactionId = await generateTransactionId(db, new Date(parsedData.transactionDate));

      const t = await db.transaction.create({
        data: {
          transactionId,
          type: "CARD_SWIPE",
          profileId: parsedData.profileId,
          cardId: swipedCardSource === "SAME" ? cardId : null,
          transactionDate: parsedData.transactionDate,
          customerName: parsedData.customerName,
          customerMobile: parsedData.customerMobile,
          paidAmount: parsedData.swipeAmount,
          swipeAmount: parsedData.swipeAmount,
          cardNameUsed: `${cardForCalc.bankName} ${cardForCalc.cardNetwork} ****${cardForCalc.cardNumberLast4}`,
          percentage: calc.percentage,
          charges: calc.charges,
          pendingAmount: 0,
          totalPending: 0,
          afterClearPending: 0,
          sentToCustomer: parsedData.sentToCustomer,
          pendingToCustomer: calc.pendingToCustomer,
          profit: calc.charges, // legacy v1.2 path — no ourCharges concept
          status: calc.pendingToCustomer < 0.01 ? "CLEARED" : "PENDING",
          customerConduct: calc.pendingToCustomer < 0.01 ? "GOOD" : "PENDING",
          remarks: parsedData.remarks || null,
          createdById: session.user.id,
          // ADDED v1.2
          swipedCardSource,
          otherSwipeCardJson: otherCardJson,
          swipeAttemptForCard: attemptSnapshot || null,
        },
      });

      // ADDED v1.2 — Increment swipe counter on the card
      if (swipedCardSource === "SAME" && cardId) {
        await db.card.update({
          where: { id: cardId },
          data: { swipeAttemptCount: { increment: 1 } },
        });
      }

      await db.auditLog.create({
        data: {
          action: "CREATE",
          entityType: "Transaction",
          entityId: t.id,
          description: `Swipe ₹${parsedData.swipeAmount} for ${parsedData.customerName} (${swipedCardSource}${attemptSnapshot ? ` · attempt ${attemptSnapshot}` : ""})`,
          afterData: t as unknown as Record<string, unknown>,
          performedById: session.user.id,
        },
      });
      return t;
    });

    revalidatePath("/transactions/swiping");
    revalidatePath("/dashboard");
    return { success: true, data: { id: tx.id } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed" };
  }
}

// ─── ADDED v1.3: ARD Swipe (matches May Swiping Sheet 2026 format) ─────────────
import { ardSwipeSchema } from "@/lib/validations/transaction.schema";
import { computeArdSwipe } from "@/lib/calculations";
import { generateTransactionId } from "@/lib/transactionId";

export async function createArdSwipe(
  formData: FormData
): Promise<ServerActionResult<{ id: string }>> {
  try {
    const session = await auth();
    requireRole(session, "ADMIN", "EMPLOYEE");

    const get = (k: string) => formData.get(k)?.toString() ?? "";
    const raw = {
      profileId: get("profileId"),
      transactionDate: get("transactionDate") || new Date().toISOString(),
      customerName: get("customerName"),
      customerMobile: get("customerMobile"),
      swipeAmount: get("swipeAmount"),
      percentage: get("percentage"),
      extraChargesInRs: get("extraChargesInRs") || "0",
      swipeGateway: get("swipeGateway"),
      sentToCustomer: get("sentToCustomer") || "0",
      sentAccount: get("sentAccount"),
      swipeSource: get("swipeSource") || "SAME",
      cardId: get("cardId") || undefined,
      otherBank: get("otherBank"),
      otherNetwork: get("otherNetwork"),
      otherCardNumber: get("otherCardNumber").replace(/\s/g, ""),
      otherExpiry: get("otherExpiry"),
      ourCharges: get("ourCharges") || "0",
      remarks: get("remarks"),
    };

    const parsed = ardSwipeSchema.safeParse(raw);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid data" };
    }
    const data = parsed.data;

    // Resolve card metadata for SAME / OTHER
    let cardId: string | null = null;
    let cardNameUsed = "";
    let cardSnapshot: { bank: string; network: string; cardNumberLast4: string; expiry: string } | null = null;
    let attemptSnapshot: number | null = null;

    if (data.swipeSource === "SAME") {
      if (!data.cardId) return { success: false, error: "Pick a card" };
      const card = await prisma.card.findUnique({ where: { id: data.cardId } });
      if (!card) return { success: false, error: "Card not found" };
      cardId = card.id;
      cardNameUsed = `${card.bankName} ${card.cardNetwork} ****${card.cardNumberLast4}`;
      attemptSnapshot = card.swipeAttemptCount + 1;
    } else {
      // OTHER — never store full card number, only last 4 in snapshot
      const last4 = (data.otherCardNumber ?? "").slice(-4);
      cardSnapshot = {
        bank: data.otherBank ?? "",
        network: data.otherNetwork ?? "",
        cardNumberLast4: last4,
        expiry: data.otherExpiry ?? "",
      };
      cardNameUsed = `${cardSnapshot.bank} ${cardSnapshot.network} ****${last4}`;
    }

    // Server-authoritative calc (never trust client)
    const calc = computeArdSwipe({
      swipeAmount: Number(data.swipeAmount),
      percentage: Number(data.percentage),
      extraChargesInRs: Number(data.extraChargesInRs),
      sentToCustomer: Number(data.sentToCustomer),
      ourCharges: Number(data.ourCharges),
    });

    const tx = await prisma.$transaction(async (db) => {
      // v1.4 (A3): Generate human-readable transaction ID atomically
      const transactionId = await generateTransactionId(db, data.transactionDate);

      const t = await db.transaction.create({
        data: {
          transactionId, // v1.4 (A3)
          type: "CARD_SWIPE",
          profileId: data.profileId,
          cardId,
          transactionDate: data.transactionDate,
          customerName: data.customerName,
          customerMobile: data.customerMobile,

          // Bill-payment-ish base fields (kept compatible)
          paidAmount: Number(data.swipeAmount),
          swipeAmount: Number(data.swipeAmount),
          swipeGateway: data.swipeGateway,
          cardNameUsed,
          percentage: Number(data.percentage),
          charges: calc.charges,

          // Required base fields with defaults — keep schema happy
          pendingAmount: 0,
          totalPending: 0,
          afterClearPending: 0,

          // Swipe-classic fields kept for backward compat
          sentToCustomer: Number(data.sentToCustomer),
          pendingToCustomer: calc.pendingToCustomer,

          // v1.4 (A2): Profit already computed via computeArdSwipe (Charges − OurCharges)
          // where Charges = pctCharges + extraCharges. Matches user's spec.
          profit: calc.profit,

          // ─── v1.3 ARD sheet fields ─────────────────────
          ardExtraCharges: Number(data.extraChargesInRs),
          ardBalanceAmount: calc.balanceAmount,
          ardSentToCustomer: Number(data.sentToCustomer),
          ardSentAccount: data.sentAccount || null,
          ardOurCharges: Number(data.ourCharges),
          ardSwipeSource: data.swipeSource,
          ardCardSnapshot: cardSnapshot ?? undefined,

          // legacy v1.2 swipe-source
          swipedCardSource: data.swipeSource,
          swipeAttemptForCard: attemptSnapshot,

          status: Math.abs(calc.pendingToCustomer) <= 0.01 ? "CLEARED" : "PENDING",
          customerConduct: Math.abs(calc.pendingToCustomer) <= 0.01 ? "GOOD" : "PENDING",
          remarks: data.remarks || null,
          createdById: session.user.id,
        },
      });

      // Increment swipe counter on the SAME card
      if (data.swipeSource === "SAME" && cardId) {
        await db.card.update({
          where: { id: cardId },
          data: { swipeAttemptCount: { increment: 1 } },
        });
      }

      await db.auditLog.create({
        data: {
          action: "CREATE",
          entityType: "Transaction",
          entityId: t.id,
          description: `ARD Swipe ₹${Number(data.swipeAmount).toFixed(2)} for ${data.customerName} (${data.swipeSource}${attemptSnapshot ? ` · attempt #${attemptSnapshot}` : ""})`,
          afterData: t as unknown as Record<string, unknown>,
          performedById: session.user.id,
        },
      });

      return t;
    });

    revalidatePath("/transactions/swiping");
    revalidatePath("/dashboard");
    return { success: true, data: { id: tx.id } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to record swipe" };
  }
}
