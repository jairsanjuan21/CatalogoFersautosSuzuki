"use server";

import { refresh } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import * as t from "@/db/esquema";
import { auth } from "@/lib/auth";
import { exigirAdmin } from "@/lib/autorizacion";
import { generarClave } from "@/lib/claves";
import type { ResultadoAdmin } from "./acciones-catalogo";

/** Solo se administra la cuenta de la asesora: el admin nunca se desactiva a sí mismo. */
async function cuentaDeAsesora(userId: string) {
  if (!z.string().min(10).max(64).safeParse(userId).success) return null;
  const [u] = await db.select().from(t.user).where(eq(t.user.id, userId));
  return u?.role === "asesora" ? u : null;
}

export async function cambiarEstadoCuenta(userId: string, activar: boolean): Promise<ResultadoAdmin> {
  const { usuarioId, ip } = await exigirAdmin();
  const u = await cuentaDeAsesora(userId);
  if (!u) return { ok: false, mensaje: "Cuenta no válida." };
  await db.transaction(async (tx) => {
    await tx.update(t.user).set({ banned: !activar, banReason: activar ? null : "Desactivada por el administrador" }).where(eq(t.user.id, userId));
    if (!activar) await tx.delete(t.session).where(eq(t.session.userId, userId)); // la saca de todos sus dispositivos
    await tx.insert(t.auditoria).values({ actor: "admin", usuarioId, accion: activar ? "Activó la cuenta" : "Desactivó la cuenta y cerró sus sesiones", entidad: "user", entidadId: u.name, ip });
  });
  refresh();
  return { ok: true, mensaje: activar ? "Cuenta activada." : "Cuenta desactivada: no puede entrar hasta que la actives." };
}

export async function cerrarSesiones(userId: string): Promise<ResultadoAdmin> {
  const { usuarioId, ip } = await exigirAdmin();
  const u = await cuentaDeAsesora(userId);
  if (!u) return { ok: false, mensaje: "Cuenta no válida." };
  const cerradas = await db.delete(t.session).where(eq(t.session.userId, userId)).returning({ id: t.session.id });
  await db.insert(t.auditoria).values({ actor: "admin", usuarioId, accion: `Cerró ${cerradas.length} sesiones abiertas`, entidad: "user", entidadId: u.name, ip });
  refresh();
  return { ok: true, mensaje: cerradas.length ? `Se cerraron ${cerradas.length} sesiones.` : "No tenía sesiones abiertas." };
}

/**
 * Asigna una contraseña temporal y la devuelve UNA vez para dictársela a Natalia.
 * Cuando haya correo configurado, esto se reemplaza por un enlace de recuperación.
 */
export async function restablecerClave(userId: string): Promise<ResultadoAdmin & { clave?: string }> {
  const { usuarioId, ip } = await exigirAdmin();
  const u = await cuentaDeAsesora(userId);
  if (!u) return { ok: false, mensaje: "Cuenta no válida." };
  const clave = generarClave();
  const hash = await (await auth.$context).password.hash(clave);
  await db.transaction(async (tx) => {
    await tx.update(t.account).set({ password: hash, updatedAt: new Date() }).where(and(eq(t.account.userId, userId), eq(t.account.providerId, "credential")));
    await tx.delete(t.session).where(eq(t.session.userId, userId));
    await tx.insert(t.auditoria).values({ actor: "admin", usuarioId, accion: "Asignó una contraseña temporal", entidad: "user", entidadId: u.name, ip });
  });
  refresh();
  return { ok: true, clave, mensaje: "Contraseña temporal creada. Se cerraron sus sesiones abiertas." };
}
