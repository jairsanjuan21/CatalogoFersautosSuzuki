import { Suspense } from "react";
import { exigirRol } from "@/lib/sesion";
import { BotonSalir } from "@/componentes/BotonSalir";
import { Cargando, Titulo } from "../componentes";

export default function Perfil() {
  return (
    <>
      <Titulo>Mi perfil</Titulo>
      <Suspense fallback={<Cargando />}>
        <Contenido />
      </Suspense>
    </>
  );
}

async function Contenido() {
  const u = await exigirRol("asesora");
  return (
    <div className="mt-5 rounded-xl border border-linea bg-superficie p-4">
      <p className="font-semibold">{u.name}</p>
      <p className="text-texto-2">{u.email}</p>
      <p className="mt-3 text-[15px] text-texto-2">La foto, la frase de presentación y el WhatsApp para el catálogo llegan en la fase 4.</p>
      <div className="mt-4">
        <BotonSalir />
      </div>
    </div>
  );
}
