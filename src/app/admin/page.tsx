import { Suspense } from "react";
import Link from "next/link";
import { exigirRol } from "@/lib/sesion";
import { haceCuanto } from "@/lib/etiquetas";
import { resumenAdmin } from "@/modulos/admin/resumen";
import { tableroAdmin } from "@/modulos/tablero/consultas";
import { Contador } from "@/componentes/tablero/Contador";
import { BarraCrece, Chispa, curvaSuave, Embudo, Variacion } from "@/componentes/tablero/graficos";
import { SelectorTema } from "@/componentes/SelectorTema";

export default function Resumen() {
  return (
    <Suspense fallback={<p className="mt-8 text-texto-2">Cargando…</p>}>
      <Contenido />
    </Suspense>
  );
}

const tarjeta = "anim-sube rounded-2xl border border-linea bg-superficie shadow-[var(--sombra)]";
const ACTOR: Record<string, [string, string]> = {
  asesora: ["Natalia", "bg-cielo text-azul-texto"],
  admin: ["Admin", "bg-pista text-texto-4"],
  cliente: ["Cliente", "bg-pista text-texto-4"],
  sistema: ["Sistema", "bg-superficie-2 text-texto-2"],
};

/** "+3 frente al periodo anterior" / "Igual que el periodo anterior" */
function cambio(n: number | null, unidad = "", menosEsMejor = false) {
  if (n === null) return null;
  if (n === 0) return { texto: "Igual que el periodo anterior", positiva: true };
  return { texto: `${n > 0 ? "+" : "−"}${Math.abs(n)}${unidad} frente al periodo anterior`, positiva: menosEsMejor ? n < 0 : n > 0 };
}

