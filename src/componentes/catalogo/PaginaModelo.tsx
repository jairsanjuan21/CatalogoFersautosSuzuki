import { notFound } from "next/navigation";
import { atributosFoto } from "@/modulos/fotos/fotos";
import { modeloAdmin } from "@/modulos/admin/catalogo";
import { FormularioModelo, GestorFotos } from "./EditorModelo";
import { GestorVersiones } from "./Versiones";
import { ZonaPeligro } from "./ZonaPeligro";
import { EditorVideo } from "./EditorVideo";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Editor de un modelo, compartido por el panel de Natalia y el del admin.
 * La página que lo usa verifica el rol ANTES de mostrarlo; las acciones lo vuelven a verificar.
 */
export async function PaginaModelo({ id }: { id: string }) {
  if (!UUID.test(id)) notFound();
  const m = await modeloAdmin(id);
  if (!m) notFound();
  return (
    <>
      <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-[32px] leading-tight font-bold">
          {m.linea} {m.archivado && <span className="ml-1 rounded bg-linea px-2 py-0.5 align-middle font-sans text-sm font-semibold text-texto-2">Archivado</span>}
        </h1>
        {m.visible && (
          <a href={`/modelo/${m.slug}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-azul-texto">
            Ver en el catálogo ↗
          </a>
        )}
      </div>
      <h2 className="font-display mt-6 mb-2.5 text-[22px] font-semibold">Fotos</h2>
      <GestorFotos modeloId={m.id} maximo={8} fotos={m.fotos.map((f) => ({ id: f.id, ...atributosFoto(f.claveArchivo) }))} />
      <h2 className="font-display mt-7 mb-2.5 text-[22px] font-semibold">Video</h2>
      <EditorVideo modeloId={m.id} videoActual={m.videoYoutube} />
      <h2 className="font-display mt-7 mb-2.5 text-[22px] font-semibold">Versiones</h2>
      <GestorVersiones modeloId={m.id} versiones={m.versiones} />
      <h2 className="font-display mt-7 mb-2.5 text-[22px] font-semibold">Datos del modelo</h2>
      {/* Sin "key" a propósito: con una key que cambie al guardar, React desmontaría
          el formulario y se perdería el mensaje de "Modelo guardado". */}
      <FormularioModelo m={m} />
      <h2 className="font-display mt-9 mb-2.5 text-[22px] font-semibold text-senal">Archivar o eliminar</h2>
      <ZonaPeligro modeloId={m.id} linea={m.linea} archivado={m.archivado} solicitudes={m.solicitudes} />
    </>
  );
}
