import { z } from "zod";
import { PAYMENT_GATEWAYS, CHARGES_SENT_TYPES } from "@/lib/constants";

export const billPaymentSchema = z.object({
  profileId: z.string().cuid(),
  cardId: z.string().cuid().optional().or(z.literal("")),
  transactionDate: z.coerce.date(),
  customerName: z.string().min(2),
  customerMobile: z.string().regex(/^\d{10}$/),
  dueAmount: z.coerce.number().nonnegative().default(0),
  paidAmountRaw: z
    .string()
    .min(1, "Paid amount required")
    .regex(/^\d+(\+\d+)*$/, "Format: 50000 or 50000+50000"),
  paymentGateway: z.enum(PAYMENT_GATEWAYS as unknown as [string, ...string[]]),
  swipeAmountRaw: z
    .string()
    .regex(/^\d+(\+\d+)*$/, "Format: 50000 or 50000+50000")
    .optional()
    .or(z.literal("")),
  swipeGateway: z.string().optional().or(z.literal("")),
  swipeDate: z.coerce.date().optional(),
  paymentSite: z.string().optional().or(z.literal("")),
  swipeSite: z.string().optional().or(z.literal("")),
  cardNameUsed: z.string().optional().or(z.literal("")),
  percentage: z.coerce.number().min(0).max(100),
  clearedAmount: z.coerce.number().nonnegative().default(0),
  extraSwipedPercent: z.coerce.number().min(0).max(100).default(0),
  siteCharges: z.coerce.number().nonnegative().default(0),
  pendingHeldBy: z.string().optional().or(z.literal("")),
  chargesSentType: z.enum(CHARGES_SENT_TYPES).optional(),
  remarks: z.string().max(2000).optional().or(z.literal("")),
});

export type BillPaymentInput = z.infer<typeof billPaymentSchema>;

export const swipingSchema = z.object({
  profileId: z.string().cuid(),
  cardId: z.string().cuid(),
  transactionDate: z.coerce.date(),
  customerName: z.string().min(2),
  customerMobile: z.string().regex(/^\d{10}$/),
  swipeAmount: z.coerce.number().positive(),
  manualPercentage: z.coerce.number().min(0).max(100).optional(),
  sentToCustomer: z.coerce.number().nonnegative().default(0),
  remarks: z.string().max(2000).optional().or(z.literal("")),
});

export type SwipingInput = z.infer<typeof swipingSchema>;

const walletBreakdownSchema = z.object({
  cash: z.coerce.number().nonnegative().default(0),
  phonepay: z.coerce.number().nonnegative().default(0),
  pay1: z.coerce.number().nonnegative().default(0),
  paybijili: z.coerce.number().nonnegative().default(0),
  paymama: z.coerce.number().nonnegative().default(0),
  softpay: z.coerce.number().nonnegative().default(0),
  roinet: z.coerce.number().nonnegative().default(0),
  other: z.coerce.number().nonnegative().default(0),
});

export const dailyReportSchema = z.object({
  transactionDate: z.coerce.date(),
  walletOpening: walletBreakdownSchema,
  walletClosing: walletBreakdownSchema,
  walletPendings: z.coerce.number().nonnegative().default(0),
  remarks: z.string().max(2000).optional().or(z.literal("")),
});

export type DailyReportInput = z.infer<typeof dailyReportSchema>;
export type WalletBreakdownInput = z.infer<typeof walletBreakdownSchema>;

export const fraudSchema = z.object({
  mobile: z.string().regex(/^\d{10}$/),
  name: z.string().optional().or(z.literal("")),
  cardDetails: z.string().max(500).optional().or(z.literal("")),
  cardPhotoUrls: z.array(z.string()).default([]),
  remarks: z.string().max(2000).optional().or(z.literal("")),
});

export type FraudInput = z.infer<typeof fraudSchema>;

// ─── ADDED v1.3: ARD Swipe Sheet (matches May Swiping Sheet 2026 format) ─────
export const ardSwipeSchema = z.object({
  profileId: z.string().cuid(),
  transactionDate: z.coerce.date(),
  customerName: z.string().min(2),
  customerMobile: z.string().regex(/^\d{10}$/, "Mobile must be 10 digits"),

  swipeAmount: z.coerce.number().positive("Swipe amount required"),
  percentage: z.coerce.number().min(0).max(100),
  extraChargesInRs: z.coerce.number().nonnegative().default(0),

  swipeGateway: z.enum(PAYMENT_GATEWAYS as unknown as [string, ...string[]]),
  sentToCustomer: z.coerce.number().nonnegative().default(0),
  sentAccount: z.string().max(200).optional().or(z.literal("")),

  // Card source
  swipeSource: z.enum(["SAME", "OTHER"]),
  cardId: z.string().cuid().optional().or(z.literal("")),

  // OTHER card details (only required if swipeSource === "OTHER")
  otherBank: z.string().optional().or(z.literal("")),
  otherNetwork: z.string().optional().or(z.literal("")),
  otherCardNumber: z.string().regex(/^\d{4,16}$/).optional().or(z.literal("")),
  otherExpiry: z.string().regex(/^\d{2}\/\d{2,4}$/).optional().or(z.literal("")),

  ourCharges: z.coerce.number().nonnegative().default(0),
  remarks: z.string().max(2000).optional().or(z.literal("")),
}).refine(
  (data) => {
    if (data.swipeSource === "SAME") {
      return !!data.cardId && data.cardId !== "";
    }
    return true;
  },
  { message: "Select a card from the customer's saved cards", path: ["cardId"] }
).refine(
  (data) => {
    if (data.swipeSource === "OTHER") {
      return !!data.otherBank && !!data.otherNetwork && !!data.otherCardNumber;
    }
    return true;
  },
  { message: "OTHER card requires bank, network, and card number", path: ["otherCardNumber"] }
);

export type ArdSwipeInput = z.infer<typeof ardSwipeSchema>;
