"use server";

import { refresh } from "next/cache";
import { and, asc, eq, inArray, max, ne, notInArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import * as t from "@/db/esquema";
import { exigirAsesora } from "@/lib/autorizacion";
import { permitir } from "@/lib/limite";
import { aSlug } from "@/lib/formato";
import { ErrorExcel, leerExcel } from "./leer-excel";
import { datosIniciales, emparejar, PRECIO_MAXIMO, PRECIO_MINIMO, type FilaPropuesta, type ModeloCatalogo } from "./lista-excel";

export interface OpcionVersion {
  id: string;
  modelo: string;
  etiqueta: string; // "GL mecánica"
}

export type ResultadoLecturaExcel =
  | { ok: false; mensaje: string }
  | {
      ok: true;
      archivo: string;
      numero: string | null;
      fecha: string | null;
      vigenteHasta: string | null;
      filas: FilaPropuesta[];
      descartadas: { texto: string; motivo: string }[];
      opciones: OpcionVersion[]; // para cambiar a mano el emparejamiento
      faltantes: { modelo: string; versiones: string[]; modeloCompleto: boolean }[]; // lo que el catálogo muestra y la lista no trae
    };

async function catalogo(): Promise<ModeloCatalogo[]> {
  const [modelos, versiones] = await Promise.all([
    db.select({ id: t.modelos.id, linea: t.modelos.linea, visible: t.modelos.visible, archivado: t.modelos.archivado }).from(t.modelos).orderBy(asc(t.modelos.orden)),
    db
      .select({
        id: t.versiones.id,
        modeloId: t.versiones.modeloId,
        nombre: t.versiones.nombre,
        transmision: t.versiones.transmision,
        nombreLista: t.versiones.nombreLista,
        visible: t.versiones.visible,
        precio: t.preciosVigentes.precioLista,
      })
      .from(t.versiones)
      .leftJoin(t.preciosVigentes, eq(t.preciosVigentes.versionId, t.versiones.id))
      .orderBy(asc(t.versiones.orden), asc(t.versiones.nombre)),
  ]);
  return modelos.map((m) => ({ ...m, versiones: versiones.filter((v) => v.modeloId === m.id) }));
}

const etiqueta = (v: { nombre: string; transmision: string | null }) => (v.transmision ? `${v.nombre} ${v.transmision === "mecanica" ? "mecánica" : "automática"}` : v.nombre);

/** Paso 1: lee el Excel y propone a qué versión del catálogo va cada fila. No guarda nada. */
export async function leerListaExcel(formulario: FormData): Promise<ResultadoLecturaExcel> {
  const { usuarioId } = await exigirAsesora();
  if (!permitir(`excel:${usuarioId}`, 30, 60 * 60 * 1000)) return { ok: false, mensaje: "Muchas lecturas seguidas. Espera un rato e intenta de nuevo." };
  const archivo = formulario.get("archivo");
  if (!(archivo instanceof File) || archivo.size === 0) return { ok: false, mensaje: "Elige el archivo de Excel." };

  let lista;
  try {
    lista = await leerExcel(Buffer.from(await archivo.arrayBuffer()));
  } catch (e) {
    if (e instanceof ErrorExcel) return { ok: false, mensaje: e.message };
    console.error("Error leyendo Excel", e);
    return { ok: false, mensaje: "No pudimos leer el Excel. Revisa que sea la lista de precios de Suzuki." };
  }

  const modelos = await catalogo();
  const filas = emparejar(lista.filas, modelos);
  const usadas = new Set(filas.flatMap((f) => (f.sugerido.tipo === "existente" ? [f.sugerido.versionId] : [])));
  const faltantes = modelos
    .filter((m) => m.visible && !m.archivado)
    .map((m) => {
      const visibles = m.versiones.filter((v) => v.visible);
      const sobran = visibles.filter((v) => !usadas.has(v.id));
      return { modelo: m.linea, versiones: sobran.map(etiqueta), modeloCompleto: sobran.length === visibles.length };
    })
    .filter((f) => f.versiones.length);

  return {
    ok: true,
    archivo: archivo.name.slice(0, 120),
    numero: lista.numero,
    fecha: lista.fecha,
    vigenteHasta: lista.vigenteHasta,
    filas,
    descartadas: lista.descartadas,
    opciones: modelos.filter((m) => !m.archivado).flatMap((m) => m.versiones.map((v) => ({ id: v.id, modelo: m.linea, etiqueta: etiqueta(v) }))),
    faltantes,
  };
}

/* ---------- paso 2: publicar lo que Natalia revisó ---------- */

const pesos = z.number().int().min(PRECIO_MINIMO).max(PRECIO_MAXIMO);
const fecha = z.union([z.iso.date(), z.null()]);
const esquemaPublicar = z
  .object({
    archivo: z.string().trim().min(1).max(120),
    numero: z.string().trim().max(10).nullable(),
    fecha,
    vigenteHasta: fecha,
    ocultarFaltantes: z.boolean(),
    filas: z
      .array(
        z.object({
          texto: z.string().trim().min(1).max(120),
          anio: z.number().int().min(2000).max(2100).nullable(),
          referencia: pesos,
          venta: pesos,
          nuevoPrecio: z.boolean(),
          combustible: z.enum(["gasolina", "hibrido", "electrico"]).nullable(),
          categoria: z.enum(["automovil", "camioneta"]).nullable(),
          destino: z.discriminatedUnion("tipo", [
            z.object({ tipo: z.literal("existente"), versionId: z.uuid() }),
            z.object({
              tipo: z.literal("nueva"),
              modeloId: z.uuid().nullable(),
              linea: z.string().trim().min(1).max(40),
              nombre: z.string().trim().min(1).max(40),
              transmision: z.enum(["mecanica", "automatica"]).nullable(),
            }),
          ]),
        }),
      )
      .min(1, { error: "No hay precios para publicar." })
      .max(200),
  })
  .refine((d) => d.filas.every((f) => f.venta <= f.referencia), { error: "Hay un precio de venta mayor que su precio de referencia." })
  .refine((d) => !d.vigenteHasta || !d.fecha || d.vigenteHasta >= d.fecha, { error: "La fecha de vigencia es anterior a la fecha de la lista." })
  .refine(
    (d) => {
      const ids = d.filas.flatMap((f) => (f.destino.tipo === "existente" ? [f.destino.versionId] : []));
      return new Set(ids).size === ids.length;
    },
    { error: "Dos filas del Excel apuntan a la misma versión. Corrige una de las dos." },
  );

export type DatosPublicacion = z.input<typeof esquemaPublicar>;

export async function publicarListaExcel(datos: DatosPublicacion): Promise<{ ok: boolean; mensaje: string; modelosNuevos?: string[] }> {
  const { usuarioId, ip } = await exigirAsesora();
  const r = esquemaPublicar.safeParse(datos);
  if (!r.success) return { ok: false, mensaje: r.error.issues[0]?.message ?? "Datos no válidos." };
  const d = r.data;

  try {
    const resultado = await db.transaction(async (tx) => {
      const [lista] = await tx
        .insert(t.listasPrecios)
        .values({ numero: d.numero, fecha: d.fecha, vigenteHasta: d.vigenteHasta, archivo: d.archivo, versiones: d.filas.length, usuarioId })
        .returning({ id: t.listasPrecios.id });

      // 1. Modelos que no existían: nacen ocultos, para completar fotos y descripción antes de mostrarlos
      const modelosNuevos = new Map<string, string>(); // línea normalizada → id
      const [{ orden }] = await tx.select({ orden: max(t.modelos.orden) }).from(t.modelos);
      let siguienteOrden = (orden ?? 0) + 1;
      for (const f of d.filas) {
        if (f.destino.tipo !== "nueva" || f.destino.modeloId) continue;
        const clave = aSlug(f.destino.linea);
        if (modelosNuevos.has(clave)) continue;
        const [existe] = await tx.select({ id: t.modelos.id }).from(t.modelos).where(eq(t.modelos.slug, clave));
        if (existe) {
          modelosNuevos.set(clave, existe.id);
          continue;
        }
        const [m] = await tx
          .insert(t.modelos)
          .values({ slug: clave, linea: f.destino.linea, ...datosIniciales(f.destino.linea, f.categoria), combustible: f.combustible, visible: false, orden: siguienteOrden++ })
          .returning({ id: t.modelos.id });
        modelosNuevos.set(clave, m.id);
      }

      // 2. Cada fila termina en una versión (existente o nueva) con su precio base y el texto de la lista
      const ahora = new Date();
      const publicadas: { versionId: string; modeloId: string; fila: (typeof d.filas)[number] }[] = [];
      for (const f of d.filas) {
        let versionId: string;
        let modeloId: string;
        if (f.destino.tipo === "existente") {
          const [v] = await tx.select({ id: t.versiones.id, modeloId: t.versiones.modeloId }).from(t.versiones).where(eq(t.versiones.id, f.destino.versionId));
          if (!v) throw new ErrorPublicacion("Alguna versión ya no existe. Vuelve a leer el Excel.");
          versionId = v.id;
          modeloId = v.modeloId;
        } else {
          modeloId = f.destino.modeloId ?? modelosNuevos.get(aSlug(f.destino.linea))!;
          const [{ ultimo }] = await tx.select({ ultimo: max(t.versiones.orden) }).from(t.versiones).where(eq(t.versiones.modeloId, modeloId));
          await tx
            .insert(t.versiones)
            .values({ modeloId, nombre: f.destino.nombre, transmision: f.destino.transmision, orden: Math.min((ultimo ?? -1) + 1, 99) })
            .onConflictDoNothing();
          const [v] = await tx
            .select({ id: t.versiones.id })
            .from(t.versiones)
            .where(and(eq(t.versiones.modeloId, modeloId), eq(t.versiones.nombre, f.destino.nombre), f.destino.transmision ? eq(t.versiones.transmision, f.destino.transmision) : sql`${t.versiones.transmision} is null`));
          if (!v) throw new ErrorPublicacion(`No se pudo crear la versión ${f.destino.nombre}.`);
          versionId = v.id;
        }
        // El texto de la lista identifica la versión en los próximos Excel: si otra lo tenía, se lo cede
        await tx.update(t.versiones).set({ nombreLista: null }).where(and(eq(t.versiones.nombreLista, f.texto), ne(t.versiones.id, versionId)));
        await tx
          .update(t.versiones)
          .set({
            nombreLista: f.texto,
            anioModelo: f.anio,
            visible: true,
            precioBase: f.referencia,
            precioBaseActualizado: sql`case when ${t.versiones.precioBase} is distinct from ${f.referencia} then now() else ${t.versiones.precioBaseActualizado} end`,
          })
          .where(eq(t.versiones.id, versionId));
        if (f.combustible) {
          await tx.update(t.modelos).set({ combustible: f.combustible }).where(and(eq(t.modelos.id, modeloId), sql`${t.modelos.combustible} is null`));
        }
        publicadas.push({ versionId, modeloId, fila: f });
      }
      if (new Set(publicadas.map((p) => p.versionId)).size !== publicadas.length) throw new ErrorPublicacion("Dos filas del Excel terminaron en la misma versión. Revisa los nombres.");

      await tx.insert(t.precios).values(
        publicadas.map((p) => ({ versionId: p.versionId, precioLista: p.fila.venta, nuevoPrecio: p.fila.nuevoPrecio, vigenteDesde: ahora, origen: "excel" as const, loteId: lista.id, usuarioId })),
      );

      // 3. Opcional: ocultar del catálogo lo que esta lista ya no trae (no se borra nada)
      let ocultas = 0;
      let modelosOcultos: string[] = [];
      if (d.ocultarFaltantes) {
        const ids = publicadas.map((p) => p.versionId);
        const conPrecio = [...new Set(publicadas.map((p) => p.modeloId))];
        const o = await tx
          .update(t.versiones)
          .set({ visible: false })
          .where(and(eq(t.versiones.visible, true), notInArray(t.versiones.id, ids)))
          .returning({ id: t.versiones.id });
        ocultas = o.length;
        const m = await tx
          .update(t.modelos)
          .set({ visible: false })
          .where(and(eq(t.modelos.visible, true), notInArray(t.modelos.id, conPrecio)))
          .returning({ linea: t.modelos.linea });
        modelosOcultos = m.map((x) => x.linea);
      }

      const nuevos = [...modelosNuevos.values()];
      const lineasNuevas = nuevos.length ? (await tx.select({ linea: t.modelos.linea }).from(t.modelos).where(inArray(t.modelos.id, nuevos))).map((x) => x.linea) : [];
      await tx.insert(t.auditoria).values({
        actor: "asesora",
        usuarioId,
        accion: `Cargó la lista de precios${d.numero ? ` No. ${d.numero}` : ""} desde Excel (${publicadas.length} versiones)`,
        entidad: "listas_precios",
        entidadId: lista.id,
        ip,
        detalle: { archivo: d.archivo, vigenteHasta: d.vigenteHasta, modelosNuevos: lineasNuevas, versionesOcultas: ocultas, modelosOcultos },
      });
      return { publicadas: publicadas.length, lineasNuevas, ocultas, modelosOcultos };
    });

    refresh();
    const partes = [`${resultado.publicadas} precios publicados.`];
    if (resultado.lineasNuevas.length) partes.push(`Se crearon ${resultado.lineasNuevas.join(", ")}: están ocultos hasta que les pongas fotos y descripción en Catálogo.`);
    if (resultado.ocultas || resultado.modelosOcultos.length)
      partes.push(`Se ocultaron ${resultado.ocultas} versiones${resultado.modelosOcultos.length ? ` y los modelos ${resultado.modelosOcultos.join(", ")}` : ""} que no vienen en la lista.`);
    return { ok: true, mensaje: partes.join(" "), modelosNuevos: resultado.lineasNuevas };
  } catch (e) {
    if (e instanceof ErrorPublicacion) return { ok: false, mensaje: e.message };
    throw e;
  }
}

class ErrorPublicacion extends Error {}
