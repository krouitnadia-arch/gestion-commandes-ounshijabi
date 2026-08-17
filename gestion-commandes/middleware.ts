import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "./lib/jwt";

const ROLE_PATHS: Record<string, string[]> = {
  ADMIN: ["/commandes", "/expedition", "/magasin", "/stock", "/utilisateurs"],
  CONFIRMATION: ["/commandes"],
  EXPEDITION: ["/expedition"],
  STOCK: ["/magasin", "/stock"],
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/login") || pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  const token = req.cookies.get("session")?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session) {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  const allowed = ROLE_PATHS[session.role] ?? [];
  const isApi = pathname.startsWith("/api/");
  const matchesAllowed = allowed.some((p) => pathname.startsWith(p));

  if (!isApi && pathname !== "/" && !matchesAllowed) {
    const fallback = new URL(allowed[0] ?? "/login", req.url);
    return NextResponse.redirect(fallback);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
