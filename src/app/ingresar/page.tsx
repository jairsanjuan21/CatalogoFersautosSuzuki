import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { SelectorTema } from "@/componentes/SelectorTema";
import { FormularioIngreso } from "./FormularioIngreso";

export const metadata: Metadata = {
  title: "Ingresar | Fersautos",
  robots: { index: false, follow: false }, // el acceso al panel no tiene por qué salir en Google
};

/** Recorrido de una venta. `n` elige la animación que lo enciende en su turno (ver globals.css). */
const PASOS = [
  { n: 1, nombre: "Solicitud", detalle: "Llega en línea", icono: "M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h4" },
  { n: 2, nombre: "En estudio", detalle: "La financiera revisa", icono: "M11 4a7 7 0 100 14 7 7 0 000-14zM21 21l-5-5" },
  { n: 3, nombre: "Aprobada", detalle: "Cliente notificado", icono: "M5 12.5l4.5 4.5L19 7" },
  { n: 4, nombre: "Entregada", detalle: "Venta y comisión", icono: "M12 2v20M17 6H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" },
] as const;

const RASGOS = ["Solicitudes de crédito en línea", "Precios del día", "Comisión estimada del mes"];

// Alineación de cada paso sobre la línea: el primero a la izquierda, el último a la derecha
const ALINEAR = ["items-start text-left", "items-center text-center", "items-center text-center", "items-end text-right"];

function Marca({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`flex items-center gap-2.5 text-[17px] font-bold tracking-tight text-texto ${className}`}>
      <span className="relative grid size-9 place-items-center overflow-hidden rounded-[10px] bg-[#1f4e9c] text-[17px] font-extrabold text-white shadow-[0_8px_18px_-10px_rgb(31_78_156/0.9)]">
        F<span className="anim-brillo" aria-hidden />
      </span>
      Fersautos
    </Link>
  );
}

export default function Ingresar() {
  return (
    <main className="font-panel grid min-h-dvh bg-fondo text-texto lg:grid-cols-[460px_minmax(0,1fr)]">
      {/* Lado del mensaje: arriba en el celular, a la derecha en computador */}
      <section
        aria-label="Qué encuentras en el panel"
        className="ingreso-lado relative overflow-hidden border-b border-linea bg-superficie px-5 pt-5 pb-6 lg:order-2 lg:flex lg:flex-col lg:justify-center lg:border-0 lg:bg-fondo lg:px-16 lg:py-14"
      >
        <div className="relative flex items-center justify-between gap-3 lg:hidden">
          <Marca />
          <SelectorTema />
        </div>

        <p className="relative mt-6 text-[34px] leading-[1.02] font-extrabold tracking-[-0.045em] lg:mt-0 lg:text-[68px]">
          <span className="anim-sube block" style={{ animationDelay: "0.15s" }}>Responde antes.</span>
          <span className="anim-sube block" style={{ animationDelay: "0.3s" }}>Cierra más.</span>
          <span className="anim-sube block" style={{ animationDelay: "0.45s" }}>
            <span className="ingreso-acento">Cobra lo justo.</span>
          </span>
        </p>

        <div
          className="anim-sube relative mt-6 max-w-[640px] lg:mt-14"
          style={{ animationDelay: "0.7s" }}
          role="img"
          aria-label="Recorrido de una venta: solicitud, en estudio, aprobada y entregada"
        >
          <div className="absolute inset-x-3.5 top-3.5 h-0.5 bg-pista" aria-hidden>
            <i className="ingreso-via absolute inset-0 bg-azul" />
          </div>
          <div className="relative grid grid-cols-4" aria-hidden>
            {PASOS.map((p, i) => (
              <div key={p.n} className={`flex flex-col gap-2.5 ${ALINEAR[i]}`}>
                <span className={`ingreso-nodo ingreso-nodo-${p.n} grid size-[30px] place-items-center rounded-full border-2 border-linea bg-superficie text-texto-3`}>
                  <svg viewBox="0 0 24 24" className="size-3.5 fill-none stroke-current stroke-[2.4] [stroke-linecap:round] [stroke-linejoin:round]">
                    <path d={p.icono} />
                  </svg>
                </span>
                <b className="text-xs lg:text-[15px]">{p.nombre}</b>
                <small className="hidden text-[13px] text-texto-3 lg:block">{p.detalle}</small>
              </div>
            ))}
          </div>
        </div>

        <ul className="anim-sube relative mt-12 hidden flex-wrap gap-7 lg:flex" style={{ animationDelay: "0.9s" }}>
          {RASGOS.map((r) => (
            <li key={r} className="flex items-center gap-2.5 text-[15px] text-texto-2">
              <span className="grid size-7 place-items-center rounded-lg bg-ok-fondo text-ok" aria-hidden>
                <svg viewBox="0 0 24 24" className="size-3.5 fill-none stroke-current stroke-[2.6] [stroke-linecap:round] [stroke-linejoin:round]">
                  <path d="M5 12.5l4.5 4.5L19 7" />
                </svg>
              </span>
              {r}
            </li>
          ))}
        </ul>
      </section>

      {/* Columna del formulario */}
      <section className="relative z-[1] flex flex-col bg-fondo px-5 py-7 lg:order-1 lg:border-r lg:border-linea lg:bg-superficie lg:px-11 lg:py-8">
        <div className="hidden items-center justify-between gap-3 lg:flex">
          <Marca />
          <SelectorTema />
        </div>

        <div className="anim-sube w-full lg:my-auto" style={{ animationDelay: "0.1s" }}>
          <h1 className="text-[30px] font-extrabold tracking-[-0.025em]">Ingresar</h1>
          <p className="mt-2 mb-6 text-[15px] text-texto-2">Panel de asesoría. Solo para Natalia y el administrador.</p>
          {/* useSearchParams lee la URL de la petición: va dentro de Suspense */}
          <Suspense>
            <FormularioIngreso />
          </Suspense>
        </div>

        <Link href="/" className="mt-6 inline-flex items-center gap-1.5 self-start text-sm font-semibold text-azul-texto hover:underline">
          <svg viewBox="0 0 24 24" aria-hidden className="size-4 fill-none stroke-current stroke-2 [stroke-linecap:round] [stroke-linejoin:round]">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Volver al catálogo
        </Link>
      </section>
    </main>
  );
}
