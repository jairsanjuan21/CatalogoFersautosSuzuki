import "server-only";
import { and, count, eq, gte, inArray, isNotNull, lt, max, sql } from "drizzle-orm";
import { db } from "@/db";
import * as t from "@/db/esquema";
import { calcularComision } from "@/modulos/ventas/comision";
import { mesActual, moverMes, nombreMes, resumenVentas } from "@/modulos/ventas/consultas";
import { embudo, mayorPerdida, prioridad, unoDeCada, variacion, type EstadoSolicitud } from "./calculos";

const DIA = 86_400_000;
const ABIERTAS: EstadoSolicitud[] = ["pendiente_valor", "lista_para_cargar", "en_estudio", "aprobada"];
const ETIQUETA_ORIGEN: Record<string, string> = { whatsapp: "WhatsApp", instagram: "Instagram", facebook: "Facebook", estados: "Estados de WhatsApp", qr: "Código QR", catalogo: "Catálogo", directo: "Directo" };
/** Mes de una fecha en hora de Colombia, en SQL */
const mesBogota = (col: unknown) => sql<string>`to_char(${col} at time zone 'America/Bogota', 'YYYY-MM')`;

/** Embudo de las solicitudes creadas desde una fecha (compartido por los dos tableros) */
async function embudoDesde(desde: Date) {
  const filas = await db
    .select({ estado: t.solicitudes.estado, conValor: sql<boolean>`${t.solicitudes.valorVehiculo} is not null` })
    .from(t.solicitudes)
    .where(gte(t.solicitudes.creadoEn, desde));
  const pasos = embudo(filas);
  return { pasos, perdida: mayorPerdida(pasos), unoDeCada: unoDeCada(pasos[0].n, pasos[4].n) };
}

/** Por canal: solicitudes y entregas desde una fecha, ordenado por lo que vende */
async function canalesDesde(desde: Date) {
  const filas = await db
    .select({
      origen: t.solicitudes.origen,
      solicitudes: count(),
      entregas: sql<number>`count(*) filter (where ${t.solicitudes.estado} = 'entregada')`.mapWith(Number),
    })
    .from(t.solicitudes)
    .where(gte(t.solicitudes.creadoEn, desde))
    .groupBy(t.solicitudes.origen);
  return filas
    .map((f) => ({ nombre: ETIQUETA_ORIGEN[f.origen] ?? f.origen, solicitudes: f.solicitudes, entregas: f.entregas, conversion: f.solicitudes ? Math.round((f.entregas / f.solicitudes) * 100) : 0 }))
    .sort((a, b) => b.entregas - a.entregas || b.solicitudes - a.solicitudes);
}

/* ===================== TABLERO DE NATALIA ===================== */

