import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const PUBLIC_PATHS = ["/login", "/api/auth", "/_next", "/favicon.ico", "/uploads"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Edge-compatible JWT extraction
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET ?? "dev-secret-please-change-in-production",
    salt:
      process.env.NODE_ENV === "production"
        ? "__Secure-authjs.session-token"
        : "authjs.session-token",
  });

  // Not signed in → redirect to login
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  // Suspended users → block
  if (token.status === "SUSPENDED" || token.status === "INACTIVE") {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("error", "AccountSuspended");
    return NextResponse.redirect(url);
  }

  // Restrict /admin/* to ADMIN
  if (pathname.startsWith("/admin") && token.role !== "ADMIN") {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
};
