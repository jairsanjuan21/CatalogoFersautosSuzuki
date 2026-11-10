import "server-only";
import { asc, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import * as t from "@/db/esquema";

/** Modelos visibles con su precio vigente y los últimos cambios de precio. */
export async function preciosParaPanel() {
  const [modelos, [conf]] = await Promise.all([
    db
      .select({
        id: t.modelos.id,
        linea: t.modelos.linea,
        tipo: t.modelos.tipo,
        mostrarPrecio: t.modelos.mostrarPrecio,
        precio: t.preciosVigentes.precioLista,
        vigenteDesde: t.preciosVigentes.vigenteDesde,
        desactualizado: t.preciosVigentes.desactualizado,
      })
      .from(t.modelos)
      .leftJoin(t.preciosVigentes, eq(t.preciosVigentes.modeloId, t.modelos.id))
      .where(eq(t.modelos.visible, true))
      .orderBy(asc(t.modelos.orden)),
    db.select({ dias: t.configuracion.diasVigenciaPrecio }).from(t.configuracion).limit(1),
  ]);

  // Los últimos 4 precios de cada modelo, para ver la tendencia
  const ids = modelos.map((m) => m.id);
  const historial = ids.length
    ? await db
        .select({ modeloId: t.precios.modeloId, precio: t.precios.precioLista, desde: t.precios.vigenteDesde, origen: t.precios.origen })
        .from(t.precios)
        .where(inArray(t.precios.modeloId, ids))
        .orderBy(desc(t.precios.vigenteDesde))
    : [];

  return {
    diasVigencia: conf?.dias ?? 7,
    modelos: modelos.map((m) => ({ ...m, historial: historial.filter((h) => h.modeloId === m.id).slice(0, 4) })),
  };
}

export type ModeloConPrecio = Awaited<ReturnType<typeof preciosParaPanel>>["modelos"][number];

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