export async function tableroNatalia() {
  const ahora = Date.now();
  const mes = mesActual();
  const ultimoMovimiento = db
    .select({ solicitudId: t.historial.solicitudId, ultimo: max(t.historial.creadoEn).as("ultimo") })
    .from(t.historial)
    .groupBy(t.historial.solicitudId)
    .as("um");

  const [ventas, [conf], abiertas, embudo30, canales, vendidosPorModelo] = await Promise.all([
    resumenVentas(mes),
    db.select({ meta: t.configuracion.metaVentasMes, porMillon: t.configuracion.comisionPorMillon, metodo: t.configuracion.comisionMetodo }).from(t.configuracion).limit(1),
    db
      .select({
        id: t.solicitudes.id,
        nombres: t.solicitudes.nombres,
        primerApellido: t.solicitudes.primerApellido,
        estado: t.solicitudes.estado,
        valor: t.solicitudes.valorVehiculo,
        linea: t.modelos.linea,
        lineaInteres: t.solicitudes.lineaInteres,
        ultimo: ultimoMovimiento.ultimo,
        creadoEn: t.solicitudes.creadoEn,
      })
      .from(t.solicitudes)
      .leftJoin(t.modelos, eq(t.modelos.id, t.solicitudes.modeloId))
      .leftJoin(ultimoMovimiento, eq(ultimoMovimiento.solicitudId, t.solicitudes.id))
      .where(inArray(t.solicitudes.estado, ABIERTAS)),
    embudoDesde(new Date(ahora - 30 * DIA)),
    canalesDesde(new Date(ahora - 90 * DIA)),
    // Lo más vendido en 6 meses: entregas del formulario + ventas manuales
    Promise.all([
      db
        .select({ linea: t.modelos.linea, n: count() })
        .from(t.solicitudes)
        .innerJoin(t.modelos, eq(t.modelos.id, t.solicitudes.modeloId))
        .where(and(eq(t.solicitudes.estado, "entregada"), gte(t.solicitudes.cerradaEn, new Date(ahora - 183 * DIA))))
        .groupBy(t.modelos.linea),
      db
        .select({ linea: t.modelos.linea, n: count() })
        .from(t.ventas)
        .innerJoin(t.modelos, eq(t.modelos.id, t.ventas.modeloId))
        .where(gte(t.ventas.fecha, moverMes(mes, -5) + "-01"))
        .groupBy(t.modelos.linea),
    ]),
  ]);

  const porMillon = conf?.porMillon ?? 5000;
  const metodo = conf?.metodo ?? "proporcional";
  const comision = (v: number | null) => (v ? calcularComision(v, porMillon, metodo) : 0);

  // Comisión en camino: lo aprobado y lo que está en estudio o por cargar, con valor
  const aprobado = abiertas.filter((s) => s.estado === "aprobada").reduce((a, s) => a + comision(s.valor), 0);
  const enEstudio = abiertas.filter((s) => s.estado === "en_estudio" || s.estado === "lista_para_cargar").reduce((a, s) => a + comision(s.valor), 0);

  const diasQuieta = (s: (typeof abiertas)[number]) => Math.floor((ahora - (s.ultimo ?? s.creadoEn).getTime()) / DIA);
  const PASO: Record<string, (d: number) => [string, "verde" | "rojo" | "ambar" | "azul"]> = {
    aprobada: () => ["Aprobada: coordina la entrega", "verde"],
    en_estudio: (d) => (d >= 3 ? [`${d} días en estudio: haz seguimiento`, "rojo"] : ["En estudio con la financiera", "azul"]),
    pendiente_valor: () => ["Falta asignar el valor", "ambar"],
    lista_para_cargar: () => ["Lista para cargar en Fersautos", "azul"],
  };
  const oportunidades = abiertas
    .map((s) => ({ s, d: diasQuieta(s) }))
    .sort((a, b) => prioridad(a.s.estado, a.d) - prioridad(b.s.estado, b.d) || b.d - a.d)
    .slice(0, 5)
    .map(({ s, d }) => {
      const [paso, tono] = PASO[s.estado](d);
      return { id: s.id, nombre: `${s.nombres.split(" ")[0]} ${s.primerApellido}`, carro: s.linea ?? s.lineaInteres ?? "Sin modelo", paso, tono, comision: s.valor ? comision(s.valor) : null };
    });

  const vendidos = new Map<string, number>();
  for (const lista of vendidosPorModelo) for (const f of lista) vendidos.set(f.linea, (vendidos.get(f.linea) ?? 0) + f.n);
  const modelos = [...vendidos.entries()].map(([nombre, n]) => ({ nombre, n })).sort((a, b) => b.n - a.n).slice(0, 4);

  const mesPasado = ventas.historico[4];
  return {
    mes: nombreMes(mes),
    comision: ventas.totales.comision,
    variacion: variacion(ventas.totales.comision, mesPasado.comision),
    mesAnterior: nombreMes(mesPasado.mes).split(" ")[0],
    vendidos: ventas.totales.cantidad,
    meta: conf?.meta ?? null,
    totalVendido: ventas.totales.valor,
    promedio: ventas.totales.cantidad ? Math.round(ventas.totales.valor / ventas.totales.cantidad) : 0,
    historico: ventas.historico.map((h) => ({ etiqueta: h.etiqueta.replace(".", ""), comision: h.comision })),
    enCamino: { total: aprobado + enEstudio, aprobado, enEstudio, abiertos: abiertas.length },
    embudo: embudo30,
    oportunidades,
    modelos,
    mejorCanal: canales.find((c) => c.entregas > 0) ?? null,
  };
}

