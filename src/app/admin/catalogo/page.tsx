import { Suspense } from "react";
import Link from "next/link";
import { exigirRol } from "@/lib/sesion";
import { Carro } from "@/componentes/Carro";
import { plata } from "@/lib/formato";
import { atributosFoto } from "@/modulos/fotos/fotos";
import { listarModelosAdmin } from "@/modulos/admin/catalogo";
import { crearModelo } from "@/modulos/admin/acciones-catalogo";
import { Titulo } from "../componentes";

export default function Catalogo() {
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Titulo sub="Tú manejas la estructura de cada modelo. Precios y promociones los maneja Natalia.">Catálogo maestro</Titulo>
        <form action={crearModelo}>
          <button className="min-h-11 rounded-lg bg-azul px-4 font-semibold text-white hover:bg-azul-hover">Agregar modelo</button>
        </form>
      </div>
      <Suspense fallback={<p className="mt-8 text-texto-2">Cargando…</p>}>
        <Lista />
      </Suspense>
    </>
  );
}

async function Lista() {
  await exigirRol("admin");
  const modelos = await listarModelosAdmin();
  return (
    <div className="mt-5 grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-3">
      {modelos.map((m) => (
        <Link key={m.id} href={`/admin/catalogo/${m.id}`} className="overflow-hidden rounded-xl border border-linea bg-superficie hover:border-linea-2">
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
            <p className="text-sm text-texto-2">{m.precio ? plata(m.precio) : "Sin precio"}</p>
            <div className="mt-2 flex flex-wrap gap-1.5 text-[13px] font-semibold">
              <span className={`rounded px-2 py-0.5 ${m.visible ? "bg-ok-fondo text-ok" : "bg-linea text-texto-2"}`}>{m.visible ? "Visible" : "Oculto"}</span>
              <span className={`rounded px-2 py-0.5 ${m.fotos ? "bg-cielo text-azul-texto" : "bg-ambar-fondo text-ambar"}`}>{m.fotos ? `${m.fotos} fotos` : "Sin fotos"}</span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
