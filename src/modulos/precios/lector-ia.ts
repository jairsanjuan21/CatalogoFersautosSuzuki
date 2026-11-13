import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { PDFDocument } from "pdf-lib";
import { z } from "zod";

/* ============================================================================
   LECTURA DE LISTAS DE PRECIOS CON IA
   La IA solo EXTRAE: cada fila del PDF tal como aparece y a qué modelo del
   catálogo corresponde. El precio "desde" de cada modelo (el menor de sus
   versiones) lo calcula este código, no la IA: así es determinista y se puede
   probar. Natalia siempre confirma antes de publicar.

   PROVEEDORES (patrón Estrategia): las instrucciones, el esquema y la
   propuesta son comunes; solo cambia la función que habla con cada API.
     IA_PROVEEDOR=gemini     → Google Gemini, plan gratuito (por defecto)
     IA_PROVEEDOR=anthropic  → Claude, de pago
   ========================================================================== */

export const LIMITES = { maxBytes: 10 * 1024 * 1024, maxPaginas: 20 } as const;
const PRECIO_MINIMO = 10_000_000;
const PRECIO_MAXIMO = 2_000_000_000;

export class ErrorLectura extends Error {}

export interface VersionParaLeer {
  id: string;
  etiqueta: string; // "GL 1.2 mecánica"
  precioActual: number | null;
}

export interface ModeloParaLeer {
  id: string;
  slug: string;
  linea: string;
  tipo: string;
  versiones: VersionParaLeer[];
}

/** Código de cada versión para la IA: "swift~1", "swift~2"... y "swift~nueva" para versiones no registradas */
const codigo = (slug: string, i: number | "nueva") => `${slug}~${i === "nueva" ? "nueva" : i + 1}`;

/** Revisa el archivo antes de gastar una llamada a la API. */
export async function validarPdf(datos: Buffer) {
  if (datos.length > LIMITES.maxBytes) throw new ErrorLectura("El PDF pesa más de 10 MB.");
  if (datos.subarray(0, 5).toString("latin1") !== "%PDF-") throw new ErrorLectura("El archivo no es un PDF.");
  let paginas: number;
  try {
    paginas = (await PDFDocument.load(datos, { updateMetadata: false })).getPageCount();
  } catch {
    throw new ErrorLectura("No pudimos abrir el PDF. Puede estar dañado o protegido con contraseña.");
  }
  if (paginas > LIMITES.maxPaginas) throw new ErrorLectura(`El PDF tiene ${paginas} páginas; el máximo es ${LIMITES.maxPaginas}.`);
  return paginas;
}

function esquemaRespuesta(codigos: string[]) {
  return z.object({
    vigencia: z.string().describe("Vigencia o fecha de la lista tal como aparece en el documento. Cadena vacía si no aparece."),
    filas: z
      .array(
        z.object({
          texto: z.string().describe("Modelo, versión y transmisión tal como aparecen en el PDF."),
          version: z.enum(["ninguno", ...codigos] as [string, ...string[]]).describe("Código de la versión del catálogo (ej. 'swift~1'), '<modelo>~nueva' o 'ninguno'."),
          precio_publico: z.number().int().min(0).max(5_000_000_000).describe("Precio al público CON IVA, en pesos, como número entero sin puntos ni comas."),
          observacion: z.string().describe("Bono, promoción o nota de esa fila. Cadena vacía si no hay."),
        }),
      )
      .describe("Una fila por cada versión con precio."),
    advertencias: z.array(z.string()).describe("Cosas que Natalia debería revisar: valores ilegibles, columnas ambiguas, etc. Lista vacía si todo está claro."),
  });
}

type Extraccion = z.infer<ReturnType<typeof esquemaRespuesta>>;

function codigosDe(modelos: ModeloParaLeer[]) {
  return modelos.flatMap((m) => [...m.versiones.map((_, i) => codigo(m.slug, i)), codigo(m.slug, "nueva")]);
}

function instrucciones(modelos: ModeloParaLeer[]) {
  const catalogo = modelos
    .map((m) =>
      [
        `${m.linea} (${m.tipo}):`,
        ...m.versiones.map((v, i) => `  ${codigo(m.slug, i)}: ${m.linea} ${v.etiqueta}`),
        `  ${codigo(m.slug, "nueva")}: otra versión de ${m.linea} que no está en esta lista`,
      ].join("\n"),
    )
    .join("\n");
  return `Eres un asistente que extrae precios de listas de precios de vehículos de un concesionario en Colombia.

Del PDF adjunto, extrae CADA versión de vehículo que tenga precio, una fila por versión.

Reglas:
1. precio_publico es el precio final al público CON IVA incluido. Si hay una columna "antes de IVA" y otra con IVA, usa la que incluye IVA. Si solo hay una columna de precio, usa esa.
2. En Colombia el punto separa miles: "78.990.000" es 78990000. Devuelve el número entero, sin puntos ni comas.
3. No confundas bonos, descuentos ni cuotas con el precio del vehículo. Eso va en "observacion".
4. Para "version", busca en el catálogo la versión que coincida con la fila en NOMBRE y en TRANSMISIÓN (mecánica o automática). Ignora diferencias de mayúsculas, guiones o espacios ("S PRESSO GL" es el S-Presso).
   - Si el modelo está en el catálogo pero ninguna versión coincide, usa "<modelo>~nueva".
   - Si el modelo no está en el catálogo, usa "ninguno".
   - No adivines: ante la duda entre dos versiones, usa "<modelo>~nueva".
5. No inventes filas ni precios. Si un valor no se puede leer, omite la fila y explícalo en "advertencias".

Catálogo actual:
${catalogo}`;
}

