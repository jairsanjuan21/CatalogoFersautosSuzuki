"use server";

import { refresh } from "next/cache";
import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import * as t from "@/db/esquema";
import { exigirAsesora } from "@/lib/autorizacion";
import { plata } from "@/lib/formato";
import { erroresPorCampo } from "@/validacion/solicitud";

export interface ResultadoPrecios {
  ok: boolean;
  mensaje?: string;
  errores?: Record<string, string>;
  /** Cambios grandes que Natalia debe confirmar antes de guardar */
  avisos?: Record<string, string>;
}


const CAMBIO_SOSPECHOSO = 0.25; // más de 25 %: probablemente sobra o falta un cero
const PRECIO_MINIMO = 10_000_000; // ningún carro nuevo cuesta menos que esto
const PRECIO_MAXIMO = 2_000_000_000;

/* ---------- guardar los precios del día ---------- */

/**
 * El formulario envía dos tipos de campo:
 *   "base:<idDelModelo>"     → precio base del modelo (fijo, solo se guarda si cambió)
 *   "precio:<idDeLaVersion>" → precio de una versión (se guarda siempre: confirma el precio de hoy)
 * Los errores y avisos vuelven con la misma clave para pintarlos junto a su campo.
 */
export async function guardarPrecios(_previo: ResultadoPrecios, formulario: FormData): Promise<ResultadoPrecios> {
  const { usuarioId, ip } = await exigirAsesora();
  const confirmado = formulario.get("confirmar") === "1";
  const leer = (prefijo: string) =>
    [...formulario.entries()]
      .filter(([k, v]) => k.startsWith(prefijo) && String(v).trim() !== "")
      .map(([k, v]) => ({ clave: k, id: k.slice(prefijo.length), precio: Number(String(v).replace(/\D/g, "")) }));
  const bases = leer("base:");
  const enviados = leer("precio:");
  if (!enviados.length && !bases.length) return { ok: false, mensaje: "Escribe al menos un precio." };
  if (![...bases, ...enviados].every((e) => z.uuid().safeParse(e.id).success)) return { ok: false, mensaje: "Datos no válidos." };

  const [modelos, versiones] = await Promise.all([
    bases.length ? db.select({ id: t.modelos.id, linea: t.modelos.linea, base: t.modelos.precioBase }).from(t.modelos).where(and(inArray(t.modelos.id, bases.map((b) => b.id)), eq(t.modelos.visible, true))) : [],
    enviados.length
      ? db
          .select({ id: t.versiones.id, nombre: t.versiones.nombre, linea: t.modelos.linea, precio: t.preciosVigentes.precioLista })
          .from(t.versiones)
          .innerJoin(t.modelos, eq(t.modelos.id, t.versiones.modeloId))
          .leftJoin(t.preciosVigentes, eq(t.preciosVigentes.versionId, t.versiones.id))
          .where(and(inArray(t.versiones.id, enviados.map((e) => e.id)), eq(t.modelos.visible, true)))
      : [],
  ]);

  const errores: Record<string, string> = {};
  const avisos: Record<string, string> = {};
  const revisar = (clave: string, nuevo: number, actual: number | null | undefined, existe: boolean) => {
    if (!existe) errores[clave] = "Ya no está en el catálogo.";
    else if (!Number.isInteger(nuevo) || nuevo < PRECIO_MINIMO || nuevo > PRECIO_MAXIMO)
      errores[clave] = `Revisa el valor: debe estar entre ${plata(PRECIO_MINIMO)} y ${plata(PRECIO_MAXIMO)}.`;
    else if (actual && Math.abs(nuevo - actual) / actual > CAMBIO_SOSPECHOSO) {
      const pct = Math.round(((nuevo - actual) / actual) * 100);
      avisos[clave] = `${pct > 0 ? "Sube" : "Baja"} ${Math.abs(pct)} % frente a ${plata(actual)}. ¿Está bien?`;
    }
  };
  for (const b of bases) {
    const m = modelos.find((x) => x.id === b.id);
    revisar(b.clave, b.precio, m?.base, !!m);
  }
  for (const e of enviados) {
    const v = versiones.find((x) => x.id === e.id);
    revisar(e.clave, e.precio, v?.precio, !!v);
  }
  if (Object.keys(errores).length) return { ok: false, errores, mensaje: "Revisa los precios marcados." };
  if (Object.keys(avisos).length && !confirmado) return { ok: false, avisos, mensaje: "Algunos precios cambian mucho. Revísalos y confirma." };

  const ahora = new Date();
  const lote = randomUUID();
  const basesCambiadas = bases.filter((b) => modelos.find((m) => m.id === b.id)?.base !== b.precio);
  const versionesCambiadas = enviados.filter((e) => versiones.find((v) => v.id === e.id)?.precio !== e.precio);

  await db.transaction(async (tx) => {
    for (const b of basesCambiadas) await tx.update(t.modelos).set({ precioBase: b.precio, precioBaseActualizado: ahora }).where(eq(t.modelos.id, b.id));
    // Una fila por versión aunque el precio no cambie: deja constancia de que Natalia lo confirmó hoy
    if (enviados.length) {
      await tx.insert(t.precios).values(enviados.map((e) => ({ versionId: e.id, precioLista: e.precio, vigenteDesde: ahora, origen: "manual" as const, loteId: lote, usuarioId })));
    }
    await tx.insert(t.auditoria).values({
      actor: "asesora",
      usuarioId,
      accion: `Actualizó precios del día (${enviados.length} versiones, ${versionesCambiadas.length} con cambio${basesCambiadas.length ? `, ${basesCambiadas.length} precios base` : ""})`,
      entidad: "precios",
      entidadId: lote,
      ip,
      detalle: {
        bases: basesCambiadas.map((b) => ({ modelo: modelos.find((m) => m.id === b.id)?.linea, precio: b.precio })),
        versiones: versionesCambiadas.map((c) => { const v = versiones.find((x) => x.id === c.id); return { version: `${v?.linea} ${v?.nombre}`, precio: c.precio }; }),
      },
    });
  });

  refresh();
  const cambios = versionesCambiadas.length + basesCambiadas.length;
  return { ok: true, mensaje: cambios ? `Precios guardados: ${cambios} ${cambios === 1 ? "cambió" : "cambiaron"}.` : "Precios confirmados para hoy." };
}

