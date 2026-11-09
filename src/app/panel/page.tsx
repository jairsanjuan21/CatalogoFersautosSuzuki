import { Suspense } from "react";
import Link from "next/link";
import { exigirRol } from "@/lib/sesion";
import { fechaCorta, haceCuanto, ORIGENES } from "@/lib/etiquetas";
import { resumenPanel } from "@/modulos/solicitudes/panel";
import { Cargando, ItemSolicitud, Lista } from "./componentes";

export default function Inicio() {
  return (
    <Suspense fallback={<Cargando texto="Cargando tu panel…" />}>
      <Contenido />
    </Suspense>
  );
}

function saludo() {
  const hora = Number(new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", hour: "numeric", hourCycle: "h23" }).format(new Date()));
  return hora < 12 ? "Buenos días" : hora < 19 ? "Buenas tardes" : "Buenas noches";
}

async function Contenido() {
  const usuario = await exigirRol("asesora");
  const r = await resumenPanel();
  const hoy = new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", weekday: "long", day: "numeric", month: "long" }).format(new Date());

  const kpis = [
    { n: r.conteos.pendiente_valor ?? 0, texto: "Pendientes de valor", estado: "pendiente_valor", alerta: true },
    { n: r.conteos.lista_para_cargar ?? 0, texto: "Listas para cargar", estado: "lista_para_cargar" },
    { n: r.conteos.en_estudio ?? 0, texto: "En estudio", estado: "en_estudio" },
    { n: r.aprobadasMes, texto: "Aprobadas este mes", estado: "aprobada" },
  ];
  const atender = [
    ...r.pendientes.map((s) => ({ s, motivo: "Asígnale modelo y valor" })),
    ...r.listas.map((s) => ({ s, motivo: "Cárgala en la plataforma de Fersautos" })),
    ...r.quietas.map((s) => ({ s: { ...s, estado: "en_estudio" as const, vistaEn: new Date() }, motivo: `Sin novedades ${haceCuanto(s.ultimo!)}` })),
  ];
  const origenes = Object.fromEntries(r.porOrigen.map((o) => [o.origen, o.n]));
  const maximo = Math.max(1, ...r.porOrigen.map((o) => o.n));

  return (
    <>
      <h1 className="font-display mt-5 text-[32px] leading-tight font-bold">
        {saludo()}, {usuario.name.split(" ")[0]}
      </h1>
      <p className="text-texto-2 first-letter:uppercase">{hoy}</p>

      <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {kpis.map((k) => (
          <Link key={k.texto} href={`/panel/solicitudes?estado=${k.estado}`} className="rounded-xl border border-linea bg-superficie px-3.5 py-3 hover:border-linea-2">
            <b className={`font-display block text-[32px] leading-none ${k.alerta && k.n ? "text-senal" : ""}`}>{k.n}</b>
            <span className="text-sm text-texto-2">{k.texto}</span>
          </Link>
        ))}
      </div>

      {r.preciosViejos.length > 0 && (
        <p className="mt-3 rounded-lg bg-ambar-fondo px-3 py-2.5 text-[15px] text-ambar">
          {r.preciosViejos.length === 1 ? `El precio de ${r.preciosViejos[0].linea} lleva` : `${r.preciosViejos.length} precios llevan`} más de 7 días sin
          actualizar y no se muestran en el catálogo.
        </p>
      )}
      {r.promosPorVencer.map((p) => (
        <p key={p.linea + p.hasta} className="mt-3 rounded-lg bg-ambar-fondo px-3 py-2.5 text-[15px] text-ambar">
          La promoción de {p.linea} vence el {fechaCorta(new Date(p.hasta + "T12:00:00"))}.
        </p>
      ))}

      <h2 className="font-display mt-7 mb-2.5 text-[22px] font-semibold">Para atender hoy</h2>
      <Lista vacio="Todo al día. Comparte tu enlace para recibir nuevas solicitudes.">
        {atender.map(({ s, motivo }) => (
          <ItemSolicitud key={s.id + motivo} s={s} detalle={motivo} />
        ))}
      </Lista>

      <h2 className="font-display mt-7 mb-2.5 text-[22px] font-semibold">De dónde llegan tus clientes</h2>
      <div className="rounded-xl border border-linea bg-superficie p-4">
        <p className="mb-3 text-sm text-texto-2">Solicitudes de los últimos 30 días según el enlace que usaron.</p>
        <div className="space-y-2.5">
          {(["instagram", "facebook", "whatsapp", "estados", "catalogo", "directo"] as const).map((o) => (
            <div key={o} className="grid grid-cols-[120px_1fr_32px] items-center gap-2.5 text-[15px]">
              <span>{ORIGENES[o]}</span>
              <span className="h-3 overflow-hidden rounded-full bg-fondo">
                <span className="block h-full rounded-full bg-azul" style={{ width: `${((origenes[o] ?? 0) / maximo) * 100}%`, minWidth: origenes[o] ? 6 : 0 }} />
              </span>
              <span className="text-right font-semibold">{origenes[o] ?? 0}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
