import { Suspense } from "react";
import { exigirRol } from "@/lib/sesion";
import { BotonNuevoModelo, ListaModelos } from "@/componentes/catalogo/ListaModelos";
import { Cargando, Titulo } from "../componentes";
import { SubnavCatalogo } from "../SubnavCatalogo";

export default function Modelos() {
  return (
    <>
      <Titulo sub="Los carros que ves en tu catálogo: fotos, video, versiones y datos.">Catálogo</Titulo>
      <SubnavCatalogo activa="Modelos" />
      <div className="mt-4 flex justify-end">
        <BotonNuevoModelo />
      </div>
      <Suspense fallback={<Cargando />}>
        <Contenido />
      </Suspense>
    </>
  );
}

async function Contenido() {
  await exigirRol("asesora");
  return <ListaModelos base="/panel/catalogo" />;
}
