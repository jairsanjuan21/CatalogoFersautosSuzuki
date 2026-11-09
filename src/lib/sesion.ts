import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth, type Rol } from "./auth";

/**
 * Capa de acceso: toda página o acción protegida pasa por aquí.
 * El proxy hace una revisión rápida (¿hay cookie?); esta es la revisión real
 * (¿la sesión existe en la base de datos, no ha vencido y tiene el rol correcto?).
 */
export async function usuarioActual() {
  const sesion = await auth.api.getSession({ headers: await headers() });
  return sesion?.user ?? null;
}

export const inicioSegunRol = (rol: string) => (rol === "admin" ? "/admin" : "/panel");

export async function exigirRol(rol: Rol) {
  const usuario = await usuarioActual();
  if (!usuario) redirect("/ingresar");
  if (usuario.role !== rol) redirect(inicioSegunRol(usuario.role ?? ""));
  return usuario;
}
