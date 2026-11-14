import "server-only";
import { and, asc, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import * as t from "@/db/esquema";
import { nombreDeAsesora } from "@/lib/formato";

/**
 * REGLAS DEL CATÁLOGO
 * - "Desde $...": se muestra si Natalia dejó activo "Mostrar precio". Es el menor entre
 *   el precio base del modelo y los precios de hoy publicables de sus versiones.
 * - Precio de cada versión: además debe estar vigente (no más días de los
 *   configurados sin actualizar). Si no, la versión aparece "a consultar".
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
  videoYoutube: t.modelos.videoYoutube,
  combustible: t.modelos.combustible,
  precio: sql<number | null>`case when ${t.modelos.mostrarPrecio} then ${t.modelos.precioBase} end`.mapWith((v) => (v === null ? null : Number(v))),
};

/** Versiones visibles de uno o varios modelos, con su precio solo si se puede mostrar */
async function versionesDe(modeloIds: string[]) {
  if (!modeloIds.length) return [];
  return db
    .select({
      id: t.versiones.id,
      modeloId: t.versiones.modeloId,
      nombre: t.versiones.nombre,
      transmision: t.versiones.transmision,
      precio: sql<number | null>`case when ${t.modelos.mostrarPrecio} and not coalesce(${t.preciosVigentes.desactualizado}, true)
        then ${t.preciosVigentes.precioLista} end`.mapWith((v) => (v === null ? null : Number(v))),
      // El precio base solo se muestra junto a un precio del día publicable (para enseñar el bono)
      base: sql<number | null>`case when ${t.modelos.mostrarPrecio} and not coalesce(${t.preciosVigentes.desactualizado}, true)
        then ${t.versiones.precioBase} end`.mapWith((v) => (v === null ? null : Number(v))),
      nuevoPrecio: sql<boolean>`coalesce(${t.preciosVigentes.nuevoPrecio} and ${t.modelos.mostrarPrecio} and not ${t.preciosVigentes.desactualizado}, false)`,
      actualizado: t.preciosVigentes.vigenteDesde,
    })
    .from(t.versiones)
    .innerJoin(t.modelos, eq(t.modelos.id, t.versiones.modeloId))
    .leftJoin(t.preciosVigentes, eq(t.preciosVigentes.versionId, t.versiones.id))
    .where(and(inArray(t.versiones.modeloId, modeloIds), eq(t.versiones.visible, true)))
    .orderBy(asc(t.versiones.orden), asc(t.versiones.nombre));
}

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

/**
 * "Desde": el menor entre el precio base del modelo y la versión más económica con precio publicable.
 * Así el catálogo nunca dice "Desde" un valor mayor que el de una versión que sí se vende más barata
 * (pasa cuando llega una lista nueva y el "Desde" quedó con el valor viejo).
 */
const desde = (precio: number | null, versiones: { precio: number | null }[]) =>
  versiones.reduce<number | null>((min, v) => (v.precio && (min === null || v.precio < min) ? v.precio : min), precio);

export async function modelosCatalogo() {
  const [modelos, promociones] = await Promise.all([
    db.select(columnas).from(t.modelos).where(eq(t.modelos.visible, true)).orderBy(asc(t.modelos.orden)),
    promocionesVigentes(),
  ]);
  const ids = modelos.map((m) => m.id);
  const [fotos, versiones] = await Promise.all([fotosDe(ids), versionesDe(ids)]);
  return modelos.map((m) => {
    const suyas = versiones.filter((v) => v.modeloId === m.id);
    return {
      ...m,
      precio: desde(m.precio, suyas),
      // Para los filtros del catálogo
      transmisiones: [...new Set(suyas.flatMap((v) => (v.transmision ? [v.transmision] : [])))],
      nuevoPrecio: suyas.some((v) => v.nuevoPrecio),
      promocion: promociones.find((p) => p.modeloId === m.id) ?? null,
      portada: fotos.find((f) => f.modeloId === m.id)?.clave ?? null,
    };
  });
}

export type ModeloCatalogo = Awaited<ReturnType<typeof modelosCatalogo>>[number];

export async function modeloPorSlug(slug: string) {
  const [modelo] = await db
    .select(columnas)
    .from(t.modelos)
    .where(and(eq(t.modelos.slug, slug), eq(t.modelos.visible, true)));
  if (!modelo) return null;
  const [promociones, fotos, versiones] = await Promise.all([promocionesVigentes(), fotosDe([modelo.id]), versionesDe([modelo.id])]);
  return { ...modelo, precio: desde(modelo.precio, versiones), promocion: promociones.find((p) => p.modeloId === modelo.id) ?? null, fotos, versiones };
}

/** Todas las versiones visibles, para elegir en el comparador */
export async function versionesParaComparar() {
  const modelos = await db.select(columnas).from(t.modelos).where(eq(t.modelos.visible, true)).orderBy(asc(t.modelos.orden));
  const versiones = await versionesDe(modelos.map((m) => m.id));
  return versiones.flatMap((v) => {
    const modelo = modelos.find((m) => m.id === v.modeloId);
    return modelo ? [{ ...v, modelo }] : [];
  });
}

export type VersionComparable = Awaited<ReturnType<typeof versionesParaComparar>>[number];

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
