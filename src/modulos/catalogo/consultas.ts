import "server-only";
import { and, asc, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import * as t from "@/db/esquema";
import { nombreDeAsesora } from "@/lib/formato";

/**
 * REGLA DEL CATÁLOGO: un precio se muestra solo si
 *   1. Natalia dejó activo "Mostrar precio en el catálogo",
 *   2. el modelo tiene precio cargado, y
 *   3. el precio no está desactualizado (más días de los configurados).
 * Si no se cumple, el catálogo muestra "Precio a consultar" y el botón de cotizar.
 */
const columnas = {
  id: t.modelos.id,
  slug: t.modelos.slug,
  linea: t.modelos.linea,
  tipo: t.modelos.tipo,
  puestos: t.modelos.puestos,
  motor: t.modelos.motor,
  transmision: t.modelos.transmision,
  descripcion: t.modelos.descripcion,
  precio: sql<number | null>`case when ${t.modelos.mostrarPrecio} and not coalesce(${t.preciosVigentes.desactualizado}, true)
    then ${t.preciosVigentes.precioLista} end`.mapWith(Number),
  actualizado: sql<Date | null>`case when ${t.modelos.mostrarPrecio} and not coalesce(${t.preciosVigentes.desactualizado}, true)
    then ${t.preciosVigentes.vigenteDesde} end`.mapWith((v) => (v ? new Date(v) : null)),
};

async function promocionesVigentes() {
  return db
    .select({ modeloId: t.promociones.modeloId, descripcion: t.promociones.descripcion, valorBono: t.promociones.valorBono, hasta: t.promociones.hasta })
    .from(t.promociones)
    .where(gte(t.promociones.hasta, sql`current_date`))
    .orderBy(asc(t.promociones.hasta));
}

async function fotosDe(modeloIds: string[]) {
  if (!modeloIds.length) return [];
  return db
    .select({ modeloId: t.fotosModelo.modeloId, clave: t.fotosModelo.claveArchivo, alt: t.fotosModelo.textoAlternativo })
    .from(t.fotosModelo)
    .where(inArray(t.fotosModelo.modeloId, modeloIds))
    .orderBy(asc(t.fotosModelo.orden));
}

export async function modelosCatalogo() {
  const [modelos, promociones] = await Promise.all([
    db
      .select(columnas)
      .from(t.modelos)
      .leftJoin(t.preciosVigentes, eq(t.preciosVigentes.modeloId, t.modelos.id))
      .where(eq(t.modelos.visible, true))
      .orderBy(asc(t.modelos.orden)),
    promocionesVigentes(),
  ]);
  const fotos = await fotosDe(modelos.map((m) => m.id));
  return modelos.map((m) => ({
    ...m,
    promocion: promociones.find((p) => p.modeloId === m.id) ?? null,
    portada: fotos.find((f) => f.modeloId === m.id)?.clave ?? null,
  }));
}

export type ModeloCatalogo = Awaited<ReturnType<typeof modelosCatalogo>>[number];

export async function modeloPorSlug(slug: string) {
  const [modelo] = await db
    .select(columnas)
    .from(t.modelos)
    .leftJoin(t.preciosVigentes, eq(t.preciosVigentes.modeloId, t.modelos.id))
    .where(and(eq(t.modelos.slug, slug), eq(t.modelos.visible, true)));
  if (!modelo) return null;
  const [promociones, fotos] = await Promise.all([promocionesVigentes(), fotosDe([modelo.id])]);
  return { ...modelo, promocion: promociones.find((p) => p.modeloId === modelo.id) ?? null, fotos };
}

/** Lo que el público ve de Natalia (nunca su cédula ni datos internos). */
export async function datosAsesora() {
  const [c] = await db
    .select({ nombre: t.configuracion.asesoraNombre, foto: t.configuracion.asesoraFoto, whatsapp: t.configuracion.asesoraWhatsapp, frase: t.configuracion.asesoraFrase, sede: t.configuracion.sede, ciudad: t.configuracion.ciudad })
    .from(t.configuracion)
    .limit(1);
  if (!c) return null;
  const { visible, primero } = nombreDeAsesora(c.nombre);
  return { nombre: visible, primerNombre: primero, foto: c.foto, whatsapp: c.whatsapp, frase: c.frase, sede: c.sede, ciudad: c.ciudad };
}

export type DatosAsesora = NonNullable<Awaited<ReturnType<typeof datosAsesora>>>;
