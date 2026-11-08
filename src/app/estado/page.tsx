import { Suspense } from "react";
import { connection } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { configuracion } from "@/db/esquema";

// Next.js 16 con Cache Components: la página tiene una parte estática (el título)
// y una parte que se consulta en cada visita, envuelta en <Suspense>.
export default function Estado() {
  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="font-display text-4xl font-bold">Estado del entorno local</h1>
      <Suspense fallback={<p className="mt-6 text-texto-2">Revisando conexión…</p>}>
        <Resultado />
      </Suspense>
    </main>
  );
}

async function Resultado() {
  await connection(); // espera una petición real: no se prerenderiza en el build
  try {
    const { rows } = await db.execute<{ version: string; ahora: string }>(
      sql`select version() as version, now()::text as ahora`,
    );
    const [conf] = await db.select().from(configuracion).limit(1);
    return (
      <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
        <dt className="text-texto-2">Base de datos</dt>
        <dd className="font-semibold text-ok">Conectada</dd>
        <dt className="text-texto-2">Versión</dt>
        <dd>{rows[0].version.split(" on ")[0]}</dd>
        <dt className="text-texto-2">Hora del servidor</dt>
        <dd>{rows[0].ahora}</dd>
        <dt className="text-texto-2">Asesora</dt>
        <dd>{conf ? `${conf.asesoraNombre}, sede ${conf.sede}` : "Falta correr npm run db:seed"}</dd>
      </dl>
    );
  } catch (e) {
    return (
      <div className="mt-6 rounded-lg bg-senal-fondo p-4 text-senal">
        <p className="font-semibold">No se pudo conectar a la base de datos</p>
        <p className="mt-2 text-sm">{e instanceof Error ? e.message : String(e)}</p>
        <p className="mt-2 text-sm">¿Está corriendo el contenedor? Prueba con: npm run db:up</p>
      </div>
    );
  }
}
