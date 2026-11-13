import "server-only";
import { and, asc, desc, eq, gte, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import * as t from "@/db/esquema";
import { nombreVersion } from "@/lib/formato";
import { calcularComision } from "./comision";

/** Fecha en hora de Colombia, "2026-11-04". El servidor trabaja en UTC (5 horas adelante). */
const diaBogota = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(d);
export const mesActual = () => diaBogota(new Date()).slice(0, 7);

/** "2026-11" → "2026-10" (o +n meses) */
export function moverMes(mes: string, n: number) {
  const [a, m] = mes.split("-").map(Number);
  const d = new Date(Date.UTC(a, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export const nombreMes = (mes: string, formato: "long" | "short" = "long") =>
  new Intl.DateTimeFormat("es-CO", { month: formato, year: formato === "long" ? "numeric" : undefined, timeZone: "UTC" }).format(new Date(`${mes}-15T12:00:00Z`));

export interface Venta {
  id: string;
  origen: "formulario" | "manual";
  fecha: string; // "2026-11-04", en hora de Colombia
  vehiculo: string;
  valor: number;
  comision: number;
  cliente: string | null;
  formaPago: "contado" | "credito" | null;
  nota: string | null;
  radicado: string | null; // solo las del formulario
}

/**
 * Resumen de un mes y de los 5 anteriores (para el gráfico).
 * Une dos fuentes: solicitudes ENTREGADAS (fecha = cuando se marcó entregada) y ventas manuales.
 * La comisión se calcula con la configuración ACTUAL: es una estimación.
 */
export async function resumenVentas(mes: string) {
  const primerMes = moverMes(mes, -5);
  // Inicio del primer mes en hora de Colombia (-05:00): así una entrega a las 8 p. m. del último día no se corre de mes
  const desde = new Date(`${primerMes}-01T00:00:00-05:00`);

  const [[conf], formulario, manuales] = await Promise.all([
    db.select({ porMillon: t.configuracion.comisionPorMillon, metodo: t.configuracion.comisionMetodo }).from(t.configuracion).limit(1),
    db
      .select({
        id: t.solicitudes.id,
        radicado: t.solicitudes.radicado,
        cerradaEn: t.solicitudes.cerradaEn,
        valor: t.solicitudes.valorVehiculo,
        nombres: t.solicitudes.nombres,
        primerApellido: t.solicitudes.primerApellido,
        linea: t.modelos.linea,
        version: t.versiones.nombre,
        transmision: t.versiones.transmision,
        lineaInteres: t.solicitudes.lineaInteres,
      })
      .from(t.solicitudes)
      .leftJoin(t.modelos, eq(t.modelos.id, t.solicitudes.modeloId))
      .leftJoin(t.versiones, eq(t.versiones.id, t.solicitudes.versionId))
      .where(and(eq(t.solicitudes.estado, "entregada"), isNotNull(t.solicitudes.cerradaEn), isNotNull(t.solicitudes.valorVehiculo), gte(t.solicitudes.cerradaEn, desde))),
    db.select().from(t.ventas).where(gte(t.ventas.fecha, `${primerMes}-01`)).orderBy(desc(t.ventas.fecha), desc(t.ventas.creadoEn)),
  ]);
  const porMillon = conf?.porMillon ?? 5000;
  const metodo = conf?.metodo ?? "proporcional";
  const comision = (v: number) => calcularComision(v, porMillon, metodo);

  const todas: Venta[] = [
    ...formulario.map((s) => ({
      id: s.id,
      origen: "formulario" as const,
      fecha: diaBogota(s.cerradaEn!),
      vehiculo: s.linea ? [s.linea, s.version && nombreVersion({ nombre: s.version, transmision: s.transmision })].filter(Boolean).join(" ") : (s.lineaInteres ?? "Vehículo"),
      valor: s.valor!,
      comision: comision(s.valor!),
      cliente: `${s.nombres.split(" ")[0]} ${s.primerApellido}`,
      formaPago: "credito" as const,
      nota: null,
      radicado: s.radicado,
    })),
    ...manuales.map((v) => ({
      id: v.id,
      origen: "manual" as const,
      fecha: v.fecha,
      vehiculo: v.vehiculo,
      valor: v.valor,
      comision: comision(v.valor),
      cliente: v.cliente,
      formaPago: v.formaPago,
      nota: v.nota,
      radicado: null,
    })),
  ].sort((a, b) => b.fecha.localeCompare(a.fecha));

  const meses = Array.from({ length: 6 }, (_, i) => moverMes(primerMes, i));
  const historico = meses.map((m) => {
    const delMes = todas.filter((v) => v.fecha.startsWith(m));
    return { mes: m, etiqueta: nombreMes(m, "short"), cantidad: delMes.length, comision: delMes.reduce((s, v) => s + v.comision, 0) };
  });
  const delMes = todas.filter((v) => v.fecha.startsWith(mes));
  return {
    mes,
    porMillon,
    metodo,
    ventas: delMes,
    totales: {
      cantidad: delMes.length,
      formulario: delMes.filter((v) => v.origen === "formulario").length,
      manuales: delMes.filter((v) => v.origen === "manual").length,
      valor: delMes.reduce((s, v) => s + v.valor, 0),
      comision: delMes.reduce((s, v) => s + v.comision, 0),
    },
    historico,
  };
}

/** Modelos (no archivados) con sus versiones y precio, para el formulario de venta manual */
export async function vehiculosParaVenta() {
  const [modelos, versiones] = await Promise.all([
    db.select({ id: t.modelos.id, linea: t.modelos.linea }).from(t.modelos).where(eq(t.modelos.archivado, false)).orderBy(asc(t.modelos.orden)),
    db
      .select({ id: t.versiones.id, modeloId: t.versiones.modeloId, nombre: t.versiones.nombre, transmision: t.versiones.transmision, precio: t.preciosVigentes.precioLista })
      .from(t.versiones)
      .leftJoin(t.preciosVigentes, eq(t.preciosVigentes.versionId, t.versiones.id))
      .where(eq(t.versiones.visible, true))
      .orderBy(asc(t.versiones.orden), asc(t.versiones.nombre)),
  ]);
  return modelos.map((m) => ({
    ...m,
    versiones: versiones.filter((v) => v.modeloId === m.id).map((v) => ({ id: v.id, etiqueta: nombreVersion(v), precio: v.precio })),
  }));
}
