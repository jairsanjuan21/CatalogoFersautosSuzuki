"use client";

import { startTransition, useActionState, useEffect, useState, useTransition, type FormEvent } from "react";
import { agregarNota, asignarValor, cambiarEstado, marcarCargada, marcarVista, type Resultado } from "@/modulos/solicitudes/acciones";
import { ESTADOS, type Estado } from "@/lib/etiquetas";
import { plata } from "@/lib/formato";
import { useFormularioAccion } from "@/lib/usar-formulario";

const inicial: Resultado = { ok: true };

/**
 * En React 19, un <form action={...}> se reinicia solo al terminar la acción.
 * Aquí no queremos eso: los campos deben mostrar lo que se acaba de guardar.
 * Por eso estos formularios se envían a mano dentro de una transición.
 */
const enviarSinReiniciar = (accion: (datos: FormData) => void) => (e: FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  const datos = new FormData(e.currentTarget);
  startTransition(() => accion(datos));
};
const claseInput =
  "min-h-11 w-full rounded-lg border border-linea-2 bg-superficie px-3 text-base outline-none focus:border-azul focus:ring-2 focus:ring-azul/40 aria-invalid:border-senal";

function Aviso({ r }: { r: Resultado }) {
  if (!r.mensaje) return null;
  return (
    <p role="status" className={`mt-3 text-[15px] ${r.ok ? "text-ok" : "text-senal"}`}>
      {r.mensaje}
    </p>
  );
}

/* ---------- quita el punto de "nueva" al abrir la solicitud ---------- */

export function MarcarVista({ solicitudId }: { solicitudId: string }) {
  useEffect(() => {
    marcarVista(solicitudId).catch(() => {});
  }, [solicitudId]);
  return null;
}

/* ---------- modelo, valor y condiciones ---------- */

interface ModeloConPrecio {
  id: string;
  linea: string;
  versiones: { id: string; etiqueta: string; precio: number | null }[];
}

