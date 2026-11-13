import { Suspense } from "react";
import Link from "next/link";
import { exigirRol } from "@/lib/sesion";
import { plata } from "@/lib/formato";
import { porcentaje } from "@/modulos/ventas/comision";
import { mesActual, moverMes, nombreMes, resumenVentas, vehiculosParaVenta } from "@/modulos/ventas/consultas";
import { Cargando, Titulo } from "../componentes";
import { FormularioVenta, QuitarVenta } from "./clientes";

type Params = Promise<{ mes?: string }>;

export default function Ventas({ searchParams }: { searchParams: Params }) {
  return (
    <>
      <Titulo sub="Las solicitudes que marcas como entregadas se cuentan solas. Las demás ventas, regístralas aquí.">Ventas y comisiones</Titulo>
      <Suspense fallback={<Cargando />}>
        <Contenido searchParams={searchParams} />
      </Suspense>
    </>
  );
}

const fechaVenta = (f: string) => new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${f}T12:00:00Z`));

async function Contenido({ searchParams }: { searchParams: Params }) {
  await exigirRol("asesora");
  const actual = mesActual();
  const pedido = (await searchParams).mes;
  // Solo meses válidos y no futuros
  const mes = pedido && /^\d{4}-(0[1-9]|1[0-2])$/.test(pedido) && pedido <= actual ? pedido : actual;
  const [r, vehiculos] = await Promise.all([resumenVentas(mes), vehiculosParaVenta()]);
  const maximo = Math.max(...r.historico.map((h) => h.comision), 1);
  const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date());

  return (
    <>
      <nav aria-label="Mes" className="mt-5 flex items-center justify-between gap-2">
        <Link href={`/panel/ventas?mes=${moverMes(mes, -1)}`} className="flex min-h-11 items-center rounded-lg border border-linea-2 bg-superficie px-3.5 font-semibold" aria-label="Mes anterior">‹</Link>
        <strong className="font-display text-2xl first-letter:uppercase">{nombreMes(mes)}</strong>
        {mes < actual ? (
          <Link href={`/panel/ventas?mes=${moverMes(mes, 1)}`} className="flex min-h-11 items-center rounded-lg border border-linea-2 bg-superficie px-3.5 font-semibold" aria-label="Mes siguiente">›</Link>
        ) : (
          <span className="w-11" />
        )}
      </nav>

      <div className="mt-3 grid grid-cols-2 gap-2.5 md:grid-cols-3">
        <div className="col-span-2 rounded-xl border border-azul bg-cielo px-4 py-3.5 sm:col-span-2 md:col-span-1">
          <span className="text-sm text-azul-texto">Comisión estimada</span>
          <b className="font-display block text-[32px] leading-tight">{plata(r.totales.comision)}</b>
          <small className="text-[13px] text-texto-2">{plata(r.porMillon)} por millón ({porcentaje(r.porMillon)}){r.metodo === "millones_completos" ? ", solo millones completos" : ""}</small>
        </div>
        <div className="col-span-2 rounded-xl border border-linea bg-superficie px-4 py-3.5 sm:col-span-1">
          <span className="text-sm text-texto-2">Vehículos vendidos</span>
          <b className="font-display block text-[32px] leading-tight">{r.totales.cantidad}</b>
          <small className="text-[13px] text-texto-2">{r.totales.formulario} del formulario, {r.totales.manuales} manuales</small>
        </div>
        {/* En el celular va a todo lo ancho: en media pantalla "$ 226.970.000" no cabe en una línea */}
        <div className="col-span-2 rounded-xl border border-linea bg-superficie px-4 py-3.5 sm:col-span-1">
          <span className="text-sm text-texto-2">Total vendido</span>
          <b className="font-display block text-[24px] leading-tight whitespace-nowrap md:text-[28px]">{plata(r.totales.valor)}</b>
        </div>
      </div>
      <p className="mt-2 text-[13px] text-texto-2">
        Es un cálculo aproximado según el valor de cada venta. Lo que te pague Fersautos puede variar por descuentos, bonos o ajustes.
      </p>

      <h2 className="font-display mt-7 mb-2.5 text-[22px] font-semibold">Últimos 6 meses</h2>
      <div className="flex h-44 items-end gap-2 rounded-xl border border-linea bg-superficie px-3 pt-4 pb-2" role="img" aria-label={`Comisión estimada por mes: ${r.historico.map((h) => `${h.etiqueta} ${plata(h.comision)}`).join(", ")}`}>
        {r.historico.map((h) => (
          <Link key={h.mes} href={`/panel/ventas?mes=${h.mes}`} className="group flex h-full flex-1 flex-col items-center justify-end gap-1" aria-hidden>
            <span className="text-[11px] whitespace-nowrap text-texto-2">{h.cantidad ? `${h.cantidad} v.` : ""}</span>
            <span
              className={`w-full max-w-12 rounded-t-md ${h.mes === mes ? "bg-azul" : "bg-cielo group-hover:bg-azul/40"}`}
              style={{ height: `${Math.max((h.comision / maximo) * 100, h.comision ? 4 : 1)}%` }}
            />
            <span className={`text-xs capitalize ${h.mes === mes ? "font-semibold text-azul-texto" : "text-texto-2"}`}>{h.etiqueta.replace(".", "")}</span>
          </Link>
        ))}
      </div>

      <h2 className="font-display mt-7 mb-2.5 text-[22px] font-semibold">Ventas del mes</h2>
      <div className="overflow-hidden rounded-xl border border-linea bg-superficie">
        {r.ventas.length === 0 && <p className="px-4 py-6 text-center text-texto-2">Sin ventas registradas en este mes.</p>}
        {/* Dos filas: vehículo y valor arriba, detalles y acción abajo (en tres columnas el nombre quedaba apretado) */}
        {r.ventas.map((v) => (
          <div key={v.id} className="border-b border-linea px-4 py-3 last:border-b-0">
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-semibold">{v.vehiculo}</p>
              <p className="font-semibold whitespace-nowrap">{plata(v.valor)}</p>
            </div>
            <div className="mt-0.5 flex items-center justify-between gap-3">
              <p className="min-w-0 text-sm text-texto-2">
                {fechaVenta(v.fecha)}
                {v.cliente && `, ${v.cliente}`}
                {v.formaPago && `, ${v.formaPago === "credito" ? "crédito" : "contado"}`}
              </p>
              <p className="text-sm whitespace-nowrap text-ok">+{plata(v.comision)}</p>
            </div>
            {v.nota && <p className="mt-0.5 text-[13px] text-texto-2">{v.nota}</p>}
            <div className="mt-2">
              {v.origen === "formulario" ? (
                <Link href={`/panel/solicitudes/${v.id}`} className="inline-block rounded bg-cielo px-2 py-0.5 text-[13px] font-semibold text-azul-texto">
                  Del formulario: {v.radicado}
                </Link>
              ) : (
                <span className="flex items-center gap-2">
                  <span className="rounded bg-fondo px-2 py-0.5 text-[13px] text-texto-2">Registrada a mano</span>
                  <QuitarVenta ventaId={v.id} />
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <h2 className="font-display mt-8 mb-2.5 text-[22px] font-semibold">Registrar una venta</h2>
      <p className="mb-3 text-[15px] text-texto-2">Para las ventas que no llegaron por el formulario: clientes de la sede, de contado o de otro canal.</p>
      <FormularioVenta vehiculos={vehiculos} hoy={hoy} porMillon={r.porMillon} metodo={r.metodo} />
    </>
  );
}
