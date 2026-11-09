import Link from "next/link";
import { COLOR_ESTADO, ESTADOS, haceCuanto, type Estado } from "@/lib/etiquetas";
import { plata } from "@/lib/formato";
import type { FilaSolicitud } from "@/modulos/solicitudes/panel";

export function EstadoBadge({ estado }: { estado: Estado }) {
  return <span className={`inline-block rounded-md px-2 py-0.5 text-[13px] font-semibold whitespace-nowrap ${COLOR_ESTADO[estado]}`}>{ESTADOS[estado]}</span>;
}

export function Avatar({ nombre, nueva }: { nombre: string; nueva?: boolean }) {
  const iniciales = nombre.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
  return (
    <span aria-hidden className="font-display relative grid size-10 flex-none place-items-center rounded-full bg-cielo text-[15px] font-semibold text-azul-texto">
      {iniciales}
      {nueva && <span className="absolute -top-px -right-px size-[11px] rounded-full border-2 border-superficie bg-senal" />}
    </span>
  );
}

export function ItemSolicitud({ s, detalle }: { s: Pick<FilaSolicitud, "id" | "nombres" | "primerApellido" | "estado" | "vistaEn"> & Partial<FilaSolicitud>; detalle?: string }) {
  const nombre = `${s.nombres} ${s.primerApellido}`;
  const nueva = !s.vistaEn;
  return (
    <Link href={`/panel/solicitudes/${s.id}`} className="flex items-center gap-3 border-b border-linea px-3.5 py-3 last:border-b-0 hover:bg-cielo">
      <Avatar nombre={nombre} nueva={nueva} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">
          {nombre}
          {nueva && <span className="sr-only"> (nueva)</span>}
        </span>
        <span className="block truncate text-sm text-texto-2">
          {detalle ?? `${s.modeloLinea ?? s.lineaInteres ?? "Sin línea"}, cuota inicial ${plata(s.cuotaInicial)}`}
        </span>
      </span>
      <span className="flex flex-none flex-col items-end gap-1 text-[13px] text-texto-2">
        <EstadoBadge estado={s.estado} />
        {s.creadoEn && <span>{haceCuanto(s.creadoEn)}</span>}
      </span>
    </Link>
  );
}

export function Lista({ children, vacio }: { children: React.ReactNode; vacio?: string }) {
  const hayHijos = Array.isArray(children) ? children.length > 0 : !!children;
  return (
    <div className="overflow-hidden rounded-xl border border-linea bg-superficie">
      {hayHijos ? children : <p className="px-4 py-6 text-center text-texto-2">{vacio}</p>}
    </div>
  );
}

export function Titulo({ children, sub }: { children: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <>
      <h1 className="font-display mt-5 text-[32px] leading-tight font-bold">{children}</h1>
      {sub && <p className="text-texto-2">{sub}</p>}
    </>
  );
}

export function Cargando({ texto = "Cargando…" }: { texto?: string }) {
  return <p className="mt-8 text-texto-2">{texto}</p>;
}
