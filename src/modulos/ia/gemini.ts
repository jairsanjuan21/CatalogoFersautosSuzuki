import "server-only";

/* ============================================================================
   CLIENTE DE GEMINI (plan gratuito)
   Un solo lugar para la llave, el modelo, los tiempos y los mensajes de error,
   que comparten las descripciones y la ficha técnica.
   ========================================================================== */

export class ErrorIA extends Error {
  constructor(
    mensaje: string,
    readonly codigo?: number,
  ) {
    super(mensaje);
  }
}

export interface Fuente {
  titulo: string;
  url: string;
}

interface Peticion {
  texto: string;
  /** Busca en Google antes de responder (para datos que cambian, como fichas técnicas) */
  buscar?: boolean;
  /** JSON Schema de la respuesta (no se puede combinar con buscar en todos los modelos) */
  jsonSchema?: Record<string, unknown>;
  temperatura?: number;
  maxTokens?: number;
  segundos?: number;
}

/** Llama a Gemini y devuelve el texto de la respuesta y, si buscó en Google, las páginas que usó. */
export async function pedirAGemini(p: Peticion): Promise<{ texto: string; fuentes: Fuente[] }> {
  const llave = process.env.GEMINI_API_KEY;
  if (!llave) throw new ErrorIA("La IA no está configurada todavía (falta GEMINI_API_KEY en el servidor).");
  const modelo = process.env.IA_MODELO || "gemini-3.5-flash";
  const base = process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com";

  let res: Response;
  try {
    res = await fetch(`${base}/v1beta/models/${encodeURIComponent(modelo)}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": llave },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: p.texto }] }],
        ...(p.buscar ? { tools: [{ google_search: {} }] } : {}),
        generationConfig: {
          ...(p.jsonSchema ? { responseMimeType: "application/json", responseJsonSchema: p.jsonSchema } : {}),
          temperature: p.temperatura ?? 0.7,
          maxOutputTokens: p.maxTokens ?? 2048,
        },
      }),
      signal: AbortSignal.timeout((p.segundos ?? 30) * 1000),
    });
  } catch (e) {
    if (e instanceof Error && e.name === "TimeoutError") throw new ErrorIA("La IA tardó demasiado. Intenta de nuevo.");
    throw new ErrorIA("No pudimos conectarnos con la IA. Revisa la conexión del servidor.");
  }

  const json = (await res.json().catch(() => ({}))) as {
    error?: { message?: string; status?: string };
    candidates?: {
      content?: { parts?: { text?: string }[] };
      groundingMetadata?: { groundingChunks?: { web?: { uri?: string; title?: string } }[] };
    }[];
  };
  if (!res.ok) {
    const detalle = `${json.error?.status ?? ""} ${json.error?.message ?? ""}`;
    if (res.status === 429) throw new ErrorIA("Se alcanzó el límite gratuito de la IA por ahora. Intenta más tarde.", 429);
    if (res.status === 403 || /API_KEY_INVALID|API key not valid|PERMISSION_DENIED/i.test(detalle)) throw new ErrorIA("La llave de Gemini no es válida. Revisa GEMINI_API_KEY.", 403);
    if (res.status >= 500) throw new ErrorIA("La IA no está disponible en este momento. Intenta en unos minutos.", res.status);
    console.error("Gemini respondió", res.status, detalle);
    throw new ErrorIA("La IA no pudo responder. Intenta de nuevo.", res.status);
  }

  const candidato = json.candidates?.[0];
  const texto = candidato?.content?.parts?.map((x) => x.text ?? "").join("") ?? "";
  const vistas = new Set<string>();
  const fuentes = (candidato?.groundingMetadata?.groundingChunks ?? []).flatMap((c) => {
    const url = c.web?.uri;
    if (!url || !/^https:\/\//.test(url) || vistas.has(url)) return [];
    vistas.add(url);
    return [{ titulo: (c.web?.title || new URL(url).hostname).slice(0, 80), url }];
  });
  return { texto, fuentes: fuentes.slice(0, 6) };
}

/** Saca el primer objeto JSON de un texto (Gemini con búsqueda a veces lo envuelve en ```json). */
export function jsonDeTexto(texto: string): unknown {
  const inicio = texto.indexOf("{");
  const fin = texto.lastIndexOf("}");
  if (inicio < 0 || fin <= inicio) throw new ErrorIA("La IA respondió algo que no se puede usar. Intenta de nuevo.");
  try {
    return JSON.parse(texto.slice(inicio, fin + 1));
  } catch {
    throw new ErrorIA("La IA respondió algo que no se puede usar. Intenta de nuevo.");
  }
}
