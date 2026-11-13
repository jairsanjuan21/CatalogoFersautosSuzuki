"use server";

import { refresh } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import * as t from "@/db/esquema";
import { exigirAsesora } from "@/lib/autorizacion";
import { erroresPorCampo } from "@/validacion/solicitud";
import { borrarFotoPublica, ErrorFoto, guardarFotoPublica } from "@/modulos/fotos/fotos";

export interface ResultadoPerfil {
  ok: boolean;
  mensaje?: string;
  errores?: Record<string, string>;
}

const esquema = z.object({
  frase: z.string().trim().min(10, { error: "Escribe una frase de al menos 10 caracteres." }).max(140, { error: "Máximo 140 caracteres." }),
  whatsapp: z
    .string()
    .trim()
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => v === "" || /^3\d{9}$/.test(v), { error: "Escribe un celular de 10 dígitos que empiece por 3." })
    .transform((v) => v || null),
  metaVentasMes: z
    .string()
    .trim()
    .transform((v) => (v ? Number(v) : null))
    .refine((v) => v === null || (Number.isInteger(v) && v >= 1 && v <= 100), { error: "Escribe cuántos vehículos, entre 1 y 100." }),
});

export async function guardarPerfil(_previo: ResultadoPerfil, formulario: FormData): Promise<ResultadoPerfil> {
  const { usuarioId, ip } = await exigirAsesora();
  const r = esquema.safeParse(Object.fromEntries(formulario));
  if (!r.success) return { ok: false, errores: erroresPorCampo(r.error) };

  await db.update(t.configuracion).set({ asesoraFrase: r.data.frase, asesoraWhatsapp: r.data.whatsapp, metaVentasMes: r.data.metaVentasMes }).where(eq(t.configuracion.id, 1));
  await db.insert(t.auditoria).values({ actor: "asesora", usuarioId, accion: "Actualizó su perfil público", entidad: "configuracion", ip, detalle: r.data });
  refresh();
  return { ok: true, mensaje: r.data.whatsapp ? "Perfil guardado." : "Perfil guardado. Sin WhatsApp, los botones de “Escríbeme” no aparecen en el catálogo." };
}

/* ---------- foto de Natalia ---------- */

export async function subirFotoAsesora(formulario: FormData): Promise<ResultadoPerfil> {
  const { usuarioId, ip } = await exigirAsesora();
  const archivo = formulario.get("foto");
  if (!(archivo instanceof File) || archivo.size === 0) return { ok: false, mensaje: "No llegó ninguna foto." };
  if (archivo.size > 900 * 1024) return { ok: false, mensaje: "La foto es demasiado pesada." };
  try {
    const [antes] = await db.select({ foto: t.configuracion.asesoraFoto }).from(t.configuracion).where(eq(t.configuracion.id, 1));
    const clave = await guardarFotoPublica(Buffer.from(await archivo.arrayBuffer()), "asesora");
    await db.update(t.configuracion).set({ asesoraFoto: clave }).where(eq(t.configuracion.id, 1));
    if (antes?.foto) await borrarFotoPublica(antes.foto);
    await db.insert(t.auditoria).values({ actor: "asesora", usuarioId, accion: "Cambió su foto de perfil", entidad: "configuracion", ip });
  } catch (e) {
    if (e instanceof ErrorFoto) return { ok: false, mensaje: e.message };
    throw e;
  }
  refresh();
  return { ok: true, mensaje: "Foto actualizada." };
}

export async function quitarFotoAsesora(): Promise<ResultadoPerfil> {
  const { usuarioId, ip } = await exigirAsesora();
  const [antes] = await db.select({ foto: t.configuracion.asesoraFoto }).from(t.configuracion).where(eq(t.configuracion.id, 1));
  if (!antes?.foto) return { ok: true };
  await db.update(t.configuracion).set({ asesoraFoto: null }).where(eq(t.configuracion.id, 1));
  await borrarFotoPublica(antes.foto);
  await db.insert(t.auditoria).values({ actor: "asesora", usuarioId, accion: "Quitó su foto de perfil", entidad: "configuracion", ip });
  refresh();
  return { ok: true, mensaje: "Foto quitada." };
}
