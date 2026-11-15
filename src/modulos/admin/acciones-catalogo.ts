"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { and, asc, count, eq, gte, inArray, max, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import * as t from "@/db/esquema";
import { baseCatalogo, exigirGestorCatalogo } from "@/lib/autorizacion";
import { borrarFotoPublica, ErrorFoto, guardarFotoPublica } from "@/modulos/fotos/fotos";
import { idDeYoutube } from "@/lib/youtube";
import { erroresPorCampo } from "@/validacion/solicitud";
import { permitir } from "@/lib/limite";
import { nombreVersion, TIPO_VEHICULO } from "@/lib/formato";
import { ErrorIA, sugerirDescripciones } from "@/modulos/ia/descripcion";
import { sugerirFicha, type FichaSugerida } from "@/modulos/ia/ficha";
import type { Fuente } from "@/modulos/ia/gemini";

export interface ResultadoAdmin {
  ok: boolean;
  mensaje?: string;
  errores?: Record<string, string>;
}

const MAX_FOTOS = 8;
const MAX_BYTES_FOTO = 900 * 1024; // el navegador ya la comprime; esto es un tope de seguridad
const uuid = z.uuid();

/* ---------- crear y editar modelos ---------- */

export async function crearModelo() {
  const { usuarioId, ip, actor } = await exigirGestorCatalogo();
  const [{ ultimo }] = await db.select({ ultimo: max(t.modelos.orden) }).from(t.modelos);
  const sufijo = Math.random().toString(36).slice(2, 6);
  const [m] = await db
    .insert(t.modelos)
    .values({ slug: `nuevo-modelo-${sufijo}`, linea: "Nuevo modelo", tipo: "hatchback", puestos: 5, visible: false, orden: (ultimo ?? 0) + 1 })
    .returning({ id: t.modelos.id });
  await db.insert(t.auditoria).values({ actor, usuarioId, accion: "Creó un modelo (oculto)", entidad: "modelos", entidadId: m.id, ip });
  redirect(`${baseCatalogo(actor)}/${m.id}`); // el destino sale del rol, no de un dato del formulario
}

/** Medida en milímetros: vacío = sin dato; si no, un entero dentro de un rango realista */
const medida = (min: number, max: number) =>
  z
    .string()
    .transform((v) => v.replace(/\D/g, ""))
    .transform((v) => (v ? Number(v) : null))
    .refine((v) => v === null || (v >= min && v <= max), { error: `En milímetros, entre ${min.toLocaleString("es-CO")} y ${max.toLocaleString("es-CO")}.` });

const esquemaModelo = z.object({
  id: uuid,
  linea: z.string().trim().min(2, { error: "Escribe el nombre de la línea." }).max(40),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, { error: "Solo minúsculas, números y guiones. Ej: s-presso" })
    .max(40),
  tipo: z.enum(t.tipoVehiculo.enumValues, { error: "Elige el tipo." }),
  puestos: z.coerce.number().int().min(1, { error: "Entre 1 y 9." }).max(9, { error: "Entre 1 y 9." }),
  motor: z.string().trim().max(60).transform((v) => v || null),
  transmision: z.string().trim().max(60).transform((v) => v || null),
  combustible: z.enum(["", ...t.combustible.enumValues]).transform((v) => (v === "" ? null : v)),
  descripcion: z.string().trim().max(140, { error: "Máximo 140 caracteres." }).transform((v) => v || null),
  orden: z.coerce.number().int().min(0).max(99),
  visible: z.preprocess((v) => v === "on", z.boolean()),
  mostrarPrecio: z.preprocess((v) => v === "on", z.boolean()),
  // Ficha técnica
  baul: z.string().trim().max(80, { error: "Máximo 80 caracteres." }).transform((v) => v || null),
  seguridad: z
    .string()
    .transform((v) => [...new Set(v.split("\n").map((x) => x.replace(/\s+/g, " ").trim()).filter(Boolean))])
    .refine((xs) => xs.length <= 15, { error: "Máximo 15 elementos." })
    .refine((xs) => xs.every((x) => x.length <= 80), { error: "Cada elemento: máximo 80 caracteres." }),
  largoMm: medida(2000, 7000),
  anchoMm: medida(1000, 3000),
  altoMm: medida(1000, 3000),
  entreEjesMm: medida(1500, 4500),
  alturaPisoMm: medida(80, 400),
});

