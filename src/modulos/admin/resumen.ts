import "server-only";
import { and, count, desc, eq, gte, isNull, like, sql } from "drizzle-orm";
import { db } from "@/db";
import * as t from "@/db/esquema";

/** Datos del resumen técnico. Sin datos personales de clientes: solo conteos. */
export async function resumenAdmin() {
  const hace30 = new Date(Date.now() - 30 * 86_400_000);
  const hace7 = new Date(Date.now() - 7 * 86_400_000);
  const [[solicitudesMes], [solicitudesTotal], sinFoto, [preciosViejos], [conf], [fallidos], actividad] = await Promise.all([
    db.select({ n: count() }).from(t.solicitudes).where(gte(t.solicitudes.creadoEn, hace30)),
    db.select({ n: count() }).from(t.solicitudes),
    db
      .select({ id: t.modelos.id, linea: t.modelos.linea })
      .from(t.modelos)
      .leftJoin(t.fotosModelo, and(eq(t.fotosModelo.modeloId, t.modelos.id), eq(t.fotosModelo.orden, 0)))
      .where(and(eq(t.modelos.visible, true), isNull(t.fotosModelo.id))),
    db
      .select({ n: count() })
      .from(t.preciosVigentes)
      .innerJoin(t.modelos, eq(t.modelos.id, t.preciosVigentes.modeloId))
      .where(and(eq(t.preciosVigentes.desactualizado, true), eq(t.modelos.visible, true))),
    db.select({ whatsapp: t.configuracion.asesoraWhatsapp, foto: t.configuracion.asesoraFoto }).from(t.configuracion).limit(1),
    db.select({ n: count() }).from(t.auditoria).where(and(like(t.auditoria.accion, "Intento de inicio de sesión fallido%"), gte(t.auditoria.creadoEn, hace7))),
    db
      .select({ creadoEn: t.auditoria.creadoEn, actor: t.auditoria.actor, accion: t.auditoria.accion, usuario: t.user.name })
      .from(t.auditoria)
      .leftJoin(t.user, eq(t.user.id, t.auditoria.usuarioId))
      .orderBy(desc(t.auditoria.creadoEn), desc(t.auditoria.id))
      .limit(8),
  ]);
  const tamanoBd = await db.execute<{ tamano: string }>(sql`select pg_size_pretty(pg_database_size(current_database())) as tamano`);
  return {
    solicitudesMes: solicitudesMes.n,
    solicitudesTotal: solicitudesTotal.n,
    sinFoto,
    preciosViejos: preciosViejos.n,
    faltaWhatsapp: !conf?.whatsapp,
    faltaFotoAsesora: !conf?.foto,
    intentosFallidos: fallidos.n,
    tamanoBd: tamanoBd.rows[0]?.tamano ?? "?",
    actividad,
  };
}
