import "server-only";
import { and, asc, count, desc, eq, gte, ilike, inArray, lt, max, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import * as t from "@/db/esquema";
import type { Estado } from "@/lib/etiquetas";
import { obtenerSolicitudCompleta } from "./consultar";

const DIA = 86_400_000;

/* ---------- lista con filtros ---------- */

export async function listarSolicitudes({ estado, busqueda }: { estado?: Estado; busqueda?: string }) {
  const filtros: SQL[] = [];
  if (estado) filtros.push(eq(t.solicitudes.estado, estado));
  const q = busqueda?.trim();
  if (q) {
    const patron = `%${q.replace(/[%_\\]/g, (c) => "\\" + c)}%`;
    filtros.push(
      or(
        ilike(sql`${t.solicitudes.nombres} || ' ' || ${t.solicitudes.primerApellido} || ' ' || coalesce(${t.solicitudes.segundoApellido}, '')`, patron),
        ilike(t.solicitudes.numeroIdentificacion, patron),
        ilike(t.solicitudes.radicado, patron),
      )!,
    );
  }
  return db
    .select({
      id: t.solicitudes.id,
      radicado: t.solicitudes.radicado,
      nombres: t.solicitudes.nombres,
      primerApellido: t.solicitudes.primerApellido,
      estado: t.solicitudes.estado,
      lineaInteres: t.solicitudes.lineaInteres,
      modeloLinea: t.modelos.linea,
      cuotaInicial: t.solicitudes.cuotaInicial,
      creadoEn: t.solicitudes.creadoEn,
      vistaEn: t.solicitudes.vistaEn,
    })
    .from(t.solicitudes)
    .leftJoin(t.modelos, eq(t.modelos.id, t.solicitudes.modeloId))
    .where(filtros.length ? and(...filtros) : undefined)
    .orderBy(desc(t.solicitudes.creadoEn))
    .limit(200);
}

export type FilaSolicitud = Awaited<ReturnType<typeof listarSolicitudes>>[number];

export async function conteoPorEstado() {
  const filas = await db.select({ estado: t.solicitudes.estado, n: count() }).from(t.solicitudes).groupBy(t.solicitudes.estado);
  return Object.fromEntries(filas.map((f) => [f.estado, f.n])) as Partial<Record<Estado, number>>;
}

/* ---------- inicio del panel ---------- */

export async function resumenPanel() {
  const hace30 = new Date(Date.now() - 30 * DIA);
  const hace3 = new Date(Date.now() - 3 * DIA);

  // Último movimiento de cada solicitud en estudio, para detectar las que llevan días quietas
  const ultimoMovimiento = db
    .select({ solicitudId: t.historial.solicitudId, ultimo: max(t.historial.creadoEn).as("ultimo") })
    .from(t.historial)
    .groupBy(t.historial.solicitudId)
    .as("um");

  const [conteos, aprobadasMes, porOrigen, pendientes, listas, quietas, preciosViejos, promosPorVencer] = await Promise.all([
    conteoPorEstado(),
    db
      .select({ n: count() })
      .from(t.solicitudes)
      .where(and(inArray(t.solicitudes.estado, ["aprobada", "entregada"]), gte(t.solicitudes.actualizadoEn, hace30)))
      .then((r) => r[0].n),
    db
      .select({ origen: t.solicitudes.origen, n: count() })
      .from(t.solicitudes)
      .where(gte(t.solicitudes.creadoEn, hace30))
      .groupBy(t.solicitudes.origen),
    listarSolicitudes({ estado: "pendiente_valor" }),
    listarSolicitudes({ estado: "lista_para_cargar" }),
    db
      .select({
        id: t.solicitudes.id,
        nombres: t.solicitudes.nombres,
        primerApellido: t.solicitudes.primerApellido,
        ultimo: ultimoMovimiento.ultimo,
      })
      .from(t.solicitudes)
      .innerJoin(ultimoMovimiento, eq(ultimoMovimiento.solicitudId, t.solicitudes.id))
      .where(and(eq(t.solicitudes.estado, "en_estudio"), lt(ultimoMovimiento.ultimo, hace3)))
      .orderBy(asc(ultimoMovimiento.ultimo)),
    db
      .select({ linea: t.modelos.linea })
      .from(t.preciosVigentes)
      .innerJoin(t.modelos, eq(t.modelos.id, t.preciosVigentes.modeloId))
      .where(and(eq(t.preciosVigentes.desactualizado, true), eq(t.modelos.visible, true), eq(t.modelos.mostrarPrecio, true))),
    db
      .select({ linea: t.modelos.linea, hasta: t.promociones.hasta })
      .from(t.promociones)
      .innerJoin(t.modelos, eq(t.modelos.id, t.promociones.modeloId))
      .where(sql`${t.promociones.hasta} between current_date and current_date + 5`),
  ]);

  return { conteos, aprobadasMes, porOrigen, pendientes, listas, quietas, preciosViejos, promosPorVencer };
}

/* ---------- detalle ---------- */

export async function detalleSolicitud(id: string) {
  const solicitud = await obtenerSolicitudCompleta(id);
  if (!solicitud) return null;
  const [historial, notas, modelos] = await Promise.all([
    db.select().from(t.historial).where(eq(t.historial.solicitudId, id)).orderBy(desc(t.historial.creadoEn), desc(t.historial.id)),
    db.select().from(t.notas).where(eq(t.notas.solicitudId, id)).orderBy(desc(t.notas.creadoEn)),
    db
      .select({
        id: t.modelos.id,
        linea: t.modelos.linea,
        precio: t.preciosVigentes.precioLista,
        vigenteDesde: t.preciosVigentes.vigenteDesde,
      })
      .from(t.modelos)
      .leftJoin(t.preciosVigentes, eq(t.preciosVigentes.modeloId, t.modelos.id))
      .orderBy(asc(t.modelos.orden)),
  ]);
  return { solicitud, historial, notas, modelos };
}
