"use client";

import { useRef } from "react";
import Link from "next/link";

type Foto = { id: string; src: string; srcSet: string; pie: string | null };

/**
 * Franja deslizable de entregas recientes. No se mueve sola (un carrusel automático
 * cambia la foto mientras alguien la mira); en el celular se desliza con el dedo y en
 * computador tiene flechas. scroll-snap hace que cada foto "encaje" al soltar.
 */
export function FranjaEntregas({ fotos, nombre }: { fotos: Foto[]; nombre: string }) {
  const pista = useRef<HTMLUListElement>(null);
  if (!fotos.length) return null;
  const mover = (sentido: 1 | -1) => pista.current?.scrollBy({ left: sentido * pista.current.clientWidth * 0.8, behavior: "smooth" });

  return (
    <section aria-labelledby="titulo-entregas" className="mt-7">
      <div className="flex items-end justify-between gap-3">
        <h2 id="titulo-entregas" className="font-display text-2xl leading-none font-bold">
          Así estrenan con {nombre}
        </h2>
        <div className="flex items-center gap-2">
          <Link href="/galeria" className="font-semibold whitespace-nowrap text-azul-texto">Ver todas ›</Link>
          <span className="hidden gap-1.5 md:flex">
            <button type="button" onClick={() => mover(-1)} aria-label="Fotos anteriores" className="grid size-9 place-items-center rounded-full border border-linea-2 bg-superficie hover:border-azul">‹</button>
            <button type="button" onClick={() => mover(1)} aria-label="Más fotos" className="grid size-9 place-items-center rounded-full border border-linea-2 bg-superficie hover:border-azul">›</button>
          </span>
        </div>
      </div>
      <ul
        ref={pista}
        tabIndex={0}
        aria-label="Fotos de entregas recientes, desliza para ver más"
        className="-mx-5 mt-3 flex snap-x snap-mandatory scroll-px-5 gap-2.5 overflow-x-auto scroll-smooth px-5 pb-2 [scrollbar-width:none] focus-visible:outline-2 focus-visible:outline-azul md:mx-0 md:scroll-px-0 md:px-0 [&::-webkit-scrollbar]:hidden"
      >
        {fotos.map((f) => (
          <li key={f.id} className="w-[42%] flex-none snap-start sm:w-[30%] md:w-[22%]">
            <Link href="/galeria" className="group relative block overflow-hidden rounded-xl bg-cielo">
              {/* eslint-disable-next-line @next/next/no-img-element -- fotos ya optimizadas en WebP con srcset */}
              <img src={f.src} srcSet={f.srcSet} sizes="(min-width: 768px) 22vw, 42vw" alt={f.pie ?? "Entrega de un Suzuki"} loading="lazy" className="aspect-[4/5] w-full object-cover transition duration-300 group-hover:scale-105" />
              {f.pie && (
                <span className="absolute inset-x-0 bottom-0 line-clamp-2 bg-gradient-to-t from-black/75 to-transparent px-2.5 pt-6 pb-2 text-[13px] leading-snug text-white">{f.pie}</span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
