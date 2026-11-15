import "server-only";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { and, count, desc, eq, isNull, sql, sum } from "drizzle-orm";
import { db } from "@/db";
import * as t from "@/db/esquema";
import { usoIA } from "@/modulos/ia/uso";
import { aplicarRetencion } from "./retencion";

async function tamanoCarpeta(ruta: string): Promise<number> {
  try {
    const entradas = await readdir(ruta, { withFileTypes: true });
    const tamanos = await Promise.all(entradas.map((e) => (e.isDirectory() ? tamanoCarpeta(path.join(ruta, e.name)) : stat(path.join(ruta, e.name)).then((s) => s.size))));
    return tamanos.reduce((a, b) => a + b, 0);
  } catch {
    return 0;
  }
}

export const legible = (bytes: number) =>
  bytes < 1024 ? `${bytes} B` : bytes < 1048576 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / 1048576).toFixed(1)} MB`;

/** Fecha en que se compiló la imagen de producción (la escribe el Dockerfile). En desarrollo no existe. */
async function fechaCompilacion(): Promise<Date | null> {
  try {
    const d = new Date((await readFile(path.resolve(process.cwd(), "COMPILADA"), "utf8")).trim());
    return Number.isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

export async function estadoSistema() {
  const local = (process.env.ALMACENAMIENTO ?? "local") === "local";
  const produccion = process.env.NODE_ENV === "production";
  const [[bd], [docs], [solicitudes], [fotos], [auditoria], retencion, publico, ia, [lista], [modelos], [versiones], compilada] = await Promise.all([
    db.execute<{ tamano: string }>(sql`select pg_size_pretty(pg_database_size(current_database())) as tamano`).then((r) => r.rows),
    db.select({ n: count(), bytes: sum(t.documentos.tamanoBytes) }).from(t.documentos).where(isNull(t.documentos.eliminadoEn)),
    db.select({ n: count() }).from(t.solicitudes),
    db.select({ n: count() }).from(t.fotosModelo),
    db.select({ n: count() }).from(t.auditoria),
    aplicarRetencion({ simular: true }),
    local ? tamanoCarpeta(path.resolve(process.cwd(), "almacenamiento", "publico")) : Promise.resolve(0),
    usoIA(),
    db.select().from(t.listasPrecios).orderBy(desc(t.listasPrecios.creadoEn)).limit(1),
    db.select({ n: count() }).from(t.modelos).where(and(eq(t.modelos.visible, true), eq(t.modelos.archivado, false))),
    // Versiones que el cliente ve con precio: modelo publicado, versión visible y precio vigente
    db
      .select({ total: count(), conPrecio: sql<number>`count(${t.preciosVigentes.versionId}) filter (where not ${t.preciosVigentes.desactualizado})`.mapWith(Number) })
      .from(t.versiones)
      .innerJoin(t.modelos, eq(t.modelos.id, t.versiones.modeloId))
      .leftJoin(t.preciosVigentes, eq(t.preciosVigentes.versionId, t.versiones.id))
      .where(and(eq(t.versiones.visible, true), eq(t.modelos.visible, true), eq(t.modelos.archivado, false))),
    fechaCompilacion(),
  ]);
  return {
    tamanoBd: bd?.tamano ?? "?",
    documentos: { n: docs.n, bytes: Number(docs.bytes ?? 0) },
    fotosBytes: publico,
    solicitudes: solicitudes.n,
    fotos: fotos.n,
    auditoria: auditoria.n,
    retencion,
    almacenamiento: !local ? "Cloudflare R2" : produccion ? "Volumen de Docker en el servidor" : "Carpeta local (desarrollo)",
    ia: { ...ia, configurada: !!process.env.GEMINI_API_KEY, modelo: process.env.IA_MODELO || "gemini-3.5-flash" },
    lista: lista ?? null,
    catalogo: { modelos: modelos.n, versiones: versiones.total, conPrecio: versiones.conPrecio },
    metricas: !!(process.env.METRICAS_INGESTA_URL && process.env.METRICAS_TOKEN),
    compilada,
    node: process.version,
    entorno: produccion ? "producción" : "desarrollo",
  };
}
