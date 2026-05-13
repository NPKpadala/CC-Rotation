"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { profileSchema, profileUpdateSchema } from "@/lib/validations/profile.schema";
import type { ServerActionResult } from "@/types";

// Helper: pull every form field into a plain object
function extractRaw(fd: FormData) {
  const get = (k: string) => fd.get(k)?.toString() ?? "";
  return {
    name: get("name"),
    mobile: get("mobile"),
    alternativeNumber: get("alternativeNumber"),
    email: get("email"),
    selfiePhotoUrl: get("selfiePhotoUrl"),
    dateOfBirth: get("dateOfBirth"),
    occupation: get("occupation"),
    aadhaarNumber: get("aadhaarNumber"),
    panNumber: get("panNumber").toUpperCase(),
    aadhaarFrontUrl: get("aadhaarFrontUrl"),
    aadhaarBackUrl: get("aadhaarBackUrl"),
    panCardUrl: get("panCardUrl"),
    permanentAddressLine1: get("permanentAddressLine1"),
    permanentAddressLine2: get("permanentAddressLine2"),
    permanentLandmark: get("permanentLandmark"),
    permanentCity: get("permanentCity"),
    permanentState: get("permanentState"),
    permanentPincode: get("permanentPincode"),
    currentSameAsPermanent: get("currentSameAsPermanent") !== "false",
    currentAddressLine1: get("currentAddressLine1"),
    currentAddressLine2: get("currentAddressLine2"),
    currentLandmark: get("currentLandmark"),
    currentCity: get("currentCity"),
    currentState: get("currentState"),
    currentPincode: get("currentPincode"),
    gasBillUrl: get("gasBillUrl"),
    electricityBillUrl: get("electricityBillUrl"),
    rentAgreementUrl: get("rentAgreementUrl"),
    bankPassbookUrl: get("bankPassbookUrl"),
    internalNotes: get("internalNotes"),
  };
}

// Helper: build the Prisma data object — empty strings → null
function toDbData(d: Record<string, unknown>) {
  const nullify = (v: unknown) => {
    const s = (v as string | undefined) ?? "";
    return s === "" ? null : s;
  };

  // If "same as permanent" is checked, copy permanent fields to current
  const useSame = d.currentSameAsPermanent !== false;

  return {
    name: d.name as string,
    mobile: d.mobile as string,
    alternativeNumber: nullify(d.alternativeNumber),
    email: nullify(d.email),
    selfiePhotoUrl: nullify(d.selfiePhotoUrl),
    dateOfBirth: d.dateOfBirth ? new Date(d.dateOfBirth as string) : null,
    occupation: nullify(d.occupation),

    aadhaarNumber: nullify(d.aadhaarNumber),
    panNumber: nullify(d.panNumber),
    aadhaarFrontUrl: nullify(d.aadhaarFrontUrl),
    aadhaarBackUrl: nullify(d.aadhaarBackUrl),
    panCardUrl: nullify(d.panCardUrl),

    permanentAddressLine1: nullify(d.permanentAddressLine1),
    permanentAddressLine2: nullify(d.permanentAddressLine2),
    permanentLandmark: nullify(d.permanentLandmark),
    permanentCity: nullify(d.permanentCity),
    permanentState: nullify(d.permanentState),
    permanentPincode: nullify(d.permanentPincode),

    currentSameAsPermanent: useSame,
    currentAddressLine1: useSame ? nullify(d.permanentAddressLine1) : nullify(d.currentAddressLine1),
    currentAddressLine2: useSame ? nullify(d.permanentAddressLine2) : nullify(d.currentAddressLine2),
    currentLandmark: useSame ? nullify(d.permanentLandmark) : nullify(d.currentLandmark),
    currentCity: useSame ? nullify(d.permanentCity) : nullify(d.currentCity),
    currentState: useSame ? nullify(d.permanentState) : nullify(d.currentState),
    currentPincode: useSame ? nullify(d.permanentPincode) : nullify(d.currentPincode),

    gasBillUrl: nullify(d.gasBillUrl),
    electricityBillUrl: nullify(d.electricityBillUrl),
    rentAgreementUrl: nullify(d.rentAgreementUrl),
    bankPassbookUrl: nullify(d.bankPassbookUrl),

    internalNotes: nullify(d.internalNotes),
  };
}