export async function guardarModelo(_previo: ResultadoAdmin, formulario: FormData): Promise<ResultadoAdmin> {
  const { usuarioId, ip, actor } = await exigirGestorCatalogo();
  const r = esquemaModelo.safeParse(Object.fromEntries(formulario));
  if (!r.success) return { ok: false, errores: erroresPorCampo(r.error), mensaje: "Revisa los campos marcados." };
  const { id, ...datos } = r.data;

  const [duplicado] = await db.select({ id: t.modelos.id }).from(t.modelos).where(and(eq(t.modelos.slug, datos.slug), ne(t.modelos.id, id)));
  if (duplicado) return { ok: false, errores: { slug: "Otro modelo ya usa esta dirección." } };

  const [antes] = await db.select().from(t.modelos).where(eq(t.modelos.id, id));
  if (!antes) return { ok: false, mensaje: "El modelo no existe." };

  if (antes.archivado && datos.visible) return { ok: false, mensaje: "Este modelo está archivado: sácalo del archivo antes de hacerlo visible." };
  await db.update(t.modelos).set(datos).where(eq(t.modelos.id, id));
  await db.insert(t.auditoria).values({ actor, usuarioId, accion: "Editó un modelo del catálogo", entidad: "modelos", entidadId: datos.linea, ip, detalle: datos });
  refresh();

  const avisos = [];
  if (antes.slug !== datos.slug && antes.visible) avisos.push("Cambiaste la dirección: los enlaces viejos a este modelo dejarán de funcionar");
  if (datos.visible && !antes.visible) avisos.push("El modelo ya se ve en el catálogo");
  return { ok: true, mensaje: ["Modelo guardado", ...avisos].join(". ") + "." };
}

/* ---------- fotos del modelo ---------- */

/** Reasigna el orden 0..n-1 sin chocar con el índice único (modelo, orden). */
async function reordenar(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], ids: string[]) {
  for (const [i, id] of ids.entries()) await tx.update(t.fotosModelo).set({ orden: 100 + i }).where(eq(t.fotosModelo.id, id));
  for (const [i, id] of ids.entries()) await tx.update(t.fotosModelo).set({ orden: i }).where(eq(t.fotosModelo.id, id));
}

export async function subirFotoModelo(modeloId: string, formulario: FormData): Promise<ResultadoAdmin> {
  const { usuarioId, ip, actor } = await exigirGestorCatalogo();
  if (!uuid.safeParse(modeloId).success) return { ok: false, mensaje: "Datos no válidos." };
  const archivo = formulario.get("foto");
  if (!(archivo instanceof File) || archivo.size === 0) return { ok: false, mensaje: "No llegó ninguna foto." };
  if (archivo.size > MAX_BYTES_FOTO) return { ok: false, mensaje: "La foto es demasiado pesada." };

  const fotos = await db.select({ id: t.fotosModelo.id }).from(t.fotosModelo).where(eq(t.fotosModelo.modeloId, modeloId));
  if (fotos.length >= MAX_FOTOS) return { ok: false, mensaje: `Cada modelo puede tener máximo ${MAX_FOTOS} fotos.` };

  try {
    const clave = await guardarFotoPublica(Buffer.from(await archivo.arrayBuffer()), "modelos", modeloId);
    const [m] = await db.select({ linea: t.modelos.linea }).from(t.modelos).where(eq(t.modelos.id, modeloId));
    await db.insert(t.fotosModelo).values({ modeloId, claveArchivo: clave, orden: fotos.length, textoAlternativo: m ? `Suzuki ${m.linea}` : null });
    await db.insert(t.auditoria).values({ actor, usuarioId, accion: "Subió una foto del catálogo", entidad: "modelos", entidadId: m?.linea, ip });
  } catch (e) {
    if (e instanceof ErrorFoto) return { ok: false, mensaje: e.message };
    throw e;
  }
  refresh();
  return { ok: true };
}

