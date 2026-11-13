import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { connection } from "next/server";
import { fotosPublicas, SECCIONES } from "@/modulos/galeria/consultas";
import { FotosEntregas } from "../FotosEntregas";

export const metadata: Metadata = {
  title: "Familia Suzuki y clientes felices | Natalia García, Fersautos",
  description: "Fotos de las entregas de los clientes que estrenaron su Suzuki con Natalia en Cúcuta.",
};

export default function Galeria() {
  return (
    <main className="mx-auto max-w-6xl px-5">
      <Link href="/" className="inline-block py-1.5 font-semibold text-azul-texto">‹ Volver al catálogo</Link>
      <Suspense fallback={<p className="py-10 text-texto-2">Cargando…</p>}>
        <Contenido />
      </Suspense>
    </main>
  );
}

async function Contenido() {
  await connection();
  const [familia, clientes] = await Promise.all([fotosPublicas("familia"), fotosPublicas("clientes")]);
  if (!familia.length && !clientes.length) return <p className="py-10 text-texto-2">Muy pronto verás aquí las fotos de nuestras entregas.</p>;
  return (
    <>
      <FotosEntregas id="familia" {...SECCIONES.familia} fotos={familia} />
      <FotosEntregas id="clientes" {...SECCIONES.clientes} fotos={clientes} />
    </>
  );
}