// ─── Duplicate detection (fast lookup, used by wizard) ────────────────
export async function checkDuplicateMobile(
  mobile: string,
  excludeId?: string
): Promise<{ exists: boolean; existingProfile?: { id: string; name: string } }> {
  if (!/^[6-9]\d{9}$/.test(mobile)) return { exists: false };

  const found = await prisma.profile.findFirst({
    where: { mobile, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true, name: true },
  });

  return found ? { exists: true, existingProfile: found } : { exists: false };
}

// ─── Create ──────────────────────────────────────────────────────────
export async function createProfile(formData: FormData): Promise<ServerActionResult<{ id: string }>> {
  try {
    const session = await auth();
    requireRole(session, "ADMIN", "EMPLOYEE");

    const raw = extractRaw(formData);
    const parsed = profileSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; "),
      };
    }

    // Soft duplicate check at server level too
    const existing = await prisma.profile.findFirst({
      where: { mobile: parsed.data.mobile },
      select: { id: true, name: true },
    });
    if (existing) {
      return {
        success: false,
        error: `Mobile ${parsed.data.mobile} already belongs to ${existing.name}.`,
      };
    }

    const result = await prisma.$transaction(async (tx) => {
      const profile = await tx.profile.create({
        data: { ...toDbData(parsed.data), createdById: session.user.id },
      });
      await tx.auditLog.create({
        data: {
          action: "CREATE",
          entityType: "Profile",
          entityId: profile.id,
          description: `Created profile for ${profile.name} (${profile.mobile})`,
          afterData: profile as unknown,
          performedById: session.user.id,
        },
      });
      return profile;
    });

    revalidatePath("/profiles");
    revalidatePath("/dashboard");
    return { success: true, data: { id: result.id } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to create profile" };
  }
}

// ─── Update ──────────────────────────────────────────────────────────
export async function updateProfile(formData: FormData): Promise<ServerActionResult<{ id: string }>> {
  try {
    const session = await auth();
    requireRole(session, "ADMIN", "EMPLOYEE");

    const id = formData.get("id")?.toString() ?? "";
    const raw = { ...extractRaw(formData), id, isActive: formData.get("isActive")?.toString() === "true" };

    const parsed = profileUpdateSchema.safeParse(raw);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid data" };
    }

    const before = await prisma.profile.findUnique({ where: { id: parsed.data.id } });
    if (!before) return { success: false, error: "Profile not found" };

    const updated = await prisma.$transaction(async (tx) => {
      const p = await tx.profile.update({
        where: { id: parsed.data.id },
        data: {
          ...toDbData(parsed.data),
          isActive: parsed.data.isActive ?? before.isActive,
        },
      });
      await tx.auditLog.create({
        data: {
          action: "UPDATE",
          entityType: "Profile",
          entityId: p.id,
          description: `Updated profile ${p.name}`,
          beforeData: before as unknown,
          afterData: p as unknown,
          performedById: session.user.id,
        },
      });
      return p;
    });

    revalidatePath("/profiles");
    revalidatePath(`/profiles/${updated.id}`);
    return { success: true, data: { id: updated.id } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to update profile" };
  }
}

// ─── Delete ──────────────────────────────────────────────────────────
export async function deleteProfile(id: string): Promise<ServerActionResult> {
  try {
    const session = await auth();
    requireRole(session, "ADMIN");

    const before = await prisma.profile.findUnique({ where: { id } });
    if (!before) return { success: false, error: "Profile not found" };

    await prisma.$transaction(async (tx) => {
      await tx.transaction.deleteMany({ where: { profileId: id } });
      await tx.conductRecord.deleteMany({ where: { profileId: id } });
      await tx.card.deleteMany({ where: { profileId: id } });
      await tx.profile.delete({ where: { id } });
      await tx.auditLog.create({
        data: {
          action: "DELETE",
          entityType: "Profile",
          entityId: id,
          description: `Deleted profile ${before.name} (${before.mobile})`,
          beforeData: before as unknown,
          performedById: session.user.id,
        },
      });
    });

    revalidatePath("/profiles");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to delete profile" };
  }
}

