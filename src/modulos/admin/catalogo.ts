import "server-only";
import { asc, count, eq } from "drizzle-orm";
import { db } from "@/db";
import * as t from "@/db/esquema";

export async function listarModelosAdmin() {
  const [modelos, fotos] = await Promise.all([
    db
      .select({
        id: t.modelos.id,
        slug: t.modelos.slug,
        linea: t.modelos.linea,
        tipo: t.modelos.tipo,
        puestos: t.modelos.puestos,
        visible: t.modelos.visible,
        precio: t.preciosVigentes.precioLista,
      })
      .from(t.modelos)
      .leftJoin(t.preciosVigentes, eq(t.preciosVigentes.modeloId, t.modelos.id))
      .orderBy(asc(t.modelos.orden), asc(t.modelos.linea)),
    db.select({ modeloId: t.fotosModelo.modeloId, n: count() }).from(t.fotosModelo).groupBy(t.fotosModelo.modeloId),
  ]);
  const portadas = await db.select({ modeloId: t.fotosModelo.modeloId, clave: t.fotosModelo.claveArchivo }).from(t.fotosModelo).where(eq(t.fotosModelo.orden, 0));
  return modelos.map((m) => ({
    ...m,
    fotos: fotos.find((f) => f.modeloId === m.id)?.n ?? 0,
    portada: portadas.find((p) => p.modeloId === m.id)?.clave ?? null,
  }));
}

export async function modeloAdmin(id: string) {
  const [modelo] = await db.select().from(t.modelos).where(eq(t.modelos.id, id));
  if (!modelo) return null;
  const fotos = await db.select().from(t.fotosModelo).where(eq(t.fotosModelo.modeloId, id)).orderBy(asc(t.fotosModelo.orden));
  return { ...modelo, fotos };
}
