"use client";

import { useState, useTransition } from "react";
import { eliminarVenta, registrarVenta, type ResultadoVenta } from "@/modulos/ventas/acciones";
import { calcularComision, type MetodoComision } from "@/modulos/ventas/comision";
import { useFormularioAccion } from "@/lib/usar-formulario";
import { plata } from "@/lib/formato";

const claseInput =
  "min-h-11 w-full rounded-lg border border-linea-2 bg-superficie px-3 text-base outline-none focus:border-azul focus:ring-2 focus:ring-azul/40 aria-invalid:border-senal";

interface Vehiculo {
  id: string;
  linea: string;
  versiones: { id: string; etiqueta: string; precio: number | null }[];
}

function Campo({ id, etiqueta, error, children, ancho }: { id: string; etiqueta: React.ReactNode; error?: string; children: React.ReactNode; ancho?: boolean }) {
  return (
    <div className={ancho ? "sm:col-span-2" : ""}>
      <label htmlFor={id} className="mb-1 block text-sm font-semibold">{etiqueta}</label>
      {children}
      {error && <p className="mt-1 text-sm text-senal">{error}</p>}
    </div>
  );
}

export function FormularioVenta({ vehiculos, hoy, porMillon, metodo }: { vehiculos: Vehiculo[]; hoy: string; porMillon: number; metodo: MetodoComision }) {
  const { ref, alEnviar, estado, pendiente } = useFormularioAccion(registrarVenta, { ok: true } as ResultadoVenta);
  const [modeloId, setModeloId] = useState("");
  const [versionId, setVersionId] = useState("");
  const [valor, setValor] = useState<number>();
  const modelo = vehiculos.find((v) => v.id === modeloId);
  const err = estado.errores ?? {};

  return (
    <form
      ref={ref}
      onSubmit={(e) => {
        alEnviar(e);
      }}
      onReset={() => { setModeloId(""); setVersionId(""); setValor(undefined); }}
      className="grid gap-3.5 rounded-xl border border-linea bg-superficie p-4 sm:grid-cols-2"
    >
      <Campo id="v-fecha" etiqueta="Fecha de la venta" error={err.fecha}>
        <input id="v-fecha" name="fecha" type="date" max={hoy} defaultValue={hoy} className={claseInput} aria-invalid={!!err.fecha} />
      </Campo>
      <Campo id="v-modelo" etiqueta="Modelo" error={err.modeloId}>
        <select
          id="v-modelo"
          name="modeloId"
          value={modeloId}
          onChange={(e) => {
            setModeloId(e.target.value);
            const vs = vehiculos.find((v) => v.id === e.target.value)?.versiones ?? [];
            const unica = vs.length === 1 ? vs[0] : undefined;
            setVersionId(unica?.id ?? "");
            if (unica?.precio) setValor(unica.precio);
          }}
          className={claseInput}
          aria-invalid={!!err.modeloId}
        >
          <option value="">Selecciona</option>
          {vehiculos.map((v) => <option key={v.id} value={v.id}>{v.linea}</option>)}
        </select>
      </Campo>
      {modelo && modelo.versiones.length > 0 && (
        <Campo id="v-version" etiqueta="Versión" error={err.versionId}>
          <select
            id="v-version"
            name="versionId"
            value={versionId}
            onChange={(e) => {
              setVersionId(e.target.value);
              const p = modelo.versiones.find((v) => v.id === e.target.value)?.precio;
              if (p) setValor(p); // se precarga el precio de lista; Natalia lo ajusta si se vendió por otro valor
            }}
            className={claseInput}
          >
            <option value="">Sin especificar</option>
            {modelo.versiones.map((v) => <option key={v.id} value={v.id}>{v.etiqueta}</option>)}
          </select>
        </Campo>
      )}
      <Campo id="v-valor" etiqueta="Valor de venta" error={err.valor}>
        <input type="hidden" name="valor" value={valor ?? ""} />
        <input
          id="v-valor"
          inputMode="numeric"
          value={plata(valor)}
          placeholder="$ 0"
          onChange={(e) => { const d = e.target.value.replace(/\D/g, "").slice(0, 10); setValor(d ? Number(d) : undefined); }}
          className={`${claseInput} text-right`}
          aria-invalid={!!err.valor}
        />
        {valor ? <p className="mt-1 text-right text-[13px] text-texto-2">Comisión estimada: <b>{plata(calcularComision(valor, porMillon, metodo))}</b></p> : null}
      </Campo>
      <Campo id="v-pago" etiqueta="Forma de pago">
        <select id="v-pago" name="formaPago" defaultValue="" className={claseInput}>
          <option value="">Sin especificar</option>
          <option value="contado">Contado</option>
          <option value="credito">Crédito</option>
        </select>
      </Campo>
      <Campo id="v-cliente" etiqueta={<>Cliente <span className="font-normal text-texto-2">(opcional)</span></>} error={err.cliente}>
        <input id="v-cliente" name="cliente" maxLength={60} placeholder="Ej: Carlos Ruiz" className={claseInput} />
      </Campo>
      <Campo id="v-nota" etiqueta={<>Nota <span className="font-normal text-texto-2">(opcional)</span></>} error={err.nota} ancho>
        <input id="v-nota" name="nota" maxLength={200} placeholder="Ej: Llegó por recomendación de Laura" className={claseInput} />
      </Campo>
      <div className="sm:col-span-2">
        <button disabled={pendiente} className="min-h-11 rounded-lg bg-azul px-4 font-semibold text-white hover:bg-azul-hover disabled:opacity-60">
          {pendiente ? "Registrando…" : "Registrar venta"}
        </button>
        {estado.mensaje && <p role="status" className={`mt-2 text-[15px] ${estado.ok ? "text-ok" : "text-senal"}`}>{estado.mensaje}</p>}
      </div>
    </form>
  );
}

export function QuitarVenta({ ventaId }: { ventaId: string }) {
  const [confirmando, setConfirmando] = useState(false);
  const [pendiente, iniciar] = useTransition();
  if (!confirmando) {
    return <button type="button" onClick={() => setConfirmando(true)} className="min-h-9 rounded-lg border border-linea-2 bg-superficie px-3 text-sm font-semibold">Quitar</button>;
  }
  return (
    <span className="flex gap-1.5">
      <button type="button" disabled={pendiente} onClick={() => iniciar(async () => void (await eliminarVenta(ventaId)))} className="min-h-9 rounded-lg bg-senal px-3 text-sm font-semibold text-white disabled:opacity-60">
        {pendiente ? "Quitando…" : "Sí, quitar"}
      </button>
      <button type="button" onClick={() => setConfirmando(false)} className="min-h-9 rounded-lg border border-linea-2 bg-superficie px-3 text-sm">No</button>
    </span>
  );
}
