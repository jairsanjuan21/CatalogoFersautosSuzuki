"use server";

import { randomBytes } from "node:crypto";
import { refresh } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import * as t from "@/db/esquema";
import { exigirAsesora } from "@/lib/autorizacion";
import { plata } from "@/lib/formato";
import { permitir } from "@/lib/limite";
import { ErrorPdf, generarDocumento } from "@/modulos/pdf/documentos";
import { chatPerdido, confirmarHasta, datosDelBot, enviarDocumento, enviarMensaje, ErrorTelegram, mensajesNuevos } from "./telegram";

/* ============================================================================
   VÍNCULO CON TELEGRAM Y ENVÍO DE PDF (solo la cuenta de Natalia)
   Vincular: se genera un código de un solo uso que vence en 10 minutos y se
   abre t.me/<bot>?start=<código>. Cuando Natalia le da "Iniciar", Telegram le
   manda al bot "/start <código>"; la página lo busca y guarda ese chat.
   Sin el código nadie puede apropiarse del bot, aunque lo encuentre.
   ========================================================================== */

export interface ResultadoTelegram {
  ok: boolean;
  mensaje?: string;
}

const VENCE_MINUTOS = 10;

const mensajeDe = (e: unknown) => (e instanceof ErrorTelegram ? e.message : "No se pudo completar con Telegram. Intenta de nuevo.");

/** Paso 1: prepara el enlace para abrir el bot. */
export async function prepararVinculo(): Promise<ResultadoTelegram & { enlace?: string; bot?: string }> {
  const { usuarioId } = await exigirAsesora();
  if (!permitir(`telegram-vinculo:${usuarioId}`, 10, 10 * 60_000)) return { ok: false, mensaje: "Demasiados intentos. Espera unos minutos." };
  try {
    const bot = await datosDelBot();
    const codigo = randomBytes(12).toString("base64url"); // 16 caracteres: A-Z a-z 0-9 _ -
    await db
      .update(t.configuracion)
      .set({ telegramCodigo: codigo, telegramCodigoExpira: new Date(Date.now() + VENCE_MINUTOS * 60_000) })
      .where(eq(t.configuracion.id, 1));
    return { ok: true, enlace: `https://t.me/${bot.username}?start=${codigo}`, bot: `@${bot.username}` };
  } catch (e) {
    return { ok: false, mensaje: mensajeDe(e) };
  }
}

/** Paso 2: busca el "/start <código>" entre los mensajes del bot. La página lo llama cada pocos segundos. */
export async function comprobarVinculo(): Promise<ResultadoTelegram & { vinculado?: boolean }> {
  const { usuarioId, ip } = await exigirAsesora();
  const [conf] = await db
    .select({ codigo: t.configuracion.telegramCodigo, expira: t.configuracion.telegramCodigoExpira })
    .from(t.configuracion)
    .limit(1);
  if (!conf?.codigo || !conf.expira || conf.expira < new Date()) return { ok: false, mensaje: "El enlace venció. Genera uno nuevo." };

  try {
    const mensajes = await mensajesNuevos();
    const inicio = mensajes.find((m) => m.privado && m.texto === `/start ${conf.codigo}`);
    // Se confirman todos los leídos (incluidos mensajes de extraños) para no acumularlos
    if (mensajes.length) await confirmarHasta(Math.max(...mensajes.map((m) => m.updateId)));
    if (!inicio) return { ok: true, vinculado: false };

    await db
      .update(t.configuracion)
      .set({ telegramChatId: inicio.chatId, telegramNombre: inicio.nombre.slice(0, 120) || null, telegramVinculadoEn: new Date(), telegramCodigo: null, telegramCodigoExpira: null })
      .where(eq(t.configuracion.id, 1));
    await db.insert(t.auditoria).values({ actor: "asesora", usuarioId, accion: "Vinculó su Telegram", entidad: "configuracion", entidadId: "telegram", ip });
    await enviarMensaje(
      inicio.chatId,
      "Listo, Natalia. Quedaste vinculada.\n\nAquí te llegará el PDF del formulario con la cédula cada vez que lo envíes desde una solicitud del panel. Este bot no responde mensajes.",
    ).catch(() => {}); // si el saludo falla, el vínculo igual quedó hecho
    refresh();
    return { ok: true, vinculado: true };
  } catch (e) {
    return { ok: false, mensaje: mensajeDe(e) };
  }
}

export async function desvincularTelegram(): Promise<ResultadoTelegram> {
  const { usuarioId, ip } = await exigirAsesora();
  await db
    .update(t.configuracion)
    .set({ telegramChatId: null, telegramNombre: null, telegramVinculadoEn: null, telegramCodigo: null, telegramCodigoExpira: null })
    .where(eq(t.configuracion.id, 1));
  await db.insert(t.auditoria).values({ actor: "asesora", usuarioId, accion: "Desvinculó su Telegram", entidad: "configuracion", entidadId: "telegram", ip });
  refresh();
  return { ok: true, mensaje: "Telegram desvinculado." };
}

/** Envía al chat de Natalia el PDF del formulario con la cédula de una solicitud. */
export async function enviarSolicitudATelegram(solicitudId: string): Promise<ResultadoTelegram> {
  const { usuarioId, ip } = await exigirAsesora();
  if (!z.uuid().safeParse(solicitudId).success) return { ok: false, mensaje: "Solicitud no válida." };
  if (!permitir(`telegram-envio:${usuarioId}`, 15, 60_000)) return { ok: false, mensaje: "Enviaste muchos seguidos. Espera un minuto." };

  const [conf] = await db.select({ chatId: t.configuracion.telegramChatId }).from(t.configuracion).limit(1);
  if (!conf?.chatId) return { ok: false, mensaje: "Primero vincula tu Telegram en Mi perfil." };

  try {
    const doc = await generarDocumento(solicitudId, "completo");
    const texto = [
      `Solicitud ${doc.radicado}`,
      doc.cliente,
      doc.vehiculo && `${doc.vehiculo}${doc.valor !== null ? ` · ${plata(doc.valor)}` : ""}`,
      "Formulario F-NS-01 con la cédula.",
    ]
      .filter(Boolean)
      .join("\n");
    await enviarDocumento(conf.chatId, doc.bytes, doc.nombre, texto);

    const accion = "PDF del formulario con la cédula enviado a Telegram";
    await Promise.all([
      db.insert(t.historial).values({ solicitudId, actor: "asesora", usuarioId, descripcion: accion }),
      db.insert(t.auditoria).values({ actor: "asesora", usuarioId, accion, entidad: "solicitudes", entidadId: doc.radicado, ip, detalle: { archivo: doc.nombre, sha256: doc.sha256 } }),
    ]);
    refresh();
    return { ok: true, mensaje: "Enviado a tu Telegram." };
  } catch (e) {
    if (e instanceof ErrorPdf) return { ok: false, mensaje: e.message };
    if (chatPerdido(e)) {
      // El chat guardado ya no sirve: se borra para que la página ofrezca vincular de nuevo
      await db.update(t.configuracion).set({ telegramChatId: null, telegramVinculadoEn: null }).where(eq(t.configuracion.id, 1));
      refresh();
    }
    if (!(e instanceof ErrorTelegram)) console.error("Error enviando a Telegram", e);
    return { ok: false, mensaje: mensajeDe(e) };
  }
}
