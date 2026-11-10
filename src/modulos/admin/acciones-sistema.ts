"use server";

import { refresh } from "next/cache";
import { exigirAdmin } from "@/lib/autorizacion";
import { aplicarRetencion } from "./retencion";
import type { ResultadoAdmin } from "./acciones-catalogo";

export async function ejecutarRetencion(): Promise<ResultadoAdmin> {
  await exigirAdmin();
  const r = await aplicarRetencion();
  refresh();
  return { ok: true, mensaje: r.archivos ? `Se borraron ${r.archivos} archivos de ${r.solicitudes} solicitudes.` : "No había documentos vencidos." };
}