async function Contenido() {
  await exigirRol("admin");
  const [d, r] = await Promise.all([tableroAdmin(), resumenAdmin()]);

  const indicadores = [
    { nombre: "Vehículos entregados", valor: d.entregas.actual, formato: "numero" as const, cambio: cambio(d.entregas.cambio), serie: d.serie.map((s) => s.entregas), heroe: true },
    { nombre: "Tasa de conversión", valor: d.conversion.actual, formato: "porcentaje" as const, cambio: cambio(d.conversion.cambio, " puntos"), serie: d.serie.map((s) => (s.solicitudes ? s.entregas / s.solicitudes : 0)) },
    { nombre: "Solicitudes", valor: d.solicitudes.actual, formato: "numero" as const, cambio: cambio(d.solicitudes.cambio), serie: d.serie.map((s) => s.solicitudes) },
    { nombre: "Días hasta la entrega", valor: d.diasEntrega.actual ?? 0, formato: "numero" as const, cambio: d.diasEntrega.actual === null ? { texto: "Aún sin entregas", positiva: true } : cambio(d.diasEntrega.cambio, " días", true), serie: [] as number[] },
  ];

  // Gráfico: solicitudes y entregas por mes (6 meses)
  const maximo = Math.max(4, ...d.serie.map((s) => s.solicitudes));
  const tope = Math.ceil(maximo / 4) * 4;
  const X = (i: number) => 60 + i * 108, Y = (n: number) => 190 - (n / tope) * 170;
  const ptsSol = d.serie.map((s, i): [number, number] => [X(i), Y(s.solicitudes)]);
  const ptsEnt = d.serie.map((s, i): [number, number] => [X(i), Y(s.entregas)]);
  const ultimo = d.serie.length - 1;

  const alertas = [
    r.intentosFallidos > 0 && { titulo: `${r.intentosFallidos} ${r.intentosFallidos === 1 ? "intento fallido" : "intentos fallidos"} de inicio de sesión`, detalle: "Esta semana", accion: "Revisar", href: "/admin/auditoria?q=fallido&dias=7", grave: true },
    r.preciosViejos > 0 && { titulo: `${r.preciosViejos} ${r.preciosViejos === 1 ? "versión" : "versiones"} con precio vencido`, detalle: "Aparecen “a consultar” en el catálogo", accion: "Ver", href: "/admin/catalogo", grave: false },
    // Agrupadas: con varios modelos sin fotos, una alerta por modelo empujaría todo lo demás
    r.sinFoto.length === 1 && { titulo: `${r.sinFoto[0].linea} no tiene fotos`, detalle: "Se muestra con ilustración en el catálogo", accion: "Agregar", href: `/admin/catalogo/${r.sinFoto[0].id}`, grave: false },
    r.sinFoto.length > 1 && { titulo: `${r.sinFoto.length} modelos sin fotos`, detalle: r.sinFoto.map((m) => m.linea).join(", "), accion: "Ver", href: "/admin/catalogo", grave: false },
    r.faltaWhatsapp && { titulo: "Natalia no ha puesto su WhatsApp", detalle: "Los botones “Escríbeme” no aparecen", accion: "", href: "", grave: false },
  ].filter(Boolean) as { titulo: string; detalle: string; accion: string; href: string; grave: boolean }[];
  const maxModelo = Math.max(1, ...d.modelos.map((m) => m.n));

  return (
    <div className="pt-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight">Ventas y sistema</h1>
          <p className="mt-1.5 flex items-center gap-2 text-sm text-texto-2">
            <span className="anim-vivo size-2 rounded-full bg-verde" aria-hidden />
            Sistema en línea. Últimos 30 días frente a los 30 anteriores.
          </p>
        </div>
        <SelectorTema variante="texto" />
      </div>

      {/* ---------- Indicadores ---------- */}
      <section aria-label="Indicadores" className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3.5">
        {indicadores.map((k, i) => (
          <div
            key={k.nombre}
            className={`anim-sube relative overflow-hidden rounded-2xl border p-4 px-5 ${k.heroe ? "border-heroe bg-heroe text-white shadow-[var(--heroe-sombra)]" : "border-linea bg-superficie shadow-[var(--sombra)]"}`}
            style={{ animationDelay: `${i * 0.08}s` }}
          >
            {k.heroe && <div className="anim-brillo" aria-hidden />}
            <span className={`relative text-[13px] font-medium ${k.heroe ? "text-[#d5e0f5]" : "text-texto-2"}`}>{k.nombre}</span>
            <div className="relative mt-1.5 flex items-end justify-between gap-2">
              <span className="text-[34px] font-extrabold tracking-tight">
                <Contador valor={k.valor} formato={k.formato} />
              </span>
              {k.serie.length > 1 && <Chispa valores={k.serie} color={k.heroe ? "#fff" : "var(--grafico)"} />}
            </div>
            {k.cambio && (
              <div className="relative mt-2">
                <Variacion texto={k.cambio.texto} positiva={k.cambio.positiva} sobreAzul={k.heroe} retraso={1.3 + i * 0.1} />
              </div>
            )}
          </div>
        ))}
      </section>

      <div className="mt-3.5 grid gap-3.5 lg:grid-cols-3">
        {/* ---------- Solicitudes y entregas por mes ---------- */}
        <section aria-labelledby="titulo-tendencia" className={`${tarjeta} min-w-0 p-5 lg:col-span-2`} style={{ animationDelay: ".3s" }}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="titulo-tendencia" className="text-[15px] font-semibold">Solicitudes y entregas por mes</h2>
            <span className="flex gap-3.5 text-[13px] text-texto-4">
              <span className="flex items-center gap-1.5"><span aria-hidden className="h-[3px] w-2.5 rounded bg-grafico" />Solicitudes</span>
              <span className="flex items-center gap-1.5"><span aria-hidden className="h-[3px] w-2.5 rounded bg-verde" />Entregas</span>
            </span>
          </div>
          <svg viewBox="0 0 640 220" className="mt-3.5 block h-auto w-full" role="img" aria-label={`Por mes: ${d.serie.map((s) => `${s.etiqueta} ${s.solicitudes} solicitudes y ${s.entregas} entregas`).join("; ")}`}>
            <defs>
              <linearGradient id="velo-solicitudes" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="var(--grafico)" stopOpacity=".18" />
                <stop offset="1" stopColor="var(--grafico)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[0, tope / 4, tope / 2, (3 * tope) / 4, tope].map((n) => (
              <g key={n}>
                <line x1="30" y1={Y(n)} x2="640" y2={Y(n)} stroke={n === 0 ? "var(--linea-2)" : "var(--divisor)"} />
                <text x="0" y={Y(n) + 4} fill="var(--texto-3)" fontSize="12">{n}</text>
              </g>
            ))}
            <path className="anim-aparece" d={`${curvaSuave(ptsSol)} L${X(ultimo)} 190 L${X(0)} 190 Z`} fill="url(#velo-solicitudes)" />
            <path className="anim-dibujar" d={curvaSuave(ptsSol)} pathLength={1} fill="none" stroke="var(--grafico)" strokeWidth={3} strokeLinecap="round" />
            <path className="anim-dibujar" d={curvaSuave(ptsEnt)} pathLength={1} fill="none" stroke="var(--verde)" strokeWidth={3} strokeLinecap="round" style={{ animationDelay: ".8s" }} />
            <circle className="anim-aparece anim-onda" cx={X(ultimo)} cy={Y(d.serie[ultimo].solicitudes)} r={5} fill="var(--grafico)" />
            <circle className="anim-aparece" cx={X(ultimo)} cy={Y(d.serie[ultimo].solicitudes)} r={5.5} fill="var(--superficie)" stroke="var(--grafico)" strokeWidth={3} />
            <circle className="anim-aparece" cx={X(ultimo)} cy={Y(d.serie[ultimo].entregas)} r={5.5} fill="var(--superficie)" stroke="var(--verde)" strokeWidth={3} />
            {d.serie.map((s, i) => (
              <text key={s.etiqueta} x={X(i)} y={214} textAnchor="middle" fill="var(--texto-3)" fontSize="12" className="capitalize">{s.etiqueta}</text>
            ))}
          </svg>
        </section>

        {/* ---------- Embudo ---------- */}
        <section aria-labelledby="titulo-embudo" className={`${tarjeta} p-5`} style={{ animationDelay: ".4s" }}>
          <h2 id="titulo-embudo" className="mb-3 text-[15px] font-semibold">Embudo de ventas</h2>
          {d.embudo.pasos[0].n === 0 ? (
            <p className="text-sm text-texto-2">Sin solicitudes en los últimos 30 días.</p>
          ) : (
            <>
              <Embudo pasos={d.embudo.pasos} retraso={0.8} />
              {d.embudo.perdida && (
                <p className="mt-3 rounded-[10px] bg-cielo px-3 py-2.5 text-[13px] text-texto-4">
                  Donde más se pierden clientes: de “{d.embudo.perdida.desde.toLowerCase()}” a “{d.embudo.perdida.hasta.toLowerCase()}”.
                </p>
              )}
            </>
          )}
        </section>

        {/* ---------- Canales ---------- */}
        <section aria-labelledby="titulo-canales" className={`${tarjeta} min-w-0 overflow-hidden lg:col-span-2`} style={{ animationDelay: ".5s" }}>
          <h2 id="titulo-canales" className="px-5 pt-4.5 pb-2.5 text-[15px] font-semibold">Qué canal vende más <span className="font-normal text-texto-3">(90 días)</span></h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="bg-superficie-2 text-left text-xs text-texto-2">
                  <th className="px-5 py-2.5 font-medium">Canal</th>
                  <th className="px-3 py-2.5 text-right font-medium">Solicitudes</th>
                  <th className="px-3 py-2.5 text-right font-medium">Entregas</th>
                  <th className="w-2/5 px-5 py-2.5 font-medium">Conversión</th>
                </tr>
              </thead>
              <tbody>
                {d.canales.length === 0 && (
                  <tr><td colSpan={4} className="px-5 py-5 text-center text-texto-2">Sin solicitudes en los últimos 90 días.</td></tr>
                )}
                {d.canales.map((c, i) => (
                  <tr key={c.nombre} className="border-t border-divisor">
                    <td className="px-5 py-3 font-semibold">{c.nombre}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{c.solicitudes}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{c.entregas}</td>
                    <td className="px-5 py-3">
                      <span className="flex items-center gap-2.5">
                        <span className="flex-1"><BarraCrece pct={c.conversion} color={c.conversion ? "var(--verde)" : "var(--linea-2)"} retraso={1 + 0.1 * i} /></span>
                        <strong className="w-12 text-right whitespace-nowrap tabular-nums">{c.conversion} %</strong>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ---------- Modelos más solicitados ---------- */}
        <section aria-labelledby="titulo-modelos" className={`${tarjeta} p-5`} style={{ animationDelay: ".6s" }}>
          <h2 id="titulo-modelos" className="text-[15px] font-semibold">Modelos más solicitados <span className="font-normal text-texto-3">(90 días)</span></h2>
          {d.modelos.length === 0 ? (
            <p className="mt-2 text-sm text-texto-2">Sin solicitudes todavía.</p>
          ) : (
            <ul className="mt-3.5 grid gap-3">
              {d.modelos.map((m, i) => (
                <li key={m.nombre} className="grid grid-cols-[84px_1fr_20px] items-center gap-2.5 text-[13px]">
                  <span className="truncate text-texto-4">{m.nombre}</span>
                  <BarraCrece pct={(m.n / maxModelo) * 100} retraso={1.1 + 0.1 * i} />
                  <strong className="text-right">{m.n}</strong>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ---------- Requiere atención ---------- */}
        <section aria-labelledby="titulo-alertas" className={`${tarjeta} p-5`} style={{ animationDelay: ".7s" }}>
          <h2 id="titulo-alertas" className="mb-1.5 text-[15px] font-semibold">Requiere atención</h2>
          {alertas.length === 0 ? (
            <p className="rounded-[10px] bg-ok-fondo px-3 py-2.5 text-sm text-ok">Todo en orden.</p>
          ) : (
            <ul>
              {alertas.map((a) => (
                <li key={a.titulo} className="flex gap-3 border-t border-divisor py-3 first:border-t-0">
                  <span aria-hidden className={`grid size-8 flex-none place-items-center rounded-lg ${a.grave ? "bg-senal-fondo text-senal" : "bg-ambar-fondo text-ambar"}`}>
                    <svg viewBox="0 0 24 24" className="size-4 fill-none stroke-current stroke-2 [stroke-linecap:round] [stroke-linejoin:round]"><path d="M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" /></svg>
                  </span>
                  <span className="flex flex-1 flex-col">
                    <strong className="text-sm font-semibold">{a.titulo}</strong>
                    <span className="text-[13px] text-texto-2">{a.detalle}</span>
                  </span>
                  {a.accion && <Link href={a.href} className="flex min-h-11 items-center self-center text-[13px] font-semibold whitespace-nowrap text-azul-texto">{a.accion}</Link>}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ---------- Actividad ---------- */}
        <section aria-labelledby="titulo-actividad" className={`${tarjeta} min-w-0 overflow-hidden lg:col-span-2`} style={{ animationDelay: ".8s" }}>
          <div className="flex items-baseline justify-between px-5 pt-4.5 pb-2.5">
            <h2 id="titulo-actividad" className="text-[15px] font-semibold">Actividad reciente</h2>
            <Link href="/admin/auditoria" className="text-[13px] font-semibold text-azul-texto">Ver auditoría</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <tbody>
                {r.actividad.map((a, i) => {
                  const [quien, color] = ACTOR[a.actor] ?? ACTOR.sistema;
                  return (
                    <tr key={i} className="border-t border-divisor">
                      <td className="px-5 py-3 whitespace-nowrap text-texto-2 tabular-nums">{haceCuanto(a.creadoEn)}</td>
                      <td className="px-2 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${color}`}>{a.usuario?.split(" ")[0] ?? quien}</span></td>
                      <td className="py-3 pr-5 pl-2">{a.accion}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
