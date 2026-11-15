"use client";

import { useState } from "react";
import { Carro, NEUTRO, type Carroceria } from "@/componentes/Carro";

/**
 * Ilustración del carro mientras el modelo no tenga fotos reales. Si tiene colores cargados,
 * se pueden elegir y la ilustración y el fondo cambian. Sin colores se muestra en gris neutro
 * y sin muestras: el cliente no debe ver colores que Natalia no ha confirmado.
 */
export function SelectorColor({ tipo, colores, sellos }: { tipo: Carroceria; colores: { nombre: string; hex: string }[]; sellos?: React.ReactNode }) {
  const [elegido, setElegido] = useState(0);
  const actual = colores[elegido];
  return (
    <div>
      <div
        className="relative grid aspect-[16/10] place-items-center overflow-hidden rounded-[28px] transition-[background] duration-500"
        style={{ background: actual ? `color-mix(in oklab, ${actual.hex} 18%, var(--cielo))` : "var(--cielo)" }}
      >
        {sellos}
        <div className="cat-llega w-[84%]">
          <Carro tipo={tipo} color={actual?.hex ?? NEUTRO} className="w-full [&_path]:transition-[fill] [&_path]:duration-500" />
        </div>
        <span className="absolute bottom-3 left-3 rounded-md bg-superficie/90 px-2 py-0.5 text-xs font-semibold text-texto-2">Ilustración</span>
      </div>
      {colores.length > 0 && <Muestras colores={colores} elegido={elegido} elegir={setElegido} />}
    </div>
  );
}

/** Muestras de color. Con `elegir` se pueden tocar; sin él solo informan (cuando hay fotos reales). */
export function Muestras({ colores, elegido, elegir }: { colores: { nombre: string; hex: string }[]; elegido?: number; elegir?: (i: number) => void }) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-3.5 gap-y-2.5">
      <span className="text-[15px] font-semibold">
        {elegir ? "Color:" : "Colores:"} {elegir && elegido !== undefined && <span className="font-medium text-texto-2">{colores[elegido]?.nombre}</span>}
      </span>
      <div className="flex flex-wrap gap-2.5" role={elegir ? "group" : undefined} aria-label={elegir ? "Color" : undefined}>
        {colores.map((c, i) =>
          elegir ? (
            <button
              key={c.nombre}
              type="button"
              aria-label={c.nombre}
              aria-pressed={i === elegido}
              onClick={() => elegir(i)}
              style={{ background: c.hex }}
              className="size-9 rounded-full border-2 border-superficie shadow-[0_0_0_2px_var(--linea-2)] transition-transform hover:scale-110 aria-pressed:scale-110 aria-pressed:shadow-[0_0_0_2px_var(--tinta)]"
            />
          ) : (
            <span key={c.nombre} className="flex items-center gap-2 text-[15px]">
              <span aria-hidden className="size-6 rounded-full border-2 border-superficie shadow-[0_0_0_1.5px_var(--linea-2)]" style={{ background: c.hex }} />
              {c.nombre}
            </span>
          ),
        )}
      </div>
    </div>
  );
}
