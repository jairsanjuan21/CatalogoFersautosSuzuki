"use client";

import { useState } from "react";
import { Carro, NEUTRO, type Carroceria } from "@/componentes/Carro";

/**
 * Ilustración del carro. Si el modelo tiene colores cargados en el catálogo, se pueden elegir
 * y la ilustración cambia. Si no tiene, se muestra en gris neutro y sin muestras de color:
 * el cliente no debe ver colores que Natalia no ha confirmado.
 */
export function SelectorColor({ tipo, colores }: { tipo: Carroceria; colores: { nombre: string; hex: string }[] }) {
  const [elegido, setElegido] = useState(0);
  const actual = colores[elegido];
  return (
    <div>
      <div className="grid aspect-[16/10] place-items-center rounded-2xl bg-cielo">
        <Carro tipo={tipo} color={actual?.hex ?? NEUTRO} className="w-4/5" />
      </div>
      {colores.length > 0 && (
        <div className="mt-3.5 flex flex-wrap items-center gap-2.5" role="group" aria-label="Color">
          {colores.map((c, i) => (
            <button
              key={c.nombre}
              type="button"
              aria-label={c.nombre}
              aria-pressed={i === elegido}
              onClick={() => setElegido(i)}
              style={{ background: c.hex }}
              className="size-[34px] rounded-full border-2 border-linea-2 aria-pressed:border-azul aria-pressed:ring-[3px] aria-pressed:ring-cielo"
            />
          ))}
          <span className="text-[15px] text-texto-2">{actual?.nombre}</span>
        </div>
      )}
      <p className="mt-2 text-[13px] text-texto-2">
        {colores.length ? "Ilustración de referencia con los colores en que se consigue. Confirma disponibilidad." : "Ilustración de referencia. Pregunta por los colores disponibles."}
      </p>
    </div>
  );
}
