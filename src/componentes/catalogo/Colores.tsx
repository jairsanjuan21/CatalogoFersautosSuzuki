"use client";

import { useRef, useState, useTransition } from "react";

const TONO_INICIAL = "#2f5da8";
import { agregarColor, moverColor, quitarColor, type ResultadoAdmin } from "@/modulos/admin/acciones-catalogo";
import { useFormularioAccion } from "@/lib/usar-formulario";

export interface ColorEditable {
  id: string;
  nombre: string;
  hex: string;
}

/** Colores frecuentes de Suzuki en Colombia, para agregarlos con un toque. El nombre se puede cambiar. */
const SUGERIDOS = [
  { nombre: "Blanco", hex: "#f2f3f5" },
  { nombre: "Blanco Perla", hex: "#ece9e0" },
  { nombre: "Plata", hex: "#b9bec5" },
  { nombre: "Gris", hex: "#6f757e" },
  { nombre: "Negro", hex: "#1f2227" },
  { nombre: "Rojo", hex: "#b3261e" },
  { nombre: "Azul", hex: "#2f5da8" },
  { nombre: "Verde", hex: "#4a6b3c" },
  { nombre: "Amarillo", hex: "#e1b52b" },
  { nombre: "Beige", hex: "#c7b48f" },
];

const claseInput =
  "min-h-11 w-full rounded-lg border border-linea-2 bg-superficie px-3 text-base outline-none focus:border-azul focus:ring-2 focus:ring-azul/40 aria-invalid:border-senal";

export function GestorColores({ modeloId, colores }: { modeloId: string; colores: ColorEditable[] }) {
  const { ref, alEnviar, estado, pendiente } = useFormularioAccion(agregarColor, { ok: true } as ResultadoAdmin);
  const campoHex = useRef<HTMLInputElement>(null);
  const campoNombre = useRef<HTMLInputElement>(null); // sin estado: el formulario lo limpia solo al agregar
  const [error, setError] = useState<string>();
  const [ocupado, iniciar] = useTransition();
  const sugeridos = SUGERIDOS.filter((s) => !colores.some((c) => c.nombre.toLowerCase() === s.nombre.toLowerCase()));

  const accion = (fn: () => Promise<ResultadoAdmin>) =>
    iniciar(async () => {
      const r = await fn();
      setError(r.ok ? undefined : r.mensaje);
    });

  return (
    <div className="rounded-xl border border-linea bg-superficie p-4">
      {colores.length === 0 ? (
        <p className="text-texto-2">Sin colores: la ficha del catálogo muestra los colores de la ilustración y dice que dependen del inventario.</p>
      ) : (
        <ul className="flex flex-wrap gap-2.5" aria-label="Colores del modelo">
          {colores.map((c, i) => (
            <li key={c.id} className="flex items-center gap-2 rounded-full border border-linea bg-superficie-2 py-1 pr-1 pl-1.5">
              <span aria-hidden className="size-7 flex-none rounded-full border border-linea-2" style={{ background: c.hex }} />
              <span className="text-[15px] font-semibold">{c.nombre}</span>
              <span className="flex">
                <button type="button" disabled={ocupado || i === 0} onClick={() => accion(() => moverColor(c.id, -1))} aria-label={`Mover ${c.nombre} antes`} className="grid size-8 place-items-center rounded-full text-texto-2 hover:bg-linea disabled:opacity-30">
                  ‹
                </button>
                <button type="button" disabled={ocupado || i === colores.length - 1} onClick={() => accion(() => moverColor(c.id, 1))} aria-label={`Mover ${c.nombre} después`} className="grid size-8 place-items-center rounded-full text-texto-2 hover:bg-linea disabled:opacity-30">
                  ›
                </button>
                <button type="button" disabled={ocupado} onClick={() => accion(() => quitarColor(c.id))} aria-label={`Quitar ${c.nombre}`} className="grid size-8 place-items-center rounded-full text-senal hover:bg-senal-fondo disabled:opacity-30">
                  <svg viewBox="0 0 24 24" aria-hidden className="size-4 fill-none stroke-current stroke-2 [stroke-linecap:round]">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
      {error && <p role="alert" className="mt-2 text-sm text-senal">{error}</p>}

      <form ref={ref} onSubmit={alEnviar} className="mt-4 border-t border-linea pt-4">
        <p className="mb-2 text-sm font-semibold">Agregar color</p>
        <input type="hidden" name="modeloId" value={modeloId} />
        <div className="flex flex-wrap items-start gap-2">
          {/* Sin estado, igual que el nombre: al agregar, el formulario vuelve al tono inicial */}
          <input
            ref={campoHex}
            type="color"
            name="hex"
            defaultValue={TONO_INICIAL}
            aria-label="Tono del color"
            title="Elegir el tono"
            className="size-11 flex-none cursor-pointer rounded-lg border border-linea-2 bg-superficie p-1"
          />
          <div className="min-w-0 flex-[1_1_200px]">
            <input
              name="nombre"
              ref={campoNombre}
              maxLength={30}
              placeholder="Nombre, como sale en Suzuki: Rojo Fuego"
              aria-label="Nombre del color"
              aria-invalid={!!estado.errores?.nombre}
              className={claseInput}
            />
            {estado.errores?.nombre && <p className="mt-1 text-[13px] text-senal">{estado.errores.nombre}</p>}
          </div>
          <button disabled={pendiente} className="min-h-11 rounded-lg bg-azul px-4 font-semibold text-white hover:bg-azul-hover disabled:opacity-60">
            {pendiente ? "Agregando…" : "Agregar"}
          </button>
        </div>
        {estado.mensaje && <p role="status" className={`mt-1.5 text-sm ${estado.ok ? "text-ok" : "text-senal"}`}>{estado.mensaje}</p>}
        {sugeridos.length > 0 && (
          <div className="mt-3">
            <p className="mb-1.5 text-[13px] text-texto-2">O toma uno de estos y ajusta el nombre si quieres:</p>
            <div className="flex flex-wrap gap-1.5">
              {sugeridos.map((s) => (
                <button
                  key={s.nombre}
                  type="button"
                  onClick={() => {
                    if (campoHex.current) campoHex.current.value = s.hex;
                    if (campoNombre.current) {
                      campoNombre.current.value = s.nombre;
                      campoNombre.current.focus();
                    }
                  }}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-linea-2 bg-superficie px-2.5 text-sm hover:border-azul"
                >
                  <span aria-hidden className="size-4 rounded-full border border-linea-2" style={{ background: s.hex }} />
                  {s.nombre}
                </button>
              ))}
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
