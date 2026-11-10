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

export async function guardarPrecios(_previo: ResultadoPrecios, formulario: FormData): Promise<ResultadoPrecios> {
  const { usuarioId, ip } = await exigirAsesora();
  const confirmado = formulario.get("confirmar") === "1";

  // Llegan como "precio:<idDelModelo>" = "77990000"
  const enviados = [...formulario.entries()]
    .filter(([k, v]) => k.startsWith("precio:") && String(v).trim() !== "")
    .map(([k, v]) => ({ modeloId: k.slice(7), precio: Number(String(v).replace(/\D/g, "")) }));
  if (!enviados.length) return { ok: false, mensaje: "Escribe al menos un precio." };

  const ids = enviados.map((e) => e.modeloId);
  if (!ids.every((x) => z.uuid().safeParse(x).success)) return { ok: false, mensaje: "Datos no válidos." };

  const actuales = await db
    .select({ id: t.modelos.id, linea: t.modelos.linea, precio: t.preciosVigentes.precioLista })
    .from(t.modelos)
    .leftJoin(t.preciosVigentes, eq(t.preciosVigentes.modeloId, t.modelos.id))
    .where(and(inArray(t.modelos.id, ids), eq(t.modelos.visible, true)));

  const errores: Record<string, string> = {};
  const avisos: Record<string, string> = {};
  for (const e of enviados) {
    const actual = actuales.find((a) => a.id === e.modeloId);
    if (!actual) errores[e.modeloId] = "Este modelo no existe.";
    else if (!Number.isInteger(e.precio) || e.precio < PRECIO_MINIMO || e.precio > PRECIO_MAXIMO)
      errores[e.modeloId] = `Revisa el valor: debe estar entre ${plata(PRECIO_MINIMO)} y ${plata(PRECIO_MAXIMO)}.`;
    else if (actual.precio && Math.abs(e.precio - actual.precio) / actual.precio > CAMBIO_SOSPECHOSO) {
      const pct = Math.round(((e.precio - actual.precio) / actual.precio) * 100);
      avisos[e.modeloId] = `${pct > 0 ? "Sube" : "Baja"} ${Math.abs(pct)} % frente a ${plata(actual.precio)}. ¿Está bien?`;
    }
  }
  if (Object.keys(errores).length) return { ok: false, errores, mensaje: "Revisa los precios marcados." };
  if (Object.keys(avisos).length && !confirmado) {
    return { ok: false, avisos, mensaje: "Algunos precios cambian mucho. Revísalos y confirma." };
  }

  const ahora = new Date();
  const lote = randomUUID(); // agrupa esta actualización
  const cambiados = enviados.filter((e) => actuales.find((a) => a.id === e.modeloId)?.precio !== e.precio);

  await db.transaction(async (tx) => {
    // Se inserta una fila por modelo aunque el precio no cambie: así queda
    // constancia de que Natalia lo confirmó hoy y vuelve a mostrarse en el catálogo.
    await tx.insert(t.precios).values(
      enviados.map((e) => ({ modeloId: e.modeloId, precioLista: e.precio, vigenteDesde: ahora, origen: "manual" as const, loteId: lote, usuarioId })),
    );
    await tx.insert(t.auditoria).values({
      actor: "asesora",
      usuarioId,
      accion: `Actualizó precios del día (${enviados.length} modelos, ${cambiados.length} con cambio)`,
      entidad: "precios",
      entidadId: lote,
      ip,
      detalle: { cambios: cambiados.map((c) => ({ modelo: actuales.find((a) => a.id === c.modeloId)?.linea, precio: c.precio })) },
    });
  });

  refresh();
  return {
    ok: true,
    mensaje: cambiados.length
      ? `Precios guardados: ${cambiados.length} ${cambiados.length === 1 ? "cambió" : "cambiaron"}.`
      : "Precios confirmados para hoy.",
  };
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
