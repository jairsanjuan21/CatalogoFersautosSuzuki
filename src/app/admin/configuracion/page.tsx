import { Suspense } from "react";
import { desc } from "drizzle-orm";
import { exigirRol } from "@/lib/sesion";
import { db } from "@/db";
import * as t from "@/db/esquema";
import { fechaCorta } from "@/lib/etiquetas";
import { Titulo } from "../componentes";
import { FormularioConfiguracion, NuevaVersionClausula } from "./clientes";

export default function Configuracion() {
  return (
    <>
      <Titulo sub="Datos fijos que se estampan en cada formulario y reglas del sistema.">Configuración</Titulo>
      <Suspense fallback={<p className="mt-8 text-texto-2">Cargando…</p>}>
        <Contenido />
      </Suspense>
    </>
  );
}

async function Contenido() {
  await exigirRol("admin");
  const [[c], clausulas] = await Promise.all([
    db.select().from(t.configuracion).limit(1),
    db.select().from(t.clausulas).orderBy(desc(t.clausulas.version)),
  ]);
  if (!c) return <p className="mt-6 text-senal">Falta la configuración inicial: corre npm run db:seed.</p>;
  return (
    <>
      <FormularioConfiguracion c={c} />
      <h2 className="font-display mt-9 mb-1 text-[22px] font-semibold">Cláusula de autorización</h2>
      <p className="mb-3 text-[15px] text-texto-2">
        Cada solicitud guarda la versión que el cliente aceptó. Si Fersautos cambia el texto, crea una versión nueva: las anteriores quedan como respaldo.
      </p>
      <div className="rounded-xl border border-linea bg-superficie">
        {clausulas.map((v, i) => (
          <div key={v.id} className="flex flex-wrap items-baseline gap-x-3 border-b border-linea px-4 py-3 last:border-b-0">
            <strong>Versión {v.version}</strong>
            {i === 0 && <span className="rounded bg-ok-fondo px-2 py-0.5 text-[13px] font-semibold text-ok">Vigente</span>}
            <span className="text-[15px] text-texto-2">{v.nota}, desde el {fechaCorta(v.vigenteDesde)}</span>
          </div>
        ))}
      </div>
      <NuevaVersionClausula textoActual={clausulas[0]?.texto ?? ""} />
    </>
  );
}
