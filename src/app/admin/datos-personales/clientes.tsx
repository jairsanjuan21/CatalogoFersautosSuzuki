"use client";

import { useState, useTransition } from "react";
import { cerrarPeticion, contarDatosTitular, eliminarDatosTitular, registrarPeticion } from "@/modulos/admin/acciones-titulares";
import type { ResultadoAdmin } from "@/modulos/admin/acciones-catalogo";
import { useFormularioAccion } from "@/lib/usar-formulario";

const claseInput =
  "min-h-11 w-full rounded-lg border border-linea-2 bg-superficie px-3 text-base outline-none focus:border-azul focus:ring-2 focus:ring-azul/40 aria-invalid:border-senal";
const inicial: ResultadoAdmin = { ok: true };

export function NuevaPeticion() {
  const { ref, alEnviar, estado, pendiente: guardando } = useFormularioAccion(registrarPeticion, inicial);
  const err = estado.errores ?? {};
  return (
    <form ref={ref} onSubmit={alEnviar} className="grid gap-3 rounded-xl border border-linea bg-superficie p-4 sm:grid-cols-2">
      <div>
        <label htmlFor="tipo" className="mb-1 block text-sm font-semibold">Tipo</label>
        <select id="tipo" name="tipo" className={claseInput}>
          <option value="consulta">Consulta (qué datos tenemos)</option>
          <option value="correccion">Corrección</option>
          <option value="eliminacion">Eliminación</option>
          <option value="revocatoria">Revocar la autorización</option>
        </select>
      </div>
      <div>
        <label htmlFor="canal" className="mb-1 block text-sm font-semibold">¿Por dónde llegó?</label>
        <input id="canal" name="canal" list="canales" maxLength={40} className={claseInput} aria-invalid={!!err.canal} />
        <datalist id="canales"><option value="WhatsApp" /><option value="Correo" /><option value="Presencial" /></datalist>
        {err.canal && <p className="mt-1 text-sm text-senal">{err.canal}</p>}
      </div>
      <div>
        <label htmlFor="nombre" className="mb-1 block text-sm font-semibold">Nombre del titular</label>
        <input id="nombre" name="nombre" maxLength={80} className={claseInput} aria-invalid={!!err.nombre} />
        {err.nombre && <p className="mt-1 text-sm text-senal">{err.nombre}</p>}
      </div>
      <div>
        <label htmlFor="doc" className="mb-1 block text-sm font-semibold">Número de documento</label>
        <input id="doc" name="numeroIdentificacion" inputMode="numeric" maxLength={11} className={claseInput} aria-invalid={!!err.numeroIdentificacion} />
        {err.numeroIdentificacion && <p className="mt-1 text-sm text-senal">{err.numeroIdentificacion}</p>}
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="detalle" className="mb-1 block text-sm font-semibold">Detalle <span className="font-normal text-texto-2">(opcional)</span></label>
        <textarea id="detalle" name="detalle" maxLength={500} className={`${claseInput} min-h-16 py-2`} />
      </div>
      <div className="sm:col-span-2">
        <button disabled={guardando} className="min-h-11 rounded-lg bg-azul px-4 font-semibold text-white disabled:opacity-60">{guardando ? "Registrando…" : "Registrar petición"}</button>
        {estado.mensaje && <p role="status" className={`mt-2 text-[15px] ${estado.ok ? "text-ok" : "text-senal"}`}>{estado.mensaje}</p>}
      </div>
    </form>
  );
}

