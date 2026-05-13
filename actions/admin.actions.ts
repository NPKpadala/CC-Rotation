"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import type { ServerActionResult } from "@/types";

const userCreateSchema = z.object({
  name: z.string().min(2),
  mobile: z.string().regex(/^\d{10}$/),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["ADMIN", "EMPLOYEE", "CUSTOMER"]),
  email: z.string().email().optional().or(z.literal("")),
});

export async function createUser(formData: FormData): Promise<ServerActionResult<{ id: string }>> {
  try {
    const session = await auth();
    requireRole(session, "ADMIN");

    const parsed = userCreateSchema.safeParse({
      name: formData.get("name")?.toString() ?? "",
      mobile: formData.get("mobile")?.toString() ?? "",
      password: formData.get("password")?.toString() ?? "",
      role: formData.get("role")?.toString() ?? "EMPLOYEE",
      email: formData.get("email")?.toString() ?? "",
    });

    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid input" };
    }

    const exists = await prisma.user.findUnique({ where: { mobile: parsed.data.mobile } });
    if (exists) return { success: false, error: "Mobile already registered" };

    const hash = await bcrypt.hash(parsed.data.password, 12);

    const user = await prisma.$transaction(async (db) => {
      const u = await db.user.create({
        data: {
          name: parsed.data.name,
          mobile: parsed.data.mobile,
          email: parsed.data.email || null,
          passwordHash: hash,
          role: parsed.data.role,
          status: "ACTIVE",
        },
      });
      await db.auditLog.create({
        data: {
          action: "CREATE",
          entityType: "User",
          entityId: u.id,
          description: `Created ${parsed.data.role} user ${parsed.data.name} (${parsed.data.mobile})`,
          afterData: { ...u, passwordHash: "[REDACTED]" },
          performedById: session.user.id,
        },
      });
      return u;
    });

    revalidatePath("/admin/users");
    return { success: true, data: { id: user.id } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed" };
  }
}

export async function updateUserStatus(
  userId: string,
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED"
): Promise<ServerActionResult> {
  try {
    const session = await auth();
    requireRole(session, "ADMIN");

    if (userId === session.user.id) {
      return { success: false, error: "You cannot change your own status." };
    }

    const before = await prisma.user.findUnique({ where: { id: userId } });
    if (!before) return { success: false, error: "User not found" };

    await prisma.$transaction(async (db) => {
      const u = await db.user.update({ where: { id: userId }, data: { status } });
      await db.auditLog.create({
        data: {
          action: "UPDATE",
          entityType: "User",
          entityId: userId,
          description: `Set ${u.name} status → ${status}`,
          beforeData: { status: before.status },
          afterData: { status: u.status },
          performedById: session.user.id,
        },
      });
    });

    revalidatePath("/admin/users");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed" };
  }
}

export async function updateUserRole(
  userId: string,
  role: "ADMIN" | "EMPLOYEE" | "CUSTOMER"
): Promise<ServerActionResult> {
  try {
    const session = await auth();
    requireRole(session, "ADMIN");

    if (userId === session.user.id) {
      return { success: false, error: "You cannot change your own role." };
    }

    const before = await prisma.user.findUnique({ where: { id: userId } });
    if (!before) return { success: false, error: "User not found" };

    await prisma.$transaction(async (db) => {
      const u = await db.user.update({ where: { id: userId }, data: { role } });
      await db.auditLog.create({
        data: {
          action: "UPDATE",
          entityType: "User",
          entityId: userId,
          description: `Set ${u.name} role → ${role}`,
          beforeData: { role: before.role },
          afterData: { role: u.role },
          performedById: session.user.id,
        },
      });
    });

    revalidatePath("/admin/users");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed" };
  }
}

export async function resetUserPassword(userId: string, newPassword: string): Promise<ServerActionResult> {
  try {
    const session = await auth();
    requireRole(session, "ADMIN");
    if (newPassword.length < 6) return { success: false, error: "Password must be ≥ 6 chars" };

    const hash = await bcrypt.hash(newPassword, 12);
    await prisma.$transaction(async (db) => {
      await db.user.update({ where: { id: userId }, data: { passwordHash: hash } });
      await db.auditLog.create({
        data: {
          action: "UPDATE",
          entityType: "User",
          entityId: userId,
          description: `Reset password for user ${userId}`,
          performedById: session.user.id,
        },
      });
    });
    revalidatePath("/admin/users");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed" };
  }
}

export async function updateSetting(key: string, value: string): Promise<ServerActionResult> {
  try {
    const session = await auth();
    requireRole(session, "ADMIN");

    await prisma.$transaction(async (db) => {
      const updated = await db.systemSetting.update({
        where: { key },
        data: { value, updatedById: session.user.id },
      });
      await db.auditLog.create({
        data: {
          action: "UPDATE",
          entityType: "SystemSetting",
          entityId: updated.id,
          description: `Updated setting ${key} → ${value}`,
          performedById: session.user.id,
        },
      });
    });

    revalidatePath("/admin/settings");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed" };
  }
}
