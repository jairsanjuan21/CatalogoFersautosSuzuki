"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";
import { guardarPerfil, type ResultadoPerfil } from "@/modulos/perfil/acciones";
import { FotoPerfil } from "./FotoPerfil";

const claseInput =
  "min-h-11 w-full rounded-lg border border-linea-2 bg-superficie px-3 text-base outline-none focus:border-azul focus:ring-2 focus:ring-azul/40 aria-invalid:border-senal";

export function FormularioPerfil({ nombre, frase: fraseInicial, whatsapp: waInicial, foto, meta }: { nombre: string; frase: string; whatsapp: string | null; foto: { src: string; srcSet: string } | null; meta: number | null }) {
  const [estado, accion, guardando] = useActionState(guardarPerfil, { ok: true } as ResultadoPerfil);
  const [frase, setFrase] = useState(fraseInicial);
  const [wa, setWa] = useState(waInicial ?? "");
  const enviar = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const datos = new FormData(e.currentTarget);
    startTransition(() => accion(datos));
  };
  const iniciales = nombre.split(" ").map((p) => p[0]).slice(0, 2).join("");

  return (
    <div className="mt-5 grid gap-5 md:grid-cols-[1fr_300px]">
      <form onSubmit={enviar} className="rounded-xl border border-linea bg-superficie p-4">
        <label htmlFor="frase" className="mb-1 block text-sm font-semibold">Frase de presentación</label>
        <textarea id="frase" name="frase" value={frase} onChange={(e) => setFrase(e.target.value)} maxLength={140} aria-invalid={!!estado.errores?.frase} className={`${claseInput} min-h-24 py-2`} />
        <p className={`mt-1 text-right text-[13px] ${frase.length > 130 ? "text-ambar" : "text-texto-2"}`}>{frase.length}/140</p>
        {estado.errores?.frase && <p className="text-sm text-senal">{estado.errores.frase}</p>}

        <label htmlFor="wa" className="mt-3 mb-1 block text-sm font-semibold">WhatsApp</label>
        <input id="wa" name="whatsapp" inputMode="tel" maxLength={10} placeholder="3001234567" value={wa} onChange={(e) => setWa(e.target.value.replace(/\D/g, ""))} aria-invalid={!!estado.errores?.whatsapp} className={claseInput} />
        <p className="mt-1 text-[13px] text-texto-2">Lo usan el botón “Escríbeme” del catálogo y la confirmación del formulario.</p>
        {estado.errores?.whatsapp && <p className="text-sm text-senal">{estado.errores.whatsapp}</p>}

        <label htmlFor="meta" className="mt-3 mb-1 block text-sm font-semibold">Meta de vehículos al mes <span className="font-normal text-texto-2">(opcional)</span></label>
        <input id="meta" name="metaVentasMes" type="number" inputMode="numeric" min={1} max={100} defaultValue={meta ?? ""} placeholder="Ej: 5" aria-invalid={!!estado.errores?.metaVentasMes} className={`${claseInput} max-w-32`} />
        <p className="mt-1 text-[13px] text-texto-2">Se muestra como un anillo de avance en tu inicio. Déjalo vacío si no quieres meta.</p>
        {estado.errores?.metaVentasMes && <p className="text-sm text-senal">{estado.errores.metaVentasMes}</p>}

        <button disabled={guardando} className="mt-4 min-h-11 rounded-lg bg-azul px-4 font-semibold text-white hover:bg-azul-hover disabled:opacity-60">
          {guardando ? "Guardando…" : "Guardar perfil"}
        </button>
        {estado.mensaje && <p role="status" className={`mt-2 text-[15px] ${estado.ok ? "text-ok" : "text-senal"}`}>{estado.mensaje}</p>}
      </form>

      <aside aria-label="Vista previa" className="self-start rounded-2xl border border-linea bg-superficie p-4">
        <p className="mb-3 text-[13px] font-semibold tracking-wide text-texto-2 uppercase">Así te ven en el catálogo</p>
        <div className="relative grid aspect-[4/3] place-items-center overflow-hidden rounded-xl bg-cielo">
          {foto ? (
            // eslint-disable-next-line @next/next/no-img-element -- foto optimizada
            <img src={foto.src} srcSet={foto.srcSet} sizes="300px" alt="Tu foto" className="absolute inset-0 size-full object-cover" />
          ) : (
            <span className="font-display text-6xl font-extrabold text-azul-texto">{iniciales}</span>
          )}
        </div>
        <FotoPerfil tieneFoto={!!foto} />
        <p className="font-display mt-3 text-xl font-bold">{nombre}</p>
        <p className="text-sm text-texto-2">Asesora comercial Suzuki en Fersautos</p>
        <p className="mt-2 text-[15px]">“{frase || "…"}”</p>
      </aside>
    </div>
  );
}
