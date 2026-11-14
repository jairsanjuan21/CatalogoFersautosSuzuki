import type { NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { auth } from "@/lib/auth";
import { ipDeLaPeticion, permitir } from "@/lib/limite";
import { COOKIE_PRESENCIA, SID_VALIDO, describirDispositivo, esBot, reportarAMetricas } from "@/lib/metricas";

/**
 * Recibe el "latido" de cada pestaña abierta (componente <Presencia />) y lo reenvía al monitor.
 * Quién es (visitante, Natalia o admin) lo decide AQUÍ el servidor leyendo la sesión real:
 * el navegador no puede hacerse pasar por Natalia.
 */
export async function POST(request: NextRequest) {
  const vacia = new Response(null, { status: 204 });
  if (!process.env.METRICAS_INGESTA_URL) return vacia;

  const ua = request.headers.get("user-agent");
  if (esBot(ua)) return vacia;

  // Una pestaña late cada 15 s; 40 por minuto por IP deja margen a varias personas tras la misma red
  if (!permitir(`presencia:${ipDeLaPeticion(request.headers)}`, 40, 60_000)) return new Response(null, { status: 429 });

  // sendBeacon manda el cuerpo como texto plano, por eso se lee como texto y luego se interpreta
  let cuerpo: { tipo?: unknown; ruta?: unknown; escribiendo?: unknown };
  try {
    cuerpo = JSON.parse(await request.text());
  } catch {
    return new Response(null, { status: 400 });
  }

  const sid = request.cookies.get(COOKIE_PRESENCIA)?.value;
  const tipo = cuerpo.tipo === "salida" ? "salida" : "latido";
  const ruta = typeof cuerpo.ruta === "string" && cuerpo.ruta.startsWith("/") ? cuerpo.ruta.slice(0, 120) : null;
  if (!sid || !SID_VALIDO.test(sid) || !ruta) return new Response(null, { status: 400 });

  // Solo se consulta la base de datos si hay cookie de sesión (es decir, Natalia o el admin)
  let rol: "visitante" | "asesora" | "admin" = "visitante";
  let nombre: string | undefined;
  if (getSessionCookie(request)) {
    const sesion = await auth.api.getSession({ headers: request.headers }).catch(() => null);
    if (sesion?.user) {
      rol = sesion.user.role === "admin" ? "admin" : "asesora";
      nombre = sesion.user.name;
    }
  }

  reportarAMetricas({ tipo, sid, ruta, rol, nombre, dispositivo: describirDispositivo(ua), escribiendo: cuerpo.escribiendo === true });
  return vacia;
}
