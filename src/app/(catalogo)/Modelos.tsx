"use client";

import { useState } from "react";
import Link from "next/link";
import { Carro, NEUTRO, type Carroceria } from "@/componentes/Carro";
import { plata } from "@/lib/formato";

export interface TarjetaModelo {
  slug: string;
  linea: string;
  tipo: Carroceria;
  tipoTexto: string;
  puestos: number;
  precio: number | null;
  combustible: "gasolina" | "hibrido" | "electrico" | null;
  transmisiones: ("mecanica" | "automatica")[];
  nuevoPrecio: boolean;
  versionEntrada: string | null; // "GL mecánica": la del precio que se muestra
  colores: { nombre: string; hex: string }[];
  promocion: string | null;
  foto: { src: string; srcSet: string } | null;
}

const COMBUSTIBLES = {
  gasolina: "Gasolina",
  hibrido: "Híbrido",
  electrico: "Eléctrico",
} as const;
const TRANSMISION = { mecanica: "Mecánica", automatica: "Automática" } as const;
const M = 1_000_000;
const RANGOS = [
  {
    id: "hasta80",
    texto: "Hasta $80 millones",
    cumple: (p: number) => p <= 80 * M,
  },
  {
    id: "80a110",
    texto: "De $80 a $110 millones",
    cumple: (p: number) => p > 80 * M && p <= 110 * M,
  },
  {
    id: "mas110",
    texto: "Más de $110 millones",
    cumple: (p: number) => p > 110 * M,
  },
];

const claseSelect =
  "min-h-11 rounded-full border-[1.5px] border-linea-2 bg-superficie px-4 text-[15px] transition-colors hover:border-tinta data-activo:border-tinta data-activo:font-semibold data-activo:text-tinta";

