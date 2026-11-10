"use server";

import { refresh } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import * as t from "@/db/esquema";
import { exigirAsesora } from "@/lib/autorizacion";
import { erroresPorCampo } from "@/validacion/solicitud";

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
});

export async function guardarPerfil(_previo: ResultadoPerfil, formulario: FormData): Promise<ResultadoPerfil> {
  const { usuarioId, ip } = await exigirAsesora();
  const r = esquema.safeParse(Object.fromEntries(formulario));
  if (!r.success) return { ok: false, errores: erroresPorCampo(r.error) };

  await db.update(t.configuracion).set({ asesoraFrase: r.data.frase, asesoraWhatsapp: r.data.whatsapp }).where(eq(t.configuracion.id, 1));
  await db.insert(t.auditoria).values({ actor: "asesora", usuarioId, accion: "Actualizó su perfil público", entidad: "configuracion", ip, detalle: r.data });
  refresh();
  return { ok: true, mensaje: r.data.whatsapp ? "Perfil guardado." : "Perfil guardado. Sin WhatsApp, los botones de “Escríbeme” no aparecen en el catálogo." };
}
