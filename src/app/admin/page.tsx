import { Suspense } from "react";
import { exigirRol } from "@/lib/sesion";
import { BotonSalir } from "@/componentes/BotonSalir";

export default function Admin() {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <Suspense fallback={<p className="text-texto-2">Cargando…</p>}>
        <Contenido />
      </Suspense>
    </main>
  );
}

async function Contenido() {
  const usuario = await exigirRol("admin");
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-4xl font-bold">Administración</h1>
        <BotonSalir />
      </div>
      <p className="mt-4 text-texto-2">Sesión de {usuario.name} ({usuario.email}).</p>
    </>
  );
}