export async function createProfileAndRedirect(formData: FormData) {
  const r = await createProfile(formData);
  if (r.success && r.data) {
    redirect(`/profiles/${r.data.id}`);
  }
  return r;
}

// ─── ADDED v1.2: Admin-editable old pendings ──────────────────────────────
export async function updateOldPendings(
  profileId: string,
  oldPendings: number,
  clearedOldPendings: number
): Promise<ServerActionResult> {
  try {
    const session = await auth();
    requireRole(session, "ADMIN");

    if (oldPendings < 0 || clearedOldPendings < 0) {
      return { success: false, error: "Values must be non-negative" };
    }

    const before = await prisma.profile.findUnique({
      where: { id: profileId },
      select: { name: true, oldPendings: true, clearedOldPendings: true },
    });
    if (!before) return { success: false, error: "Profile not found" };

    await prisma.$transaction(async (tx) => {
      await tx.profile.update({
        where: { id: profileId },
        data: { oldPendings, clearedOldPendings },
      });
      await tx.auditLog.create({
        data: {
          action: "UPDATE",
          entityType: "Profile",
          entityId: profileId,
          description: `Updated old pendings for ${before.name}: old=${oldPendings}, cleared=${clearedOldPendings}`,
          beforeData: { oldPendings: before.oldPendings, clearedOldPendings: before.clearedOldPendings },
          afterData: { oldPendings, clearedOldPendings },
          performedById: session.user.id,
        },
      });
    });

    revalidatePath(`/profiles/${profileId}`);
    revalidatePath("/reports/pending");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed" };
  }
}

// ─── ADDED v1.3: Edit profile (Edit Mode) ─────────────────────────────────────
// Both Admin and Employee can edit. Mobile is intentionally locked once set.
// Old/Cleared pendings are admin-only — server enforces.
import { profileEditSchema } from "@/lib/validations/profile.schema";

