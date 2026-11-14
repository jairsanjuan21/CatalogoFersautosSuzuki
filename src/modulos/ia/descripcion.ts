import "server-only";
import { z } from "zod";

/* ============================================================================
   DESCRIPCIONES DEL CATÁLOGO CON GEMINI (plan gratuito)
   La IA solo REDACTA: recibe los datos que ya están en el catálogo y propone
   tres descripciones cortas. Natalia elige una, la ajusta si quiere y guarda.
   Nunca se publica nada sin que ella lo vea.
   ========================================================================== */

export const MAX_DESCRIPCION = 140;

export class ErrorIA extends Error {}

export interface DatosVehiculo {
  linea: string;
  tipo: string; // "SUV", "Sedán"...
  puestos: number;
  motor: string | null;
  transmision: string | null;
  combustible: string | null; // "híbrido", "gasolina"
  versiones: string[]; // "GLX 2WD automática"
  actual: string | null; // la descripción que ya tiene, para no repetirla
}

const esquema = z.object({
  opciones: z
    .array(z.string().describe(`Una descripción de máximo ${MAX_DESCRIPCION} caracteres, en una o dos frases.`))
    .min(1)
    .max(3)
    .describe("Tres descripciones distintas entre sí."),
});

function instrucciones(d: DatosVehiculo) {
  const datos = [
    `Modelo: Suzuki ${d.linea}`,
    `Tipo: ${d.tipo}, ${d.puestos} puestos`,
    d.combustible && `Combustible: ${d.combustible}`,
    d.motor && `Motor: ${d.motor}`,
    d.transmision && `Transmisión: ${d.transmision}`,
    d.versiones.length && `Versiones: ${d.versiones.join("; ")}`,
    d.actual && `Descripción actual (no la repitas): ${d.actual}`,
  ]
    .filter(Boolean)
    .join("\n");
  return `Eres redactor del catálogo web de Natalia García, asesora de ventas de Suzuki en Fersautos, Cúcuta (Colombia).

Escribe TRES descripciones cortas y distintas para la tarjeta de este vehículo en el catálogo.

Reglas:
1. Máximo ${MAX_DESCRIPCION} caracteres cada una, contando espacios. Una o dos frases.
2. Español de Colombia, cercano y claro, tuteando al cliente. Sin signos de exclamación seguidos ni mayúsculas sostenidas.
3. Habla del uso real: ciudad, carretera, familia, ahorro de combustible, espacio, terreno. Elige lo que encaje con el tipo y el combustible.
4. Usa SOLO los datos de abajo. No inventes cifras, consumos, equipamiento, premios ni comparaciones con otras marcas.
5. No menciones precios, bonos, descuentos, cuotas ni promociones (cambian cada mes).
6. No empieces las tres igual. No repitas el nombre del modelo en las tres.

Datos del vehículo:
${datos}`;
}

/** Pide tres descripciones a Gemini. Lanza ErrorIA con un mensaje para mostrar tal cual. */
export async function sugerirDescripciones(d: DatosVehiculo): Promise<string[]> {
  const llave = process.env.GEMINI_API_KEY;
  if (!llave) throw new ErrorIA("La IA no está configurada todavía (falta GEMINI_API_KEY en el servidor).");
  const modelo = process.env.IA_MODELO || "gemini-3.5-flash";
  const base = process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com";
  // Zod 4 genera el JSON Schema; se quita "$schema", que la API no necesita
  const jsonSchema = z.toJSONSchema(esquema, { target: "draft-2020-12" }) as Record<string, unknown>;
  delete jsonSchema.$schema;

  let res: Response;
  try {
    res = await fetch(`${base}/v1beta/models/${encodeURIComponent(modelo)}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": llave },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: instrucciones(d) }] }],
        generationConfig: { responseMimeType: "application/json", responseJsonSchema: jsonSchema, temperature: 0.9, maxOutputTokens: 1024 },
      }),
      signal: AbortSignal.timeout(30_000),
    });
  } catch (e) {
    if (e instanceof Error && e.name === "TimeoutError") throw new ErrorIA("La IA tardó demasiado. Intenta de nuevo.");
    throw new ErrorIA("No pudimos conectarnos con la IA. Revisa la conexión del servidor.");
  }

  const json = (await res.json().catch(() => ({}))) as {
    error?: { message?: string; status?: string };
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  if (!res.ok) {
    const detalle = `${json.error?.status ?? ""} ${json.error?.message ?? ""}`;
    if (res.status === 429) throw new ErrorIA("Se alcanzó el límite gratuito de la IA por ahora. Intenta más tarde.");
    if (res.status === 403 || /API_KEY_INVALID|API key not valid|PERMISSION_DENIED/i.test(detalle)) throw new ErrorIA("La llave de Gemini no es válida. Revisa GEMINI_API_KEY.");
    if (res.status >= 500) throw new ErrorIA("La IA no está disponible en este momento. Intenta en unos minutos.");
    console.error("Gemini respondió", res.status, detalle);
    throw new ErrorIA("La IA no pudo escribir la descripción. Intenta de nuevo.");
  }

  const texto = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  let opciones: string[];
  try {
    opciones = esquema.parse(JSON.parse(texto)).opciones;
  } catch {
    throw new ErrorIA("La IA respondió algo que no se puede usar. Intenta de nuevo.");
  }
  // Gemini a veces se pasa del límite: esas se descartan en vez de cortarlas a la mitad de una palabra
  const validas = [...new Set(opciones.map((o) => o.replace(/\s+/g, " ").trim()))].filter((o) => o.length >= 20 && o.length <= MAX_DESCRIPCION);
  if (!validas.length) throw new ErrorIA("Las descripciones salieron muy largas. Intenta de nuevo.");
  return validas;
}