/* ---------- mostrar u ocultar el precio en el catálogo ---------- */

export async function cambiarMostrarPrecio(modeloId: string, mostrar: boolean): Promise<ResultadoPrecios> {
  const { usuarioId, ip } = await exigirAsesora();
  if (!z.uuid().safeParse(modeloId).success) return { ok: false, mensaje: "Datos no válidos." };
  const [m] = await db
    .update(t.modelos)
    .set({ mostrarPrecio: mostrar })
    .where(eq(t.modelos.id, modeloId))
    .returning({ linea: t.modelos.linea });
  if (!m) return { ok: false, mensaje: "El modelo no existe." };
  await db.insert(t.auditoria).values({
    actor: "asesora",
    usuarioId,
    accion: `${mostrar ? "Mostró" : "Ocultó"} el precio en el catálogo`,
    entidad: "modelos",
    entidadId: m.linea,
    ip,
  });
  refresh();
  return { ok: true, mensaje: mostrar ? `${m.linea}: precio visible en el catálogo.` : `${m.linea}: el catálogo mostrará "Cotizar con Natalia".` };
}

/* ---------- promociones ---------- */

const hoyEnColombia = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date());

const esquemaPromocion = z.object({
  modeloId: z.uuid({ error: "Elige el modelo." }),
  descripcion: z.string().trim().min(5, { error: "Describe la promoción (mínimo 5 caracteres)." }).max(120, { error: "Máximo 120 caracteres." }),
  valorBono: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v.replace(/\D/g, "")) : null))
    .refine((v) => v === null || (Number.isInteger(v) && v > 0 && v < 200_000_000), { error: "Revisa el valor del bono." }),
  hasta: z.iso.date({ error: "Elige hasta cuándo es válida." }).refine((v) => v >= hoyEnColombia(), { error: "La fecha ya pasó." }),
});

