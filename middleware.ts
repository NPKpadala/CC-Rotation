import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

// RBAC: protect /dashboard for any logged in; admin-only paths require ADMIN.
export default withAuth(
  function middleware(req) {
    const role = (req.nextauth.token as any)?.role;
    const path = req.nextUrl.pathname;
    const adminOnly = ["/users/new", "/audit", "/bank"];
    if (adminOnly.some((p) => path.startsWith(p)) && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  },
  {
    callbacks: { authorized: ({ token }) => !!token },
    pages: { signIn: "/login" },
  }
);

export const config = {
  matcher: ["/dashboard/:path*", "/users/:path*", "/transactions/:path*", "/bank/:path*", "/audit/:path*"],
};
