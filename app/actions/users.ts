"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { userCreateSchema } from "@/lib/validations";
import { requireRole } from "@/lib/rbac";
import { hashPassword } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function createUser(input: unknown) {
  const session = await requireRole(["ADMIN"]);
  const data = userCreateSchema.parse(input);
  const exists = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
  if (exists) throw new Error("Email already in use");
  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email.toLowerCase(),
      passwordHash: await hashPassword(data.password),
      role: data.role,
      phone: data.phone,
    },
  });
  await logAudit({ action: "CREATE", entityType: "User", entityId: user.id, performedBy: session.user.id });
  revalidatePath("/users");
  return { ok: true as const, id: user.id };
}
