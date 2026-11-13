import { NextResponse, type NextRequest } from "next/server";
import { and, asc, count, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import * as t from "@/db/esquema";
import { auth } from "@/lib/auth";
import { ipDeLaPeticion, permitir } from "@/lib/limite";
import { ErrorLectura, leerPreciosDePdf } from "@/modulos/precios/lector-ia";
import { nombreVersion } from "@/lib/formato";

const ACCION = "Leyó una lista de precios con IA";
const TIPOS: Record<string, string> = { hatchback: "Hatchback", sedan: "Sedán", suv: "SUV", todoterreno: "4x4", familiar: "Familiar 7 puestos" };
const respuesta = (status: number, cuerpo: object) => NextResponse.json(cuerpo, { status });

/** POST /api/precios/leer  (solo la asesora) — multipart con el campo "pdf" */
export async function POST(request: NextRequest) {
  const sesion = await auth.api.getSession({ headers: request.headers });
  if (!sesion || sesion.user.role !== "asesora") return respuesta(403, { mensaje: "No tienes acceso." });
  const ip = ipDeLaPeticion(request.headers);

  if (!permitir(`ia:${sesion.user.id}`, 10, 60 * 60 * 1000)) {
    return respuesta(429, { mensaje: "Llegaste al máximo de 10 lecturas por hora. Intenta más tarde." });
  }

  // Tope mensual: protege contra una factura sorpresa si algo sale mal
  const tope = Number(process.env.IA_LECTURAS_MES ?? 60);
  const [{ usadas }] = await db
    .select({ usadas: count() })
    .from(t.auditoria)
    .where(and(eq(t.auditoria.accion, ACCION), gte(t.auditoria.creadoEn, sql`date_trunc('month', now() at time zone 'America/Bogota') at time zone 'America/Bogota'`)));
  if (usadas >= tope) return respuesta(429, { mensaje: `Se alcanzó el tope de ${tope} lecturas este mes. Puedes actualizar los precios a mano.` });

  let archivo: File | null = null;
  try {
    const f = (await request.formData()).get("pdf");
    archivo = f instanceof File ? f : null;
  } catch {
    /* cuerpo inválido */
  }
  if (!archivo || archivo.size === 0) return respuesta(400, { mensaje: "Elige un archivo PDF." });

  const [modelos, versiones] = await Promise.all([
    db.select({ id: t.modelos.id, slug: t.modelos.slug, linea: t.modelos.linea, tipo: t.modelos.tipo }).from(t.modelos).where(eq(t.modelos.visible, true)).orderBy(asc(t.modelos.orden)),
    db
      .select({ id: t.versiones.id, modeloId: t.versiones.modeloId, nombre: t.versiones.nombre, transmision: t.versiones.transmision, precioActual: t.preciosVigentes.precioLista })
      .from(t.versiones)
      .leftJoin(t.preciosVigentes, eq(t.preciosVigentes.versionId, t.versiones.id))
      .where(eq(t.versiones.visible, true))
      .orderBy(asc(t.versiones.orden), asc(t.versiones.nombre)),
  ]);

  try {
    const r = await leerPreciosDePdf(
      Buffer.from(await archivo.arrayBuffer()),
      modelos.map((m) => ({
        ...m,
        tipo: TIPOS[m.tipo] ?? m.tipo,
        versiones: versiones.filter((v) => v.modeloId === m.id).map((v) => ({ id: v.id, etiqueta: nombreVersion(v), precioActual: v.precioActual })),
      })),
    );
    await db.insert(t.auditoria).values({
      actor: "asesora",
      usuarioId: sesion.user.id,
      accion: ACCION,
      entidad: "precios",
      ip: ip === "desconocida" ? null : ip,
      detalle: { archivo: archivo.name.slice(0, 120), ...r.uso, versionesEncontradas: r.propuesta.reduce((n, m) => n + m.versiones.length, 0), versionesNuevas: r.versionesNuevas.length, sinCoincidencia: r.sinCoincidencia.length },
    });
    return respuesta(200, { ...r, usadas: usadas + 1, tope });
  } catch (e) {
    if (e instanceof ErrorLectura) return respuesta(422, { mensaje: e.message });
    console.error("Error leyendo PDF con IA", e);
    return respuesta(500, { mensaje: "No pudimos leer el PDF. Intenta de nuevo o actualiza los precios a mano." });
  }
}
