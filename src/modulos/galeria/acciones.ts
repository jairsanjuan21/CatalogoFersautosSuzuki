"use server";

import { refresh } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import * as t from "@/db/esquema";
import { exigirGestorCatalogo } from "@/lib/autorizacion";
import { borrarFotoPublica, ErrorFoto, guardarFotoPublica } from "@/modulos/fotos/fotos";
import { erroresPorCampo } from "@/validacion/solicitud";

export interface ResultadoGaleria {
  ok: boolean;
  mensaje?: string;
  errores?: Record<string, string>;
}

const si = z.preprocess((v) => v === "on" || v === "true", z.boolean());
const esquema = z
  .object({
    seccion: z.enum(["familia", "clientes"], { error: "Elige la sección." }),
    pie: z.string().trim().max(120, { error: "Máximo 120 caracteres." }).transform((v) => v || null),
    modeloId: z.union([z.uuid(), z.literal("")]).transform((v) => v || null),
    autorizada: si,
    hayMenores: si,
    autorizacionMenores: si,
  })
  .refine((d) => d.autorizada, { path: ["autorizada"], error: "Confirma que el cliente autorizó publicar la foto." })
  .refine((d) => !d.hayMenores || d.autorizacionMenores, { path: ["autorizacionMenores"], error: "Si aparecen menores, sus padres o acudientes deben autorizarlo." });

export async function subirFotoGaleria(_previo: ResultadoGaleria, formulario: FormData): Promise<ResultadoGaleria> {
  const { usuarioId, ip, actor } = await exigirGestorCatalogo();
  const r = esquema.safeParse(Object.fromEntries(formulario));
  if (!r.success) return { ok: false, errores: erroresPorCampo(r.error) };
  const archivo = formulario.get("foto");
  if (!(archivo instanceof File) || archivo.size === 0) return { ok: false, errores: { foto: "Elige la foto." } };
  if (archivo.size > 900 * 1024) return { ok: false, errores: { foto: "La foto es demasiado pesada." } };

  let clave: string;
  try {
    clave = await guardarFotoPublica(Buffer.from(await archivo.arrayBuffer()), "galeria");
  } catch (e) {
    if (e instanceof ErrorFoto) return { ok: false, errores: { foto: e.message } };
    throw e;
  }
  const d = r.data;
  const [f] = await db
    .insert(t.fotosGaleria)
    .values({ ...d, autorizacionMenores: d.hayMenores && d.autorizacionMenores, claveArchivo: clave, autorizadaPor: usuarioId })
    .returning({ id: t.fotosGaleria.id });
  await db.insert(t.auditoria).values({
    actor,
    usuarioId,
    accion: `Publicó una foto en ${d.seccion === "familia" ? "Familia Suzuki" : "Clientes felices"} (con autorización${d.hayMenores ? ", incluye menores autorizados" : ""})`,
    entidad: "fotos_galeria",
    entidadId: f.id,
    ip,
  });
  refresh();
  return { ok: true, mensaje: "Foto publicada." };
}

export async function cambiarVisibilidadFoto(fotoId: string, visible: boolean): Promise<ResultadoGaleria> {
  const { usuarioId, ip, actor } = await exigirGestorCatalogo();
  if (!z.uuid().safeParse(fotoId).success) return { ok: false, mensaje: "Datos no válidos." };
  const [f] = await db.update(t.fotosGaleria).set({ visible }).where(eq(t.fotosGaleria.id, fotoId)).returning({ id: t.fotosGaleria.id });
  if (!f) return { ok: false, mensaje: "La foto ya no existe." };
  await db.insert(t.auditoria).values({ actor, usuarioId, accion: visible ? "Mostró una foto de la galería" : "Ocultó una foto de la galería", entidad: "fotos_galeria", entidadId: f.id, ip });
  refresh();
  return { ok: true };
}

/** Borra la foto y sus archivos. Es lo que hay que hacer si un cliente retira su autorización. */
export async function borrarFotoGaleria(fotoId: string): Promise<ResultadoGaleria> {
  const { usuarioId, ip, actor } = await exigirGestorCatalogo();
  if (!z.uuid().safeParse(fotoId).success) return { ok: false, mensaje: "Datos no válidos." };
  const [f] = await db.delete(t.fotosGaleria).where(eq(t.fotosGaleria.id, fotoId)).returning();
  if (!f) return { ok: false, mensaje: "La foto ya no existe." };
  await borrarFotoPublica(f.claveArchivo);
  await db.insert(t.auditoria).values({ actor, usuarioId, accion: "Borró una foto de la galería", entidad: "fotos_galeria", entidadId: f.id, ip });
  refresh();
  return { ok: true, mensaje: "Foto borrada." };
}
