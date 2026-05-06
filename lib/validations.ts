import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(6).max(128),
});

export const userCreateSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
  password: z.string().min(6).max(128),
  role: z.enum(["EMPLOYEE", "ADMIN"]).default("EMPLOYEE"),
  phone: z.string().trim().max(20).optional(),
});

export const profileSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  mobile: z.string().trim().regex(/^[0-9+\-\s]{7,20}$/),
  pan: z.string().trim().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/i, "Invalid PAN"),
  cardDetails: z.array(z.object({
    cardName: z.string().min(1).max(60),
    cardType: z.string().min(1).max(40),
    cardNumber: z.string().regex(/^\d{12,19}$/, "12-19 digits"),
    expiry: z.string().regex(/^(0[1-9]|1[0-2])\/\d{2}$/, "MM/YY"),
  })).min(1).max(10),
  bankDetails: z.object({
    bankName: z.string().min(1).max(80),
    accountNumber: z.string().regex(/^\d{6,20}$/),
    ifsc: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/i),
  }),
  isActive: z.boolean().default(true),
});

export const splitPaymentSchema = z.object({
  site: z.string().min(1).max(80),
  amount: z.number().nonnegative().finite(),
  ref: z.string().max(80).optional().default(""),
});

export const transactionSchema = z.object({
  profileId: z.string().min(1),
  date: z.coerce.date().default(() => new Date()),
  dueAmount: z.number().nonnegative().finite(),
  paidAmount: z.number().nonnegative().finite(),
  swipeAmount: z.number().nonnegative().finite(),
  splitPayments: z.array(splitPaymentSchema).default([]),
  swipePercentage: z.number().min(0).max(100),
  cardName: z.string().min(1).max(60),
  cardType: z.string().min(1).max(40),
  cardNumber: z.string().regex(/^\d{12,19}$/),
  paymentSite: z.string().min(1).max(80),
  swipeSite: z.string().min(1).max(80),
  swipeDate: z.coerce.date(),
  remarks: z.string().max(500).optional(),
  status: z.enum(["PENDING", "CLEARED", "PARTIAL", "CANCELLED"]).default("PENDING"),
  bankAccountId: z.string().optional().nullable(),
});

export const bankSchema = z.object({
  name: z.string().trim().min(2).max(80),
  accountNumber: z.string().regex(/^\d{6,20}$/),
  ifsc: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/i),
  isPrimary: z.boolean().default(false),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type TransactionInput = z.infer<typeof transactionSchema>;
export type BankInput = z.infer<typeof bankSchema>;
