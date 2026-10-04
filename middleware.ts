import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSession } from "@/lib/api-auth";
import { getTelaoSession } from "@/lib/telao/registro";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/log" || pathname === "/cadastrados" || pathname.startsWith("/api/telao/") || pathname === "/c" || pathname.startsWith("/telao")) {
    if (pathname === "/api/telao/registro") return NextResponse.next();
    const session = pathname === "/log" || pathname === "/cadastrados" || pathname === "/api/telao/boca-de-urna" && request.method !== "GET" ? getSession(request) : getTelaoSession(request);
    if (!session || ((pathname === "/log" || pathname === "/cadastrados") && session.credentialType !== "main")) return pathname.startsWith("/api/") ? NextResponse.json({ error: "unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } }) : NextResponse.redirect(new URL(pathname === "/log" || pathname === "/cadastrados" ? "/admin" : "/", request.url));
  }
  if (!pathname.startsWith("/m") && !pathname.startsWith("/w")) {
    return NextResponse.next();
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-mobile-path", pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  runtime: "nodejs",
  matcher: ["/log", "/cadastrados", "/c", "/telao/:path*", "/api/telao/:path*", "/m", "/m/:path*", "/w", "/w/:path*"],
};
