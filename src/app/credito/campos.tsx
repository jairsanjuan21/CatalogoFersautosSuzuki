"use client";

import { createContext, use, useId, type ReactNode } from "react";
import { plata } from "@/lib/formato";

/* ============================================================================
   Contexto del formulario: cada campo pide su valor y su error por "ruta"
   (por ejemplo "contacto.celular"), sin pasar props de componente en componente.
   ========================================================================== */

interface ContextoFormulario {
  valor: (ruta: string) => unknown;
  cambiar: (ruta: string, valor: unknown) => void;
  error: (ruta: string) => string | undefined;
}

export const FormularioContexto = createContext<ContextoFormulario | null>(null);

export function useCampo(ruta: string) {
  const ctx = use(FormularioContexto);
  if (!ctx) throw new Error("useCampo debe usarse dentro de FormularioContexto");
  return { valor: ctx.valor(ruta), cambiar: (v: unknown) => ctx.cambiar(ruta, v), error: ctx.error(ruta) };
}

/* ---------- envoltura común: etiqueta, ayuda y error ---------- */

interface Base {
  ruta: string;
  etiqueta: string;
  opcional?: boolean;
  ayuda?: string;
  media?: boolean; // ocupa media fila en pantallas anchas
}

function Envoltura({
  id,
  etiqueta,
  opcional,
  ayuda,
  error,
  media,
  children,
  comoGrupo,
}: Omit<Base, "ruta"> & { id: string; error?: string; children: ReactNode; comoGrupo?: boolean }) {
  const Etiqueta = comoGrupo ? "legend" : "label";
  const Contenedor = comoGrupo ? "fieldset" : "div";
  return (
    <Contenedor data-campo={id} className={`min-w-0 border-0 p-0 ${media ? "col-span-2 sm:col-span-1" : "col-span-2"}`}>
      <Etiqueta {...(!comoGrupo && { htmlFor: id })} className="mb-1 block p-0 text-[15px] font-semibold text-texto-2">
        {etiqueta}
        {opcional && <span className="font-normal text-texto-2"> (opcional)</span>}
      </Etiqueta>
      {children}
      {ayuda && (
        <p id={`${id}-ayuda`} className="mt-1.5 text-sm text-texto-2">
          {ayuda}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-senal">
          {error}
        </p>
      )}
    </Contenedor>
  );
}

// Campos subrayados y grandes (propuesta I). 18 px: en iPhone, menos de 16 px hace zoom al tocar el campo.
const claseInput = (error?: string, grande?: boolean) =>
  `min-h-[52px] w-full rounded-none border-0 border-b-[2.5px] bg-transparent px-0.5 ${grande ? "font-display text-[28px] sm:text-[32px]" : "text-lg"} font-semibold text-tinta outline-none transition-colors placeholder:font-normal placeholder:text-texto-3 focus:border-acento ${
    error ? "border-senal" : "border-linea-2"
  }`;

