import { Suspense } from "react";
import { asc, eq, sql } from "drizzle-orm";
import { exigirRol } from "@/lib/sesion";
import { db } from "@/db";
import * as t from "@/db/esquema";
import { nombreDeAsesora } from "@/lib/formato";
import { Cargando, Titulo } from "../componentes";
import { PanelCompartir, type Estadisticas } from "./PanelCompartir";

export default function Compartir() {
  return (
    <>
      <Titulo sub="Enlaces y mensajes listos para cada red, con lo que ha dado cada una.">Compartir</Titulo>
      <Suspense fallback={<Cargando />}>
        <Contenido />
      </Suspense>
    </>
  );
}

async function Contenido() {
  await exigirRol("asesora");
  const base = (process.env.BETTER_AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const [porOrigen, modelos, [conf]] = await Promise.all([
    db
      .select({
        origen: t.solicitudes.origen,
        recientes: sql<number>`count(*) filter (where ${t.solicitudes.creadoEn} >= now() - interval '30 days')`.mapWith(Number),
        vendidas: sql<number>`count(*) filter (where ${t.solicitudes.estado} = 'entregada')`.mapWith(Number),
      })
      .from(t.solicitudes)
      .groupBy(t.solicitudes.origen),
    db.select({ slug: t.modelos.slug, linea: t.modelos.linea }).from(t.modelos).where(eq(t.modelos.visible, true)).orderBy(asc(t.modelos.orden)),
    db.select({ nombre: t.configuracion.asesoraNombre }).from(t.configuracion).limit(1),
  ]);
  const estadisticas: Estadisticas = Object.fromEntries(porOrigen.map((o) => [o.origen, { recientes: o.recientes, vendidas: o.vendidas }]));
  return <PanelCompartir base={base} primerNombre={conf ? nombreDeAsesora(conf.nombre).primero : "Natalia"} modelos={modelos} estadisticas={estadisticas} />;
}