export interface PropuestaVersion {
  versionId: string;
  etiqueta: string;
  precioActual: number | null;
  precioLeido: number;
  cambioPct: number | null;
  texto: string; // la fila tal como venía en el PDF
  observacion: string;
}

export interface PropuestaModelo {
  modeloId: string;
  linea: string;
  versiones: PropuestaVersion[];
}

export interface ResultadoLectura {
  vigencia: string;
  propuesta: PropuestaModelo[];
  versionesNuevas: { linea: string; texto: string; precio: number }[];
  sinCoincidencia: { texto: string; precio: number }[];
  descartadas: { texto: string; motivo: string }[];
  advertencias: string[];
  uso: { modelo: string; entrada: number; salida: number; paginas: number };
}

/** Convierte las filas extraídas en una propuesta por versión. Función pura: se prueba sin la API. */
export function armarPropuesta(filas: Extraccion["filas"], modelos: ModeloParaLeer[]) {
  const propuesta: PropuestaModelo[] = [];
  const versionesNuevas: ResultadoLectura["versionesNuevas"] = [];
  const sinCoincidencia: ResultadoLectura["sinCoincidencia"] = [];
  const descartadas: ResultadoLectura["descartadas"] = [];

  const validas = filas.filter((f) => {
    const ok = Number.isInteger(f.precio_publico) && f.precio_publico >= PRECIO_MINIMO && f.precio_publico <= PRECIO_MAXIMO;
    if (!ok) descartadas.push({ texto: f.texto, motivo: `Precio fuera de rango (${f.precio_publico.toLocaleString("es-CO")})` });
    return ok;
  });

  for (const f of validas) if (f.version === "ninguno") sinCoincidencia.push({ texto: f.texto, precio: f.precio_publico });

  for (const m of modelos) {
    for (const f of validas.filter((x) => x.version === codigo(m.slug, "nueva"))) versionesNuevas.push({ linea: m.linea, texto: f.texto, precio: f.precio_publico });
    const versiones: PropuestaVersion[] = [];
    m.versiones.forEach((v, i) => {
      const coincidencias = validas.filter((f) => f.version === codigo(m.slug, i));
      if (!coincidencias.length) return;
      const [f, ...repetidas] = coincidencias;
      // Si la IA asignó dos filas a la misma versión, se usa la primera y el resto se avisa
      for (const r of repetidas) descartadas.push({ texto: r.texto, motivo: `Otra fila ya se asignó a ${m.linea} ${v.etiqueta}` });
      versiones.push({
        versionId: v.id,
        etiqueta: v.etiqueta,
        precioActual: v.precioActual,
        precioLeido: f.precio_publico,
        cambioPct: v.precioActual ? Math.round(((f.precio_publico - v.precioActual) / v.precioActual) * 1000) / 10 : null,
        texto: f.texto,
        observacion: f.observacion,
      });
    });
    if (versiones.length) propuesta.push({ modeloId: m.id, linea: m.linea, versiones });
  }
  return { propuesta, versionesNuevas, sinCoincidencia, descartadas };
}

interface ResultadoProveedor {
  datos: Extraccion;
  uso: { modelo: string; entrada: number; salida: number };
}
type Proveedor = (pdf: Buffer, modelos: ModeloParaLeer[]) => Promise<ResultadoProveedor>;

/* ---------- Estrategia 1: Google Gemini (plan gratuito) ---------- */

