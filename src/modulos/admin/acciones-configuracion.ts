"use server";

import { refresh } from "next/cache";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import * as t from "@/db/esquema";
import { exigirAdmin } from "@/lib/autorizacion";
import { erroresPorCampo, RANGO_PLAZO } from "@/validacion/solicitud";
import type { ResultadoAdmin } from "./acciones-catalogo";

const esquema = z.object({
  asesoraNombre: z.string().trim().min(5, { error: "Escribe el nombre completo." }).max(80),
  asesoraCc: z.string().trim().regex(/^\d{6,11}$/, { error: "Entre 6 y 11 dígitos, sin puntos." }),
  ciudad: z.string().trim().min(2).max(40),
  sede: z.string().trim().min(2, { error: "Escribe la sede." }).max(60),
  marcaPorDefecto: z.string().trim().min(2).max(30),
  planFinanciacion: z.string().trim().min(2).max(40),
  plazosMeses: z
    .array(
      z.coerce
        .number()
        .int({ error: "Los plazos son meses enteros." })
        .min(RANGO_PLAZO.min, { error: `Mínimo ${RANGO_PLAZO.min} meses.` })
        .max(RANGO_PLAZO.max, { error: `Máximo ${RANGO_PLAZO.max} meses.` }),
    )
    .min(1, { error: "Deja al menos un plazo disponible." })
    .max(12, { error: "Máximo 12 plazos." })
    .transform((v) => [...new Set(v)].sort((a, b) => a - b)),
  diasVigenciaPrecio: z.coerce.number().refine((v) => [3, 5, 7, 10, 15].includes(v)),
  diasRetencionDocumentos: z.coerce.number().refine((v) => [30, 60, 90, 180].includes(v)),
});

export async function guardarConfiguracion(_previo: ResultadoAdmin, formulario: FormData): Promise<ResultadoAdmin> {
  const { usuarioId, ip } = await exigirAdmin();
  const r = esquema.safeParse({ ...Object.fromEntries(formulario), plazosMeses: formulario.getAll("plazosMeses") });
  if (!r.success) return { ok: false, errores: erroresPorCampo(r.error), mensaje: "Revisa los campos marcados." };

  const [antes] = await db.select().from(t.configuracion).where(eq(t.configuracion.id, 1));
  await db.update(t.configuracion).set(r.data).where(eq(t.configuracion.id, 1));
  const cambios = Object.fromEntries(
    Object.entries(r.data).filter(([k, v]) => JSON.stringify(v) !== JSON.stringify(antes?.[k as keyof typeof antes])),
  );
  await db.insert(t.auditoria).values({ actor: "admin", usuarioId, accion: "Actualizó la configuración", entidad: "configuracion", ip, detalle: cambios });
  refresh();
  return { ok: true, mensaje: Object.keys(cambios).length ? "Configuración guardada." : "No había cambios." };
}

const esquemaClausula = z.object({
  texto: z.string().trim().min(200, { error: "El texto parece incompleto (mínimo 200 caracteres)." }).max(10_000),
  nota: z.string().trim().min(3, { error: "Explica brevemente qué cambió." }).max(120),
});

/** Una versión nueva queda vigente de inmediato. Las solicitudes viejas conservan la que aceptaron. */
export async function crearVersionClausula(_previo: ResultadoAdmin, formulario: FormData): Promise<ResultadoAdmin> {
  const { usuarioId, ip } = await exigirAdmin();
  const r = esquemaClausula.safeParse(Object.fromEntries(formulario));
  if (!r.success) return { ok: false, errores: erroresPorCampo(r.error) };
  const [ultima] = await db.select({ version: t.clausulas.version, texto: t.clausulas.texto }).from(t.clausulas).orderBy(desc(t.clausulas.version)).limit(1);
  if (ultima && ultima.texto.trim() === r.data.texto) return { ok: false, errores: { texto: "Es igual a la versión vigente." } };
  const version = (ultima?.version ?? 0) + 1;
  await db.insert(t.clausulas).values({ version, texto: r.data.texto, nota: r.data.nota });
  await db.insert(t.auditoria).values({ actor: "admin", usuarioId, accion: `Creó la versión ${version} de la cláusula de autorización`, entidad: "clausulas", entidadId: String(version), ip, detalle: { nota: r.data.nota } });
  refresh();
  return { ok: true, mensaje: `Versión ${version} creada y vigente. Quien tenga el formulario abierto deberá recargarlo para aceptarla.` };
}
