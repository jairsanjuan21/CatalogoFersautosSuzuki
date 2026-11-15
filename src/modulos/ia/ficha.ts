import "server-only";
import { z } from "zod";
import { ErrorIA, jsonDeTexto, pedirAGemini, type Fuente } from "./gemini";

/* ============================================================================
   FICHA TÉCNICA CON GEMINI + BÚSQUEDA EN GOOGLE
   Los datos técnicos (medidas, baúl, airbags) NO se pueden inventar: un error
   ahí es una promesa falsa al cliente. Por eso:
   1. Gemini busca en Google antes de responder y se muestran las páginas que usó.
   2. Cada dato se valida con rangos realistas; lo que no pasa, se descarta.
   3. Si no encuentra un dato, debe dejarlo vacío (null), nunca adivinar.
   4. Nada se guarda solo: llena el formulario y Natalia revisa y guarda.
   ========================================================================== */

export interface DatosParaFicha {
  linea: string;
  tipo: string;
  versiones: string[]; // "GLX 2WD automática"
  versionEntrada: string | null;
}

/** Medida en mm dentro de un rango, o null (un dato dudoso se descarta, no se corrige) */
const mm = (min: number, max: number) =>
  // En milímetros no hay decimales: "3.985" (punto de miles, como se escribe en Colombia) es 3985
  z.preprocess((v) => (typeof v === "string" ? Number(v.replace(/\D/g, "")) || null : v), z.number().int().min(min).max(max).nullable().catch(null));
const texto = (max: number) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() ? v.replace(/\s+/g, " ").trim() : null), z.string().max(max).nullable().catch(null));

export const esquemaFicha = z.object({
  motor: texto(60),
  combustible: z.enum(["gasolina", "hibrido", "electrico"]).nullable().catch(null),
  transmision: texto(60),
  puestos: z.preprocess((v) => (typeof v === "string" ? Number(v) : v), z.number().int().min(2).max(9).nullable().catch(null)),
  baul: texto(80),
  largoMm: mm(2000, 7000),
  anchoMm: mm(1000, 3000),
  altoMm: mm(1000, 3000),
  entreEjesMm: mm(1500, 4500),
  alturaPisoMm: mm(80, 400),
  seguridad: z
    .array(z.unknown())
    .catch([])
    .transform((xs) => [...new Set(xs.flatMap((x) => (typeof x === "string" && x.trim() ? [x.replace(/\s+/g, " ").trim().slice(0, 80)] : [])))].slice(0, 12)),
});

export type FichaSugerida = z.infer<typeof esquemaFicha>;

function instrucciones(d: DatosParaFicha) {
  return `Busca la ficha técnica OFICIAL del Suzuki ${d.linea} (${d.tipo}) que se vende en Colombia, modelo 2026 o 2027.
Prioriza suzuki.com.co y concesionarios Suzuki de Colombia. Si no hay datos de Colombia, usa la ficha oficial de Suzuki de otro país de Latinoamérica para la misma versión.
${d.versiones.length ? `Versiones que se venden: ${d.versiones.join("; ")}.` : ""}
${d.versionEntrada ? `Si un dato cambia entre versiones, usa el de la versión de entrada: ${d.versionEntrada}.` : ""}

Responde SOLO con un objeto JSON, sin texto antes ni después, con estas claves:
{
  "motor": "cilindrada, tipo y potencia, ej: 1.5 L 4 cilindros, 103 hp" o null,
  "combustible": "gasolina" | "hibrido" | "electrico" | null,
  "transmision": "ej: Mecánica de 5 velocidades o automática de 6" o null,
  "puestos": número de pasajeros o null,
  "baul": "capacidad en litros, ej: 308 L (1.050 L con sillas abatidas)" o null,
  "largoMm": número en milímetros o null,
  "anchoMm": número en milímetros o null,
  "altoMm": número en milímetros o null,
  "entreEjesMm": distancia entre ejes en milímetros o null,
  "alturaPisoMm": altura libre al piso en milímetros o null,
  "seguridad": ["lista corta de equipamiento de seguridad y tecnología, ej: 6 airbags", "Frenos ABS con EBD", "Pantalla táctil con Apple CarPlay"]
}

Reglas:
- Si no encuentras un dato en una fuente confiable, pon null (o lista vacía). NUNCA lo adivines ni lo calcules.
- Números sin puntos ni unidades en las medidas. Textos en español de Colombia, cortos.
- Máximo 10 elementos en "seguridad", los más importantes para un comprador.
- No incluyas precios, bonos ni promociones.`;
}

/** Devuelve la ficha propuesta, las páginas consultadas y si de verdad buscó en internet. */
export async function sugerirFicha(d: DatosParaFicha): Promise<{ ficha: FichaSugerida; fuentes: Fuente[]; verificada: boolean }> {
  let respuesta: { texto: string; fuentes: Fuente[] };
  let verificada = true;
  try {
    respuesta = await pedirAGemini({ texto: instrucciones(d), buscar: true, temperatura: 0.1, maxTokens: 2048, segundos: 60 });
  } catch (e) {
    // Si el modelo o la cuenta no permiten la búsqueda en Google, se intenta sin ella y se avisa
    if (!(e instanceof ErrorIA) || e.codigo !== 400) throw e;
    verificada = false;
    respuesta = await pedirAGemini({ texto: instrucciones(d), temperatura: 0.1, maxTokens: 2048, segundos: 45 });
  }
  const ficha = esquemaFicha.parse(jsonDeTexto(respuesta.texto));
  const vacia = Object.values(ficha).every((v) => v === null || (Array.isArray(v) && !v.length));
  if (vacia) throw new ErrorIA("La IA no encontró la ficha técnica de este modelo. Llénala con la ficha oficial de Suzuki.");
  return { ficha, fuentes: respuesta.fuentes, verificada: verificada && respuesta.fuentes.length > 0 };
}
