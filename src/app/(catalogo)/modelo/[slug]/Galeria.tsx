"use client";

import { useState } from "react";

type Foto = { src: string; srcSet: string; sizes: string };

export function Galeria({ linea, fotos }: { linea: string; fotos: Foto[] }) {
  const [actual, setActual] = useState(0);
  const f = fotos[actual];
  return (
    <div>
      <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-cielo">
        {/* eslint-disable-next-line @next/next/no-img-element -- fotos ya optimizadas en WebP con srcset */}
        <img src={f.src} srcSet={f.srcSet} sizes={f.sizes} alt={`Suzuki ${linea}, foto ${actual + 1} de ${fotos.length}`} className="size-full object-cover" />
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
              className="h-16 w-24 flex-none overflow-hidden rounded-lg border-2 border-transparent opacity-70 aria-pressed:border-azul aria-pressed:opacity-100"
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