/* ===================== TABLERO DEL ADMIN (sin cifras de dinero) ===================== */

export async function tableroAdmin() {
  const ahora = Date.now();
  const hace30 = new Date(ahora - 30 * DIA), hace60 = new Date(ahora - 60 * DIA);
  const hace90 = new Date(ahora - 90 * DIA), hace180 = new Date(ahora - 180 * DIA);
  const primerMes = moverMes(mesActual(), -5);
  const desde6Meses = new Date(`${primerMes}-01T00:00:00-05:00`);

  const contar = (desde: Date, hasta: Date, soloEntregadas: boolean) =>
    db
      .select({ n: count() })
      .from(t.solicitudes)
      .where(
        soloEntregadas
          ? and(eq(t.solicitudes.estado, "entregada"), gte(t.solicitudes.cerradaEn, desde), lt(t.solicitudes.cerradaEn, hasta))
          : and(gte(t.solicitudes.creadoEn, desde), lt(t.solicitudes.creadoEn, hasta)),
      )
      .then((r) => r[0].n);
  const diasEntrega = (desde: Date, hasta: Date) =>
    db
      .select({ d: sql<number | null>`avg(extract(epoch from (${t.solicitudes.cerradaEn} - ${t.solicitudes.creadoEn})) / 86400)`.mapWith((v) => (v === null ? null : Number(v))) })
      .from(t.solicitudes)
      .where(and(eq(t.solicitudes.estado, "entregada"), isNotNull(t.solicitudes.cerradaEn), gte(t.solicitudes.cerradaEn, desde), lt(t.solicitudes.cerradaEn, hasta)))
      .then((r) => r[0].d);

  const fin = new Date(ahora + DIA);
  const [solAct, solAnt, entAct, entAnt, diasAct, diasAnt, solMes, entMes, embudo30, canales, modelos] = await Promise.all([
    contar(hace30, fin, false),
    contar(hace60, hace30, false),
    contar(hace30, fin, true),
    contar(hace60, hace30, true),
    diasEntrega(hace90, fin),
    diasEntrega(hace180, hace90),
    db.select({ mes: mesBogota(t.solicitudes.creadoEn), n: count() }).from(t.solicitudes).where(gte(t.solicitudes.creadoEn, desde6Meses)).groupBy(mesBogota(t.solicitudes.creadoEn)),
    db
      .select({ mes: mesBogota(t.solicitudes.cerradaEn), n: count() })
      .from(t.solicitudes)
      .where(and(eq(t.solicitudes.estado, "entregada"), gte(t.solicitudes.cerradaEn, desde6Meses)))
      .groupBy(mesBogota(t.solicitudes.cerradaEn)),
    embudoDesde(hace30),
    canalesDesde(hace90),
    db
      .select({ nombre: sql<string>`coalesce(${t.modelos.linea}, ${t.solicitudes.lineaInteres}, 'Sin modelo')`, n: count() })
      .from(t.solicitudes)
      .leftJoin(t.modelos, eq(t.modelos.id, t.solicitudes.modeloId))
      .where(gte(t.solicitudes.creadoEn, hace90))
      .groupBy(sql`1`)
      .orderBy(sql`2 desc`)
      .limit(5),
  ]);

  const meses = Array.from({ length: 6 }, (_, i) => moverMes(primerMes, i));
  const serie = meses.map((m) => ({
    etiqueta: nombreMes(m, "short").replace(".", ""),
    solicitudes: solMes.find((x) => x.mes === m)?.n ?? 0,
    entregas: entMes.find((x) => x.mes === m)?.n ?? 0,
  }));
  const conv = (e: number, s: number) => (s ? Math.round((e / s) * 100) : 0);

  return {
    solicitudes: { actual: solAct, cambio: solAct - solAnt },
    entregas: { actual: entAct, cambio: entAct - entAnt },
    conversion: { actual: conv(entAct, solAct), cambio: conv(entAct, solAct) - conv(entAnt, solAnt) },
    diasEntrega: { actual: diasAct === null ? null : Math.round(diasAct), cambio: diasAct !== null && diasAnt !== null ? Math.round(diasAct - diasAnt) : null },
    serie,
    embudo: embudo30,
    canales,
    modelos,
  };
}