export function FormularioValor({
  solicitudId,
  modelos,
  plazos,
  pendiente,
  valores,
}: {
  solicitudId: string;
  modelos: ModeloConPrecio[];
  plazos: number[];
  pendiente: boolean;
  valores: { modeloId?: string; versionId?: string; valorVehiculo: number | null; cuotaInicial: number; plazoMeses: number; lineaInteres: string | null };
}) {
  const [estado, accion, guardando] = useActionState(asignarValor, inicial);
  const sugerido = valores.modeloId ?? modelos.find((m) => m.linea === valores.lineaInteres)?.id ?? "";
  const [modeloId, setModeloId] = useState(sugerido);
  const [versionId, setVersionId] = useState(valores.versionId ?? "");
  const [valor, setValor] = useState<number | undefined>(valores.valorVehiculo ?? undefined);
  const [cuota, setCuota] = useState<number | undefined>(valores.cuotaInicial);
  const modelo = modelos.find((m) => m.id === modeloId);
  const version = modelo?.versiones.find((v) => v.id === versionId);
  const aFinanciar = valor !== undefined && cuota !== undefined ? valor - cuota : undefined;
  const err = estado.errores ?? {};
  const soloDigitos = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 11);
    return d ? Number(d) : undefined;
  };

  return (
    <form onSubmit={enviarSinReiniciar(accion)} className="rounded-xl border border-linea bg-superficie p-4">
      <input type="hidden" name="solicitudId" value={solicitudId} />
      <input type="hidden" name="versionId" value={versionId} />
      <input type="hidden" name="valorVehiculo" value={valor ?? ""} />
      <input type="hidden" name="cuotaInicial" value={cuota ?? ""} />
      <div className="grid gap-3.5 sm:grid-cols-2">
        <div>
          <label htmlFor="modelo" className="mb-1 block text-sm font-semibold">Modelo</label>
          <select
            id="modelo"
            name="modeloId"
            value={modeloId}
            onChange={(e) => {
              setModeloId(e.target.value);
              // Al cambiar de modelo, la versión anterior ya no aplica; si hay una sola, se elige sola
              const vs = modelos.find((m) => m.id === e.target.value)?.versiones ?? [];
              setVersionId(vs.length === 1 ? vs[0].id : "");
            }}
            aria-invalid={!!err.modeloId}
            className={claseInput}
          >
            <option value="">Selecciona</option>
            {modelos.map((m) => (
              <option key={m.id} value={m.id}>{m.linea}</option>
            ))}
          </select>
          <p className="mt-1 text-[13px] text-texto-2">El cliente marcó interés en: {valores.lineaInteres ?? "no indicó"}</p>
          {err.modeloId && <p className="mt-1 text-sm text-senal">{err.modeloId}</p>}
        </div>
        {modelo && modelo.versiones.length > 0 && (
          <div>
            <label htmlFor="version" className="mb-1 block text-sm font-semibold">Versión</label>
            <select id="version" value={versionId} onChange={(e) => setVersionId(e.target.value)} aria-invalid={!!err.versionId} className={claseInput}>
              <option value="">Selecciona</option>
              {modelo.versiones.map((v) => (
                <option key={v.id} value={v.id}>{v.etiqueta}{v.precio ? ` (${plata(v.precio)})` : ""}</option>
              ))}
            </select>
            {err.versionId && <p className="mt-1 text-sm text-senal">{err.versionId}</p>}
          </div>
        )}
        <div>
          <label htmlFor="plazo" className="mb-1 block text-sm font-semibold">Plazo</label>
          <select id="plazo" name="plazoMeses" defaultValue={valores.plazoMeses} className={claseInput}>
            {plazos.map((p) => (
              <option key={p} value={p}>{p} meses</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="valor" className="mb-1 block text-sm font-semibold">Valor del vehículo</label>
          <input id="valor" inputMode="numeric" placeholder="$ 0" value={plata(valor)} onChange={(e) => setValor(soloDigitos(e.target.value))} aria-invalid={!!err.valorVehiculo} className={claseInput} />
          {version?.precio ? (
            <p className="mt-1 text-[13px] text-texto-2">
              Precio de lista: {plata(version.precio)}{" "}
              <button type="button" onClick={() => setValor(version.precio!)} className="font-semibold text-azul-texto">Usar este precio</button>
            </p>
          ) : version ? (
            <p className="mt-1 text-[13px] text-texto-2">Esta versión no tiene precio de lista cargado.</p>
          ) : null}
          {err.valorVehiculo && <p className="mt-1 text-sm text-senal">{err.valorVehiculo}</p>}
        </div>
        <div>
          <label htmlFor="cuota" className="mb-1 block text-sm font-semibold">Cuota inicial</label>
          <input id="cuota" inputMode="numeric" value={plata(cuota)} onChange={(e) => setCuota(soloDigitos(e.target.value))} aria-invalid={!!err.cuotaInicial} className={claseInput} />
          {err.cuotaInicial && <p className="mt-1 text-sm text-senal">{err.cuotaInicial}</p>}
        </div>
      </div>
      <div className="mt-3.5 flex items-baseline justify-between border-t border-dashed border-linea-2 pt-3">
        <span>Valor a financiar</span>
        <b className={`font-display text-2xl ${aFinanciar !== undefined && aFinanciar < 0 ? "text-senal" : ""}`}>{aFinanciar !== undefined ? plata(aFinanciar) : "—"}</b>
      </div>
      {aFinanciar !== undefined && aFinanciar < 0 && <p className="text-sm text-senal">La cuota inicial no puede ser mayor que el valor del vehículo.</p>}
      <button disabled={guardando} className="mt-3.5 min-h-11 rounded-lg bg-azul px-4 font-semibold text-white hover:bg-azul-hover disabled:opacity-60">
        {guardando ? "Guardando…" : pendiente ? "Guardar y marcar lista para cargar" : "Guardar cambios"}
      </button>
      <Aviso r={estado} />
    </form>
  );
}

/* ---------- estado y financiera ---------- */

export function FormularioEstado({ solicitudId, estadoActual, financiera, sugerenciasFinanciera }: { solicitudId: string; estadoActual: Estado; financiera: string | null; sugerenciasFinanciera: string[] }) {
  const [estado, accion, guardando] = useActionState(cambiarEstado, inicial);
  const [seleccion, setSeleccion] = useState<Estado>(estadoActual);
  const [entidad, setEntidad] = useState(financiera ?? "");

  // Si el estado cambia desde otro lado (por ejemplo "Ya la cargué"), el selector se actualiza.
  // Es el patrón de React para "ajustar el estado cuando cambia una prop", sin useEffect.
  const [anterior, setAnterior] = useState({ estadoActual, financiera });
  if (anterior.estadoActual !== estadoActual || anterior.financiera !== financiera) {
    setAnterior({ estadoActual, financiera });
    setSeleccion(estadoActual);
    setEntidad(financiera ?? "");
  }

  return (
    <form onSubmit={enviarSinReiniciar(accion)} className="rounded-xl border border-linea bg-superficie p-4">
      <input type="hidden" name="solicitudId" value={solicitudId} />
      <div className="grid gap-3.5 sm:grid-cols-2">
        <div>
          <label htmlFor="estado" className="mb-1 block text-sm font-semibold">Estado de la solicitud</label>
          <select id="estado" name="estado" value={seleccion} onChange={(e) => setSeleccion(e.target.value as Estado)} className={claseInput}>
            {(Object.keys(ESTADOS) as Estado[]).map((e) => (
              <option key={e} value={e}>{ESTADOS[e]}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="financiera" className="mb-1 block text-sm font-semibold">
            Entidad financiera <span className="font-normal text-texto-2">(si ya la sabes)</span>
          </label>
          <input id="financiera" name="financiera" list="financieras" value={entidad} onChange={(e) => setEntidad(e.target.value)} maxLength={80} className={claseInput} />
          <datalist id="financieras">
            {sugerenciasFinanciera.map((f) => (
              <option key={f} value={f} />
            ))}
          </datalist>
        </div>
      </div>
      <button disabled={guardando} className="mt-3.5 min-h-11 rounded-lg border border-linea-2 bg-superficie px-4 font-semibold disabled:opacity-60">
        {guardando ? "Actualizando…" : "Actualizar estado"}
      </button>
      <Aviso r={estado} />
    </form>
  );
}

/* ---------- "Ya la cargué en Fersautos" ---------- */

export function BotonCargada({ solicitudId }: { solicitudId: string }) {
  const [pendiente, iniciar] = useTransition();
  const [r, setR] = useState<Resultado>(inicial);
  return (
    <>
      <button
        type="button"
        disabled={pendiente}
        onClick={() => iniciar(async () => setR(await marcarCargada(solicitudId)))}
        className="min-h-11 rounded-lg bg-azul px-4 font-semibold text-white hover:bg-azul-hover disabled:opacity-60"
      >
        {pendiente ? "Marcando…" : "Ya la cargué en Fersautos"}
      </button>
      <Aviso r={r} />
    </>
  );
}

/* ---------- notas ---------- */

export function FormularioNota({ solicitudId }: { solicitudId: string }) {
  const { ref, alEnviar, estado, pendiente: guardando } = useFormularioAccion(agregarNota, inicial);
  return (
    <form ref={ref} onSubmit={alEnviar}>
      <input type="hidden" name="solicitudId" value={solicitudId} />
      <label htmlFor="nota" className="sr-only">Nueva nota</label>
      <textarea
        id="nota"
        name="texto"
        maxLength={1000}
        placeholder="Ej: Me confirma el viernes si sube la cuota inicial"
        aria-invalid={!!estado.errores?.texto}
        className={`${claseInput} min-h-20 py-2`}
      />
      {estado.errores?.texto && <p className="text-sm text-senal">{estado.errores.texto}</p>}
      <button disabled={guardando} className="mt-2 min-h-11 rounded-lg border border-linea-2 bg-superficie px-4 font-semibold disabled:opacity-60">
        {guardando ? "Guardando…" : "Agregar nota"}
      </button>
    </form>
  );
}
