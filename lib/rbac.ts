import "server-only";
import { Role, type User } from "@prisma/client";
import type { Session } from "next-auth";

export type SessionUser = Session["user"];

export function isAdmin(role: Role | string | undefined | null): boolean {
  return role === "ADMIN";
}

export function isEmployee(role: Role | string | undefined | null): boolean {
  return role === "EMPLOYEE";
}

export function canCreateProfile(role: Role | string): boolean {
  return role === "ADMIN" || role === "EMPLOYEE";
}

export function canEditProfile(role: Role | string): boolean {
  return role === "ADMIN" || role === "EMPLOYEE";
}

export function canDeleteRecord(role: Role | string): boolean {
  return role === "ADMIN";
}

export function canViewAdminPanel(role: Role | string): boolean {
  return role === "ADMIN";
}

export function canEditFraudAfterSubmit(role: Role | string): boolean {
  return role === "ADMIN";
}

export function canViewAllProfiles(role: Role | string): boolean {
  return role === "ADMIN" || role === "EMPLOYEE";
}

/** Throw if the session role is not in the allowed list */
export function requireRole(
  session: Session | null,
  ...allowedRoles: Array<Role | string>
): asserts session is Session {
  if (!session?.user) {
    throw new Error("UNAUTHORIZED: not signed in");
  }
  if (!allowedRoles.includes(session.user.role)) {
    throw new Error(`FORBIDDEN: role ${session.user.role} cannot perform this action`);
  }
}

/** Returns a Prisma where-clause fragment for profile visibility based on role */
export function getProfileScopeWhere(session: Session): { createdById?: string } | undefined {
  if (!session?.user) return undefined;
  if (session.user.role === "ADMIN") return undefined; // admins see all
  // Employees see all profiles for now (per spec). Customers would be filtered.
  if (session.user.role === "EMPLOYEE") return undefined;
  // Customer scope (not used in current product, but safe default)
  return { createdById: session.user.id };
}
