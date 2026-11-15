import "server-only";
import { z } from "zod";
import { ErrorIA, pedirAGemini } from "./gemini";

/* ============================================================================
   DESCRIPCIONES DEL CATÁLOGO CON GEMINI (plan gratuito)
   La IA solo REDACTA: recibe los datos que ya están en el catálogo y propone
   tres descripciones cortas. Natalia elige una, la ajusta si quiere y guarda.
   Nunca se publica nada sin que ella lo vea.
   ========================================================================== */

export const MAX_DESCRIPCION = 140;

export { ErrorIA };

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
  return `Eres redactor del catálogo web de Natalia Sierra, asesora de ventas de Suzuki en Fersautos, Cúcuta (Colombia).

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
  // Zod 4 genera el JSON Schema; se quita "$schema", que la API no necesita
  const jsonSchema = z.toJSONSchema(esquema, { target: "draft-2020-12" }) as Record<string, unknown>;
  delete jsonSchema.$schema;
  const { texto } = await pedirAGemini({ texto: instrucciones(d), jsonSchema, temperatura: 0.9, maxTokens: 1024 });
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
