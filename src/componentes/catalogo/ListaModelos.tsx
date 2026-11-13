import Link from "next/link";
import { Carro } from "@/componentes/Carro";
import { plata } from "@/lib/formato";
import { atributosFoto } from "@/modulos/fotos/fotos";
import { listarModelosAdmin } from "@/modulos/admin/catalogo";
import { crearModelo } from "@/modulos/admin/acciones-catalogo";

/** Botón para crear un modelo nuevo (nace oculto). El destino lo decide el servidor según el rol. */
export function BotonNuevoModelo() {
  return (
    <form action={crearModelo}>
      <button className="min-h-11 rounded-lg bg-azul px-4 font-semibold text-white hover:bg-azul-hover">Agregar modelo</button>
    </form>
  );
}

/** Lista de modelos, compartida por el panel de Natalia y el del admin. */
export async function ListaModelos({ base }: { base: string }) {
  const todos = await listarModelosAdmin();
  const activos = todos.filter((m) => !m.archivado);
  const archivados = todos.filter((m) => m.archivado);
  return (
    <>
      <Tarjetas modelos={activos} base={base} />
      {archivados.length > 0 && (
        <>
          <h2 className="font-display mt-9 text-[22px] font-semibold text-texto-2">Archivados</h2>
          <p className="text-sm text-texto-2">Ya no se venden. Se conservan porque hay solicitudes que los usan.</p>
          <div className="opacity-70"><Tarjetas modelos={archivados} base={base} /></div>
        </>
      )}
    </>
  );
}

function Tarjetas({ modelos, base }: { modelos: Awaited<ReturnType<typeof listarModelosAdmin>>; base: string }) {
  return (
    <div className="mt-5 grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-3">
      {modelos.map((m) => (
        <Link key={m.id} href={`${base}/${m.id}`} className="overflow-hidden rounded-xl border border-linea bg-superficie hover:border-linea-2">
          <div className="grid aspect-video place-items-center bg-cielo">
            {m.portada ? (
              // eslint-disable-next-line @next/next/no-img-element -- fotos ya optimizadas en WebP con srcset
              <img {...atributosFoto(m.portada, "230px")} alt="" className="size-full object-cover" />
            ) : (
              <Carro tipo={m.tipo} color="#c9d3e1" className="w-3/4" />
            )}
          </div>
          <div className="p-3.5">
            <strong className="font-display text-xl">{m.linea}</strong>
            <p className="text-sm text-texto-2">{m.precio ? `Desde ${plata(m.precio)}` : "Sin precio base"}</p>
            <div className="mt-2 flex flex-wrap gap-1.5 text-[13px] font-semibold">
              <span className={`rounded px-2 py-0.5 ${m.visible ? "bg-ok-fondo text-ok" : "bg-linea text-texto-2"}`}>{m.visible ? "Visible" : "Oculto"}</span>
              <span className={`rounded px-2 py-0.5 ${m.fotos ? "bg-cielo text-azul-texto" : "bg-ambar-fondo text-ambar"}`}>{m.fotos ? `${m.fotos} fotos` : "Sin fotos"}</span>
              <span className={`rounded px-2 py-0.5 ${m.versiones ? "bg-cielo text-azul-texto" : "bg-ambar-fondo text-ambar"}`}>{m.versiones ? `${m.versiones} ${m.versiones === 1 ? "versión" : "versiones"}` : "Sin versiones"}</span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
