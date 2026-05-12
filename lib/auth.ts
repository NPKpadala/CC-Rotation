import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { z } from "zod";

const credentialsSchema = z.object({
  mobile: z.string().regex(/^\d{10}$/, "Invalid mobile"),
  password: z.string().min(1, "Password required"),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      name: "Mobile + Password",
      credentials: {
        mobile: { label: "Mobile", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { mobile, password } = parsed.data;

        const user = await prisma.user.findUnique({ where: { mobile } });
        if (!user) return null;
        if (user.status !== "ACTIVE") return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        // Fire-and-forget last login update + audit log
        try {
          await prisma.$transaction([
            prisma.user.update({
              where: { id: user.id },
              data: { lastLoginAt: new Date() },
            }),
            prisma.auditLog.create({
              data: {
                action: "LOGIN",
                entityType: "User",
                entityId: user.id,
                description: `User ${user.name} (${user.mobile}) logged in`,
                performedById: user.id,
              },
            }),
          ]);
        } catch {
          // Don't fail login if audit fails
        }

        return {
          id: user.id,
          name: user.name,
          mobile: user.mobile,
          role: user.role,
          status: user.status,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = ((user as { role?: string }).role ?? "EMPLOYEE") as "ADMIN" | "EMPLOYEE" | "CUSTOMER";
        token.mobile = (user as { mobile?: string }).mobile ?? "";
        token.status = ((user as { status?: string }).status ?? "ACTIVE") as "ACTIVE" | "INACTIVE" | "SUSPENDED";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "ADMIN" | "EMPLOYEE" | "CUSTOMER";
        session.user.mobile = token.mobile as string;
        session.user.status = token.status as "ACTIVE" | "INACTIVE" | "SUSPENDED";
      }
      return session;
    },
  },
  secret: process.env.AUTH_SECRET,
});
