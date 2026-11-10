"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";
import { crearVersionClausula, guardarConfiguracion } from "@/modulos/admin/acciones-configuracion";
import { useFormularioAccion } from "@/lib/usar-formulario";
import type { ResultadoAdmin } from "@/modulos/admin/acciones-catalogo";

const claseInput =
  "min-h-11 w-full rounded-lg border border-linea-2 bg-superficie px-3 text-base outline-none focus:border-azul focus:ring-2 focus:ring-azul/40 aria-invalid:border-senal";
const inicial: ResultadoAdmin = { ok: true };

function Campo({ id, etiqueta, error, ayuda, children, ancho }: { id: string; etiqueta: string; error?: string; ayuda?: string; children: React.ReactNode; ancho?: boolean }) {
  return (
    <div className={ancho ? "sm:col-span-2" : ""}>
      <label htmlFor={id} className="mb-1 block text-sm font-semibold">{etiqueta}</label>
      {children}
      {ayuda && <p className="mt-1 text-[13px] text-texto-2">{ayuda}</p>}
      {error && <p className="mt-1 text-sm text-senal">{error}</p>}
    </div>
  );
}

export interface Config {
  asesoraNombre: string;
  asesoraCc: string;
  ciudad: string;
  sede: string;
  marcaPorDefecto: string;
  planFinanciacion: string;
  plazosMeses: number[];
  diasVigenciaPrecio: number;
  diasRetencionDocumentos: number;
}

export function FormularioConfiguracion({ c }: { c: Config }) {
  const [estado, accion, guardando] = useActionState(guardarConfiguracion, inicial);
  const [cc, setCc] = useState(c.asesoraCc);
  const err = estado.errores ?? {};
  const enviar = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const datos = new FormData(e.currentTarget);
    startTransition(() => accion(datos));
  };

  return (
    <form onSubmit={enviar}>
      <h2 className="font-display mt-7 mb-2.5 text-[22px] font-semibold">Datos de la asesora en el formato F-NS-01</h2>
      <div className="grid gap-3.5 rounded-xl border border-linea bg-superficie p-4 sm:grid-cols-2">
        <Campo id="asesoraNombre" etiqueta="Nombre completo (campo “Asesor”)" error={err.asesoraNombre} ancho>
          <input id="asesoraNombre" name="asesoraNombre" defaultValue={c.asesoraNombre} maxLength={80} className={claseInput} aria-invalid={!!err.asesoraNombre} />
        </Campo>
        <Campo id="asesoraCc" etiqueta="C.C. de la asesora" error={err.asesoraCc} ayuda={cc ? `En el PDF: ${Number(cc).toLocaleString("es-CO")}` : undefined}>
          <input id="asesoraCc" name="asesoraCc" inputMode="numeric" maxLength={11} value={cc} onChange={(e) => setCc(e.target.value.replace(/\D/g, ""))} className={claseInput} aria-invalid={!!err.asesoraCc} />
        </Campo>
        <Campo id="sede" etiqueta="Sede" error={err.sede}>
          <input id="sede" name="sede" defaultValue={c.sede} maxLength={60} className={claseInput} aria-invalid={!!err.sede} />
        </Campo>
        <Campo id="ciudad" etiqueta="Ciudad" error={err.ciudad}>
          <input id="ciudad" name="ciudad" defaultValue={c.ciudad} maxLength={40} className={claseInput} />
        </Campo>
      </div>

      <h2 className="font-display mt-7 mb-2.5 text-[22px] font-semibold">Formulario de crédito</h2>
      <div className="grid gap-3.5 rounded-xl border border-linea bg-superficie p-4 sm:grid-cols-2">
        <Campo id="marcaPorDefecto" etiqueta="Marca">
          <input id="marcaPorDefecto" name="marcaPorDefecto" defaultValue={c.marcaPorDefecto} maxLength={30} className={claseInput} />
        </Campo>
        <Campo id="planFinanciacion" etiqueta="Plan de financiación">
          <input id="planFinanciacion" name="planFinanciacion" defaultValue={c.planFinanciacion} maxLength={40} className={claseInput} />
        </Campo>
        <fieldset className="sm:col-span-2">
          <legend className="mb-1.5 text-sm font-semibold">Plazos disponibles</legend>
          <div className="flex flex-wrap gap-2">
            {[12, 24, 36, 48, 60, 72, 84].map((p) => (
              <label key={p} className="flex min-h-10 cursor-pointer items-center gap-2 rounded-full border border-linea-2 px-3.5 has-checked:border-azul has-checked:bg-azul has-checked:font-semibold has-checked:text-white">
                <input type="checkbox" name="plazosMeses" value={p} defaultChecked={c.plazosMeses.includes(p)} className="sr-only" />
                {p} meses
              </label>
            ))}
          </div>
          {err.plazosMeses && <p className="mt-1 text-sm text-senal">{err.plazosMeses}</p>}
        </fieldset>
        <p className="text-[15px] text-texto-2 sm:col-span-2">Valores fijos en cada PDF: Solicitante, Crédito, Nuevo y Particular.</p>
      </div>

      <h2 className="font-display mt-7 mb-2.5 text-[22px] font-semibold">Reglas del sistema</h2>
      <div className="grid gap-3.5 rounded-xl border border-linea bg-superficie p-4 sm:grid-cols-2">
        <Campo id="diasVigenciaPrecio" etiqueta="Ocultar un precio del catálogo después de">
          <select id="diasVigenciaPrecio" name="diasVigenciaPrecio" defaultValue={c.diasVigenciaPrecio} className={claseInput}>
            {[3, 5, 7, 10, 15].map((d) => <option key={d} value={d}>{d} días sin actualizar</option>)}
          </select>
        </Campo>
        <Campo id="diasRetencionDocumentos" etiqueta="Borrar fotos de cédula y firmas">
          <select id="diasRetencionDocumentos" name="diasRetencionDocumentos" defaultValue={c.diasRetencionDocumentos} className={claseInput}>
            {[30, 60, 90, 180].map((d) => <option key={d} value={d}>{d} días después de cerrar la solicitud</option>)}
          </select>
        </Campo>
      </div>

      <button disabled={guardando} className="mt-4 min-h-11 rounded-lg bg-azul px-4 font-semibold text-white hover:bg-azul-hover disabled:opacity-60">
        {guardando ? "Guardando…" : "Guardar configuración"}
      </button>
      {estado.mensaje && <p role="status" className={`mt-2 text-[15px] ${estado.ok ? "text-ok" : "text-senal"}`}>{estado.mensaje}</p>}
    </form>
  );
}