export async function updateProfileById(
  profileId: string,
  formData: FormData
): Promise<ServerActionResult<void>> {
  try {
    const session = await auth();
    requireRole(session, "ADMIN", "EMPLOYEE");

    const before = await prisma.profile.findUnique({ where: { id: profileId } });
    if (!before) return { success: false, error: "Profile not found" };

    const get = (k: string) => formData.get(k)?.toString() ?? "";
    const raw = {
      name: get("name"),
      email: get("email"),
      alternativeNumber: get("alternativeNumber"),
      dateOfBirth: get("dateOfBirth") || undefined,
      occupation: get("occupation"),
      aadhaarNumber: get("aadhaarNumber"),
      panNumber: get("panNumber").toUpperCase(),
      permanentAddressLine1: get("permanentAddressLine1"),
      permanentAddressLine2: get("permanentAddressLine2"),
      permanentLandmark: get("permanentLandmark"),
      permanentCity: get("permanentCity"),
      permanentState: get("permanentState"),
      permanentPincode: get("permanentPincode"),
      currentSameAsPermanent: get("currentSameAsPermanent") === "true",
      currentAddressLine1: get("currentAddressLine1"),
      currentAddressLine2: get("currentAddressLine2"),
      currentLandmark: get("currentLandmark"),
      currentCity: get("currentCity"),
      currentState: get("currentState"),
      currentPincode: get("currentPincode"),
      selfiePhotoUrl: get("selfiePhotoUrl"),
      aadhaarFrontUrl: get("aadhaarFrontUrl"),
      aadhaarBackUrl: get("aadhaarBackUrl"),
      panCardUrl: get("panCardUrl"),
      gasBillUrl: get("gasBillUrl"),
      electricityBillUrl: get("electricityBillUrl"),
      rentAgreementUrl: get("rentAgreementUrl"),
      bankPassbookUrl: get("bankPassbookUrl"),
      internalNotes: get("internalNotes"),
      oldPendings: get("oldPendings") || undefined,
      clearedOldPendings: get("clearedOldPendings") || undefined,
    };

    const parsed = profileEditSchema.safeParse(raw);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid data" };
    }
    const data = parsed.data;

    // Build the update object, excluding mobile (locked) and excluding old/cleared
    // pendings unless the user is admin (defense in depth — schema allows them
    // but RBAC drops them silently for employees).
    const isAdmin = session.user.role === "ADMIN";

    // Detect changed fields for the audit description
    const candidateFields: Record<string, unknown> = {
      name: data.name,
      email: data.email || null,
      alternativeNumber: data.alternativeNumber || null,
      dateOfBirth: data.dateOfBirth ?? null,
      occupation: data.occupation || null,
      aadhaarNumber: data.aadhaarNumber || null,
      panNumber: data.panNumber || null,
      permanentAddressLine1: data.permanentAddressLine1 || null,
      permanentAddressLine2: data.permanentAddressLine2 || null,
      permanentLandmark: data.permanentLandmark || null,
      permanentCity: data.permanentCity || null,
      permanentState: data.permanentState || null,
      permanentPincode: data.permanentPincode || null,
      currentSameAsPermanent: data.currentSameAsPermanent,
      currentAddressLine1: data.currentAddressLine1 || null,
      currentAddressLine2: data.currentAddressLine2 || null,
      currentLandmark: data.currentLandmark || null,
      currentCity: data.currentCity || null,
      currentState: data.currentState || null,
      currentPincode: data.currentPincode || null,
      selfiePhotoUrl: data.selfiePhotoUrl || null,
      aadhaarFrontUrl: data.aadhaarFrontUrl || null,
      aadhaarBackUrl: data.aadhaarBackUrl || null,
      panCardUrl: data.panCardUrl || null,
      gasBillUrl: data.gasBillUrl || null,
      electricityBillUrl: data.electricityBillUrl || null,
      rentAgreementUrl: data.rentAgreementUrl || null,
      bankPassbookUrl: data.bankPassbookUrl || null,
      internalNotes: data.internalNotes || null,
    };

    if (isAdmin) {
      if (data.oldPendings !== undefined) candidateFields.oldPendings = data.oldPendings;
      if (data.clearedOldPendings !== undefined) candidateFields.clearedOldPendings = data.clearedOldPendings;
    }

    // Compute changed-keys for the audit-log description
    const changedKeys: string[] = [];
    for (const [k, v] of Object.entries(candidateFields)) {
      const beforeVal = (before as unknown)[k];
      // Date comparison
      if (beforeVal instanceof Date) {
        const beforeIso = beforeVal.toISOString().slice(0, 10);
        const newIso = v instanceof Date ? v.toISOString().slice(0, 10) : v;
        if (beforeIso !== newIso) changedKeys.push(k);
      } else if (typeof beforeVal === "object" && beforeVal !== null && "toString" in beforeVal) {
        // Decimal etc.
        if (String(beforeVal) !== String(v)) changedKeys.push(k);
      } else if (beforeVal !== v) {
        changedKeys.push(k);
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.profile.update({
        where: { id: profileId },
        data: candidateFields,
      });
      await tx.auditLog.create({
        data: {
          action: "UPDATE",
          entityType: "Profile",
          entityId: profileId,
          description:
            changedKeys.length > 0
              ? `Edited profile for ${data.name} — changed: ${changedKeys.slice(0, 8).join(", ")}${changedKeys.length > 8 ? `, +${changedKeys.length - 8} more` : ""}`
              : `Saved profile for ${data.name} (no field changes)`,
          beforeData: before as unknown,
          afterData: candidateFields,
          performedById: session.user.id,
        },
      });
    });

    revalidatePath(`/profiles/${profileId}`);
    revalidatePath("/profiles");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to update profile" };
  }
}
