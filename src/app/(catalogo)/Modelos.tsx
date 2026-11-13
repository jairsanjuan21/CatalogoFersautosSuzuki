"use client";

import { useState } from "react";
import Link from "next/link";
import { Carro, colorDe, type Carroceria } from "@/componentes/Carro";
import { plata } from "@/lib/formato";

export interface TarjetaModelo {
  slug: string;
  linea: string;
  tipo: Carroceria;
  tipoTexto: string;
  puestos: number;
  precio: number | null;
  promocion: string | null;
  foto: { src: string; srcSet: string } | null;
}

/** Grilla con filtros. Se filtra en el navegador: son pocos modelos y así es instantáneo. */
export function Modelos({ modelos }: { modelos: TarjetaModelo[] }) {
  const tipos = [...new Map(modelos.map((m) => [m.tipo, m.tipoTexto])).entries()];
  const [filtro, setFiltro] = useState<string>("todos");
  const visibles = modelos.filter((m) => filtro === "todos" || (filtro === "promocion" ? m.promocion : m.tipo === filtro));
  const opciones: [string, string][] = [["todos", "Todos"], ...tipos, ...(modelos.some((m) => m.promocion) ? [["promocion", "Con promoción"] as [string, string]] : [])];

  return (
    <>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pt-3.5 pb-1.5 [scrollbar-width:none]" role="group" aria-label="Filtrar por tipo">
        {opciones.map(([valor, texto]) => (
          <button
            key={valor}
            type="button"
            aria-pressed={filtro === valor}
            onClick={() => setFiltro(valor)}
            className="min-h-10 flex-none rounded-full border border-linea-2 bg-superficie px-3.5 text-[15px] whitespace-nowrap aria-pressed:border-azul aria-pressed:bg-azul aria-pressed:font-semibold aria-pressed:text-white"
          >
            {texto}
          </button>
        ))}
      </div>
      <div className="mt-2.5 grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
        {visibles.map((m) => (
          <Link key={m.slug} href={`/modelo/${m.slug}`} className="flex flex-col overflow-hidden rounded-2xl border border-linea bg-superficie hover:border-linea-2">
            <div className="relative grid aspect-video place-items-center bg-cielo">
              {m.promocion && <span className="absolute top-2.5 left-2.5 z-10 rounded-md bg-senal-fondo px-2 py-0.5 text-[13px] font-semibold text-senal">{m.promocion}</span>}
              {m.foto ? (
                // eslint-disable-next-line @next/next/no-img-element -- fotos ya optimizadas en WebP con srcset
                <img src={m.foto.src} srcSet={m.foto.srcSet} sizes="(min-width: 640px) 33vw, 100vw" alt={`Suzuki ${m.linea}`} loading="lazy" className="absolute inset-0 size-full object-cover" />
              ) : (
                <Carro tipo={m.tipo} color={colorDe(m.slug)} className="w-4/5" />
              )}
            </div>
            <div className="flex flex-1 flex-col gap-0.5 px-4 pt-3.5 pb-4">
              <h3 className="font-display text-[26px] leading-tight font-bold">{m.linea}</h3>
              <span className="text-sm text-texto-2">{m.tipoTexto}, {m.puestos} puestos</span>
              {m.precio ? (
                <span className="mt-auto pt-3 font-semibold">
                  Desde {plata(m.precio)}
                  <small className="block text-[13px] font-normal text-texto-2">Precio base con IVA</small>
                </span>
              ) : (
                <span className="mt-auto pt-3 font-semibold text-azul-texto">
                  Precio a consultar
                  <small className="block text-[13px] font-normal text-texto-2">Escríbeme y te cotizo al día</small>
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
      {visibles.length === 0 && <p className="py-8 text-center text-texto-2">No hay modelos con ese filtro por ahora.</p>}
    </>
  );
}
