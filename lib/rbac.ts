import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

export type Role = "EMPLOYEE" | "ADMIN";

export async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("UNAUTHORIZED");
  return session as typeof session & { user: { id: string; email: string; name?: string | null; role: Role } };
}

export async function requireRole(roles: Role[]) {
  const s = await requireSession();
  if (!roles.includes(s.user.role)) throw new Error("FORBIDDEN");
  return s;
}

export async function getSessionSafe() {
  try {
    return await requireSession();
  } catch {
    return null;
  }
}