export function NuevaVersionClausula({ textoActual }: { textoActual: string }) {
  const [abierto, setAbierto] = useState(false);
  const { ref, alEnviar, estado, pendiente: guardando } = useFormularioAccion(crearVersionClausula, inicial);
  if (!abierto) {
    return (
      <button type="button" onClick={() => setAbierto(true)} className="mt-3 min-h-11 rounded-lg border border-linea-2 bg-superficie px-4 font-semibold">
        Crear nueva versión
      </button>
    );
  }
  return (
    <form ref={ref} onSubmit={alEnviar} className="mt-3 rounded-xl border border-linea bg-superficie p-4">
      <label htmlFor="texto" className="mb-1 block text-sm font-semibold">Texto completo de la nueva cláusula</label>
      <textarea id="texto" name="texto" defaultValue={textoActual} className={`${claseInput} min-h-56 py-2 text-sm leading-relaxed`} aria-invalid={!!estado.errores?.texto} />
      {estado.errores?.texto && <p className="mt-1 text-sm text-senal">{estado.errores.texto}</p>}
      <label htmlFor="nota" className="mt-3 mb-1 block text-sm font-semibold">¿Qué cambió?</label>
      <input id="nota" name="nota" maxLength={120} placeholder="Ej: Fersautos actualizó el formato a la versión 2" className={claseInput} aria-invalid={!!estado.errores?.nota} />
      {estado.errores?.nota && <p className="mt-1 text-sm text-senal">{estado.errores.nota}</p>}
      <div className="mt-3 flex gap-2">
        <button disabled={guardando} className="min-h-11 rounded-lg bg-azul px-4 font-semibold text-white disabled:opacity-60">{guardando ? "Creando…" : "Crear y poner vigente"}</button>
        <button type="button" onClick={() => setAbierto(false)} className="min-h-11 rounded-lg border border-linea-2 bg-superficie px-4 font-semibold">Cancelar</button>
      </div>
      {estado.mensaje && <p role="status" className={`mt-2 text-[15px] ${estado.ok ? "text-ok" : "text-senal"}`}>{estado.mensaje}</p>}
    </form>
  );
}
