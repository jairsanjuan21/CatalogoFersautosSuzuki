import "server-only";
import { headers } from "next/headers";
import { auth } from "./auth";
import { ipDeLaPeticion } from "./limite";

/**
 * Para Server Actions y Route Handlers: si no es la asesora, lanza un error
 * (no redirige, porque una acción no es una página).
 * Las páginas usan exigirRol() de sesion.ts, que sí redirige.
 */
export async function exigirAsesora() {
  const h = await headers();
  const sesion = await auth.api.getSession({ headers: h });
  if (!sesion || sesion.user.role !== "asesora") throw new Error("No autorizado");
  const ip = ipDeLaPeticion(h);
  return { usuarioId: sesion.user.id, ip: ip === "desconocida" ? null : ip };
}