/** Grilla con filtros. Se filtra en el navegador: son pocos modelos y así es instantáneo. */
export function Modelos({ modelos }: { modelos: TarjetaModelo[] }) {
  const tipos = [
    ...new Map(modelos.map((m) => [m.tipo, m.tipoTexto])).entries(),
  ];
  const [filtro, setFiltro] = useState<string>("todos");
  const [combustible, setCombustible] = useState("");
  const [transmision, setTransmision] = useState("");
  const [rango, setRango] = useState("");
  const combustibles = (
    Object.keys(COMBUSTIBLES) as (keyof typeof COMBUSTIBLES)[]
  ).filter((c) => modelos.some((m) => m.combustible === c));
  const transmisiones = (
    Object.keys(TRANSMISION) as (keyof typeof TRANSMISION)[]
  ).filter((t) => modelos.some((m) => m.transmisiones.includes(t)));
  const cumpleRango = RANGOS.find((r) => r.id === rango)?.cumple;

  const visibles = modelos.filter(
    (m) =>
      (filtro === "todos" ||
        (filtro === "promocion" ? m.promocion : m.tipo === filtro)) &&
      (!combustible || m.combustible === combustible) &&
      (!transmision || m.transmisiones.includes(transmision as "mecanica")) &&
      (!cumpleRango || (m.precio !== null && cumpleRango(m.precio))),
  );
  const opciones: [string, string][] = [
    ["todos", "Todos"],
    ...tipos,
    ...(modelos.some((m) => m.promocion)
      ? [["promocion", "Con promoción"] as [string, string]]
      : []),
  ];
  const hayFiltros = filtro !== "todos" || combustible || transmision || rango;
  const limpiar = () => {
    setFiltro("todos");
    setCombustible("");
    setTransmision("");
    setRango("");
  };

  return (
    <>
      <div
        className="-mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pt-3.5 pb-1.5 [scrollbar-width:none]"
        role="group"
        aria-label="Filtrar por tipo"
      >
        {opciones.map(([valor, texto]) => (
          <button
            key={valor}
            type="button"
            aria-pressed={filtro === valor}
            onClick={() => setFiltro(valor)}
            className="min-h-11 flex-none rounded-full border-[1.5px] border-linea-2 bg-superficie px-4.5 text-[15px] font-semibold whitespace-nowrap text-texto-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-tinta active:scale-95 aria-pressed:border-azul aria-pressed:bg-azul aria-pressed:text-white"
          >
            {texto}
          </button>
        ))}
      </div>
      <div
        className="mt-1.5 flex flex-wrap items-center gap-2"
        role="group"
        aria-label="Más filtros"
      >
        {combustibles.length > 1 && (
          <select
            aria-label="Combustible"
            value={combustible}
            onChange={(e) => setCombustible(e.target.value)}
            data-activo={combustible ? "" : undefined}
            className={claseSelect}
          >
            <option value="">Cualquier combustible</option>
            {combustibles.map((c) => (
              <option key={c} value={c}>
                {COMBUSTIBLES[c]}
              </option>
            ))}
          </select>
        )}
        {transmisiones.length > 1 && (
          <select
            aria-label="Transmisión"
            value={transmision}
            onChange={(e) => setTransmision(e.target.value)}
            data-activo={transmision ? "" : undefined}
            className={claseSelect}
          >
            <option value="">Mecánica o automática</option>
            {transmisiones.map((t) => (
              <option key={t} value={t}>
                {TRANSMISION[t]}
              </option>
            ))}
          </select>
        )}
        {modelos.some((m) => m.precio) && (
          <select
            aria-label="Precio"
            value={rango}
            onChange={(e) => setRango(e.target.value)}
            data-activo={rango ? "" : undefined}
            className={claseSelect}
          >
            <option value="">Cualquier precio</option>
            {RANGOS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.texto}
              </option>
            ))}
          </select>
        )}
        <p className="ml-auto text-sm text-texto-2" aria-live="polite">
          {visibles.length === modelos.length
            ? `${modelos.length} modelos`
            : `${visibles.length} de ${modelos.length} modelos`}
          {hayFiltros && (
            <button
              type="button"
              onClick={limpiar}
              className="ml-2 min-h-10 font-semibold text-azul-texto underline-offset-2 hover:underline"
            >
              Quitar filtros
            </button>
          )}
        </p>
      </div>
      <div className="mt-6 grid grid-cols-[repeat(auto-fill,minmax(min(300px,100%),1fr))] gap-6">
        {visibles.map((m, i) => {
          const tono = m.colores[0]?.hex ?? NEUTRO;
          // Sin colores cargados, el fondo usa el tono cálido del catálogo en vez del gris
          const fondo = m.colores[0]
            ? `color-mix(in oklab, ${tono} 20%, var(--superficie))`
            : "var(--cielo)";
          return (
            <Link
              key={m.slug}
              href={`/modelo/${m.slug}`}
              className="cat-carta group flex flex-col overflow-hidden rounded-[22px] transition-[transform,box-shadow] duration-300 hover:-translate-y-1.5 hover:shadow-[0_26px_50px_-28px_rgb(20_33_61/0.55)]"
              style={{
                animationDelay: `${Math.min(i, 8) * 70}ms`,
                background: fondo,
              }}
            >
              <div className="relative grid aspect-[16/10] place-items-center overflow-hidden">
                {/* Etiquetas en una fila que se acomoda: no se montan aunque la promoción sea larga */}
                <div className="absolute inset-x-3 top-3 z-10 flex flex-wrap items-start justify-between gap-1.5">
                  {m.promocion ? (
                    <span className="max-w-[75%] rounded-lg bg-acento px-2.5 py-1 text-[13px] font-bold text-white shadow-sm">
                      {m.promocion}
                    </span>
                  ) : (
                    <span />
                  )}
                  {m.combustible === "hibrido" && (
                    <span className="rounded-lg bg-ok-fondo px-2.5 py-1 text-[13px] font-bold text-ok">
                      Híbrido
                    </span>
                  )}
                </div>
                {m.foto ? (
                  // eslint-disable-next-line @next/next/no-img-element -- fotos ya optimizadas en WebP con srcset
                  <img
                    src={m.foto.src}
                    srcSet={m.foto.srcSet}
                    sizes="(min-width: 640px) 33vw, 100vw"
                    alt={`Suzuki ${m.linea}`}
                    loading="lazy"
                    className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="cat-arranca w-4/5 pt-4">
                    <Carro tipo={m.tipo} color={tono} className="w-full" />
                  </div>
                )}
              </div>
              <div className="m-2.5 mt-0 flex flex-1 flex-col gap-0.5 rounded-2xl bg-superficie px-4.5 pt-4 pb-4">
                <h3 className="font-display text-[28px] leading-tight font-semibold text-tinta">
                  {m.linea}
                </h3>
                <span className="text-[15px] text-texto-2">
                  {m.tipoTexto}, {m.puestos} puestos
                </span>
                {m.colores.length > 0 && (
                  <span
                    className="mt-2 flex items-center gap-1.5"
                    aria-label={`Colores: ${m.colores.map((c) => c.nombre).join(", ")}`}
                  >
                    {m.colores.slice(0, 6).map((c, j) => (
                      <span
                        key={c.nombre}
                        title={c.nombre}
                        className="size-4 rounded-full border border-linea-2 transition-transform duration-300 group-hover:-translate-y-0.5"
                        style={{
                          background: c.hex,
                          transitionDelay: `${j * 40}ms`,
                        }}
                      />
                    ))}
                    {m.colores.length > 6 && (
                      <span className="ml-0.5 text-xs text-texto-2">
                        +{m.colores.length - 6}
                      </span>
                    )}
                  </span>
                )}
                <div className="mt-auto flex items-end justify-between gap-3 pt-4">
                  {m.precio ? (
                    <span className="font-bold text-tinta">
                      Desde {plata(m.precio)}
                      {m.nuevoPrecio && (
                        <span className="ml-2 inline-block rounded bg-cielo px-1.5 py-0.5 align-middle text-xs whitespace-nowrap text-azul-texto">
                          Nuevo precio
                        </span>
                      )}
                      <small className="block text-[13px] font-normal text-texto-2">
                        {m.versionEntrada
                          ? `Versión ${m.versionEntrada}, con IVA`
                          : "Precio con IVA, según versión"}
                      </small>
                    </span>
                  ) : (
                    <span className="font-bold text-tinta">
                      Precio a consultar
                      <small className="block text-[13px] font-normal text-texto-2">
                        Escríbeme y te cotizo al día
                      </small>
                    </span>
                  )}
                  <span
                    aria-hidden
                    className="grid size-10 flex-none place-items-center rounded-full bg-cielo font-bold text-azul-texto transition-all duration-300 group-hover:translate-x-1 group-hover:bg-acento group-hover:text-white"
                  >
                    →
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
      {visibles.length === 0 && (
        <p className="py-8 text-center text-texto-2">
          No hay modelos con esos filtros por ahora.{" "}
          <button
            type="button"
            onClick={limpiar}
            className="font-semibold text-azul-texto underline"
          >
            Ver todos
          </button>
        </p>
      )}
    </>
  );
}
