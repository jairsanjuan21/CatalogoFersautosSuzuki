import "server-only";
import { and, asc, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import * as t from "@/db/esquema";

/** Modelos visibles con su precio base y sus versiones, cada una con su precio vigente y el anterior. */
export async function preciosParaPanel() {
  const [modelos, [conf]] = await Promise.all([
    db
      .select({ id: t.modelos.id, linea: t.modelos.linea, tipo: t.modelos.tipo, mostrarPrecio: t.modelos.mostrarPrecio, precioBase: t.modelos.precioBase, precioBaseActualizado: t.modelos.precioBaseActualizado })
      .from(t.modelos)
      .where(eq(t.modelos.visible, true))
      .orderBy(asc(t.modelos.orden)),
    db.select({ dias: t.configuracion.diasVigenciaPrecio }).from(t.configuracion).limit(1),
  ]);
  const ids = modelos.map((m) => m.id);
  const [versiones, historial] = ids.length
    ? await Promise.all([
        db
          .select({
            id: t.versiones.id,
            modeloId: t.versiones.modeloId,
            nombre: t.versiones.nombre,
            transmision: t.versiones.transmision,
            precio: t.preciosVigentes.precioLista,
            vigenteDesde: t.preciosVigentes.vigenteDesde,
            desactualizado: t.preciosVigentes.desactualizado,
          })
          .from(t.versiones)
          .leftJoin(t.preciosVigentes, eq(t.preciosVigentes.versionId, t.versiones.id))
          .where(and(inArray(t.versiones.modeloId, ids), eq(t.versiones.visible, true)))
          .orderBy(asc(t.versiones.orden), asc(t.versiones.nombre)),
        db
          .select({ versionId: t.precios.versionId, precio: t.precios.precioLista, desde: t.precios.vigenteDesde })
          .from(t.precios)
          .innerJoin(t.versiones, eq(t.versiones.id, t.precios.versionId))
          .where(inArray(t.versiones.modeloId, ids))
          .orderBy(desc(t.precios.vigenteDesde)),
      ])
    : [[], []];

  return {
    diasVigencia: conf?.dias ?? 7,
    modelos: modelos.map((m) => ({
      ...m,
      versiones: versiones
        .filter((v) => v.modeloId === m.id)
        .map((v) => ({ ...v, anterior: historial.find((h) => h.versionId === v.id && h.precio !== v.precio) ?? null })),
    })),
  };
}

export type ModeloConPrecios = Awaited<ReturnType<typeof preciosParaPanel>>["modelos"][number];

/** Promociones vigentes y las vencidas en los últimos 30 días. */
export function promocionesParaPanel() {
  return db
    .select({
      id: t.promociones.id,
      modeloId: t.promociones.modeloId,
      linea: t.modelos.linea,
      descripcion: t.promociones.descripcion,
      valorBono: t.promociones.valorBono,
      hasta: t.promociones.hasta,
      vencida: sql<boolean>`${t.promociones.hasta} < current_date`,
    })
    .from(t.promociones)
    .innerJoin(t.modelos, eq(t.modelos.id, t.promociones.modeloId))
    .where(gte(t.promociones.hasta, sql`current_date - 30`))
    .orderBy(asc(t.promociones.hasta));
}
