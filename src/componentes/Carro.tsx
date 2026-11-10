/**
 * Ilustración de referencia de un carro según su carrocería.
 * Es provisional: cuando haya fotos reales de los modelos, se reemplaza.
 * No usa hooks, así que sirve igual en componentes de servidor y de cliente.
 */

export type Carroceria = "hatchback" | "sedan" | "suv" | "todoterreno" | "familiar";

const FORMAS: Record<Carroceria, { cuerpo: string; vidrios: string; ruedas: [number, number] }> = {
  hatchback: {
    cuerpo: "M15 64L17 52Q19 44 30 42L62 38L82 22Q88 18 98 18L132 18Q142 18 150 28L162 42L178 46Q186 48 186 56L186 64Z",
    vidrios: "M88 24L96 22L130 22Q138 22 144 30L152 40L80 40Z",
    ruedas: [48, 152],
  },
  sedan: {
    cuerpo: "M10 64L12 54Q14 46 26 44L58 40L80 24Q86 20 96 20L124 20Q134 20 142 28L156 40L182 44Q190 46 190 54L190 64Z",
    vidrios: "M86 26L96 24L122 24Q130 24 136 30L148 40L76 40Z",
    ruedas: [46, 160],
  },
  suv: {
    cuerpo: "M14 66L14 48Q16 40 28 38L56 36L70 18Q74 14 84 14L150 14Q160 14 166 22L176 36Q186 38 188 48L188 66Z",
    vidrios: "M76 20L84 18L148 18Q156 18 160 24L168 34L68 34Z",
    ruedas: [50, 154],
  },
  todoterreno: {
    cuerpo: "M30 66L30 46Q30 38 40 36L56 34L64 14Q66 10 74 10L150 10Q158 10 160 18L164 34Q172 36 172 46L172 66Z",
    vidrios: "M70 16L74 14L148 14Q154 14 156 20L158 32L64 32Z",
    ruedas: [60, 146],
  },
  familiar: {
    cuerpo: "M8 64L10 50Q12 42 24 40L48 36L66 18Q70 14 80 14L160 14Q170 14 176 22L184 38Q192 40 192 50L192 64Z",
    vidrios: "M72 20L80 18L158 18Q166 18 170 24L176 34L60 34Z",
    ruedas: [44, 162],
  },
};

export const COLORES = [
  { nombre: "Blanco", hex: "#F2F3F5" },
  { nombre: "Gris", hex: "#8B929C" },
  { nombre: "Rojo", hex: "#B8312F" },
  { nombre: "Azul", hex: "#2F5DA8" },
  { nombre: "Negro", hex: "#262A31" },
] as const;

/** Color inicial estable para cada modelo (no aleatorio: igual en servidor y navegador). */
export const colorDe = (slug: string) => COLORES[[...slug].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORES.length].hex;

export function Carro({ tipo, color, className }: { tipo: Carroceria; color: string; className?: string }) {
  const f = FORMAS[tipo] ?? FORMAS.hatchback;
  return (
    <svg viewBox="0 0 200 84" role="img" aria-label="Ilustración de referencia" className={className}>
      <ellipse cx="100" cy="77" rx="92" ry="5" fill="#000" opacity=".13" />
      <path d={f.cuerpo} fill={color} stroke="#1a2330" strokeOpacity=".25" strokeWidth="1" />
      <path d={f.vidrios} fill="#2b3440" opacity=".85" />
      {f.ruedas.map((x) => (
        <g key={x}>
          <circle cx={x} cy="66" r="12" fill="#1e2229" />
          <circle cx={x} cy="66" r="5" fill="#a9b0ba" />
        </g>
      ))}
    </svg>
  );
}
