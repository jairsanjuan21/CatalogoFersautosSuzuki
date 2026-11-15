"use client";

import { useEffect, useRef, useState } from "react";

export type Pestana = { id: string; titulo: string; contenido: React.ReactNode };

/** Pestañas bajo la ficha técnica: solo aparecen las que tienen datos cargados */
export function Detalles({ pestanas }: { pestanas: Pestana[] }) {
  const [actual, setActual] = useState(pestanas[0]?.id);
  if (!pestanas.length) return null;
  const p = pestanas.find((x) => x.id === actual) ?? pestanas[0];
  return (
    <div>
      <div role="tablist" aria-label="Detalles del modelo" className="-mx-1 flex gap-2 overflow-x-auto border-b border-linea px-1 pb-3">
        {pestanas.map((x) => (
          <button
            key={x.id}
            type="button"
            role="tab"
            id={`pestana-${x.id}`}
            aria-selected={x.id === p.id}
            aria-controls={`panel-${x.id}`}
            onClick={() => setActual(x.id)}
            className="min-h-11 flex-none rounded-full border-[1.5px] border-linea-2 bg-superficie px-5 text-[15px] font-semibold whitespace-nowrap text-texto-4 transition hover:border-tinta aria-selected:border-azul aria-selected:bg-azul aria-selected:text-white"
          >
            {x.titulo}
          </button>
        ))}
      </div>
      <div key={p.id} role="tabpanel" id={`panel-${p.id}`} aria-labelledby={`pestana-${p.id}`} className="cat-panel mt-6">
        {p.contenido}
      </div>
    </div>
  );
}

/** Número que cuenta desde 0 cuando entra en pantalla */
export function Contador({ valor }: { valor: number }) {
  const [n, setN] = useState(valor);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      const ini = performance.now();
      const paso = (t: number) => {
        const k = Math.min(1, (t - ini) / 1100);
        setN(Math.round(valor * (1 - Math.pow(1 - k, 3))));
        if (k < 1) raf = requestAnimationFrame(paso);
      };
      setN(0);
      raf = requestAnimationFrame(paso);
    });
    obs.observe(el);
    return () => {
      obs.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [valor]);
  return (
    <span ref={ref} className="tabular-nums">
      {n.toLocaleString("es-CO")}
    </span>
  );
}