export async function borrarFotoModelo(fotoId: string): Promise<ResultadoAdmin> {
  const { usuarioId, ip, actor } = await exigirGestorCatalogo();
  if (!uuid.safeParse(fotoId).success) return { ok: false, mensaje: "Datos no válidos." };
  const [foto] = await db.select().from(t.fotosModelo).where(eq(t.fotosModelo.id, fotoId));
  if (!foto) return { ok: false, mensaje: "La foto ya no existe." };

  await db.transaction(async (tx) => {
    await tx.delete(t.fotosModelo).where(eq(t.fotosModelo.id, fotoId));
    const restantes = await tx.select({ id: t.fotosModelo.id }).from(t.fotosModelo).where(eq(t.fotosModelo.modeloId, foto.modeloId)).orderBy(asc(t.fotosModelo.orden));
    await reordenar(tx, restantes.map((f) => f.id));
    await tx.insert(t.auditoria).values({ actor, usuarioId, accion: "Borró una foto del catálogo", entidad: "fotos_modelo", entidadId: fotoId, ip });
  });
  await borrarFotoPublica(foto.claveArchivo); // después de la BD: si esto falla, solo queda un archivo huérfano
  refresh();
  return { ok: true, mensaje: "Foto borrada." };
}

/** Mueve una foto: "portada" la pone primera; -1 / +1 la corre una posición. */
export async function moverFoto(fotoId: string, movimiento: "portada" | -1 | 1): Promise<ResultadoAdmin> {
  await exigirGestorCatalogo();
  if (!uuid.safeParse(fotoId).success) return { ok: false, mensaje: "Datos no válidos." };
  const [foto] = await db.select().from(t.fotosModelo).where(eq(t.fotosModelo.id, fotoId));
  if (!foto) return { ok: false, mensaje: "La foto ya no existe." };

  await db.transaction(async (tx) => {
    const ids = (await tx.select({ id: t.fotosModelo.id }).from(t.fotosModelo).where(eq(t.fotosModelo.modeloId, foto.modeloId)).orderBy(asc(t.fotosModelo.orden))).map((f) => f.id);
    const i = ids.indexOf(fotoId);
    if (movimiento === "portada") ids.unshift(...ids.splice(i, 1));
    else {
      const j = i + movimiento;
      if (j < 0 || j >= ids.length) return;
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    await reordenar(tx, ids);
  });
  refresh();
  return { ok: true };
}

/* ---------- versiones del modelo ---------- */

const esquemaVersion = z.object({
  id: z.union([uuid, z.literal("")]).transform((v) => v || null), // vacío = versión nueva
  modeloId: uuid,
  nombre: z.string().trim().min(1, { error: "Escribe el nombre de la versión." }).max(40, { error: "Máximo 40 caracteres." }),
  transmision: z.enum(["", "mecanica", "automatica"]).transform((v) => (v === "" ? null : v)),
  orden: z.coerce.number().int().min(0).max(99),
  visible: z.preprocess((v) => v === "on", z.boolean()),
  // Llega formateado ("$ 73.990.000"): se dejan solo los dígitos. Vacío = sin precio base.
  precioBase: z
    .string()
    .optional()
    .transform((v) => {
      const d = (v ?? "").replace(/\D/g, "").slice(0, 12);
      return d ? Number(d) : null;
    })
    .refine((v) => v === null || v >= 1_000_000, { error: "Revisa el precio base: parece muy bajo." })
    .refine((v) => v === null || v <= 2_000_000_000, { error: "Revisa el precio base: parece muy alto." }),
});

export async function guardarVersion(_previo: ResultadoAdmin, formulario: FormData): Promise<ResultadoAdmin> {
  const { usuarioId, ip, actor } = await exigirGestorCatalogo();
  const r = esquemaVersion.safeParse(Object.fromEntries(formulario));
  if (!r.success) return { ok: false, errores: erroresPorCampo(r.error) };
  const { id, ...datos } = r.data;
  try {
    if (id) {
      // La fecha del precio base solo se mueve si el valor cambió de verdad
      const fechaBase = sql`case when ${t.versiones.precioBase} is distinct from ${datos.precioBase} then now() else ${t.versiones.precioBaseActualizado} end`;
      const [v] = await db.update(t.versiones).set({ ...datos, precioBaseActualizado: fechaBase }).where(and(eq(t.versiones.id, id), eq(t.versiones.modeloId, datos.modeloId))).returning({ id: t.versiones.id });
      if (!v) return { ok: false, mensaje: "La versión ya no existe." };
    } else {
      await db.insert(t.versiones).values({ ...datos, precioBaseActualizado: datos.precioBase ? new Date() : null });
    }
  } catch (e) {
    // El índice único (modelo, nombre, transmisión) avisa si ya existe
    if (String((e as { cause?: { code?: string } })?.cause?.code ?? (e as { code?: string }).code) === "23505") {
      return { ok: false, errores: { nombre: "Ya existe una versión con ese nombre y esa transmisión." } };
    }
    throw e;
  }
  await db.insert(t.auditoria).values({ actor, usuarioId, accion: id ? "Editó una versión" : "Agregó una versión", entidad: "versiones", entidadId: datos.nombre, ip, detalle: datos });
  refresh();
  return { ok: true, mensaje: id ? "Versión guardada." : "Versión agregada." };
}

/** Solo se borran versiones sin historial de precios: las demás se ocultan, para no perder ese historial. */
export async function borrarVersion(versionId: string): Promise<ResultadoAdmin> {
  const { usuarioId, ip, actor } = await exigirGestorCatalogo();
  if (!uuid.safeParse(versionId).success) return { ok: false, mensaje: "Datos no válidos." };
  const [{ n }] = await db.select({ n: count() }).from(t.precios).where(eq(t.precios.versionId, versionId));
  if (n > 0) return { ok: false, mensaje: "Esta versión tiene historial de precios: ocúltala en lugar de borrarla." };
  const [v] = await db.delete(t.versiones).where(eq(t.versiones.id, versionId)).returning({ nombre: t.versiones.nombre });
  if (!v) return { ok: false, mensaje: "La versión ya no existe." };
  await db.insert(t.auditoria).values({ actor, usuarioId, accion: "Borró una versión sin precios", entidad: "versiones", entidadId: v.nombre, ip });
  refresh();
  return { ok: true, mensaje: "Versión borrada." };
}

/* ---------- archivar y eliminar modelos ---------- */

/** Archivar: deja de venderse (sale del catálogo y del panel de precios) sin perder nada. */
export async function archivarModelo(modeloId: string, archivar: boolean): Promise<ResultadoAdmin> {
  const { usuarioId, ip, actor } = await exigirGestorCatalogo();
  if (!uuid.safeParse(modeloId).success) return { ok: false, mensaje: "Datos no válidos." };
  const [m] = await db
    .update(t.modelos)
    .set(archivar ? { archivado: true, visible: false } : { archivado: false })
    .where(eq(t.modelos.id, modeloId))
    .returning({ linea: t.modelos.linea });
  if (!m) return { ok: false, mensaje: "El modelo no existe." };
  await db.insert(t.auditoria).values({ actor, usuarioId, accion: archivar ? "Archivó un modelo" : "Sacó un modelo del archivo", entidad: "modelos", entidadId: m.linea, ip });
  refresh();
  return { ok: true, mensaje: archivar ? `${m.linea} archivado: ya no aparece en el catálogo ni en precios.` : `${m.linea} salió del archivo. Sigue oculto hasta que lo marques como visible.` };
}

/**
 * Eliminar: solo si ninguna solicitud lo usa. Si alguna lo usa, la base de datos le
 * quitaría el modelo a esa solicitud (SET NULL) y su PDF quedaría con la línea vacía.
 * Se pide escribir el nombre del modelo para confirmar.
 */
export async function eliminarModelo(modeloId: string, confirmacion: string): Promise<ResultadoAdmin> {
  const { usuarioId, ip, actor } = await exigirGestorCatalogo();
  if (!uuid.safeParse(modeloId).success) return { ok: false, mensaje: "Datos no válidos." };
  const [m] = await db.select({ linea: t.modelos.linea }).from(t.modelos).where(eq(t.modelos.id, modeloId));
  if (!m) return { ok: false, mensaje: "El modelo ya no existe." };
  if (confirmacion.trim().toLowerCase() !== m.linea.toLowerCase()) return { ok: false, mensaje: `Escribe “${m.linea}” para confirmar.` };

  const [{ n }] = await db.select({ n: count() }).from(t.solicitudes).where(eq(t.solicitudes.modeloId, modeloId));
  if (n > 0) return { ok: false, mensaje: `${n} ${n === 1 ? "solicitud usa" : "solicitudes usan"} este modelo. Archívalo en lugar de eliminarlo.` };

  // La cascada borra las filas de fotos, versiones, precios y promociones; los archivos hay que borrarlos aparte
  const fotos = await db.select({ clave: t.fotosModelo.claveArchivo }).from(t.fotosModelo).where(eq(t.fotosModelo.modeloId, modeloId));
  await db.transaction(async (tx) => {
    await tx.delete(t.modelos).where(eq(t.modelos.id, modeloId));
    await tx.insert(t.auditoria).values({ actor, usuarioId, accion: "Eliminó un modelo del catálogo", entidad: "modelos", entidadId: m.linea, ip, detalle: { fotos: fotos.length } });
  });
  await Promise.allSettled(fotos.map((f) => borrarFotoPublica(f.clave)));
  redirect(baseCatalogo(actor));
}

/* ---------- video de YouTube del modelo ---------- */

/** Recibe el enlace tal como lo copie Natalia; guarda solo el identificador. Texto vacío = quitar el video. */
export async function guardarVideo(modeloId: string, enlace: string): Promise<ResultadoAdmin> {
  const { usuarioId, ip, actor } = await exigirGestorCatalogo();
  if (!uuid.safeParse(modeloId).success) return { ok: false, mensaje: "Datos no válidos." };
  const id = enlace.trim() ? idDeYoutube(enlace) : null;
  if (enlace.trim() && !id) return { ok: false, mensaje: "Ese enlace no es de un video de YouTube. Cópialo desde el botón “Compartir” del video." };
  const [m] = await db.update(t.modelos).set({ videoYoutube: id }).where(eq(t.modelos.id, modeloId)).returning({ linea: t.modelos.linea });
  if (!m) return { ok: false, mensaje: "El modelo no existe." };
  await db.insert(t.auditoria).values({ actor, usuarioId, accion: id ? "Puso el video de un modelo" : "Quitó el video de un modelo", entidad: "modelos", entidadId: m.linea, ip, detalle: { video: id } });
  refresh();
  return { ok: true, mensaje: id ? "Video guardado." : "Video quitado." };
}

/* ---------- descripción del modelo con IA (Gemini) ---------- */

const ACCION_IA = "Pidió descripciones a la IA";
const ACCION_FICHA = "Pidió la ficha técnica a la IA";

/**
 * Tope mensual compartido por las dos funciones de IA: el plan gratuito de Gemini tiene límites
 * y esto evita gastarlos sin querer. Devuelve el mensaje si ya se llegó, o null.
 */
async function topeIA() {
  // Vacío, cero o algo que no sea número = el valor por defecto (un "IA_USOS_MES=" vacío dejaba el tope en 0)
  const configurado = Number(process.env.IA_USOS_MES);
  const tope = Number.isInteger(configurado) && configurado > 0 ? configurado : 200;
  const [{ usados }] = await db
    .select({ usados: count() })
    .from(t.auditoria)
    .where(
      and(
        inArray(t.auditoria.accion, [ACCION_IA, ACCION_FICHA]),
        gte(t.auditoria.creadoEn, sql`date_trunc('month', now() at time zone 'America/Bogota') at time zone 'America/Bogota'`),
      ),
    );
  return usados >= tope ? `Se alcanzó el tope de ${tope} usos de la IA este mes.` : null;
}
const COMBUSTIBLES: Record<string, string> = { gasolina: "gasolina", hibrido: "híbrido", electrico: "eléctrico" };

const esquemaSugerencia = z.object({
  linea: z.string().trim().min(2, { error: "Escribe primero el nombre de la línea." }).max(40),
  tipo: z.enum(t.tipoVehiculo.enumValues),
  puestos: z.coerce.number().int().min(1).max(9),
  motor: z.string().trim().max(60),
  transmision: z.string().trim().max(60),
  combustible: z.string().trim().max(20),
  descripcion: z.string().trim().max(400),
});

/**
 * Propone tres descripciones con los datos que hay en el formulario (aunque no se hayan guardado)
 * y las versiones visibles del modelo. No guarda nada: Natalia elige y luego guarda el modelo.
 */
export async function sugerirDescripcion(modeloId: string, campos: Record<string, string>): Promise<{ ok: true; opciones: string[] } | { ok: false; mensaje: string }> {
  const { usuarioId, ip, actor } = await exigirGestorCatalogo();
  if (!uuid.safeParse(modeloId).success) return { ok: false, mensaje: "Datos no válidos." };
  const r = esquemaSugerencia.safeParse(campos);
  if (!r.success) return { ok: false, mensaje: r.error.issues[0]?.message ?? "Revisa los datos del modelo." };
  if (!permitir(`ia-descripcion:${usuarioId}`, 15, 60 * 60 * 1000)) return { ok: false, mensaje: "Pediste muchas descripciones seguidas. Intenta en un rato." };

  const tope = await topeIA();
  if (tope) return { ok: false, mensaje: tope };

  const versiones = await db
    .select({ nombre: t.versiones.nombre, transmision: t.versiones.transmision })
    .from(t.versiones)
    .where(and(eq(t.versiones.modeloId, modeloId), eq(t.versiones.visible, true)))
    .orderBy(asc(t.versiones.orden), asc(t.versiones.nombre));

  const d = r.data;
  try {
    const opciones = await sugerirDescripciones({
      linea: d.linea,
      tipo: TIPO_VEHICULO[d.tipo],
      puestos: d.puestos,
      motor: d.motor || null,
      transmision: d.transmision || null,
      combustible: COMBUSTIBLES[d.combustible] ?? null,
      versiones: versiones.map(nombreVersion),
      actual: d.descripcion || null,
    });
    await db.insert(t.auditoria).values({ actor, usuarioId, accion: ACCION_IA, entidad: "modelos", entidadId: d.linea, ip });
    return { ok: true, opciones };
  } catch (e) {
    if (e instanceof ErrorIA) return { ok: false, mensaje: e.message };
    console.error("Error pidiendo descripciones a la IA", e);
    return { ok: false, mensaje: "La IA no pudo escribir la descripción. Intenta de nuevo." };
  }
}

/* ---------- colores del modelo ---------- */

const MAX_COLORES = 12;
const esquemaColor = z.object({
  modeloId: uuid,
  nombre: z.string().trim().min(1, { error: "Escribe el nombre del color." }).max(30, { error: "Máximo 30 caracteres." }),
  hex: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^#[0-9a-f]{6}$/, { error: "Elige el color." }),
});

export async function agregarColor(_previo: ResultadoAdmin, formulario: FormData): Promise<ResultadoAdmin> {
  const { usuarioId, ip, actor } = await exigirGestorCatalogo();
  const r = esquemaColor.safeParse(Object.fromEntries(formulario));
  if (!r.success) return { ok: false, errores: erroresPorCampo(r.error) };
  const { modeloId, nombre, hex } = r.data;
  const [m] = await db.select({ linea: t.modelos.linea }).from(t.modelos).where(eq(t.modelos.id, modeloId));
  if (!m) return { ok: false, mensaje: "El modelo no existe." };
  const [{ n, ultimo }] = await db.select({ n: count(), ultimo: max(t.coloresModelo.orden) }).from(t.coloresModelo).where(eq(t.coloresModelo.modeloId, modeloId));
  if (n >= MAX_COLORES) return { ok: false, mensaje: `Máximo ${MAX_COLORES} colores por modelo.` };
  const nuevo = await db
    .insert(t.coloresModelo)
    .values({ modeloId, nombre, hex, orden: (ultimo ?? -1) + 1 })
    .onConflictDoNothing()
    .returning({ id: t.coloresModelo.id });
  if (!nuevo.length) return { ok: false, errores: { nombre: "Ese color ya está en la lista." } };
  await db.insert(t.auditoria).values({ actor, usuarioId, accion: "Agregó un color", entidad: "modelos", entidadId: m.linea, ip, detalle: { nombre, hex } });
  refresh();
  return { ok: true, mensaje: `${nombre} agregado.` };
}

export async function quitarColor(colorId: string): Promise<ResultadoAdmin> {
  const { usuarioId, ip, actor } = await exigirGestorCatalogo();
  if (!uuid.safeParse(colorId).success) return { ok: false, mensaje: "Datos no válidos." };
  const [c] = await db.delete(t.coloresModelo).where(eq(t.coloresModelo.id, colorId)).returning({ nombre: t.coloresModelo.nombre, modeloId: t.coloresModelo.modeloId });
  if (!c) return { ok: false, mensaje: "Ese color ya no está." };
  await db.insert(t.auditoria).values({ actor, usuarioId, accion: "Quitó un color", entidad: "modelos", entidadId: c.modeloId, ip, detalle: { nombre: c.nombre } });
  refresh();
  return { ok: true };
}

/** Mueve un color un puesto a la izquierda (-1) o a la derecha (1). El primero es el que se ve primero. */
export async function moverColor(colorId: string, direccion: -1 | 1): Promise<ResultadoAdmin> {
  await exigirGestorCatalogo();
  if (!uuid.safeParse(colorId).success || (direccion !== -1 && direccion !== 1)) return { ok: false, mensaje: "Datos no válidos." };
  const [c] = await db.select().from(t.coloresModelo).where(eq(t.coloresModelo.id, colorId));
  if (!c) return { ok: false, mensaje: "Ese color ya no está." };
  const todos = await db.select({ id: t.coloresModelo.id }).from(t.coloresModelo).where(eq(t.coloresModelo.modeloId, c.modeloId)).orderBy(asc(t.coloresModelo.orden), asc(t.coloresModelo.creadoEn));
  const i = todos.findIndex((x) => x.id === colorId);
  const j = i + direccion;
  if (j < 0 || j >= todos.length) return { ok: true };
  [todos[i], todos[j]] = [todos[j], todos[i]];
  await db.transaction(async (tx) => {
    for (const [orden, x] of todos.entries()) await tx.update(t.coloresModelo).set({ orden }).where(eq(t.coloresModelo.id, x.id));
  });
  refresh();
  return { ok: true };
}

/* ---------- ficha técnica con IA (Gemini + búsqueda en Google) ---------- */

/**
 * Propone la ficha técnica buscando en internet. No guarda nada: llena el formulario y
 * Natalia (o el admin) revisa cada dato contra las fuentes antes de guardar el modelo.
 */
export async function completarFicha(
  modeloId: string,
  campos: { linea: string; tipo: string },
): Promise<{ ok: true; ficha: FichaSugerida; fuentes: Fuente[]; verificada: boolean } | { ok: false; mensaje: string }> {
  const { usuarioId, ip, actor } = await exigirGestorCatalogo();
  const r = z.object({ id: uuid, linea: z.string().trim().min(2, { error: "Escribe primero el nombre de la línea." }).max(40), tipo: z.enum(t.tipoVehiculo.enumValues) }).safeParse({ id: modeloId, ...campos });
  if (!r.success) return { ok: false, mensaje: r.error.issues[0]?.message ?? "Revisa los datos del modelo." };
  if (!permitir(`ia-ficha:${usuarioId}`, 10, 60 * 60 * 1000)) return { ok: false, mensaje: "Pediste muchas fichas seguidas. Intenta en un rato." };
  const tope = await topeIA();
  if (tope) return { ok: false, mensaje: tope };

  const versiones = await db
    .select({ nombre: t.versiones.nombre, transmision: t.versiones.transmision, precioBase: t.versiones.precioBase })
    .from(t.versiones)
    .where(and(eq(t.versiones.modeloId, modeloId), eq(t.versiones.visible, true)))
    .orderBy(asc(t.versiones.orden), asc(t.versiones.nombre));
  const entrada = versiones.filter((v) => v.precioBase).sort((a, b) => a.precioBase! - b.precioBase!)[0] ?? versiones[0];

  try {
    const res = await sugerirFicha({
      linea: r.data.linea,
      tipo: TIPO_VEHICULO[r.data.tipo],
      versiones: versiones.map(nombreVersion),
      versionEntrada: entrada ? nombreVersion(entrada) : null,
    });
    await db.insert(t.auditoria).values({ actor, usuarioId, accion: ACCION_FICHA, entidad: "modelos", entidadId: r.data.linea, ip, detalle: { fuentes: res.fuentes.map((f) => f.url), verificada: res.verificada } });
    return { ok: true, ...res };
  } catch (e) {
    if (e instanceof ErrorIA) return { ok: false, mensaje: e.message };
    console.error("Error pidiendo la ficha técnica a la IA", e);
    return { ok: false, mensaje: "La IA no pudo completar la ficha. Intenta de nuevo." };
  }
}
