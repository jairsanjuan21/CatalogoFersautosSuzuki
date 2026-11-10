import { Suspense } from "react";
import Link from "next/link";
import { exigirRol } from "@/lib/sesion";
import { haceCuanto } from "@/lib/etiquetas";
import { resumenAdmin } from "@/modulos/admin/resumen";
import { BotonSalir } from "@/componentes/BotonSalir";
import { Alerta, Titulo } from "./componentes";

export default function Resumen() {
  return (
    <>
      <Titulo sub="Estado general. Las solicitudes de clientes solo las ve Natalia en su panel.">Resumen del sistema</Titulo>
      <Suspense fallback={<p className="mt-8 text-texto-2">Cargando…</p>}>
        <Contenido />
      </Suspense>
    </>
  );
}

const ACTOR: Record<string, string> = { cliente: "Cliente", asesora: "Natalia", admin: "Admin", sistema: "Sistema" };

async function Contenido() {
  const usuario = await exigirRol("admin");
  const r = await resumenAdmin();
  const kpis = [
    [r.solicitudesMes, "Solicitudes en 30 días", `${r.solicitudesTotal} en total`],
    [r.sinFoto.length, "Modelos visibles sin foto", "Se muestran con ilustración"],
    [r.preciosViejos, "Precios desactualizados", "No se muestran en el catálogo"],
    [r.tamanoBd, "Base de datos", "Tamaño actual"],
  ] as const;

  return (
    <>
      <div className="mt-5 grid grid-cols-2 gap-2.5 md:grid-cols-4">
        {kpis.map(([n, titulo, sub]) => (
          <div key={titulo} className="rounded-xl border border-linea bg-superficie px-3.5 py-3">
            <b className="font-display block text-[30px] leading-none">{n}</b>
            <span className="text-sm text-texto-2">{titulo}</span>
            <small className="block text-[13px] text-texto-2">{sub}</small>
          </div>
        ))}
      </div>

      <h2 className="font-display mt-7 mb-1 text-[22px] font-semibold">Requiere tu atención</h2>
      {r.sinFoto.map((m) => (
        <Alerta key={m.id} tono="ambar">
          {m.linea} está visible en el catálogo pero no tiene fotos. <Link href={`/admin/catalogo/${m.id}`} className="font-semibold underline">Agregar fotos</Link>
        </Alerta>
      ))}
      {r.faltaWhatsapp && <Alerta tono="ambar">Natalia no ha puesto su WhatsApp: los botones “Escríbeme” no aparecen en el catálogo. Lo configura ella en su perfil.</Alerta>}
      {r.faltaFotoAsesora && <Alerta tono="ambar">Natalia no ha subido su foto: el catálogo muestra sus iniciales.</Alerta>}
      {r.intentosFallidos > 0 && (
        <Alerta tono="rojo">
          {r.intentosFallidos} {r.intentosFallidos === 1 ? "intento fallido" : "intentos fallidos"} de inicio de sesión esta semana.
        </Alerta>
      )}
      {!r.sinFoto.length && !r.faltaWhatsapp && !r.faltaFotoAsesora && !r.intentosFallidos && <Alerta tono="ok">Todo en orden.</Alerta>}

      <h2 className="font-display mt-7 mb-2.5 text-[22px] font-semibold">Actividad reciente</h2>
      <div className="overflow-x-auto rounded-xl border border-linea bg-superficie">
        <table className="w-full text-[15px]">
          <thead>
            <tr className="bg-fondo text-left text-[13px] text-texto-2">
              <th className="px-3.5 py-2.5 font-semibold">Cuándo</th>
              <th className="px-3.5 py-2.5 font-semibold">Quién</th>
              <th className="px-3.5 py-2.5 font-semibold">Acción</th>
            </tr>
          </thead>
          <tbody>
            {r.actividad.map((a, i) => (
              <tr key={i} className="border-t border-linea">
                <td className="px-3.5 py-2.5 whitespace-nowrap text-texto-2">{haceCuanto(a.creadoEn)}</td>
                <td className="px-3.5 py-2.5">{a.usuario ?? ACTOR[a.actor]}</td>
                <td className="px-3.5 py-2.5">{a.accion}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-linea bg-superficie p-4">
        <span className="text-texto-2">Sesión de {usuario.name} ({usuario.email})</span>
        <BotonSalir />
      </div>
    </>
  );
}
