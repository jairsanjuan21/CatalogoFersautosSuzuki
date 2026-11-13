import { Suspense } from "react";
import Link from "next/link";
import { exigirRol } from "@/lib/sesion";
import { fechaCorta } from "@/lib/etiquetas";
import { nombreVersion, plata } from "@/lib/formato";
import { resumenPanel } from "@/modulos/solicitudes/panel";
import { tableroNatalia } from "@/modulos/tablero/consultas";
import { Contador } from "@/componentes/tablero/Contador";
import { Anillo, aPuntos, BarraCrece, curvaSuave, Embudo, Variacion } from "@/componentes/tablero/graficos";
import { Cargando } from "./componentes";

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

const TONOS = {
  verde: "bg-ok-fondo text-ok",
  rojo: "bg-senal-fondo text-senal",
  ambar: "bg-ambar-fondo text-ambar",
  azul: "bg-cielo text-azul-texto",
} as const;

const tarjeta = "anim-sube rounded-[18px] border border-linea bg-superficie shadow-[var(--sombra)]";

async function Contenido() {
  const usuario = await exigirRol("asesora");
  const [d, avisos] = await Promise.all([tableroNatalia(), resumenPanel()]);
  const hoy = new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", weekday: "long", day: "numeric", month: "long" }).format(new Date());

  // Curva de la comisión de los últimos 6 meses, dentro de la tarjeta azul
  const pts = aPuntos(d.historico.map((h) => h.comision), 340, 70, 6, Math.max(...d.historico.map((h) => h.comision), 1) * 1.08);
  const ultimo = pts[pts.length - 1];
  const pctMeta = d.meta ? Math.round((d.vendidos / d.meta) * 100) : 0;
  const pctAprobado = d.enCamino.total ? (d.enCamino.aprobado / d.enCamino.total) * 100 : 0;
  const maxModelo = Math.max(1, ...d.modelos.map((m) => m.n));

  return (
    <div className="pb-6">
      <h1 className="mt-5 text-2xl font-bold tracking-tight">
        {saludo()}, {usuario.name.split(" ")[0]}
      </h1>
      <p className="text-sm text-texto-2 first-letter:uppercase">{hoy}</p>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {/* ---------- Comisión del mes ---------- */}
        <section aria-label={`Ventas de ${d.mes}`} className="anim-sube relative overflow-hidden rounded-[22px] bg-heroe p-5 pb-4 text-white shadow-[var(--heroe-sombra)] lg:col-span-2">
          <div className="anim-brillo" aria-hidden />
          <div className="relative flex justify-between gap-3">
            <div>
              <span className="text-[13px] font-medium text-[#d5e0f5]">Tu comisión de {d.mes.split(" ")[0]}</span>
              <div className="mt-1 text-4xl font-extrabold tracking-tight">
                <Contador valor={d.comision} formato="pesos" duracion={1600} />
              </div>
              {d.variacion !== null && (
                <div className="mt-2">
                  <Variacion sobreAzul positiva={d.variacion >= 0} texto={`${d.variacion >= 0 ? "+" : ""}${d.variacion} % frente a ${d.mesAnterior}`} retraso={1.5} />
                </div>
              )}
            </div>
            {d.meta ? (
              <div className="relative size-23 flex-none">
                <Anillo pct={pctMeta} etiqueta={`Meta del mes: ${d.vendidos} de ${d.meta} vehículos, ${pctMeta} %`} className="size-23" />
                <div className="absolute inset-0 grid place-items-center text-center leading-tight">
                  <span>
                    <strong className="block text-xl font-extrabold">
                      {d.vendidos} de {d.meta}
                    </strong>
                    <span className="text-[11px] text-[#d5e0f5]">meta</span>
                  </span>
                </div>
              </div>
            ) : (
              <Link href="/panel/perfil" className="relative flex h-23 w-23 flex-none items-center justify-center rounded-full border-2 border-dashed border-white/40 px-2 text-center text-xs leading-tight font-semibold text-white">
                Define tu meta del mes
              </Link>
            )}
          </div>
          <svg viewBox="0 0 340 70" className="relative mt-2.5 block h-auto w-full" role="img" aria-label={`Comisión de los últimos 6 meses: ${d.historico.map((h) => `${h.etiqueta} ${plata(h.comision)}`).join(", ")}`}>
            <path className="anim-dibujar" d={curvaSuave(pts)} pathLength={1} fill="none" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" />
            <circle className="anim-aparece anim-onda" cx={ultimo[0]} cy={ultimo[1]} r={4} fill="#fff" />
            <circle className="anim-aparece" cx={ultimo[0]} cy={ultimo[1]} r={4.5} fill="#fff" />
          </svg>
          <div className="relative mt-1 flex justify-between text-[11px] text-[#d5e0f5]">
            {d.historico.map((h) => (
              <span key={h.etiqueta} className="capitalize">{h.etiqueta}</span>
            ))}
          </div>
          <div className="relative mt-3 grid grid-cols-3 gap-2.5 border-t border-white/20 pt-3">
            <div>
              <span className="block text-xs text-[#d5e0f5]">Vendidos</span>
              <strong className="text-[17px]"><Contador valor={d.vendidos} /></strong>
            </div>
            <div>
              <span className="block text-xs text-[#d5e0f5]">Total vendido</span>
              <strong className="text-[17px]"><Contador valor={d.totalVendido} formato="millones" /></strong>
            </div>
            <div>
              <span className="block text-xs text-[#d5e0f5]">Venta promedio</span>
              <strong className="text-[17px]"><Contador valor={d.promedio} formato="millones" /></strong>
            </div>
          </div>
        </section>

        {/* ---------- Avisos que requieren acción ---------- */}
        {(avisos.preciosViejos.length > 0 || avisos.promosPorVencer.length > 0) && (
          <div className="grid gap-2 lg:col-span-2">
            {avisos.preciosViejos.length > 0 && (
              <Link href="/panel/precios" className="anim-sube rounded-xl bg-ambar-fondo px-3.5 py-2.5 text-sm text-ambar" style={{ animationDelay: ".06s" }}>
                {avisos.preciosViejos.length === 1
                  ? `El precio de ${avisos.preciosViejos[0].linea} ${nombreVersion(avisos.preciosViejos[0])} lleva`
                  : `${avisos.preciosViejos.length} versiones llevan`}{" "}
                más de 7 días sin actualizar: el catálogo las muestra “a consultar”. <strong>Actualizar</strong>
              </Link>
            )}
            {avisos.promosPorVencer.map((p) => (
              <p key={p.linea + p.hasta} className="anim-sube rounded-xl bg-ambar-fondo px-3.5 py-2.5 text-sm text-ambar" style={{ animationDelay: ".06s" }}>
                La promoción de {p.linea} vence el {fechaCorta(new Date(p.hasta + "T12:00:00"))}.
              </p>
            ))}
          </div>
        )}

        {/* ---------- Comisión en camino ---------- */}
        <section aria-labelledby="titulo-camino" className={`${tarjeta} p-4 px-4.5`} style={{ animationDelay: ".12s" }}>
          <div className="flex items-baseline justify-between gap-2">
            <h2 id="titulo-camino" className="text-[15px] font-semibold">Comisión en camino</h2>
            <span className="flex items-center gap-1.5 text-xs text-texto-2">
              <span className="anim-vivo size-2 rounded-full bg-verde" aria-hidden />
              {d.enCamino.abiertos} {d.enCamino.abiertos === 1 ? "negocio abierto" : "negocios abiertos"}
            </span>
          </div>
          <div className="mt-1.5 text-[28px] font-extrabold tracking-tight">
            <Contador valor={d.enCamino.total} formato="pesos" />
          </div>
          <p className="mt-0.5 mb-3 text-[13px] text-texto-2">Lo que ganarías si cierras lo aprobado y lo que está en estudio.</p>
          <div aria-hidden className="flex h-3 gap-[3px] overflow-hidden rounded-full bg-pista">
            {d.enCamino.aprobado > 0 && <span className="anim-resorte bg-verde" style={{ flex: pctAprobado, animationDelay: ".7s" }} />}
            {d.enCamino.enEstudio > 0 && <span className="anim-resorte bg-grafico-2" style={{ flex: 100 - pctAprobado, animationDelay: ".85s" }} />}
          </div>
          <div className="mt-2 flex flex-wrap justify-between gap-x-3 text-[13px]">
            <span className="flex items-center gap-1.5"><span className="size-2 rounded-xs bg-verde" aria-hidden />Aprobado <strong>{plata(d.enCamino.aprobado)}</strong></span>
            <span className="flex items-center gap-1.5"><span className="size-2 rounded-xs bg-grafico-2" aria-hidden />En estudio <strong>{plata(d.enCamino.enEstudio)}</strong></span>
          </div>
        </section>

        {/* ---------- Embudo ---------- */}
        <section aria-labelledby="titulo-embudo" className={`${tarjeta} p-4 px-4.5`} style={{ animationDelay: ".24s" }}>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 id="titulo-embudo" className="text-[15px] font-semibold">Tu embudo de ventas</h2>
            <span className="text-xs text-texto-2">Últimos 30 días</span>
          </div>
          {d.embudo.pasos[0].n === 0 ? (
            <p className="text-sm text-texto-2">Aún no hay solicitudes en los últimos 30 días. Comparte tu enlace para empezar a recibirlas.</p>
          ) : (
            <>
              <Embudo pasos={d.embudo.pasos} />
              {(d.embudo.unoDeCada || d.embudo.perdida) && (
                <p className="mt-3 rounded-[10px] bg-cielo px-3 py-2.5 text-[13px] text-texto-4">
                  {d.embudo.unoDeCada && (
                    <>
                      <strong>1 de cada {d.embudo.unoDeCada}</strong> solicitudes termina en entrega.{" "}
                    </>
                  )}
                  {d.embudo.perdida && <>Donde más se pierden clientes: de “{d.embudo.perdida.desde.toLowerCase()}” a “{d.embudo.perdida.hasta.toLowerCase()}”.</>}
                </p>
              )}
            </>
          )}
        </section>

        {/* ---------- Oportunidades ---------- */}
        <section aria-labelledby="titulo-cerrar" className={`${tarjeta} overflow-hidden`} style={{ animationDelay: ".36s" }}>
          <div className="flex items-baseline justify-between px-4.5 pt-4 pb-1.5">
            <h2 id="titulo-cerrar" className="text-[15px] font-semibold">Oportunidades por cerrar</h2>
            <Link href="/panel/solicitudes" className="text-[13px] font-semibold text-azul-texto">Ver todas</Link>
          </div>
          {d.oportunidades.length === 0 ? (
            <p className="px-4.5 pt-1 pb-4 text-sm text-texto-2">No tienes negocios abiertos. Comparte tu enlace para recibir nuevas solicitudes.</p>
          ) : (
            <ul>
              {d.oportunidades.map((o) => (
                <li key={o.id} className="border-t border-divisor">
                  <Link href={`/panel/solicitudes/${o.id}`} className="flex min-h-16 items-center gap-3 px-4.5 py-2 hover:bg-superficie-2">
                    <span aria-hidden className={`grid size-9.5 flex-none place-items-center rounded-full text-[13px] font-bold ${TONOS[o.tono]}`}>
                      {o.nombre.split(" ").map((x) => x[0]).join("")}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <strong className="text-sm font-semibold">{o.nombre}</strong>
                      <span className={`text-xs font-semibold ${TONOS[o.tono].split(" ")[1]}`}>{o.paso}</span>
                    </span>
                    <span className="text-right">
                      <strong className={`block text-sm tabular-nums ${o.comision ? "text-ok" : "text-texto-3"}`}>{o.comision ? `+${plata(o.comision)}` : "Sin valor"}</strong>
                      <span className="text-xs text-texto-3">{o.carro}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ---------- Lo que más vendes ---------- */}
        <section aria-labelledby="titulo-mas" className={`${tarjeta} p-4 px-4.5`} style={{ animationDelay: ".48s" }}>
          <h2 id="titulo-mas" className="text-[15px] font-semibold">Lo que más vendes</h2>
          {d.modelos.length === 0 ? (
            <p className="mt-2 text-sm text-texto-2">Cuando registres ventas, aquí verás tus modelos más vendidos.</p>
          ) : (
            <ul className="mt-3 grid gap-2.5">
              {d.modelos.map((m, i) => (
                <li key={m.nombre} className="grid grid-cols-[84px_1fr_20px] items-center gap-2.5 text-[13px]">
                  <span className="text-texto-4">{m.nombre}</span>
                  <BarraCrece pct={(m.n / maxModelo) * 100} retraso={0.9 + 0.1 * i} />
                  <strong className="text-right">{m.n}</strong>
                </li>
              ))}
            </ul>
          )}
          {d.mejorCanal && (
            <div className="mt-3.5 flex items-center justify-between gap-2.5 border-t border-divisor pt-3 text-[13px]">
              <span className="text-texto-4">
                Tu mejor canal: <strong>{d.mejorCanal.nombre}</strong>, {d.mejorCanal.entregas} {d.mejorCanal.entregas === 1 ? "venta" : "ventas"} de {d.mejorCanal.solicitudes} solicitudes
              </span>
              <Link href="/panel/compartir" className="font-semibold whitespace-nowrap text-azul-texto">Compartir</Link>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
