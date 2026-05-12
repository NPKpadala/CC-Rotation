import { z } from "zod";
import { aadhaarSchema, panSchema, pincodeSchema, indianMobileSchema } from "./india";

export const profileSchema = z.object({
  // Identity
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  mobile: indianMobileSchema,
  alternativeNumber: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Alt mobile must be 10 digits starting with 6-9")
    .optional()
    .or(z.literal("")),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  selfiePhotoUrl: z.string().optional().or(z.literal("")),
  dateOfBirth: z.string().optional().or(z.literal("")),
  occupation: z.string().max(80).optional().or(z.literal("")),

  // Identity docs (optional, not strict KYC)
  aadhaarNumber: aadhaarSchema,
  panNumber: panSchema,
  aadhaarFrontUrl: z.string().optional().or(z.literal("")),
  aadhaarBackUrl: z.string().optional().or(z.literal("")),
  panCardUrl: z.string().optional().or(z.literal("")),

  // Permanent address
  permanentAddressLine1: z.string().max(200).optional().or(z.literal("")),
  permanentAddressLine2: z.string().max(200).optional().or(z.literal("")),
  permanentLandmark: z.string().max(100).optional().or(z.literal("")),
  permanentCity: z.string().max(80).optional().or(z.literal("")),
  permanentState: z.string().max(80).optional().or(z.literal("")),
  permanentPincode: pincodeSchema,

  // Current address (with same-as toggle)
  currentSameAsPermanent: z.boolean().default(true),
  currentAddressLine1: z.string().max(200).optional().or(z.literal("")),
  currentAddressLine2: z.string().max(200).optional().or(z.literal("")),
  currentLandmark: z.string().max(100).optional().or(z.literal("")),
  currentCity: z.string().max(80).optional().or(z.literal("")),
  currentState: z.string().max(80).optional().or(z.literal("")),
  currentPincode: pincodeSchema,

  // Local proof docs
  gasBillUrl: z.string().optional().or(z.literal("")),
  electricityBillUrl: z.string().optional().or(z.literal("")),
  rentAgreementUrl: z.string().optional().or(z.literal("")),
  bankPassbookUrl: z.string().optional().or(z.literal("")),

  internalNotes: z.string().max(2000).optional().or(z.literal("")),
});

export type ProfileInput = z.infer<typeof profileSchema>;

export const profileUpdateSchema = profileSchema.extend({
  id: z.string().cuid(),
  isActive: z.boolean().optional(),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

// ─── ADDED v1.3: Profile edit (mobile locked, all other fields optional) ─────
// Used by ProfileEditForm + updateProfileById action.
export const profileEditSchema = z.object({
  // mobile is intentionally NOT in this schema — locked once set
  name: z.string().min(2, "Name required"),
  email: z.string().email().optional().or(z.literal("")),
  alternativeNumber: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Alt mobile must be 10 digits starting 6-9")
    .optional()
    .or(z.literal("")),
  dateOfBirth: z.coerce.date().optional().nullable(),
  occupation: z.string().max(100).optional().or(z.literal("")),

  aadhaarNumber: aadhaarSchema,
  panNumber: panSchema,

  // Permanent address
  permanentAddressLine1: z.string().max(200).optional().or(z.literal("")),
  permanentAddressLine2: z.string().max(200).optional().or(z.literal("")),
  permanentLandmark: z.string().max(100).optional().or(z.literal("")),
  permanentCity: z.string().max(80).optional().or(z.literal("")),
  permanentState: z.string().max(80).optional().or(z.literal("")),
  permanentPincode: pincodeSchema,

  // Current address
  currentSameAsPermanent: z.boolean().default(true),
  currentAddressLine1: z.string().max(200).optional().or(z.literal("")),
  currentAddressLine2: z.string().max(200).optional().or(z.literal("")),
  currentLandmark: z.string().max(100).optional().or(z.literal("")),
  currentCity: z.string().max(80).optional().or(z.literal("")),
  currentState: z.string().max(80).optional().or(z.literal("")),
  currentPincode: pincodeSchema,

  // Documents (URLs from PhotoUpload)
  selfiePhotoUrl: z.string().optional().or(z.literal("")),
  aadhaarFrontUrl: z.string().optional().or(z.literal("")),
  aadhaarBackUrl: z.string().optional().or(z.literal("")),
  panCardUrl: z.string().optional().or(z.literal("")),
  gasBillUrl: z.string().optional().or(z.literal("")),
  electricityBillUrl: z.string().optional().or(z.literal("")),
  rentAgreementUrl: z.string().optional().or(z.literal("")),
  bankPassbookUrl: z.string().optional().or(z.literal("")),

  internalNotes: z.string().max(2000).optional().or(z.literal("")),

  // Admin-only — but server enforces RBAC; in the schema, allow them so admins can pass
  oldPendings: z.coerce.number().nonnegative().optional(),
  clearedOldPendings: z.coerce.number().nonnegative().optional(),
});

export type ProfileEditInput = z.infer<typeof profileEditSchema>;
