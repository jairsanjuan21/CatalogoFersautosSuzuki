import { Suspense } from "react";
import { asc, eq } from "drizzle-orm";
import { exigirRol } from "@/lib/sesion";
import { db } from "@/db";
import * as t from "@/db/esquema";
import { atributosFoto } from "@/modulos/fotos/fotos";
import { fotosParaPanel, SECCIONES, type Seccion } from "@/modulos/galeria/consultas";
import { Cargando, Titulo } from "../componentes";
import { SubnavCatalogo } from "../SubnavCatalogo";
import { AccionesFoto, SubirFoto } from "./clientes";

export default function Galeria() {
  return (
    <>
      <Titulo sub="Fotos de tus entregas para las secciones Familia Suzuki y Clientes felices del catálogo.">Catálogo</Titulo>
      <SubnavCatalogo activa="Galería" />
      <Suspense fallback={<Cargando />}>
        <Contenido />
      </Suspense>
    </>
  );
}

async function Contenido() {
  await exigirRol("asesora");
  const [fotos, modelos] = await Promise.all([
    fotosParaPanel(),
    db.select({ id: t.modelos.id, linea: t.modelos.linea }).from(t.modelos).where(eq(t.modelos.archivado, false)).orderBy(asc(t.modelos.orden)),
  ]);
  return (
    <>
      <h2 className="font-display mt-6 mb-2.5 text-[22px] font-semibold">Publicar una foto</h2>
      <SubirFoto modelos={modelos} />
      <p className="mt-2 text-[13px] text-texto-2">
        La imagen de una persona es un dato personal (Ley 1581 de 2012): publica solo fotos autorizadas. Si alguien te pide retirar su foto, bórrala aquí.
      </p>

      {(Object.keys(SECCIONES) as Seccion[]).map((s) => {
        const delaSeccion = fotos.filter((f) => f.seccion === s);
        return (
          <section key={s}>
            <h2 className="font-display mt-8 mb-2.5 text-[22px] font-semibold">
              {SECCIONES[s].titulo} <span className="font-sans text-base font-normal text-texto-2">({delaSeccion.length})</span>
            </h2>
            {delaSeccion.length === 0 && <p className="rounded-xl border border-linea bg-superficie p-4 text-texto-2">Todavía no hay fotos en esta sección.</p>}
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {delaSeccion.map((f) => (
                <li key={f.id} className={`overflow-hidden rounded-xl border border-linea bg-superficie ${f.visible ? "" : "opacity-60"}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- fotos ya optimizadas */}
                  <img {...atributosFoto(f.clave, "200px")} alt={f.pie ?? "Foto de entrega"} className="aspect-[4/3] w-full object-cover" />
                  <div className="p-2.5">
                    {f.pie && <p className="text-sm">{f.pie}</p>}
                    <p className="text-[13px] text-texto-2">
                      {[f.linea, f.hayMenores && "con menores autorizados", !f.visible && "oculta"].filter(Boolean).join(" · ")}
                    </p>
                    <div className="mt-2"><AccionesFoto fotoId={f.id} visible={f.visible} /></div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </>
  );
}
