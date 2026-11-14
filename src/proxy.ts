import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { COOKIE_ORIGEN, DURACION_ORIGEN, esCampana } from "@/lib/origen";

export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Zonas privadas: revisión optimista. Si no hay cookie de sesión, ni siquiera se
  // renderiza la página. No consulta la base de datos (el proxy debe ser rápido);
  // la verificación real la hace exigirRol() en cada página.
  if (pathname.startsWith("/panel") || pathname.startsWith("/admin")) {
    if (!getSessionCookie(request)) {
      const url = new URL("/ingresar", request.url);
      url.searchParams.set("siguiente", pathname);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // Páginas públicas: si llegó por el enlace de una red, se recuerda de dónde vino
  const origen = searchParams.get("origen");
  const respuesta = NextResponse.next();
  if (esCampana(origen)) {
    respuesta.cookies.set(COOKIE_ORIGEN, origen, { maxAge: DURACION_ORIGEN, sameSite: "lax", path: "/", httpOnly: true });
  }
  return respuesta;
}

export const config = {
  matcher: ["/panel/:path*", "/admin/:path*", "/", "/modelo/:path*", "/galeria", "/credito"],
};
