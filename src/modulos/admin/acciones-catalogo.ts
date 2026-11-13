"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { and, asc, count, eq, max, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import * as t from "@/db/esquema";
import { baseCatalogo, exigirGestorCatalogo } from "@/lib/autorizacion";
import { borrarFotoPublica, ErrorFoto, guardarFotoPublica } from "@/modulos/fotos/fotos";
import { idDeYoutube } from "@/lib/youtube";
import { erroresPorCampo } from "@/validacion/solicitud";

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
  descripcion: z.string().trim().max(140, { error: "Máximo 140 caracteres." }).transform((v) => v || null),
  orden: z.coerce.number().int().min(0).max(99),
  visible: z.preprocess((v) => v === "on", z.boolean()),
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
});

export async function guardarVersion(_previo: ResultadoAdmin, formulario: FormData): Promise<ResultadoAdmin> {
  const { usuarioId, ip, actor } = await exigirGestorCatalogo();
  const r = esquemaVersion.safeParse(Object.fromEntries(formulario));
  if (!r.success) return { ok: false, errores: erroresPorCampo(r.error) };
  const { id, ...datos } = r.data;
  try {
    if (id) {
      const [v] = await db.update(t.versiones).set(datos).where(and(eq(t.versiones.id, id), eq(t.versiones.modeloId, datos.modeloId))).returning({ id: t.versiones.id });
      if (!v) return { ok: false, mensaje: "La versión ya no existe." };
    } else {
      await db.insert(t.versiones).values(datos);
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