const describe = (id: string, ayuda?: string, error?: string) =>
  [ayuda && `${id}-ayuda`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;

/* ---------- texto, correo, fecha ---------- */

export function Texto({
  tipo = "text",
  placeholder,
  maxLength,
  autoComplete,
  ...b
}: Base & { tipo?: "text" | "email" | "date"; placeholder?: string; maxLength?: number; autoComplete?: string }) {
  const id = useId();
  const { valor, cambiar, error } = useCampo(b.ruta);
  return (
    <Envoltura id={id} {...b} error={error}>
      <input
        id={id}
        type={tipo}
        value={(valor as string) ?? ""}
        onChange={(e) => cambiar(e.target.value === "" ? undefined : e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        autoComplete={autoComplete}
        aria-invalid={!!error}
        aria-describedby={describe(id, b.ayuda, error)}
        className={claseInput(error)}
      />
    </Envoltura>
  );
}

/* ---------- solo dígitos (celular, cédula, teléfono) ---------- */

export function Digitos({ max, autoComplete, placeholder, ...b }: Base & { max: number; autoComplete?: string; placeholder?: string }) {
  const id = useId();
  const { valor, cambiar, error } = useCampo(b.ruta);
  return (
    <Envoltura id={id} {...b} error={error}>
      <input
        id={id}
        inputMode="numeric"
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={(valor as string) ?? ""}
        onChange={(e) => {
          const d = e.target.value.replace(/\D/g, "").slice(0, max);
          cambiar(d === "" ? undefined : d);
        }}
        aria-invalid={!!error}
        aria-describedby={describe(id, b.ayuda, error)}
        className={claseInput(error)}
      />
    </Envoltura>
  );
}

/* ---------- número entero pequeño ---------- */

export function Numero({ max = 99, ...b }: Base & { max?: number }) {
  const id = useId();
  const { valor, cambiar, error } = useCampo(b.ruta);
  return (
    <Envoltura id={id} {...b} error={error}>
      <input
        id={id}
        inputMode="numeric"
        value={valor === undefined ? "" : String(valor)}
        onChange={(e) => {
          const d = e.target.value.replace(/\D/g, "").slice(0, String(max).length);
          cambiar(d === "" ? undefined : Math.min(Number(d), max));
        }}
        aria-invalid={!!error}
        aria-describedby={describe(id, b.ayuda, error)}
        className={claseInput(error)}
      />
    </Envoltura>
  );
}

/* ---------- dinero: se escribe "15000000" y se ve "$ 15.000.000" ---------- */

export function Dinero(b: Base) {
  const id = useId();
  const { valor, cambiar, error } = useCampo(b.ruta);
  return (
    <Envoltura id={id} {...b} error={error}>
      <input
        id={id}
        inputMode="numeric"
        placeholder="$ 0"
        value={plata(valor as number | undefined)}
        onChange={(e) => {
          const d = e.target.value.replace(/\D/g, "").slice(0, 11);
          cambiar(d === "" ? undefined : Number(d));
        }}
        aria-invalid={!!error}
        aria-describedby={describe(id, b.ayuda, error)}
        className={claseInput(error, true)}
      />
    </Envoltura>
  );
}

/* ---------- lista desplegable ---------- */

export function Seleccion({ opciones, ...b }: Base & { opciones: Record<string, string> | string[] }) {
  const id = useId();
  const { valor, cambiar, error } = useCampo(b.ruta);
  const pares = Array.isArray(opciones) ? opciones.map((o) => [o, o]) : Object.entries(opciones);
  return (
    <Envoltura id={id} {...b} error={error}>
      <select
        id={id}
        value={(valor as string) ?? ""}
        onChange={(e) => cambiar(e.target.value || undefined)}
        aria-invalid={!!error}
        aria-describedby={describe(id, b.ayuda, error)}
        className={claseInput(error)}
      >
        <option value="">Selecciona una opción</option>
        {pares.map(([v, t]) => (
          <option key={v} value={v}>
            {t}
          </option>
        ))}
      </select>
    </Envoltura>
  );
}

/* ---------- botones de opción (chips) ---------- */

export function Chips<T extends string | number | boolean>({
  opciones,
  sufijo = "",
  rejilla,
  ...b
}: Base & { opciones: [T, string][]; sufijo?: string; rejilla?: boolean }) {
  const id = useId();
  const { valor, cambiar, error } = useCampo(b.ruta);
  return (
    <Envoltura id={id} {...b} error={error} comoGrupo>
      {/* rejilla: opciones cortas (plazos, estrato) en columnas parejas en el celular */}
      <div className={rejilla ? "grid grid-cols-3 gap-2 sm:flex sm:flex-wrap" : "flex flex-wrap gap-2"} role="radiogroup" aria-describedby={describe(id, b.ayuda, error)}>
        {opciones.map(([v, t]) => {
          const activo = valor === v;
          return (
            <button
              key={String(v)}
              type="button"
              role="radio"
              aria-checked={activo}
              onClick={() => cambiar(v)}
              className={`min-h-12 rounded-full border-[1.5px] ${rejilla ? "px-2 sm:px-5" : "px-5"} text-base font-semibold whitespace-nowrap transition duration-200 hover:-translate-y-0.5 active:scale-95 ${
                activo ? "border-azul bg-azul text-white" : `bg-superficie/80 text-texto-4 ${error ? "border-senal" : "border-linea-2"}`
              }`}
            >
              {t}
              {sufijo}
            </button>
          );
        })}
      </div>
    </Envoltura>
  );
}

/* ---------- interruptor (para secciones opcionales) ---------- */

export function Interruptor({
  activo,
  alCambiar,
  children,
}: {
  activo: boolean;
  alCambiar: (v: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label className="col-span-2 flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border-[1.5px] border-linea-2 bg-superficie p-4 font-semibold transition hover:border-tinta">
      <input type="checkbox" checked={activo} onChange={(e) => alCambiar(e.target.checked)} className="peer sr-only" />
      <span
        aria-hidden
        className="relative h-6 w-[42px] flex-none rounded-full bg-linea-2 transition-colors peer-checked:bg-azul peer-focus-visible:ring-2 peer-focus-visible:ring-azul after:absolute after:top-[3px] after:left-[3px] after:h-[18px] after:w-[18px] after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-[18px]"
      />
      <span>{children}</span>
    </label>
  );
}

/* ---------- títulos y notas dentro de un paso ---------- */

export function Subtitulo({ children, nota }: { children: ReactNode; nota?: string }) {
  return (
    <div className="col-span-2 mt-3 border-t border-linea pt-6 first:mt-0 first:border-0 first:pt-0">
      <h3 className="font-display text-2xl font-semibold text-tinta">{children}</h3>
      {nota && <p className="mt-1 text-[15px] text-texto-2">{nota}</p>}
    </div>
  );
}

export function Nota({ children }: { children: ReactNode }) {
  return <p className="col-span-2 rounded-2xl bg-cielo p-4 text-[15px]">{children}</p>;
}
