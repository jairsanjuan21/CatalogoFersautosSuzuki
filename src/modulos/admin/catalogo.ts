import "server-only";
import { asc, count, eq } from "drizzle-orm";
import { db } from "@/db";
import * as t from "@/db/esquema";

export async function listarModelosAdmin() {
  const [modelos, fotos] = await Promise.all([
    db
      .select({
        id: t.modelos.id,
        slug: t.modelos.slug,
        linea: t.modelos.linea,
        tipo: t.modelos.tipo,
        puestos: t.modelos.puestos,
        visible: t.modelos.visible,
        archivado: t.modelos.archivado,
        precio: t.modelos.precioBase,
      })
      .from(t.modelos)
      .orderBy(asc(t.modelos.orden), asc(t.modelos.linea)),
    db.select({ modeloId: t.fotosModelo.modeloId, n: count() }).from(t.fotosModelo).groupBy(t.fotosModelo.modeloId),
  ]);
  const conteoVersiones = await db.select({ modeloId: t.versiones.modeloId, n: count() }).from(t.versiones).groupBy(t.versiones.modeloId);
  const portadas = await db.select({ modeloId: t.fotosModelo.modeloId, clave: t.fotosModelo.claveArchivo }).from(t.fotosModelo).where(eq(t.fotosModelo.orden, 0));
  return modelos.map((m) => ({
    ...m,
    fotos: fotos.find((f) => f.modeloId === m.id)?.n ?? 0,
    versiones: conteoVersiones.find((v) => v.modeloId === m.id)?.n ?? 0,
    portada: portadas.find((p) => p.modeloId === m.id)?.clave ?? null,
  }));
}

export async function modeloAdmin(id: string) {
  const [modelo] = await db.select().from(t.modelos).where(eq(t.modelos.id, id));
  if (!modelo) return null;
  const [fotos, versiones, [{ solicitudes }]] = await Promise.all([
    db.select().from(t.fotosModelo).where(eq(t.fotosModelo.modeloId, id)).orderBy(asc(t.fotosModelo.orden)),
    db
      .select({ id: t.versiones.id, nombre: t.versiones.nombre, transmision: t.versiones.transmision, visible: t.versiones.visible, orden: t.versiones.orden, precios: count(t.precios.id) })
      .from(t.versiones)
      .leftJoin(t.precios, eq(t.precios.versionId, t.versiones.id))
      .where(eq(t.versiones.modeloId, id))
      .groupBy(t.versiones.id)
      .orderBy(asc(t.versiones.orden), asc(t.versiones.nombre)),
    db.select({ solicitudes: count() }).from(t.solicitudes).where(eq(t.solicitudes.modeloId, id)),
  ]);
  return { ...modelo, fotos, versiones, solicitudes };
}
