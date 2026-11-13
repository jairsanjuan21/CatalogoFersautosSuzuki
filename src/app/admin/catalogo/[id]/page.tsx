import { Suspense } from "react";
import Link from "next/link";
import { exigirRol } from "@/lib/sesion";
import { PaginaModelo } from "@/componentes/catalogo/PaginaModelo";

export default function EditarModelo({ params }: { params: Promise<{ id: string }> }) {
  return (
    <>
      <Link href="/admin/catalogo" className="mt-5 inline-block py-1 font-semibold text-azul-texto">
        ‹ Catálogo maestro
      </Link>
      <Suspense fallback={<p className="mt-8 text-texto-2">Cargando…</p>}>
        <Contenido params={params} />
      </Suspense>
    </>
  );
}

async function Contenido({ params }: { params: Promise<{ id: string }> }) {
  await exigirRol("admin");
  return <PaginaModelo id={(await params).id} />;
}
