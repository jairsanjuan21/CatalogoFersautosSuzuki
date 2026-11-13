"use server";

import { refresh } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import * as t from "@/db/esquema";
import { exigirAsesora } from "@/lib/autorizacion";
import { nombreVersion } from "@/lib/formato";
import { erroresPorCampo } from "@/validacion/solicitud";

export interface ResultadoVenta {
  ok: boolean;
  mensaje?: string;
  errores?: Record<string, string>;
}

const hoyBogota = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date());

const esquema = z.object({
  fecha: z.iso
    .date({ error: "Elige la fecha de la venta." })
    .refine((f) => f <= hoyBogota(), { error: "La fecha no puede ser futura." })
    .refine((f) => f >= "2020-01-01", { error: "Revisa la fecha." }),
  modeloId: z.uuid({ error: "Elige el modelo." }),
  versionId: z.union([z.uuid(), z.literal("")]).transform((v) => v || null),
  valor: z
    .string()
    .transform((v) => Number(v.replace(/\D/g, "")))
    .refine((v) => v >= 10_000_000 && v <= 2_000_000_000, { error: "Revisa el valor: debe estar entre $ 10.000.000 y $ 2.000.000.000." }),
  formaPago: z.enum(["", "contado", "credito"]).transform((v) => (v === "" ? null : v)),
  cliente: z.string().trim().max(60, { error: "Máximo 60 caracteres." }).transform((v) => v || null),
  nota: z.string().trim().max(200, { error: "Máximo 200 caracteres." }).transform((v) => v || null),
});

export async function registrarVenta(_previo: ResultadoVenta, formulario: FormData): Promise<ResultadoVenta> {
  const { usuarioId, ip } = await exigirAsesora();
  const r = esquema.safeParse(Object.fromEntries(formulario));
  if (!r.success) return { ok: false, errores: erroresPorCampo(r.error) };
  const d = r.data;

  const [modelo] = await db.select({ linea: t.modelos.linea }).from(t.modelos).where(eq(t.modelos.id, d.modeloId));
  if (!modelo) return { ok: false, errores: { modeloId: "Ese modelo no existe." } };
  const versiones = await db.select({ id: t.versiones.id, nombre: t.versiones.nombre, transmision: t.versiones.transmision }).from(t.versiones).where(eq(t.versiones.modeloId, d.modeloId));
  const version = versiones.find((v) => v.id === d.versionId);
  // Igual que en las solicitudes: la versión debe ser de ese modelo
  if (d.versionId && !version) return { ok: false, errores: { versionId: "Esa versión no es de este modelo." } };

  const vehiculo = version ? `${modelo.linea} ${nombreVersion(version)}` : modelo.linea;
  const [venta] = await db.insert(t.ventas).values({ ...d, vehiculo, usuarioId }).returning({ id: t.ventas.id });
  await db.insert(t.auditoria).values({ actor: "asesora", usuarioId, accion: "Registró una venta manual", entidad: "ventas", entidadId: venta.id, ip, detalle: { vehiculo, valor: d.valor, fecha: d.fecha } });
  refresh();
  return { ok: true, mensaje: `Venta registrada: ${vehiculo}.` };
}

export async function eliminarVenta(ventaId: string): Promise<ResultadoVenta> {
  const { usuarioId, ip } = await exigirAsesora();
  if (!z.uuid().safeParse(ventaId).success) return { ok: false, mensaje: "Datos no válidos." };
  const [v] = await db.delete(t.ventas).where(eq(t.ventas.id, ventaId)).returning();
  if (!v) return { ok: false, mensaje: "La venta ya no existe." };
  await db.insert(t.auditoria).values({ actor: "asesora", usuarioId, accion: "Eliminó una venta manual", entidad: "ventas", entidadId: v.id, ip, detalle: { vehiculo: v.vehiculo, valor: v.valor, fecha: v.fecha } });
  refresh();
  return { ok: true, mensaje: "Venta eliminada." };
}
