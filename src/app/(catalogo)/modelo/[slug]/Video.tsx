"use client";

import { useState } from "react";
import { miniaturaYoutube } from "@/lib/youtube";

/**
 * "Lite embed": muestra solo la miniatura y carga el reproductor de YouTube (más de 1 MB)
 * cuando el cliente toca reproducir. youtube-nocookie.com no pone cookies de seguimiento
 * hasta que el video se reproduce.
 */
export function Video({ id, titulo }: { id: string; titulo: string }) {
  const [reproduciendo, setReproduciendo] = useState(false);
  return (
    <div className="relative aspect-video overflow-hidden rounded-2xl bg-black">
      {reproduciendo ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1`}
          title={titulo}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          className="absolute inset-0 size-full"
        />
      ) : (
        <button type="button" onClick={() => setReproduciendo(true)} aria-label={`Reproducir: ${titulo}`} className="group absolute inset-0 size-full">
          {/* eslint-disable-next-line @next/next/no-img-element -- miniatura externa de YouTube */}
          <img src={miniaturaYoutube(id)} alt="" loading="lazy" className="size-full object-cover opacity-90 transition group-hover:opacity-100" />
          <span className="absolute inset-0 grid place-items-center">
            <span className="grid size-16 place-items-center rounded-full bg-black/70 transition group-hover:scale-110 group-hover:bg-azul">
              <svg viewBox="0 0 24 24" aria-hidden className="ml-1 size-7 fill-white"><path d="M8 5v14l11-7z" /></svg>
            </span>
          </span>
        </button>
      )}
    </div>
  );
}
