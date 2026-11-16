import "server-only";

/* ============================================================================
   CLIENTE DEL BOT DE TELEGRAM
   El bot tiene un solo trabajo: entregarle a Natalia, en su chat privado, el PDF
   del formulario con la cédula de cada solicitud. No responde mensajes ni sirve
   a nadie más. No usa webhook: el vínculo se comprueba a pedido con getUpdates.
   El token nunca sale de aquí: no se escribe en errores ni en registros.
   ========================================================================== */

export class ErrorTelegram extends Error {
  constructor(
    mensaje: string,
    readonly codigo?: number,
  ) {
    super(mensaje);
  }
}

/** Errores que significan que el chat guardado ya no sirve: hay que volver a vincular */
export const chatPerdido = (e: unknown) => e instanceof ErrorTelegram && (e.codigo === 403 || e.codigo === 400);

function direccion(metodo: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) throw new ErrorTelegram("El bot de Telegram no está configurado todavía (falta TELEGRAM_BOT_TOKEN en el servidor).");
  return `${process.env.TELEGRAM_API_URL || "https://api.telegram.org"}/bot${token}/${metodo}`;
}

export const telegramConfigurado = () => !!process.env.TELEGRAM_BOT_TOKEN?.trim();

async function llamar<T>(metodo: string, cuerpo: Record<string, unknown> | FormData, segundos = 20): Promise<T> {
  let res: Response;
  try {
    res = await fetch(direccion(metodo), {
      method: "POST",
      ...(cuerpo instanceof FormData ? { body: cuerpo } : { headers: { "content-type": "application/json" }, body: JSON.stringify(cuerpo) }),
      signal: AbortSignal.timeout(segundos * 1000),
      cache: "no-store",
    });
  } catch (e) {
    if (e instanceof ErrorTelegram) throw e;
    if (e instanceof Error && e.name === "TimeoutError") throw new ErrorTelegram("Telegram tardó demasiado en responder. Intenta de nuevo.");
    throw new ErrorTelegram("No pudimos conectarnos con Telegram. Revisa la conexión del servidor.");
  }
  const json = (await res.json().catch(() => ({}))) as { ok?: boolean; result?: T; description?: string; error_code?: number; parameters?: { retry_after?: number } };
  if (res.ok && json.ok) return json.result as T;

  const codigo = json.error_code ?? res.status;
  const detalle = json.description ?? "";
  if (codigo === 401 || codigo === 404) throw new ErrorTelegram("El token del bot no es válido. Revisa TELEGRAM_BOT_TOKEN.", 401);
  if (codigo === 403) throw new ErrorTelegram("El bot ya no puede escribirte: lo bloqueaste o borraste el chat. Vuelve a vincular Telegram en Mi perfil.", 403);
  if (codigo === 400 && /chat not found/i.test(detalle)) throw new ErrorTelegram("Telegram no encuentra el chat vinculado. Vuelve a vincular Telegram en Mi perfil.", 400);
  if (codigo === 429) throw new ErrorTelegram(`Telegram pidió esperar ${json.parameters?.retry_after ?? "unos"} segundos antes de enviar otro archivo.`, 429);
  if (codigo === 409) throw new ErrorTelegram("El bot tiene un webhook configurado. Quítalo con deleteWebhook para poder vincularlo.", 409);
  console.error("Telegram respondió", codigo, detalle.slice(0, 200));
  throw new ErrorTelegram("Telegram no aceptó el envío. Intenta de nuevo.", codigo >= 500 ? 500 : codigo);
}

let bot: { username: string; nombre: string } | null = null;

/** Usuario del bot (@...), para armar el enlace t.me. Se pide una vez por proceso. */
export async function datosDelBot() {
  if (!bot) {
    const r = await llamar<{ username: string; first_name: string }>("getMe", {});
    bot = { username: r.username, nombre: r.first_name };
  }
  return bot;
}

export interface MensajeEntrante {
  updateId: number;
  chatId: string;
  privado: boolean;
  texto: string;
  nombre: string;
}

/** Mensajes que le han llegado al bot (Telegram los guarda 24 h hasta que se confirman). */
export async function mensajesNuevos(): Promise<MensajeEntrante[]> {
  const r = await llamar<
    { update_id: number; message?: { text?: string; chat: { id: number; type: string }; from?: { first_name?: string; last_name?: string; username?: string } } }[]
  >("getUpdates", { timeout: 0, allowed_updates: ["message"] });
  return r.flatMap((u) =>
    u.message
      ? [
          {
            updateId: u.update_id,
            chatId: String(u.message.chat.id),
            privado: u.message.chat.type === "private",
            texto: (u.message.text ?? "").trim(),
            nombre:
              [u.message.from?.first_name, u.message.from?.last_name].filter(Boolean).join(" ") +
              (u.message.from?.username ? ` (@${u.message.from.username})` : ""),
          },
        ]
      : [],
  );
}

/** Confirma los mensajes leídos para que Telegram no los vuelva a entregar. */
export async function confirmarHasta(updateId: number) {
  await llamar("getUpdates", { offset: updateId + 1, timeout: 0, limit: 1 });
}

export async function enviarMensaje(chatId: string, texto: string) {
  await llamar("sendMessage", { chat_id: chatId, text: texto, link_preview_options: { is_disabled: true } });
}

/** Envía un PDF al chat. Telegram acepta archivos de hasta 50 MB por bot. */
export async function enviarDocumento(chatId: string, bytes: Uint8Array, nombreArchivo: string, texto: string) {
  const datos = new FormData();
  datos.set("chat_id", chatId);
  datos.set("caption", texto.slice(0, 1024));
  datos.set("document", new Blob([Buffer.from(bytes)], { type: "application/pdf" }), nombreArchivo);
  await llamar("sendDocument", datos, 60);
}
