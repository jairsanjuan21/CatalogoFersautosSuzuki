"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import * as t from "@/db/esquema";
import { exigirAsesora } from "@/lib/autorizacion";
import { almacenamiento } from "@/lib/almacenamiento";
import { ESTADOS, ESTADOS_CERRADOS, type Estado } from "@/lib/etiquetas";
import { nombreVersion, plata } from "@/lib/formato";
import { erroresPorCampo, RANGO_PLAZO } from "@/validacion/solicitud";

/* ============================================================================
   ACCIONES DEL PANEL DE NATALIA
   Cada acción vuelve a comprobar la sesión: una Server Action es un endpoint
   público que cualquiera puede llamar, aunque nunca haya visto la página.
   ========================================================================== */

export interface Resultado {
  ok: boolean;
  mensaje?: string;
  errores?: Record<string, string>;
}


const id = z.uuid();
const pesos = z.coerce.number({ error: "Escribe un valor." }).int().positive({ error: "Escribe un valor mayor que cero." });

/* ---------- marcar como vista (quita el punto rojo de "nueva") ---------- */

export async function marcarVista(solicitudId: string) {
  await exigirAsesora();
  if (!id.safeParse(solicitudId).success) return;
  await db
    .update(t.solicitudes)
    .set({ vistaEn: new Date() })
    .where(and(eq(t.solicitudes.id, solicitudId), isNull(t.solicitudes.vistaEn)));
}

/* ---------- asignar modelo, valor y condiciones ---------- */

const esquemaValor = z
  .object({
    solicitudId: id,
    modeloId: z.uuid({ error: "Selecciona el modelo." }),
    versionId: z.union([z.uuid(), z.literal("")]).transform((v) => v || null),
    valorVehiculo: pesos,
    cuotaInicial: pesos,
    plazoMeses: z.coerce.number().int().min(RANGO_PLAZO.min, { error: "Elige un plazo." }).max(RANGO_PLAZO.max, { error: "Elige un plazo." }),
  })
  .refine((d) => d.cuotaInicial <= d.valorVehiculo, {
    path: ["cuotaInicial"],
    error: "La cuota inicial no puede ser mayor que el valor del vehículo.",
  });

