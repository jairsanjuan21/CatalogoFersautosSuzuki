"use client";

import { useState } from "react";
import { Carro, COLORES, type Carroceria } from "@/componentes/Carro";

export function SelectorColor({ tipo, colorInicial }: { tipo: Carroceria; colorInicial: string }) {
  const [color, setColor] = useState(colorInicial);
  const nombre = COLORES.find((c) => c.hex === color)?.nombre;
  return (
    <div>
      <div className="grid aspect-[16/10] place-items-center rounded-2xl bg-cielo">
        <Carro tipo={tipo} color={color} className="w-4/5" />
      </div>
      <div className="mt-3.5 flex flex-wrap items-center gap-2.5" role="group" aria-label="Color">
        {COLORES.map((c) => (
          <button
            key={c.hex}
            type="button"
            aria-label={c.nombre}
            aria-pressed={c.hex === color}
            onClick={() => setColor(c.hex)}
            style={{ background: c.hex }}
            className="size-[34px] rounded-full border-2 border-linea-2 aria-pressed:border-azul aria-pressed:ring-[3px] aria-pressed:ring-cielo"
          />
        ))}
        <span className="text-[15px] text-texto-2">{nombre}</span>
      </div>
      <p className="mt-2 text-[13px] text-texto-2">Ilustración de referencia. Los colores disponibles dependen del inventario.</p>
    </div>
  );
}
