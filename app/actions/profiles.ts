"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { profileSchema, type ProfileInput } from "@/lib/validations";
import { requireSession } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";

export async function createProfile(input: ProfileInput) {
  const session = await requireSession();
  const data = profileSchema.parse(input);
  const profile = await prisma.profile.create({
    data: {
      userId: session.user.id,
      fullName: data.fullName,
      mobile: data.mobile,
      pan: data.pan.toUpperCase(),
      cardDetails: data.cardDetails as any,
      bankDetails: data.bankDetails as any,
      isActive: data.isActive,
    },
  });
  await logAudit({ action: "CREATE", entityType: "Profile", entityId: profile.id, performedBy: session.user.id });
  revalidatePath("/users");
  return { ok: true as const, id: profile.id };
}

export async function updateProfile(id: string, input: ProfileInput) {
  const session = await requireSession();
  const data = profileSchema.parse(input);
  const existing = await prisma.profile.findUnique({ where: { id } });
  if (!existing) throw new Error("NOT_FOUND");
  if (session.user.role !== "ADMIN" && existing.userId !== session.user.id) throw new Error("FORBIDDEN");
  const updated = await prisma.profile.update({
    where: { id },
    data: {
      fullName: data.fullName,
      mobile: data.mobile,
      pan: data.pan.toUpperCase(),
      cardDetails: data.cardDetails as any,
      bankDetails: data.bankDetails as any,
      isActive: data.isActive,
    },
  });
  await logAudit({ action: "UPDATE", entityType: "Profile", entityId: updated.id, performedBy: session.user.id });
  revalidatePath("/users");
  revalidatePath(`/users/${id}`);
  return { ok: true as const };
}

export async function deleteProfile(id: string) {
  const session = await requireSession();
  if (session.user.role !== "ADMIN") throw new Error("FORBIDDEN");
  await prisma.profile.delete({ where: { id } });
  await logAudit({ action: "DELETE", entityType: "Profile", entityId: id, performedBy: session.user.id });
  revalidatePath("/users");
  return { ok: true as const };
}
