"use client";

import { useState } from "react";

type Foto = { src: string; srcSet: string; sizes: string };

/** Fotos reales del modelo: la principal grande, flechas y miniaturas para cambiar */
export function Galeria({ linea, fotos, sellos }: { linea: string; fotos: Foto[]; sellos?: React.ReactNode }) {
  const [actual, setActual] = useState(0);
  const f = fotos[actual];
  const ir = (paso: number) => setActual((a) => (a + paso + fotos.length) % fotos.length);
  return (
    <div>
      <div className="group relative aspect-[16/10] overflow-hidden rounded-[28px] bg-cielo">
        {/* key: al cambiar de foto se vuelve a montar y repite la animación */}
        {/* eslint-disable-next-line @next/next/no-img-element -- fotos ya optimizadas en WebP con srcset */}
        <img key={f.src} src={f.src} srcSet={f.srcSet} sizes={f.sizes} alt={`Suzuki ${linea}, foto ${actual + 1} de ${fotos.length}`} className="cat-foto size-full object-cover" />
        {sellos}
        {fotos.length > 1 && (
          <>
            {[
              [-1, "Foto anterior", "M15 6l-6 6 6 6", "left-3"],
              [1, "Foto siguiente", "M9 6l6 6-6 6", "right-3"],
            ].map(([paso, etiqueta, d, lado]) => (
              <button
                key={etiqueta as string}
                type="button"
                aria-label={etiqueta as string}
                onClick={() => ir(paso as number)}
                className={`absolute top-1/2 ${lado} grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[#14213d] shadow-md transition hover:scale-110 sm:opacity-0 sm:group-hover:opacity-100`}
              >
                <svg viewBox="0 0 24 24" aria-hidden className="size-5 fill-none stroke-current stroke-[2.4] [stroke-linecap:round] [stroke-linejoin:round]">
                  <path d={d as string} />
                </svg>
              </button>
            ))}
            <span className="absolute right-3 bottom-3 rounded-full bg-black/55 px-2.5 py-1 text-[13px] font-semibold text-white tabular-nums">
              {actual + 1} / {fotos.length}
            </span>
          </>
        )}
      </div>
      {fotos.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Fotos">
          {fotos.map((x, i) => (
            <button
              key={x.src}
              type="button"
              aria-label={`Ver foto ${i + 1}`}
              aria-pressed={i === actual}
              onClick={() => setActual(i)}
              className="h-16 w-24 flex-none overflow-hidden rounded-xl border-2 border-transparent opacity-60 transition hover:opacity-100 aria-pressed:border-tinta aria-pressed:opacity-100"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- miniatura */}
              <img src={x.src} alt="" loading="lazy" className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
