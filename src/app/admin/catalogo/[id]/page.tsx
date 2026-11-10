import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirRol } from "@/lib/sesion";
import { atributosFoto } from "@/modulos/fotos/fotos";
import { modeloAdmin } from "@/modulos/admin/catalogo";
import { FormularioModelo, GestorFotos } from "./clientes";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const m = await modeloAdmin(id);
  if (!m) notFound();
  return (
    <>
      <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-[32px] leading-tight font-bold">{m.linea}</h1>
        {m.visible && (
          <a href={`/modelo/${m.slug}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-azul-texto">
            Ver en el catálogo ↗
          </a>
        )}
      </div>
      <h2 className="font-display mt-6 mb-2.5 text-[22px] font-semibold">Fotos</h2>
      <GestorFotos modeloId={m.id} maximo={8} fotos={m.fotos.map((f) => ({ id: f.id, ...atributosFoto(f.claveArchivo) }))} />
      <h2 className="font-display mt-7 mb-2.5 text-[22px] font-semibold">Datos del modelo</h2>
      {/* Sin "key" a propósito: con una key que cambie al guardar, React desmontaría
          el formulario y se perdería el mensaje de "Modelo guardado". */}
      <FormularioModelo m={m} />
    </>
  );
}
