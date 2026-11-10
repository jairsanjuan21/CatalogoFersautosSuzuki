import "server-only";
import { and, count, desc, eq, gte, ilike, type SQL } from "drizzle-orm";
import { db } from "@/db";
import * as t from "@/db/esquema";

export const POR_PAGINA = 50;

export async function consultarAuditoria(f: { actor?: (typeof t.actor.enumValues)[number]; dias: number; q?: string; pagina: number }) {
  const filtros: SQL[] = [gte(t.auditoria.creadoEn, new Date(Date.now() - f.dias * 86_400_000))];
  if (f.actor) filtros.push(eq(t.auditoria.actor, f.actor));
  if (f.q) filtros.push(ilike(t.auditoria.accion, `%${f.q.replace(/[%_\\]/g, (c) => "\\" + c)}%`));
  const donde = and(...filtros);
  const [filas, [{ total }]] = await Promise.all([
    db
      .select({ id: t.auditoria.id, creadoEn: t.auditoria.creadoEn, actor: t.auditoria.actor, usuario: t.user.name, accion: t.auditoria.accion, entidadId: t.auditoria.entidadId, ip: t.auditoria.ip })
      .from(t.auditoria)
      .leftJoin(t.user, eq(t.user.id, t.auditoria.usuarioId))
      .where(donde)
      .orderBy(desc(t.auditoria.creadoEn), desc(t.auditoria.id))
      .limit(POR_PAGINA)
      .offset((f.pagina - 1) * POR_PAGINA),
    db.select({ total: count() }).from(t.auditoria).where(donde),
  ]);
  return { filas, total, paginas: Math.max(1, Math.ceil(total / POR_PAGINA)) };
}
