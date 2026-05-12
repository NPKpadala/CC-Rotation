"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import type { ServerActionResult } from "@/types";

export async function flagConduct(
  profileId: string,
  conductType: "GOOD" | "PENDING",
  pendingAmount: number,
  remarks?: string
): Promise<ServerActionResult> {
  try {
    const session = await auth();
    requireRole(session, "ADMIN", "EMPLOYEE");

    await prisma.$transaction(async (db) => {
      const c = await db.conductRecord.create({
        data: {
          profileId,
          conductType,
          pendingAmount,
          remarks: remarks ?? null,
          flaggedById: session.user.id,
          flaggedAt: new Date(),
        },
      });
      await db.auditLog.create({
        data: {
          action: "CREATE",
          entityType: "ConductRecord",
          entityId: c.id,
          description: `Flagged profile ${profileId} as ${conductType}`,
          afterData: c as unknown as Record<string, unknown>,
          performedById: session.user.id,
        },
      });
    });

    revalidatePath("/customers/conduct");
    revalidatePath(`/profiles/${profileId}`);
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed" };
  }
}
