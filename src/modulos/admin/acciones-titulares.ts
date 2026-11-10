"use server";

import { refresh } from "next/cache";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import * as t from "@/db/esquema";
import { almacenamiento } from "@/lib/almacenamiento";
import { exigirAdmin } from "@/lib/autorizacion";
import { enmascarar } from "@/lib/claves";
import { erroresPorCampo } from "@/validacion/solicitud";
import type { ResultadoAdmin } from "./acciones-catalogo";

const esquemaPeticion = z.object({
  tipo: z.enum(t.tipoPeticion.enumValues, { error: "Elige el tipo de petición." }),
  nombre: z.string().trim().min(3, { error: "Escribe el nombre del titular." }).max(80),
  numeroIdentificacion: z.string().trim().regex(/^\d{5,11}$/, { error: "Solo números, entre 5 y 11 dígitos." }),
  canal: z.string().trim().min(3, { error: "¿Por dónde llegó?" }).max(40),
  detalle: z.string().trim().max(500).transform((v) => v || null),
});

export async function registrarPeticion(_previo: ResultadoAdmin, formulario: FormData): Promise<ResultadoAdmin> {
  const { usuarioId, ip } = await exigirAdmin();
  const r = esquemaPeticion.safeParse(Object.fromEntries(formulario));
  if (!r.success) return { ok: false, errores: erroresPorCampo(r.error) };
  const [p] = await db.insert(t.peticionesTitulares).values(r.data).returning({ id: t.peticionesTitulares.id });
  await db.insert(t.auditoria).values({ actor: "admin", usuarioId, accion: `Registró una petición de titular (${r.data.tipo})`, entidad: "peticiones_titulares", entidadId: p.id, ip });
  refresh();
  return { ok: true, mensaje: "Petición registrada." };
}

const uuid = z.uuid();

/** Cuántos registros hay del titular, sin mostrar sus datos. */
export async function contarDatosTitular(peticionId: string) {
  await exigirAdmin();
  if (!uuid.safeParse(peticionId).success) return null;
  const [p] = await db.select().from(t.peticionesTitulares).where(eq(t.peticionesTitulares.id, peticionId));
  if (!p || p.estado !== "pendiente") return null;
  const [comoSolicitante, comoConyuge] = await Promise.all([
    db.select({ radicado: t.solicitudes.radicado }).from(t.solicitudes).where(eq(t.solicitudes.numeroIdentificacion, p.numeroIdentificacion)),
    db.select({ id: t.conyuges.solicitudId }).from(t.conyuges).where(eq(t.conyuges.numeroIdentificacion, p.numeroIdentificacion)),
  ]);
  return { radicados: comoSolicitante.map((s) => s.radicado), comoConyuge: comoConyuge.length };
}

/**
 * Elimina todo lo del titular: sus solicitudes (con referencias, documentos,
 * historial y notas, por la cascada de la BD), sus datos como cónyuge en
 * solicitudes de otras personas, y los archivos. La auditoría conserva solo
 * que la eliminación ocurrió.
 */
export async function eliminarDatosTitular(peticionId: string, ultimosTres: string): Promise<ResultadoAdmin> {
  const { usuarioId, ip } = await exigirAdmin();
  if (!uuid.safeParse(peticionId).success) return { ok: false, mensaje: "Petición no válida." };
  const [p] = await db.select().from(t.peticionesTitulares).where(eq(t.peticionesTitulares.id, peticionId));
  if (!p || p.estado !== "pendiente" || p.tipo !== "eliminacion") return { ok: false, mensaje: "Esta petición no es de eliminación o ya fue atendida." };
  if (ultimosTres !== p.numeroIdentificacion.slice(-3)) return { ok: false, mensaje: "Los dígitos no coinciden con el documento del titular." };

  const doc = p.numeroIdentificacion;
  const solicitudes = await db.select({ id: t.solicitudes.id }).from(t.solicitudes).where(eq(t.solicitudes.numeroIdentificacion, doc));
  const ids = solicitudes.map((s) => s.id);
  const archivos = ids.length ? await db.select({ clave: t.documentos.claveArchivo }).from(t.documentos).where(inArray(t.documentos.solicitudId, ids)) : [];

  const resumen = await db.transaction(async (tx) => {
    if (ids.length) await tx.delete(t.solicitudes).where(inArray(t.solicitudes.id, ids));
    const conyuges = await tx.delete(t.conyuges).where(eq(t.conyuges.numeroIdentificacion, doc)).returning({ id: t.conyuges.solicitudId });
    const texto = `Se eliminaron ${ids.length} solicitudes, ${archivos.length} archivos y ${conyuges.length} registros como cónyuge.`;
    await tx
      .update(t.peticionesTitulares)
      .set({ estado: "atendida", atendidaEn: new Date(), respuesta: texto, numeroIdentificacion: enmascarar(doc) })
      .where(eq(t.peticionesTitulares.id, peticionId));
    await tx.insert(t.auditoria).values({ actor: "admin", usuarioId, accion: "Eliminó los datos de un titular por petición (Ley 1581)", entidad: "peticiones_titulares", entidadId: peticionId, ip, detalle: { solicitudes: ids.length, archivos: archivos.length, conyuge: conyuges.length } });
    return texto;
  });
  // Los archivos se borran después de confirmar la transacción
  await Promise.allSettled(archivos.map((a) => almacenamiento.borrar(a.clave)));
  refresh();
  return { ok: true, mensaje: resumen };
}

const esquemaCierre = z.object({
  peticionId: uuid,
  estado: z.enum(["atendida", "rechazada"]),
  respuesta: z.string().trim().min(5, { error: "Escribe qué se respondió." }).max(500),
});

export async function cerrarPeticion(_previo: ResultadoAdmin, formulario: FormData): Promise<ResultadoAdmin> {
  const { usuarioId, ip } = await exigirAdmin();
  const r = esquemaCierre.safeParse(Object.fromEntries(formulario));
  if (!r.success) return { ok: false, errores: erroresPorCampo(r.error) };
  const [p] = await db.select().from(t.peticionesTitulares).where(eq(t.peticionesTitulares.id, r.data.peticionId));
  if (!p || p.estado !== "pendiente") return { ok: false, mensaje: "La petición ya fue cerrada." };
  await db
    .update(t.peticionesTitulares)
    .set({ estado: r.data.estado, respuesta: r.data.respuesta, atendidaEn: new Date(), numeroIdentificacion: enmascarar(p.numeroIdentificacion) })
    .where(eq(t.peticionesTitulares.id, p.id));
  await db.insert(t.auditoria).values({ actor: "admin", usuarioId, accion: `Cerró una petición de titular (${r.data.estado})`, entidad: "peticiones_titulares", entidadId: p.id, ip });
  refresh();
  return { ok: true, mensaje: "Petición cerrada." };
}
