import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import * as t from "@/db/esquema";

/** Una solicitud con todo lo que necesita el PDF y el detalle del panel. */
export async function obtenerSolicitudCompleta(id: string) {
  const [solicitud] = await db.select().from(t.solicitudes).where(eq(t.solicitudes.id, id));
  if (!solicitud) return null;

  const [referencias, [conyuge], inmuebles, vehiculos, documentos, modelo] = await Promise.all([
    db.select().from(t.referencias).where(eq(t.referencias.solicitudId, id)),
    db.select().from(t.conyuges).where(eq(t.conyuges.solicitudId, id)),
    db.select().from(t.inmuebles).where(eq(t.inmuebles.solicitudId, id)),
    db.select().from(t.vehiculosCliente).where(eq(t.vehiculosCliente.solicitudId, id)),
    db.select().from(t.documentos).where(eq(t.documentos.solicitudId, id)),
    solicitud.modeloId
      ? db.select().from(t.modelos).where(eq(t.modelos.id, solicitud.modeloId)).then((r) => r[0] ?? null)
      : Promise.resolve(null),
  ]);

  return { ...solicitud, referencias, conyuge: conyuge ?? null, inmuebles, vehiculos, documentos, modelo };
}

export type SolicitudCompleta = NonNullable<Awaited<ReturnType<typeof obtenerSolicitudCompleta>>>;
