"use client";

import { useEffect, useRef } from "react";

type Punto = [number, number];

/**
 * Recuadro de firma con el dedo o el mouse.
 * El lienzo es transparente: solo la tinta queda en el PNG, y así el servidor
 * puede contar los píxeles dibujados para rechazar una firma vacía.
 */
export function Firma({ alCambiar, error }: { alCambiar: (png: Blob | null) => void; error?: string }) {
  const lienzo = useRef<HTMLCanvasElement>(null);
  const trazos = useRef<Punto[][]>([]);
  const actual = useRef<Punto[] | null>(null);

  function dibujar() {
    const cv = lienzo.current;
    if (!cv) return;
    const cx = cv.getContext("2d")!;
    const { width, height } = cv.getBoundingClientRect();
    cx.clearRect(0, 0, width, height);
    cx.strokeStyle = "#14213a";
    cx.lineWidth = 2.6;
    cx.lineCap = "round";
    cx.lineJoin = "round";
    for (const t of trazos.current) {
      cx.beginPath();
      t.forEach(([x, y], i) => (i ? cx.lineTo(x * width, y * height) : cx.moveTo(x * width, y * height)));
      if (t.length === 1) cx.lineTo(t[0][0] * width + 0.1, t[0][1] * height);
      cx.stroke();
    }
  }

  useEffect(() => {
    const cv = lienzo.current!;
    function medir() {
      const r = cv.getBoundingClientRect();
      const k = window.devicePixelRatio || 1;
      cv.width = Math.round(r.width * k);
      cv.height = Math.round(r.height * k);
      cv.getContext("2d")!.setTransform(k, 0, 0, k, 0, 0);
      dibujar();
    }
    medir();
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, []);

  const punto = (e: React.PointerEvent): Punto => {
    const r = lienzo.current!.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height];
  };

  function terminar() {
    if (!actual.current) return;
    actual.current = null;
    lienzo.current!.toBlob((b) => alCambiar(b), "image/png");
  }

  function borrar() {
    trazos.current = [];
    dibujar();
    alCambiar(null);
  }

  return (
    // select-none: al firmar con el dedo, el navegador no debe seleccionar el texto de alrededor
    <div className="select-none">
      <div
        className={`relative mt-2 overflow-hidden rounded-xl border bg-white ${error ? "border-senal" : "border-linea-2"}`}
      >
        <canvas
          ref={lienzo}
          aria-label="Recuadro para firmar"
          className="block h-48 w-full cursor-crosshair touch-none"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            actual.current = [punto(e)];
            trazos.current.push(actual.current);
            dibujar();
          }}
          onPointerMove={(e) => {
            if (!actual.current) return;
            actual.current.push(punto(e));
            dibujar();
          }}
          onPointerUp={terminar}
          onPointerCancel={terminar}
        />
        <div className="pointer-events-none absolute right-4 bottom-10 left-4 border-t border-dashed border-[#9aa5b5]" />
        <span className="pointer-events-none absolute bottom-3 left-4 text-xs text-[#6b7585]">Firma del solicitante</span>
      </div>
      <div className="mt-2 flex justify-end">
        <button type="button" onClick={borrar} className="p-1 text-[15px] font-semibold text-azul-texto">
          Borrar firma
        </button>
      </div>
      {error && <p className="text-sm text-senal">{error}</p>}
    </div>
  );
}
