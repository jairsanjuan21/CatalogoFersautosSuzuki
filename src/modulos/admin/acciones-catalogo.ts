"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { and, asc, eq, max, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import * as t from "@/db/esquema";
import { exigirAdmin } from "@/lib/autorizacion";
import { borrarFotoPublica, ErrorFoto, guardarFotoPublica } from "@/modulos/fotos/fotos";
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
  const { usuarioId, ip } = await exigirAdmin();
  const [{ ultimo }] = await db.select({ ultimo: max(t.modelos.orden) }).from(t.modelos);
  const sufijo = Math.random().toString(36).slice(2, 6);
  const [m] = await db
    .insert(t.modelos)
    .values({ slug: `nuevo-modelo-${sufijo}`, linea: "Nuevo modelo", tipo: "hatchback", puestos: 5, visible: false, orden: (ultimo ?? 0) + 1 })
    .returning({ id: t.modelos.id });
  await db.insert(t.auditoria).values({ actor: "admin", usuarioId, accion: "Creó un modelo (oculto)", entidad: "modelos", entidadId: m.id, ip });
  redirect(`/admin/catalogo/${m.id}`);
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
  const { usuarioId, ip } = await exigirAdmin();
  const r = esquemaModelo.safeParse(Object.fromEntries(formulario));
  if (!r.success) return { ok: false, errores: erroresPorCampo(r.error), mensaje: "Revisa los campos marcados." };
  const { id, ...datos } = r.data;

  const [duplicado] = await db.select({ id: t.modelos.id }).from(t.modelos).where(and(eq(t.modelos.slug, datos.slug), ne(t.modelos.id, id)));
  if (duplicado) return { ok: false, errores: { slug: "Otro modelo ya usa esta dirección." } };

  const [antes] = await db.select().from(t.modelos).where(eq(t.modelos.id, id));
  if (!antes) return { ok: false, mensaje: "El modelo no existe." };

  await db.update(t.modelos).set(datos).where(eq(t.modelos.id, id));
  await db.insert(t.auditoria).values({ actor: "admin", usuarioId, accion: "Editó un modelo del catálogo", entidad: "modelos", entidadId: datos.linea, ip, detalle: datos });
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
  const { usuarioId, ip } = await exigirAdmin();
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
    await db.insert(t.auditoria).values({ actor: "admin", usuarioId, accion: "Subió una foto del catálogo", entidad: "modelos", entidadId: m?.linea, ip });
  } catch (e) {
    if (e instanceof ErrorFoto) return { ok: false, mensaje: e.message };
    throw e;
  }
  refresh();
  return { ok: true };
}

export async function borrarFotoModelo(fotoId: string): Promise<ResultadoAdmin> {
  const { usuarioId, ip } = await exigirAdmin();
  if (!uuid.safeParse(fotoId).success) return { ok: false, mensaje: "Datos no válidos." };
  const [foto] = await db.select().from(t.fotosModelo).where(eq(t.fotosModelo.id, fotoId));
  if (!foto) return { ok: false, mensaje: "La foto ya no existe." };

  await db.transaction(async (tx) => {
    await tx.delete(t.fotosModelo).where(eq(t.fotosModelo.id, fotoId));
    const restantes = await tx.select({ id: t.fotosModelo.id }).from(t.fotosModelo).where(eq(t.fotosModelo.modeloId, foto.modeloId)).orderBy(asc(t.fotosModelo.orden));
    await reordenar(tx, restantes.map((f) => f.id));
    await tx.insert(t.auditoria).values({ actor: "admin", usuarioId, accion: "Borró una foto del catálogo", entidad: "fotos_modelo", entidadId: fotoId, ip });
  });
  await borrarFotoPublica(foto.claveArchivo); // después de la BD: si esto falla, solo queda un archivo huérfano
  refresh();
  return { ok: true, mensaje: "Foto borrada." };
}

/** Mueve una foto: "portada" la pone primera; -1 / +1 la corre una posición. */
export async function moverFoto(fotoId: string, movimiento: "portada" | -1 | 1): Promise<ResultadoAdmin> {
  await exigirAdmin();
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
