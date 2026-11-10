import "server-only";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { count, isNull, sql, sum } from "drizzle-orm";
import { db } from "@/db";
import * as t from "@/db/esquema";
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

export async function estadoSistema() {
  const local = (process.env.ALMACENAMIENTO ?? "local") === "local";
  const [[bd], [docs], [solicitudes], [fotos], [auditoria], retencion, publico] = await Promise.all([
    db.execute<{ tamano: string }>(sql`select pg_size_pretty(pg_database_size(current_database())) as tamano`).then((r) => r.rows),
    db.select({ n: count(), bytes: sum(t.documentos.tamanoBytes) }).from(t.documentos).where(isNull(t.documentos.eliminadoEn)),
    db.select({ n: count() }).from(t.solicitudes),
    db.select({ n: count() }).from(t.fotosModelo),
    db.select({ n: count() }).from(t.auditoria),
    aplicarRetencion({ simular: true }),
    local ? tamanoCarpeta(path.resolve(process.cwd(), "almacenamiento", "publico")) : Promise.resolve(0),
  ]);
  return {
    tamanoBd: bd?.tamano ?? "?",
    documentos: { n: docs.n, bytes: Number(docs.bytes ?? 0) },
    fotosBytes: publico,
    solicitudes: solicitudes.n,
    fotos: fotos.n,
    auditoria: auditoria.n,
    retencion,
    almacenamiento: local ? "Carpeta local (desarrollo)" : "Cloudflare R2",
    node: process.version,
    entorno: process.env.NODE_ENV ?? "development",
  };
}
