import { Suspense } from "react";
import { exigirRol } from "@/lib/sesion";
import { BotonSalir } from "@/componentes/BotonSalir";
import { datosAsesora } from "@/modulos/catalogo/consultas";
import { Cargando, Titulo } from "../componentes";
import { FormularioPerfil } from "./FormularioPerfil";
import { db } from "@/db";
import * as t from "@/db/esquema";
import { atributosFoto } from "@/modulos/fotos/fotos";

export default function Perfil() {
  return (
    <>
      <Titulo sub="Así te presentas en el catálogo y en el formulario de crédito.">Mi perfil</Titulo>
      <Suspense fallback={<Cargando />}>
        <Contenido />
      </Suspense>
    </>
  );
}

async function Contenido() {
  const usuario = await exigirRol("asesora");
  const [a, [conf]] = await Promise.all([datosAsesora(), db.select({ meta: t.configuracion.metaVentasMes }).from(t.configuracion).limit(1)]);
  if (!a) return null;
  return (
    <>
      <FormularioPerfil nombre={a.nombre} frase={a.frase} whatsapp={a.whatsapp} foto={a.foto ? atributosFoto(a.foto) : null} meta={conf?.meta ?? null} />
      <h2 className="font-display mt-8 mb-2.5 text-[22px] font-semibold">Cuenta</h2>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-linea bg-superficie p-4">
        <span className="text-texto-2">{usuario.email}</span>
        <BotonSalir />
      </div>
    </>
  );
}
