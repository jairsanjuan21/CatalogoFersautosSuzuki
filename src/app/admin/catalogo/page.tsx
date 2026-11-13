import { Suspense } from "react";
import { exigirRol } from "@/lib/sesion";
import { BotonNuevoModelo, ListaModelos } from "@/componentes/catalogo/ListaModelos";
import { Titulo } from "../componentes";

export default function Catalogo() {
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Titulo sub="Modelos, versiones, fotos y videos. Natalia también puede administrarlos desde su panel.">Catálogo maestro</Titulo>
        <BotonNuevoModelo />
      </div>
      <Suspense fallback={<p className="mt-8 text-texto-2">Cargando…</p>}>
        <Contenido />
      </Suspense>
    </>
  );
}

async function Contenido() {
  await exigirRol("admin");
  return <ListaModelos base="/admin/catalogo" />;
}