/** Eliminación con fricción: primero se ve cuánto hay, luego se confirma con los últimos 3 dígitos. */
export function EliminarDatos({ peticionId }: { peticionId: string }) {
  const [pendiente, iniciar] = useTransition();
  const [hallazgo, setHallazgo] = useState<{ radicados: string[]; comoConyuge: number } | null>();
  const [digitos, setDigitos] = useState("");
  const [resultado, setResultado] = useState<ResultadoAdmin>();

  if (resultado?.ok) return <p role="status" className="mt-3 text-[15px] text-ok">{resultado.mensaje}</p>;
  if (hallazgo === undefined) {
    return (
      <button type="button" disabled={pendiente} onClick={() => iniciar(async () => setHallazgo(await contarDatosTitular(peticionId)))} className="mt-3 min-h-10 rounded-lg border border-senal px-3.5 text-sm font-semibold text-senal">
        {pendiente ? "Buscando…" : "Revisar y eliminar datos"}
      </button>
    );
  }
  if (!hallazgo) return <p className="mt-3 text-sm text-senal">No se pudo revisar esta petición.</p>;
  const nada = hallazgo.radicados.length === 0 && hallazgo.comoConyuge === 0;
  return (
    <div className="mt-3 rounded-lg border border-senal bg-senal-fondo p-3.5 text-[15px]">
      {nada ? (
        <p>No hay datos de este titular en el sistema. Puedes cerrar la petición respondiendo eso.</p>
      ) : (
        <>
          <p className="font-semibold text-senal">Se eliminará de forma definitiva:</p>
          <ul className="mt-1 list-disc pl-5">
            {hallazgo.radicados.length > 0 && <li>{hallazgo.radicados.length} solicitudes ({hallazgo.radicados.join(", ")}) con sus fotos, firma, referencias, notas e historial</li>}
            {hallazgo.comoConyuge > 0 && <li>Sus datos como cónyuge en {hallazgo.comoConyuge} solicitudes de otras personas</li>}
          </ul>
          <p className="mt-2">En la auditoría queda solo que la eliminación se hizo. No se puede deshacer.</p>
          <label htmlFor={`d-${peticionId}`} className="mt-3 mb-1 block text-sm font-semibold">Para confirmar, escribe los últimos 3 dígitos del documento</label>
          <div className="flex flex-wrap gap-2">
            <input id={`d-${peticionId}`} inputMode="numeric" maxLength={3} value={digitos} onChange={(e) => setDigitos(e.target.value.replace(/\D/g, ""))} className={`${claseInput} max-w-28`} />
            <button type="button" disabled={pendiente || digitos.length !== 3} onClick={() => iniciar(async () => setResultado(await eliminarDatosTitular(peticionId, digitos)))} className="min-h-11 rounded-lg bg-senal px-4 font-semibold text-white disabled:opacity-50">
              {pendiente ? "Eliminando…" : "Eliminar definitivamente"}
            </button>
          </div>
          {resultado && !resultado.ok && <p className="mt-2 text-sm text-senal">{resultado.mensaje}</p>}
        </>
      )}
    </div>
  );
}

export function CerrarPeticion({ peticionId }: { peticionId: string }) {
  const [abierto, setAbierto] = useState(false);
  const { ref, alEnviar, estado, pendiente: guardando } = useFormularioAccion(cerrarPeticion, inicial);
  if (!abierto) return <button type="button" onClick={() => setAbierto(true)} className="mt-3 ml-2 min-h-10 rounded-lg border border-linea-2 bg-superficie px-3.5 text-sm font-semibold">Cerrar petición</button>;
  return (
    <form ref={ref} onSubmit={alEnviar} className="mt-3 rounded-lg border border-linea p-3">
      <input type="hidden" name="peticionId" value={peticionId} />
      <div className="flex flex-wrap gap-3 text-[15px]">
        <label className="flex items-center gap-1.5"><input type="radio" name="estado" value="atendida" defaultChecked className="accent-azul" />Atendida</label>
        <label className="flex items-center gap-1.5"><input type="radio" name="estado" value="rechazada" className="accent-azul" />Rechazada</label>
      </div>
      <label htmlFor={`r-${peticionId}`} className="mt-2 mb-1 block text-sm font-semibold">¿Qué se le respondió?</label>
      <textarea id={`r-${peticionId}`} name="respuesta" maxLength={500} className={`${claseInput} min-h-16 py-2`} aria-invalid={!!estado.errores?.respuesta} />
      {estado.errores?.respuesta && <p className="mt-1 text-sm text-senal">{estado.errores.respuesta}</p>}
      <button disabled={guardando} className="mt-2 min-h-10 rounded-lg bg-azul px-3.5 text-sm font-semibold text-white disabled:opacity-60">{guardando ? "Cerrando…" : "Cerrar"}</button>
      {estado.mensaje && <p className={`mt-2 text-sm ${estado.ok ? "text-ok" : "text-senal"}`}>{estado.mensaje}</p>}
    </form>
  );
}
