import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Revisión optimista: si no hay cookie de sesión, ni siquiera se renderiza la página.
 * No consulta la base de datos (el proxy debe ser rápido); la verificación real
 * la hace exigirRol() en cada página.
 */
export function proxy(request: NextRequest) {
  if (!getSessionCookie(request)) {
    const url = new URL("/ingresar", request.url);
    url.searchParams.set("siguiente", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/panel/:path*", "/admin/:path*"],
};
