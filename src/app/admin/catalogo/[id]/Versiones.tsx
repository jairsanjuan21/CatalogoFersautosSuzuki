"use client";

import { startTransition, useActionState, useState, useTransition, type FormEvent } from "react";
import { borrarVersion, guardarVersion, type ResultadoAdmin } from "@/modulos/admin/acciones-catalogo";
import { useFormularioAccion } from "@/lib/usar-formulario";

const claseInput =
  "min-h-10 w-full rounded-lg border border-linea-2 bg-superficie px-2.5 text-[15px] outline-none focus:border-azul focus:ring-2 focus:ring-azul/40 aria-invalid:border-senal";
const inicial: ResultadoAdmin = { ok: true };

export interface VersionEditable {
  id: string;
  nombre: string;
  transmision: "mecanica" | "automatica" | null;
  visible: boolean;
  orden: number;
  precios: number;
}

function Campos({ v, error }: { v?: VersionEditable; error?: string }) {
  return (
    <>
      <div className="min-w-0 flex-[2_1_160px]">
        <input name="nombre" defaultValue={v?.nombre} maxLength={40} placeholder="Ej: GLX 1.5" aria-label="Nombre de la versión" aria-invalid={!!error} className={claseInput} />
        {error && <p className="mt-1 text-[13px] text-senal">{error}</p>}
      </div>
      <select name="transmision" defaultValue={v?.transmision ?? ""} aria-label="Transmisión" className={`${claseInput} flex-[1_1_130px]`}>
        <option value="">Sin especificar</option>
        <option value="mecanica">Mecánica</option>
        <option value="automatica">Automática</option>
      </select>
      <input name="orden" type="number" min={0} max={99} defaultValue={v?.orden ?? 0} aria-label="Orden" className={`${claseInput} w-16 flex-none`} />
      <label className="flex min-h-10 flex-none items-center gap-1.5 text-sm">
        <input type="checkbox" name="visible" defaultChecked={v?.visible ?? true} className="size-4 accent-azul" />
        Visible
      </label>
    </>
  );
}

function FilaVersion({ modeloId, v }: { modeloId: string; v: VersionEditable }) {
  const [estado, accion, guardando] = useActionState(guardarVersion, inicial);
  const [borrando, iniciar] = useTransition();
  const [aviso, setAviso] = useState<string>();
  const enviar = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const datos = new FormData(e.currentTarget);
    startTransition(() => accion(datos)); // sin reiniciar: los campos muestran lo que se guardó
  };
  return (
    <li className="py-2.5">
      <form onSubmit={enviar} className="flex flex-wrap items-start gap-2">
        <input type="hidden" name="id" value={v.id} />
        <input type="hidden" name="modeloId" value={modeloId} />
        <Campos v={v} error={estado.errores?.nombre} />
        <button disabled={guardando} className="min-h-10 rounded-lg border border-linea-2 bg-superficie px-3 text-sm font-semibold disabled:opacity-60">
          {guardando ? "…" : "Guardar"}
        </button>
        <button
          type="button"
          disabled={borrando}
          onClick={() => iniciar(async () => setAviso((await borrarVersion(v.id)).mensaje))}
          title={v.precios ? "Tiene historial de precios: ocúltala en lugar de borrarla" : undefined}
          className="min-h-10 rounded-lg border border-senal px-3 text-sm font-semibold text-senal disabled:opacity-60"
        >
          Borrar
        </button>
      </form>
      <p className="mt-1 text-[13px] text-texto-2">{v.precios ? `${v.precios} precios en su historial` : "Sin precios todavía"}</p>
      {(estado.mensaje || aviso) && <p role="status" className={`mt-1 text-sm ${estado.ok && !aviso?.includes("ocúltala") ? "text-ok" : "text-senal"}`}>{aviso ?? estado.mensaje}</p>}
    </li>
  );
}

export function GestorVersiones({ modeloId, versiones }: { modeloId: string; versiones: VersionEditable[] }) {
  const { ref, alEnviar, estado, pendiente } = useFormularioAccion(guardarVersion, inicial);
  return (
    <div className="rounded-xl border border-linea bg-superficie p-4">
      <p className="text-[15px] text-texto-2">
        Cada versión tiene su propio precio, que Natalia actualiza en su panel. El precio base (“Desde”) también lo maneja ella.
      </p>
      {versiones.length === 0 && <p className="mt-3 font-semibold text-ambar">Este modelo no tiene versiones: Natalia no puede cargarle precios.</p>}
      <ul className="mt-2 divide-y divide-linea">
        {versiones.map((v) => <FilaVersion key={v.id} modeloId={modeloId} v={v} />)}
      </ul>
      <form ref={ref} onSubmit={alEnviar} className="mt-3 border-t border-linea pt-3">
        <p className="mb-2 text-sm font-semibold">Agregar versión</p>
        <input type="hidden" name="id" value="" />
        <input type="hidden" name="modeloId" value={modeloId} />
        <div className="flex flex-wrap items-start gap-2">
          <Campos error={estado.errores?.nombre} />
          <button disabled={pendiente} className="min-h-10 rounded-lg bg-azul px-3 text-sm font-semibold text-white disabled:opacity-60">
            {pendiente ? "Agregando…" : "Agregar"}
          </button>
        </div>
        {estado.mensaje && <p role="status" className={`mt-1 text-sm ${estado.ok ? "text-ok" : "text-senal"}`}>{estado.mensaje}</p>}
      </form>
    </div>
  );
}
