import { z } from "zod";
import { BANK_NAMES } from "@/lib/constants";

const CARD_NETWORKS = [
  "VISA",
  "RUPAY",
  "MASTERCARD",
  "HDFC_RUPAY",
  "HDFC_MASTER",
  "DINERS_CLUB",
  "AMERICAN_EXPRESS",
  "OTHER",
] as const;

const CARD_TYPES = ["DOMESTIC", "BUSINESS", "INTERNATIONAL"] as const;

export const cardSchema = z
  .object({
    profileId: z.string().cuid(),
    holderName: z.string().min(2).max(100),
    holderMobile: z.string().regex(/^\d{10}$/, "Holder mobile must be 10 digits"),
    holderAltMobile: z.string().regex(/^\d{10}$/).optional().or(z.literal("")),
    bankName: z.enum(BANK_NAMES as unknown as [string, ...string[]]),
    bankNameOther: z.string().max(80).optional().or(z.literal("")), // ADDED v1.2
    cardNetwork: z.enum(CARD_NETWORKS),
    cardType: z.enum(CARD_TYPES),
    cardNumber: z.string().regex(/^\d{14,16}$/, "Card number must be 14-16 digits"),
    cardExpireMonth: z.coerce.number().int().min(1).max(12),
    cardExpireYear: z.coerce.number().int().min(new Date().getFullYear()).max(2099),
    cvv: z.string().regex(/^\d{3,4}$/, "CVV must be 3-4 digits").optional().or(z.literal("")),
    aadharFrontUrl: z.string().optional().or(z.literal("")),
    aadharBackUrl: z.string().optional().or(z.literal("")),
    panCardUrl: z.string().optional().or(z.literal("")),
    localProofUrl: z.string().optional().or(z.literal("")),
    cardFrontUrl: z.string().optional().or(z.literal("")),
    cardBackUrl: z.string().optional().or(z.literal("")),
  })
  // ADDED v1.2 — Relaxed expiry: valid if expiry >= current month (this month is OK)
  .refine(
    (data) => {
      const now = new Date();
      const m = now.getMonth() + 1;
      const y = now.getFullYear();
      if (data.cardExpireYear < y) return false;
      if (data.cardExpireYear > y) return true;
      return data.cardExpireMonth >= m;
    },
    { message: "Card has expired", path: ["cardExpireMonth"] }
  )
  // ADDED v1.2 — If bank is OTHER, require a manual name
  .refine(
    (data) => data.bankName !== "OTHER" || (data.bankNameOther && data.bankNameOther.trim().length >= 2),
    { message: "When bank is OTHER, please enter the bank name", path: ["bankNameOther"] }
  );

export type CardInput = z.infer<typeof cardSchema>;

// ─── ADDED v1.3: Card document edit (only photos/docs editable) ───────────────
// Card detail edit mode lets users update KYC docs. Card number, expiry,
// network, bank, holder details — all locked.
export const cardDocEditSchema = z.object({
  aadharFrontUrl: z.string().optional().or(z.literal("")),
  aadharBackUrl: z.string().optional().or(z.literal("")),
  panCardUrl: z.string().optional().or(z.literal("")),
  localProofUrl: z.string().optional().or(z.literal("")),
  cardFrontUrl: z.string().optional().or(z.literal("")),
  cardBackUrl: z.string().optional().or(z.literal("")),
});

export type CardDocEditInput = z.infer<typeof cardDocEditSchema>;
