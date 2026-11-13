"use client";

import { useEffect, useState } from "react";

const FORMATOS = {
  pesos: (n: number) => "$ " + Math.round(n).toLocaleString("es-CO"),
  numero: (n: number) => Math.round(n).toLocaleString("es-CO"),
  porcentaje: (n: number) => Math.round(n) + " %",
  millones: (n: number) => "$ " + (n / 1_000_000).toLocaleString("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + " M",
};

/**
 * Número que cuenta desde 0 hasta su valor al aparecer.
 * El valor real siempre está para lectores de pantalla (sr-only); la cifra que
 * se anima es decorativa. Con "reducir movimiento" se muestra fija de una vez.
 */
export function Contador({ valor, formato = "numero", duracion = 1400 }: { valor: number; formato?: keyof typeof FORMATOS; duracion?: number }) {
  const [mostrado, setMostrado] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sin animación: valor final de una vez
      setMostrado(valor);
      return;
    }
    let cuadro = 0;
    const inicio = performance.now();
    const paso = (ahora: number) => {
      const x = Math.min(1, (ahora - inicio) / duracion);
      setMostrado(valor * (1 - Math.pow(1 - x, 4))); // arranca rápido y frena al llegar
      if (x < 1) cuadro = requestAnimationFrame(paso);
    };
    cuadro = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(cuadro);
  }, [valor, duracion]);
  const f = FORMATOS[formato];
  return (
    <>
      <span aria-hidden className="tabular-nums">{f(mostrado)}</span>
      <span className="sr-only">{f(valor)}</span>
    </>
  );
}
