import { Suspense } from "react";
import Link from "next/link";
import { exigirRol } from "@/lib/sesion";
import { ESTADOS, type Estado } from "@/lib/etiquetas";
import { conteoPorEstado, listarSolicitudes } from "@/modulos/solicitudes/panel";
import { Cargando, ItemSolicitud, Lista, Titulo } from "../componentes";

type Params = Promise<{ estado?: string; q?: string }>;

export default function Solicitudes({ searchParams }: { searchParams: Params }) {
  return (
    <>
      <Titulo>Solicitudes</Titulo>
      <Suspense fallback={<Cargando />}>
        <Contenido searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Contenido({ searchParams }: { searchParams: Params }) {
  await exigirRol("asesora");
  const { estado: e, q } = await searchParams;
  const estado = e && e in ESTADOS ? (e as Estado) : undefined;
  const [filas, conteos] = await Promise.all([listarSolicitudes({ estado, busqueda: q }), conteoPorEstado()]);
  const total = Object.values(conteos).reduce((a, b) => a + (b ?? 0), 0);

  const enlace = (nuevo?: Estado) => {
    const p = new URLSearchParams();
    if (nuevo) p.set("estado", nuevo);
    if (q) p.set("q", q);
    const s = p.toString();
    return `/panel/solicitudes${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <p className="text-texto-2">{total} en total</p>

      {/* Búsqueda con un formulario GET: funciona incluso sin JavaScript y queda en la URL */}
      <form action="/panel/solicitudes" role="search" className="mt-4 flex gap-2">
        {estado && <input type="hidden" name="estado" value={estado} />}
        <input
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Buscar por nombre, cédula o radicado"
          aria-label="Buscar solicitudes"
          className="min-h-12 min-w-0 flex-1 rounded-xl border border-linea-2 bg-superficie px-3.5 outline-none focus:border-azul focus:ring-2 focus:ring-azul/40"
        />
        <button className="min-h-12 rounded-xl border border-linea-2 bg-superficie px-4 font-semibold">Buscar</button>
      </form>

      <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-2.5 [scrollbar-width:none]" role="group" aria-label="Filtrar por estado">
        {[undefined, ...(Object.keys(ESTADOS) as Estado[])].map((x) => (
          <Link
            key={x ?? "todas"}
            href={enlace(x)}
            aria-current={x === estado ? "true" : undefined}
            className="flex min-h-10 flex-none items-center rounded-full border border-linea-2 bg-superficie px-3.5 text-[15px] whitespace-nowrap aria-[current=true]:border-azul aria-[current=true]:bg-azul aria-[current=true]:font-semibold aria-[current=true]:text-white"
          >
            {x ? `${ESTADOS[x]} (${conteos[x] ?? 0})` : "Todas"}
          </Link>
        ))}
      </div>

      <Lista vacio={q ? `No hay solicitudes que coincidan con “${q}”.` : "No hay solicitudes con este filtro."}>
        {filas.map((s) => (
          <ItemSolicitud key={s.id} s={s} />
        ))}
      </Lista>
    </>
  );
}
