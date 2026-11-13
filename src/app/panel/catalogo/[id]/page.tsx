import { Suspense } from "react";
import Link from "next/link";
import { exigirRol } from "@/lib/sesion";
import { PaginaModelo } from "@/componentes/catalogo/PaginaModelo";
import { Cargando } from "../../componentes";

export default function EditarModelo({ params }: { params: Promise<{ id: string }> }) {
  return (
    <>
      <Link href="/panel/catalogo" className="mt-4 inline-block py-1 font-semibold text-azul-texto">
        ‹ Modelos
      </Link>
      <Suspense fallback={<Cargando />}>
        <Contenido params={params} />
      </Suspense>
    </>
  );
}

async function Contenido({ params }: { params: Promise<{ id: string }> }) {
  await exigirRol("asesora");
  return <PaginaModelo id={(await params).id} />;
}
