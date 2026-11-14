"use client";

import { useState } from "react";
import { Carro, COLORES, type Carroceria } from "@/componentes/Carro";

/**
 * Ilustración del carro que cambia de color. Si el modelo tiene colores cargados, usa esos;
 * si no, unos genéricos y avisa que dependen del inventario.
 */
export function SelectorColor({ tipo, colorInicial, colores }: { tipo: Carroceria; colorInicial: string; colores: { nombre: string; hex: string }[] }) {
  const propios = colores.length > 0;
  const lista = propios ? colores : COLORES;
  const [color, setColor] = useState(propios ? colores[0].hex : colorInicial);
  const nombre = lista.find((c) => c.hex === color)?.nombre;
  return (
    <div>
      <div className="grid aspect-[16/10] place-items-center rounded-2xl bg-cielo">
        <Carro tipo={tipo} color={color} className="w-4/5" />
      </div>
      <div className="mt-3.5 flex flex-wrap items-center gap-2.5" role="group" aria-label="Color">
        {lista.map((c) => (
          <button
            key={c.nombre}
            type="button"
            aria-label={c.nombre}
            aria-pressed={c.hex === color && c.nombre === nombre}
            onClick={() => setColor(c.hex)}
            style={{ background: c.hex }}
            className="size-[34px] rounded-full border-2 border-linea-2 aria-pressed:border-azul aria-pressed:ring-[3px] aria-pressed:ring-cielo"
          />
        ))}
        <span className="text-[15px] text-texto-2">{nombre}</span>
      </div>
      <p className="mt-2 text-[13px] text-texto-2">
        {propios ? "Ilustración de referencia con los colores en que se consigue. Confirma disponibilidad." : "Ilustración de referencia. Los colores disponibles dependen del inventario."}
      </p>
    </div>
  );
}