export async function asignarValor(_previo: Resultado, formulario: FormData): Promise<Resultado> {
  const { usuarioId, ip } = await exigirAsesora();
  const r = esquemaValor.safeParse(Object.fromEntries(formulario));
  // erroresPorCampo se queda con el PRIMER error de cada campo (el más útil para la persona)
  if (!r.success) return { ok: false, errores: erroresPorCampo(r.error) };
  const d = r.data;

  const [actual] = await db.select().from(t.solicitudes).where(eq(t.solicitudes.id, d.solicitudId));
  if (!actual) return { ok: false, mensaje: "La solicitud no existe." };
  // Plazo: uno de los activos, o el que la solicitud ya tenía (aunque se haya desactivado después)
  const [conf] = await db.select({ plazos: t.configuracion.plazosMeses }).from(t.configuracion).limit(1);
  if (conf && !conf.plazos.includes(d.plazoMeses) && d.plazoMeses !== actual.plazoMeses) return { ok: false, errores: { plazoMeses: "Ese plazo no está disponible." } };

  const [modelo] = await db.select({ linea: t.modelos.linea }).from(t.modelos).where(eq(t.modelos.id, d.modeloId));
  if (!modelo) return { ok: false, errores: { modeloId: "Ese modelo no existe." } };
  const versionesDelModelo = await db.select({ id: t.versiones.id, nombre: t.versiones.nombre, transmision: t.versiones.transmision }).from(t.versiones).where(eq(t.versiones.modeloId, d.modeloId));
  const version = versionesDelModelo.find((v) => v.id === d.versionId);
  // La versión debe ser DE ese modelo: sin esta revisión se podría guardar un Swift con versión de Jimny
  if (versionesDelModelo.length && !version) return { ok: false, errores: { versionId: "Selecciona la versión." } };
  const vehiculo = version ? `${modelo.linea} ${nombreVersion(version)}` : modelo.linea;

  const cambios: { descripcion: string; campo: string; antes: unknown; despues: unknown }[] = [];
  if (actual.valorVehiculo !== d.valorVehiculo || actual.modeloId !== d.modeloId || actual.versionId !== (version?.id ?? null)) {
    cambios.push({
      campo: "valorVehiculo",
      antes: actual.valorVehiculo,
      despues: d.valorVehiculo,
      descripcion: actual.valorVehiculo
        ? `Valor cambiado: ${plata(actual.valorVehiculo)} → ${plata(d.valorVehiculo)} (${vehiculo})`
        : `Valor asignado: ${plata(d.valorVehiculo)} (${vehiculo})`,
    });
  }
  if (actual.cuotaInicial !== d.cuotaInicial) {
    cambios.push({ campo: "cuotaInicial", antes: actual.cuotaInicial, despues: d.cuotaInicial, descripcion: `Cuota inicial: ${plata(actual.cuotaInicial)} → ${plata(d.cuotaInicial)}` });
  }
  if (actual.plazoMeses !== d.plazoMeses) {
    cambios.push({ campo: "plazoMeses", antes: actual.plazoMeses, despues: d.plazoMeses, descripcion: `Plazo: ${actual.plazoMeses} → ${d.plazoMeses} meses` });
  }
  const pasaALista = actual.estado === "pendiente_valor";
  if (!cambios.length && !pasaALista) return { ok: true, mensaje: "No había cambios." };

  await db.transaction(async (tx) => {
    await tx
      .update(t.solicitudes)
      .set({
        modeloId: d.modeloId,
        versionId: version?.id ?? null,
        valorVehiculo: d.valorVehiculo,
        cuotaInicial: d.cuotaInicial,
        plazoMeses: d.plazoMeses,
        ...(pasaALista && { estado: "lista_para_cargar" as const }),
      })
      .where(eq(t.solicitudes.id, d.solicitudId));
    const filas = cambios.map((c) => ({
      solicitudId: d.solicitudId,
      actor: "asesora" as const,
      usuarioId,
      descripcion: c.descripcion,
      datos: { campo: c.campo, antes: c.antes, despues: c.despues },
    }));
    if (pasaALista) filas.push({ solicitudId: d.solicitudId, actor: "asesora", usuarioId, descripcion: `Estado: ${ESTADOS.lista_para_cargar}`, datos: { campo: "estado", antes: actual.estado, despues: "lista_para_cargar" } });
    if (filas.length) await tx.insert(t.historial).values(filas);
    await tx.insert(t.auditoria).values({
      actor: "asesora",
      usuarioId,
      accion: "Asignó valor y condiciones",
      entidad: "solicitudes",
      entidadId: actual.radicado,
      ip,
      detalle: { valorVehiculo: d.valorVehiculo, cuotaInicial: d.cuotaInicial, plazoMeses: d.plazoMeses },
    });
  });

  refresh();
  return { ok: true, mensaje: pasaALista ? "Guardado. La solicitud quedó lista para cargar." : "Cambios guardados." };
}

/* ---------- cambiar estado ---------- */

const esquemaEstado = z.object({
  solicitudId: id,
  estado: z.enum(Object.keys(ESTADOS) as [Estado, ...Estado[]], { error: "Elige un estado." }),
  financiera: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((v) => v || null),
});

export async function cambiarEstado(_previo: Resultado, formulario: FormData): Promise<Resultado> {
  const { usuarioId, ip } = await exigirAsesora();
  const r = esquemaEstado.safeParse(Object.fromEntries(formulario));
  if (!r.success) return { ok: false, mensaje: "Revisa los datos." };
  const d = r.data;

  const [actual] = await db.select().from(t.solicitudes).where(eq(t.solicitudes.id, d.solicitudId));
  if (!actual) return { ok: false, mensaje: "La solicitud no existe." };
  if (d.estado !== "pendiente_valor" && d.estado !== "desistio" && actual.valorVehiculo === null) {
    return { ok: false, mensaje: "Primero asigna el modelo y el valor del vehículo." };
  }
  const cambiaEstado = d.estado !== actual.estado;
  const cambiaFinanciera = d.financiera !== actual.financiera;
  if (!cambiaEstado && !cambiaFinanciera) return { ok: true, mensaje: "No había cambios." };

  const cerrada = ESTADOS_CERRADOS.includes(d.estado);
  const descripcion = cambiaEstado
    ? d.estado === "en_estudio" && actual.estado === "lista_para_cargar"
      ? `Cargada en la plataforma de Fersautos${d.financiera ? ` (${d.financiera})` : ""}`
      : `Estado: ${ESTADOS[d.estado]}${d.financiera && cambiaFinanciera ? ` (${d.financiera})` : ""}`
    : `Entidad financiera: ${d.financiera ?? "sin definir"}`;

  await db.transaction(async (tx) => {
    await tx
      .update(t.solicitudes)
      .set({
        estado: d.estado,
        financiera: d.financiera,
        // Al cerrarse empieza a contar la retención de documentos; si se reabre, se reinicia
        cerradaEn: cerrada ? (actual.cerradaEn ?? new Date()) : null,
      })
      .where(eq(t.solicitudes.id, d.solicitudId));
    await tx.insert(t.historial).values({
      solicitudId: d.solicitudId,
      actor: "asesora",
      usuarioId,
      descripcion,
      datos: { campo: "estado", antes: actual.estado, despues: d.estado },
    });
    await tx.insert(t.auditoria).values({
      actor: "asesora",
      usuarioId,
      accion: "Cambió el estado de una solicitud",
      entidad: "solicitudes",
      entidadId: actual.radicado,
      ip,
      detalle: { antes: actual.estado, despues: d.estado, financiera: d.financiera },
    });
  });

  refresh();
  return { ok: true, mensaje: `Estado actualizado: ${ESTADOS[d.estado]}.` };
}

