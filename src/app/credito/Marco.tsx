import Link from "next/link";
import { Carro, type Carroceria } from "@/componentes/Carro";
import { plata } from "@/lib/formato";

/** Encabezado fijo arriba: logo y anillo de avance con los minutos que faltan */
export function Encabezado({ paso, total }: { paso?: number; total: number }) {
  const enPaso = paso !== undefined && paso >= 0 && paso < total;
  const avance = enPaso ? Math.round(((paso + 1) / total) * 100) : 0;
  const minutos = enPaso ? Math.max(1, Math.round(8 * (1 - paso / total))) : 0;
  return (
    <header className="sticky top-0 z-20 border-b border-linea/70 bg-fondo/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-2.5">
        <Link
          href="/"
          className="font-display text-[22px] leading-none font-bold text-tinta sm:text-2xl"
        >
          Fersautos
          <small className="block font-panel text-[12px] font-medium text-texto-2 sm:text-[13px]">
            Solicitud de crédito
          </small>
        </Link>
        {enPaso && (
          <div className="flex items-center gap-2.5">
            <span className="text-right text-[13px] leading-tight sm:text-sm">
              <strong className="block text-[15px] text-tinta sm:text-base">
                Paso {paso + 1} de {total}
              </strong>
              <span className="text-texto-2">Unos {minutos} min</span>
            </span>
            <svg
              viewBox="0 0 44 44"
              aria-hidden
              className="size-11 -rotate-90 sm:size-[52px]"
            >
              <circle
                cx="22"
                cy="22"
                r="18"
                fill="none"
                stroke="var(--linea)"
                strokeWidth="5"
              />
              <circle
                cx="22"
                cy="22"
                r="18"
                fill="none"
                stroke="var(--acento)"
                strokeWidth="5"
                strokeLinecap="round"
                pathLength={100}
                strokeDasharray={100}
                strokeDashoffset={100 - avance}
                className="transition-[stroke-dashoffset] duration-700 ease-out motion-reduce:transition-none"
              />
            </svg>
          </div>
        )}
      </div>
      {/* Barra fina debajo del encabezado: en el celular se ve el avance aunque el anillo sea pequeño */}
      {enPaso && (
        <div aria-hidden className="h-[3px] bg-linea/60 sm:hidden">
          <div
            className="h-full bg-acento transition-[width] duration-700 ease-out"
            style={{ width: `${avance}%` }}
          />
        </div>
      )}
    </header>
  );
}

export interface DatosResumen {
  linea?: string;
  tipo?: Carroceria;
  cuota?: number;
  plazo?: number;
  nombre?: string;
}

/** Resumen "Tu Suzuki": columna al lado en computador; en el celular, una tira compacta arriba */
export function Resumen({ d, asesora }: { d: DatosResumen; asesora: string }) {
  const filas: [string, string][] = [
    ["Cuota inicial", d.cuota ? plata(d.cuota) : "—"],
    ["Plazo", d.plazo ? `${d.plazo} meses` : "—"],
    ["Solicitante", d.nombre || "—"],
  ];
  return (
    <aside
      aria-label="Resumen de tu solicitud"
      className="cred-llega sticky top-24 hidden rounded-[28px] bg-[#14213d] p-6 text-white lg:block"
      style={{ animationDelay: "0.2s" }}
    >
      <p className="text-[13px] font-semibold tracking-[0.1em] text-[#f29b72] uppercase">
        Tu Suzuki
      </p>
      <div className="mt-3 overflow-hidden rounded-[18px] bg-[#1d2d52] px-2.5 pt-5 pb-2">
        <div className="cat-llega">
          <Carro tipo={d.tipo ?? "suv"} color="#f2f1ec" className="w-full" />
        </div>
      </div>
      <h2 className="mt-3.5 font-display text-[34px] font-semibold">
        {d.linea ?? "Por elegir"}
      </h2>
      <dl className="mt-3 divide-y divide-[#2a3b62]">
        {filas.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3 py-2.5">
            <dt className="text-[#c3cbe0]">{k}</dt>
            <dd className="text-right font-bold break-words">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 flex items-center gap-2.5 text-sm text-[#c3cbe0]">
        <Iniciales nombre={asesora} />
        {asesora.split(" ")[0]} recibe tu solicitud y te escribe por WhatsApp.
      </p>
    </aside>
  );
}

export function ResumenMovil({ d }: { d: DatosResumen }) {
  if (!d.linea && !d.cuota && !d.plazo) return null;
  return (
    <div className="mb-6 flex items-center gap-3 rounded-2xl bg-[#14213d] px-4 py-3 text-white lg:hidden">
      <Carro
        tipo={d.tipo ?? "suv"}
        color="#f2f1ec"
        className="w-16 flex-none"
      />
      <p className="min-w-0 text-sm leading-snug">
        <strong className="block font-display text-base">
          {d.linea ?? "Tu Suzuki"}
        </strong>
        <span className="text-[#c3cbe0]">
          {[d.cuota && `Cuota ${plata(d.cuota)}`, d.plazo && `${d.plazo} meses`]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </p>
    </div>
  );
}

export function Iniciales({
  nombre,
  grande,
}: {
  nombre: string;
  grande?: boolean;
}) {
  const ini = nombre
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");
  return (
    <span
      aria-hidden
      className={`grid flex-none place-items-center rounded-full bg-[#e9dccb] font-display font-semibold text-[#14213d] ${grande ? "size-14 text-xl" : "size-9 text-sm"}`}
    >
      {ini}
    </span>
  );
}
