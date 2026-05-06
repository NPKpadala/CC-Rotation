import "next-auth";
declare module "next-auth" {
  interface Session {
    user: { id: string; email: string; name?: string | null; role: "EMPLOYEE" | "ADMIN" };
  }
  interface User { role: "EMPLOYEE" | "ADMIN" }
}
declare module "next-auth/jwt" {
  interface JWT { id: string; role: "EMPLOYEE" | "ADMIN" }
}