/* ---------- atajo: "Ya la cargué en Fersautos" ---------- */

export async function marcarCargada(solicitudId: string): Promise<Resultado> {
  await exigirAsesora(); // primero la autorización, después cualquier consulta
  if (!id.safeParse(solicitudId).success) return { ok: false, mensaje: "Solicitud no válida." };
  const datos = new FormData();
  datos.set("solicitudId", solicitudId);
  datos.set("estado", "en_estudio");
  const [actual] = await db.select({ financiera: t.solicitudes.financiera }).from(t.solicitudes).where(eq(t.solicitudes.id, solicitudId));
  if (actual?.financiera) datos.set("financiera", actual.financiera);
  return cambiarEstado({ ok: true }, datos);
}

/* ---------- notas ---------- */

const esquemaNota = z.object({
  solicitudId: id,
  texto: z.string().trim().min(1, { error: "Escribe la nota." }).max(1000, { error: "Máximo 1.000 caracteres." }),
});

export async function agregarNota(_previo: Resultado, formulario: FormData): Promise<Resultado> {
  const { usuarioId } = await exigirAsesora();
  const r = esquemaNota.safeParse(Object.fromEntries(formulario));
  if (!r.success) return { ok: false, errores: { texto: r.error.issues[0].message } };
  await db.insert(t.notas).values({ solicitudId: r.data.solicitudId, texto: r.data.texto, usuarioId });
  refresh();
  return { ok: true, mensaje: "Nota agregada." };
}

/* ---------- eliminar una solicitud ---------- */

/**
 * Borra la solicitud con todo lo suyo (referencias, cónyuge, documentos, historial,
 * notas: la base de datos lo hace en cascada) y después los archivos del disco.
 * La auditoría guarda solo que se eliminó, el radicado y el estado: no los datos del cliente.
 */
export async function eliminarSolicitud(solicitudId: string, ultimos4: string): Promise<Resultado> {
  const { usuarioId, ip } = await exigirAsesora();
  if (!z.uuid().safeParse(solicitudId).success) return { ok: false, mensaje: "Datos no válidos." };
  const [s] = await db.select({ radicado: t.solicitudes.radicado, estado: t.solicitudes.estado }).from(t.solicitudes).where(eq(t.solicitudes.id, solicitudId));
  if (!s) return { ok: false, mensaje: "La solicitud ya no existe." };
  if (ultimos4.trim() !== s.radicado.slice(-4)) return { ok: false, mensaje: "Los dígitos no coinciden con el radicado." };

  const archivos = await db.select({ clave: t.documentos.claveArchivo }).from(t.documentos).where(eq(t.documentos.solicitudId, solicitudId));
  await db.transaction(async (tx) => {
    await tx.delete(t.solicitudes).where(eq(t.solicitudes.id, solicitudId));
    await tx.insert(t.auditoria).values({ actor: "asesora", usuarioId, accion: `Eliminó una solicitud (estaba en "${s.estado}")`, entidad: "solicitudes", entidadId: s.radicado, ip, detalle: { archivos: archivos.length } });
  });
  await Promise.allSettled(archivos.map((a) => almacenamiento.borrar(a.clave)));
  redirect("/panel/solicitudes");
}