export async function crearPromocion(_previo: ResultadoPrecios, formulario: FormData): Promise<ResultadoPrecios> {
  const { usuarioId, ip } = await exigirAsesora();
  const r = esquemaPromocion.safeParse(Object.fromEntries(formulario));
  // erroresPorCampo se queda con el PRIMER error de cada campo (el más útil para la persona)
  if (!r.success) return { ok: false, errores: erroresPorCampo(r.error) };
  const [m] = await db.select({ linea: t.modelos.linea }).from(t.modelos).where(eq(t.modelos.id, r.data.modeloId));
  if (!m) return { ok: false, errores: { modeloId: "Ese modelo no existe." } };

  await db.insert(t.promociones).values(r.data);
  await db.insert(t.auditoria).values({ actor: "asesora", usuarioId, accion: "Creó una promoción", entidad: "promociones", entidadId: m.linea, ip, detalle: r.data });
  refresh();
  return { ok: true, mensaje: "Promoción agregada." };
}

export async function eliminarPromocion(promocionId: string): Promise<ResultadoPrecios> {
  const { usuarioId, ip } = await exigirAsesora();
  if (!z.uuid().safeParse(promocionId).success) return { ok: false, mensaje: "Datos no válidos." };
  const [p] = await db.delete(t.promociones).where(eq(t.promociones.id, promocionId)).returning();
  if (!p) return { ok: false, mensaje: "La promoción ya no existe." };
  await db.insert(t.auditoria).values({ actor: "asesora", usuarioId, accion: "Quitó una promoción", entidad: "promociones", entidadId: p.id, ip, detalle: { descripcion: p.descripcion, hasta: p.hasta } });
  refresh();
  return { ok: true, mensaje: "Promoción quitada." };
}

/* ---------- publicar lo que leyó la IA (después de que Natalia lo revisa) ---------- */

const esquemaPublicacion = z
  .array(z.object({ versionId: z.uuid(), precio: z.number().int().min(PRECIO_MINIMO).max(PRECIO_MAXIMO) }))
  .min(1, { error: "Selecciona al menos un precio." })
  .max(50);

export async function publicarPreciosLeidos(seleccion: { versionId: string; precio: number }[], archivo: string): Promise<ResultadoPrecios> {
  const { usuarioId, ip } = await exigirAsesora();
  const r = esquemaPublicacion.safeParse(seleccion);
  if (!r.success) return { ok: false, mensaje: r.error.issues[0]?.message ?? "Datos no válidos." };
  const ids = r.data.map((s) => s.versionId);
  const existentes = await db
    .select({ id: t.versiones.id })
    .from(t.versiones)
    .innerJoin(t.modelos, eq(t.modelos.id, t.versiones.modeloId))
    .where(and(inArray(t.versiones.id, ids), eq(t.modelos.visible, true)));
  if (existentes.length !== new Set(ids).size) return { ok: false, mensaje: "Alguna versión ya no está en el catálogo. Vuelve a leer el PDF." };

  const lote = randomUUID();
  const ahora = new Date();
  await db.transaction(async (tx) => {
    await tx.insert(t.precios).values(r.data.map((s) => ({ versionId: s.versionId, precioLista: s.precio, vigenteDesde: ahora, origen: "pdf_ia" as const, loteId: lote, usuarioId })));
    await tx.insert(t.auditoria).values({ actor: "asesora", usuarioId, accion: `Publicó ${r.data.length} precios leídos de un PDF`, entidad: "precios", entidadId: lote, ip, detalle: { archivo: archivo.slice(0, 120) } });
  });
  refresh();
  return { ok: true, mensaje: `${r.data.length} precios publicados.` };
}
