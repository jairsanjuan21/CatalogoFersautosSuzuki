"use server";

import { headers } from "next/headers";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import * as t from "@/db/esquema";
import { auth } from "@/lib/auth";
import { ipDeLaPeticion } from "@/lib/limite";
import { LARGO_MIN_CLAVE } from "@/lib/clave-minima";
import type { ResultadoAdmin } from "@/modulos/admin/acciones-catalogo";

const LARGO_MAX_CLAVE = 128;

const esquema = z
  .object({
    actual: z.string().min(1, "Escribe tu contraseña actual."),
    nueva: z.string().min(LARGO_MIN_CLAVE, `Mínimo ${LARGO_MIN_CLAVE} caracteres.`).max(LARGO_MAX_CLAVE, "Es demasiado larga."),
    repetir: z.string(),
  })
  .refine((d) => d.nueva === d.repetir, { path: ["repetir"], message: "No coincide con la nueva contraseña." })
  .refine((d) => d.nueva !== d.actual, { path: ["nueva"], message: "Debe ser distinta a la actual." });

/** Cambia la contraseña de quien tiene la sesión abierta (Natalia o el admin). Cierra sus otras sesiones. */
export async function cambiarMiClave(_previo: ResultadoAdmin, formulario: FormData): Promise<ResultadoAdmin> {
  const h = await headers();
  const sesion = await auth.api.getSession({ headers: h });
  if (!sesion || (sesion.user.role !== "asesora" && sesion.user.role !== "admin")) return { ok: false, mensaje: "Inicia sesión de nuevo." };

  const r = esquema.safeParse(Object.fromEntries(formulario));
  if (!r.success) {
    const errores: Record<string, string> = {};
    for (const i of r.error.issues) errores[String(i.path[0])] ??= i.message;
    return { ok: false, errores };
  }

  try {
    await auth.api.changePassword({
      headers: h,
      body: { currentPassword: r.data.actual, newPassword: r.data.nueva },
    });
  } catch {
    // Better Auth responde con error si la contraseña actual no es correcta
    return { ok: false, errores: { actual: "La contraseña actual no es correcta." } };
  }

  // Se cierran las demás sesiones (por si alguien más la tenía abierta) y se conserva esta, para no sacarla de su propio panel
  await db.delete(t.session).where(and(eq(t.session.userId, sesion.user.id), ne(t.session.id, sesion.session.id)));

  const ip = ipDeLaPeticion(h);
  await db.insert(t.auditoria).values({
    actor: sesion.user.role === "admin" ? "admin" : "asesora",
    usuarioId: sesion.user.id,
    accion: "Cambió su contraseña",
    entidad: "user",
    entidadId: sesion.user.name,
    ip: ip === "desconocida" ? null : ip,
  });
  return { ok: true, mensaje: "Contraseña cambiada. Las demás sesiones abiertas se cerraron." };
}
