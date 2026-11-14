import "server-only";
import { and, asc, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import * as t from "@/db/esquema";
import { nombreDeAsesora } from "@/lib/formato";

/**
 * REGLAS DEL CATÁLOGO
 * - Precio del modelo: el de su versión de entrada (la más económica con precio). Si
 *   ninguna versión tiene precio, el "Desde" del modelo. Todo solo con "Mostrar precio".
 * - Precio de cada versión: el de hoy si está vigente (lista de Excel sin vencer o días de
 *   la configuración); si no, su precio base como "precio de lista". Sin ninguno: "a consultar".
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

const aNumero = (v: unknown) => (v === null ? null : Number(v));

/**
 * Versiones visibles de uno o varios modelos, con su precio solo si se puede mostrar.
 * Precio de la versión: el de hoy si está vigente; si no hay (o se venció), su precio base,
 * que es el de lista de Suzuki y no se vence. "deLista" avisa cuál de los dos es.
 */
async function versionesDe(modeloIds: string[]) {
  if (!modeloIds.length) return [];
  const filas = await db
    .select({
      id: t.versiones.id,
      modeloId: t.versiones.modeloId,
      nombre: t.versiones.nombre,
      transmision: t.versiones.transmision,
      hoy: sql<number | null>`case when ${t.modelos.mostrarPrecio} and not coalesce(${t.preciosVigentes.desactualizado}, true)
        then ${t.preciosVigentes.precioLista} end`.mapWith(aNumero),
      lista: sql<number | null>`case when ${t.modelos.mostrarPrecio} then ${t.versiones.precioBase} end`.mapWith(aNumero),
      // El precio base solo se muestra junto a un precio del día publicable (para enseñar el bono)
      nuevoPrecio: sql<boolean>`coalesce(${t.preciosVigentes.nuevoPrecio} and ${t.modelos.mostrarPrecio} and not ${t.preciosVigentes.desactualizado}, false)`,
      actualizado: t.preciosVigentes.vigenteDesde,
    })
    .from(t.versiones)
    .innerJoin(t.modelos, eq(t.modelos.id, t.versiones.modeloId))
    .leftJoin(t.preciosVigentes, eq(t.preciosVigentes.versionId, t.versiones.id))
    .where(and(inArray(t.versiones.modeloId, modeloIds), eq(t.versiones.visible, true)))
    .orderBy(asc(t.versiones.orden), asc(t.versiones.nombre));
  return filas.map(({ hoy, lista, ...v }) => ({
    ...v,
    precio: hoy ?? lista,
    deLista: hoy === null && lista !== null,
    // Precio base tachado + bono: solo cuando hay precio de hoy menor que el de lista
    base: hoy !== null && lista !== null && lista > hoy ? lista : null,
  }));
}

/** Colores de uno o varios modelos, en el orden que eligió Natalia */
async function coloresDe(modeloIds: string[]) {
  if (!modeloIds.length) return [];
  return db
    .select({ modeloId: t.coloresModelo.modeloId, nombre: t.coloresModelo.nombre, hex: t.coloresModelo.hex })
    .from(t.coloresModelo)
    .where(inArray(t.coloresModelo.modeloId, modeloIds))
    .orderBy(asc(t.coloresModelo.orden), asc(t.coloresModelo.creadoEn));
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
 * La versión de entrada (la más económica con precio publicable) es la que se muestra primero.
 * Si ninguna versión tiene precio, queda el "Desde" que Natalia puso en el modelo.
 */
function versionDeEntrada<V extends { precio: number | null }>(versiones: V[]) {
  return versiones.reduce<V | null>((min, v) => (v.precio && (!min || v.precio < min.precio!) ? v : min), null);
}

export async function modelosCatalogo() {
  const [modelos, promociones] = await Promise.all([
    db.select(columnas).from(t.modelos).where(eq(t.modelos.visible, true)).orderBy(asc(t.modelos.orden)),
    promocionesVigentes(),
  ]);
  const ids = modelos.map((m) => m.id);
  const [fotos, versiones, colores] = await Promise.all([fotosDe(ids), versionesDe(ids), coloresDe(ids)]);
  return modelos.map((m) => {
    const suyas = versiones.filter((v) => v.modeloId === m.id);
    const entrada = versionDeEntrada(suyas);
    return {
      ...m,
      precio: entrada?.precio ?? m.precio,
      versionEntrada: entrada ? { nombre: entrada.nombre, transmision: entrada.transmision } : null,
      colores: colores.filter((c) => c.modeloId === m.id),
      // Para los filtros del catálogo
      transmisiones: [...new Set(suyas.flatMap((v) => (v.transmision ? [v.transmision] : [])))],
      nuevoPrecio: !!entrada?.nuevoPrecio, // la etiqueta acompaña al precio que se muestra
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
  const [promociones, fotos, versiones, colores] = await Promise.all([promocionesVigentes(), fotosDe([modelo.id]), versionesDe([modelo.id]), coloresDe([modelo.id])]);
  const entrada = versionDeEntrada(versiones);
  return {
    ...modelo,
    precio: entrada?.precio ?? modelo.precio,
    entrada,
    // Las demás versiones, de la más económica a la más cara (las que no tienen precio al final)
    otras: versiones.filter((v) => v !== entrada).sort((a, b) => (a.precio ?? Infinity) - (b.precio ?? Infinity)),
    promocion: promociones.find((p) => p.modeloId === modelo.id) ?? null,
    fotos,
    versiones,
    colores,
  };
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
