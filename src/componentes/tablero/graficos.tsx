/**
 * Gráficos SVG dibujados en el servidor. Sin hooks: sirven en páginas de servidor.
 * Las animaciones son clases CSS de globals.css (anim-dibujar, anim-resorte, ...).
 */

/** Curva suave (Bézier) que pasa por los puntos */
export function curvaSuave(puntos: [number, number][]) {
  if (!puntos.length) return "";
  let d = `M${puntos[0][0].toFixed(1)} ${puntos[0][1].toFixed(1)}`;
  for (let i = 1; i < puntos.length; i++) {
    const [ax, ay] = puntos[i - 1], [bx, by] = puntos[i], c = (bx - ax) / 2;
    d += ` C${(ax + c).toFixed(1)} ${ay.toFixed(1)} ${(bx - c).toFixed(1)} ${by.toFixed(1)} ${bx.toFixed(1)} ${by.toFixed(1)}`;
  }
  return d;
}

/** Escala valores a puntos dentro de un rectángulo (y crece hacia arriba) */
export function aPuntos(valores: number[], ancho: number, alto: number, margen = 6, maximo?: number): [number, number][] {
  const max = maximo ?? Math.max(...valores, 1);
  const paso = valores.length > 1 ? (ancho - 2 * margen) / (valores.length - 1) : 0;
  return valores.map((v, i) => [margen + i * paso, alto - margen - (v / max) * (alto - 2 * margen)]);
}

/** Mini tendencia de un indicador */
export function Chispa({ valores, color = "var(--grafico)", className = "" }: { valores: number[]; color?: string; className?: string }) {
  const min = Math.min(...valores), max = Math.max(...valores);
  const pts = valores.map((v, i): [number, number] => [(i * 80) / Math.max(valores.length - 1, 1), 27 - ((v - min) / (max - min || 1)) * 24]);
  return (
    <svg viewBox="0 0 80 30" aria-hidden className={`h-8 w-22 ${className}`}>
      <path className="anim-dibujar" d={pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ")} pathLength={1} fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Anillo de progreso (por ejemplo la meta del mes) */
export function Anillo({ pct, color = "#fff", pista = "rgb(255 255 255 / 0.2)", className = "", etiqueta }: { pct: number; color?: string; pista?: string; className?: string; etiqueta: string }) {
  const fin = 100 - Math.max(0, Math.min(100, pct));
  return (
    <svg viewBox="0 0 42 42" role="img" aria-label={etiqueta} className={`-rotate-90 ${className}`}>
      <circle cx="21" cy="21" r="17" fill="none" stroke={pista} strokeWidth="4.5" />
      <circle className="anim-anillo" cx="21" cy="21" r="17" fill="none" stroke={color} strokeWidth="4.5" strokeLinecap="round" pathLength={100} style={{ "--fin": fin } as React.CSSProperties} />
    </svg>
  );
}

/** Barra horizontal que crece con rebote, sobre su pista */
export function BarraCrece({ pct, color = "var(--grafico)", retraso = 0, alto = "h-2", redondeo = "rounded" }: { pct: number; color?: string; retraso?: number; alto?: string; redondeo?: string }) {
  return (
    <div aria-hidden className={`${alto} overflow-hidden ${redondeo} bg-pista`}>
      <div className={`anim-resorte h-full ${redondeo}`} style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: color, animationDelay: `${retraso}s` }} />
    </div>
  );
}

/** Embudo de ventas: un paso por fila con su barra */
export function Embudo({ pasos, retraso = 0.5, altoBarra = "h-5" }: { pasos: { nombre: string; n: number; pct: number }[]; retraso?: number; altoBarra?: string }) {
  return (
    <ol className="grid gap-2.5">
      {pasos.map((p, i) => (
        <li key={p.nombre}>
          <div className="mb-1 flex justify-between text-[13px]">
            <span className="text-texto-4">{p.nombre}</span>
            <span>
              <strong className="tabular-nums">{p.n}</strong> {i > 0 && <span className="text-texto-3">{p.pct} %</span>}
            </span>
          </div>
          <BarraCrece pct={pasos[0].n ? (p.n / pasos[0].n) * 100 : 0} color={`var(--emb-${i + 1})`} retraso={retraso + 0.12 * i} alto={altoBarra} redondeo="rounded-md" />
        </li>
      ))}
    </ol>
  );
}

/** Etiqueta de variación (+18 % / −5 %) que aparece de golpe */
export function Variacion({ texto, positiva, retraso = 1.4, sobreAzul = false }: { texto: string; positiva: boolean; retraso?: number; sobreAzul?: boolean }) {
  const colores = sobreAzul
    ? positiva ? "bg-[#a6f4c5] text-[#054f31]" : "bg-[#fecdca] text-[#7a271a]"
    : positiva ? "bg-ok-fondo text-ok" : "bg-senal-fondo text-senal";
  return (
    <span className={`anim-salta rounded-full px-2.5 py-0.5 text-xs font-bold ${colores}`} style={{ animationDelay: `${retraso}s` }}>
      {texto}
    </span>
  );
}