const extraerConGemini: Proveedor = async (pdf, modelos) => {
  const llave = process.env.GEMINI_API_KEY;
  if (!llave) throw new ErrorLectura("La lectura con IA no está configurada (falta GEMINI_API_KEY).");
  const modelo = process.env.IA_MODELO || "gemini-3.5-flash";
  const base = process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com";
  const esquema = esquemaRespuesta(codigosDe(modelos));
  // Zod 4 genera el JSON Schema; se quita "$schema", que la API no necesita
  const jsonSchema = z.toJSONSchema(esquema, { target: "draft-2020-12" }) as Record<string, unknown>;
  delete jsonSchema.$schema;

  let res: Response;
  try {
    res = await fetch(`${base}/v1beta/models/${encodeURIComponent(modelo)}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": llave },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ inlineData: { mimeType: "application/pdf", data: pdf.toString("base64") } }, { text: instrucciones(modelos) }],
          },
        ],
        generationConfig: { responseMimeType: "application/json", responseJsonSchema: jsonSchema, temperature: 0, maxOutputTokens: 8192 },
      }),
      signal: AbortSignal.timeout(90_000),
    });
  } catch (e) {
    if (e instanceof Error && e.name === "TimeoutError") throw new ErrorLectura("La lectura tardó demasiado. Intenta de nuevo.");
    throw new ErrorLectura("No pudimos conectarnos con el servicio de IA. Revisa la conexión del servidor.");
  }

  const json = (await res.json().catch(() => ({}))) as {
    error?: { message?: string; status?: string };
    candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
    usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
  };
  if (!res.ok) {
    const detalle = `${json.error?.status ?? ""} ${json.error?.message ?? ""}`;
    if (res.status === 429) throw new ErrorLectura("Se alcanzó el límite gratuito de la IA por ahora. Intenta más tarde o actualiza los precios a mano.");
    if (/API_KEY_INVALID|API key not valid|PERMISSION_DENIED/i.test(detalle) || res.status === 403)
      throw new ErrorLectura("La llave de Gemini no es válida. Revisa GEMINI_API_KEY.");
    if (res.status >= 500) throw new ErrorLectura("El servicio de IA no está disponible en este momento. Intenta en unos minutos.");
    console.error("Gemini respondió", res.status, detalle);
    throw new ErrorLectura("La IA no pudo procesar el PDF. Intenta de nuevo o actualiza los precios a mano.");
  }

  const candidato = json.candidates?.[0];
  if (candidato?.finishReason === "MAX_TOKENS") throw new ErrorLectura("La lista es demasiado larga para leerla de una vez. Divide el PDF en partes.");
  const texto = candidato?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  // Gemini promete respetar el esquema; igual se valida con Zod antes de confiar en la respuesta
  let datos: Extraccion;
  try {
    datos = esquema.parse(JSON.parse(texto));
  } catch {
    throw new ErrorLectura("La IA no pudo leer este documento. Revisa que sea una lista de precios.");
  }
  return { datos, uso: { modelo, entrada: json.usageMetadata?.promptTokenCount ?? 0, salida: json.usageMetadata?.candidatesTokenCount ?? 0 } };
};

/* ---------- Estrategia 2: Anthropic Claude (de pago, opcional) ---------- */

const extraerConAnthropic: Proveedor = async (pdf, modelos) => {
  if (!process.env.ANTHROPIC_API_KEY) throw new ErrorLectura("La lectura con IA no está configurada (falta ANTHROPIC_API_KEY).");
  const modelo = process.env.IA_MODELO || "claude-haiku-5-5";
  const cliente = new Anthropic({ timeout: 90_000, maxRetries: 2 });
  let respuesta;
  try {
    respuesta = await cliente.messages.parse({
      model: modelo,
      max_tokens: 8000,
      messages: [
        {
          role: "user",
          content: [
            { type: "document", source: { type: "base64", media_type: "application/pdf", data: pdf.toString("base64") } },
            { type: "text", text: instrucciones(modelos) },
          ],
        },
      ],
      output_config: { format: zodOutputFormat(esquemaRespuesta(codigosDe(modelos))) },
    });
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) throw new ErrorLectura("La llave de la API no es válida. Revisa ANTHROPIC_API_KEY.");
    if (e instanceof Anthropic.RateLimitError) throw new ErrorLectura("La IA recibió demasiadas peticiones. Intenta en un minuto.");
    if (e instanceof Anthropic.APIConnectionTimeoutError) throw new ErrorLectura("La lectura tardó demasiado. Intenta de nuevo.");
    if (e instanceof Anthropic.APIError && (e.status ?? 0) >= 500) throw new ErrorLectura("El servicio de IA no está disponible en este momento. Intenta en unos minutos.");
    throw e;
  }
  if (respuesta.stop_reason === "max_tokens") throw new ErrorLectura("La lista es demasiado larga para leerla de una vez. Divide el PDF en partes.");
  if (respuesta.stop_reason === "refusal" || !respuesta.parsed_output) throw new ErrorLectura("La IA no pudo leer este documento. Revisa que sea una lista de precios.");
  return { datos: respuesta.parsed_output, uso: { modelo, entrada: respuesta.usage.input_tokens, salida: respuesta.usage.output_tokens } };
};

const PROVEEDORES: Record<string, Proveedor> = { gemini: extraerConGemini, anthropic: extraerConAnthropic };

export async function leerPreciosDePdf(pdf: Buffer, modelos: ModeloParaLeer[]): Promise<ResultadoLectura> {
  if (!modelos.some((m) => m.versiones.length)) throw new ErrorLectura("No hay versiones en el catálogo para comparar. El administrador debe agregarlas.");
  const nombre = process.env.IA_PROVEEDOR || "gemini";
  const proveedor = PROVEEDORES[nombre];
  if (!proveedor) throw new ErrorLectura(`IA_PROVEEDOR="${nombre}" no existe. Usa "gemini" o "anthropic".`);
  const paginas = await validarPdf(pdf); // antes de gastar cuota de la API

  const { datos, uso } = await proveedor(pdf, modelos);
  return {
    vigencia: datos.vigencia,
    advertencias: datos.advertencias,
    ...armarPropuesta(datos.filas, modelos),
    uso: { ...uso, paginas },
  };
}
