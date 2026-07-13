import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { homeFor } from "@/lib/roles";
import type { Role } from "@prisma/client";

const PUBLIC_PATHS = ["/login", "/registro"];

const ROLE_PATHS: Record<string, Role[]> = {
  "/usuarios": ["ADMIN"],
  "/caja": ["ADMIN", "CAJERO"],
  "/productos": ["ADMIN", "EDITOR"],
  "/clientes": ["ADMIN", "EDITOR"],
  "/pos": ["ADMIN", "CAJERO"],
  "/afiliados": ["ADMIN"],
  "/canje": ["ADMIN", "CAJERO"],
  "/monedero": ["AFILIADO"],
};

export default auth((req) => {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  if (!req.auth) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const role = req.auth.user.role as Role;

  for (const [path, allowed] of Object.entries(ROLE_PATHS)) {
    if (pathname.startsWith(path) && !allowed.includes(role)) {
      // homeFor evita bucles: cada rol cae en una página que sí puede ver
      return NextResponse.redirect(new URL(homeFor(role), req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|uploads).*)"],
};
